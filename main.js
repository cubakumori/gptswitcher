const { app, BrowserWindow, shell, ipcMain, Menu, Tray, nativeImage, globalShortcut, session, screen, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const store = require('./store');

const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

// User agent de Chrome real para compatibilidad con servicios web (login de Google/Apple/GitHub)
const chromeVersion = process.versions.chrome;
const osString = isMac
  ? 'Macintosh; Intel Mac OS X 10_15_7'
  : 'Windows NT 10.0; Win64; x64';
const CHROME_USER_AGENT = `Mozilla/5.0 (${osString}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;

// Destinos que se pueden abrir por cuenta. El renderer solo envia la clave, nunca la URL.
const WORKSPACE_TARGETS = {
  chatgpt: { url: 'https://chatgpt.com', label: 'ChatGPT' },
  codex: { url: 'https://chatgpt.com/codex', label: 'Codex' },
};

// Hosts que deben seguir dentro de la app: OpenAI y los proveedores de login (popups OAuth).
// Cualquier otro enlace se abre en el navegador del sistema.
const IN_APP_HOSTS = [
  'chatgpt.com', 'openai.com', 'oaistatic.com', 'oaiusercontent.com', 'auth0.com',
  'accounts.google.com', 'accounts.youtube.com', 'gstatic.com', 'googleapis.com',
  'appleid.apple.com', 'idmsa.apple.com',
  'login.microsoftonline.com', 'login.live.com', 'login.microsoft.com',
];

// GitHub solo dentro de la app para el flujo OAuth (Codex web pide conectar GitHub).
const GITHUB_AUTH_PATHS = ['/login', '/sessions', '/apps/', '/settings/installations', '/settings/connections'];

function hostMatches(host, allowed) {
  return host === allowed || host.endsWith('.' + allowed);
}

function shouldOpenInApp(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  const host = url.hostname;
  if (IN_APP_HOSTS.some((h) => hostMatches(host, h))) return true;
  if (hostMatches(host, 'github.com')) {
    return GITHUB_AUTH_PATHS.some((p) => url.pathname.startsWith(p));
  }
  return false;
}

// --- Identidad de navegador coherente con Chrome ---
// El UA ya se presenta como Chrome, pero Chromium sigue anunciando en los Client Hints
// (Sec-CH-UA) solo la marca "Chromium". Google detecta la incoherencia y bloquea el login
// ("Es posible que el navegador o la aplicacion no sean seguros"). Reescribimos las marcas
// en las cabeceras y, via workspace-preload.js, en navigator.userAgentData.

const CHROME_MAJOR = chromeVersion.split('.')[0];
const CHROME_BRANDS = `"Chromium";v="${CHROME_MAJOR}", "Google Chrome";v="${CHROME_MAJOR}", "Not?A_Brand";v="24"`;
const CHROME_FULL_VERSION_LIST = `"Chromium";v="${chromeVersion}", "Google Chrome";v="${chromeVersion}", "Not?A_Brand";v="24.0.0.0"`;

const CHROME_PLATFORM = isMac ? '"macOS"' : isWin ? '"Windows"' : '"Linux"';

// Google bloquea el login desde motores Chromium que no son Chrome ("Es posible que el navegador
// o la aplicacion no sean seguros") aunque el UA y los Client Hints digan Chrome. La solucion que
// mantiene qutebrowser (QtWebEngine, mismo problema) y que sigue funcionando en 2026 es presentar
// un UA de Firefox unicamente en accounts.google.com: Firefox no envia Client Hints, asi que
// Google no tiene nada que contrastar. El resto de sitios sigue viendo Chrome.
const FIREFOX_VERSION = '156.0';
const FIREFOX_USER_AGENT = isMac
  ? `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:${FIREFOX_VERSION}) Gecko/20100101 Firefox/${FIREFOX_VERSION}`
  : isWin
    ? `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${FIREFOX_VERSION}) Gecko/20100101 Firefox/${FIREFOX_VERSION}`
    : `Mozilla/5.0 (X11; Linux x86_64; rv:${FIREFOX_VERSION}) Gecko/20100101 Firefox/${FIREFOX_VERSION}`;
const FIREFOX_IDENTITY_HOSTS = ['accounts.google.com'];

function usesFirefoxIdentity(rawUrl) {
  try {
    const { protocol, hostname } = new URL(rawUrl);
    return protocol === 'https:' && FIREFOX_IDENTITY_HOSTS.some((h) => hostMatches(hostname, h));
  } catch {
    return false;
  }
}

function userAgentForUrl(rawUrl) {
  return usesFirefoxIdentity(rawUrl) ? FIREFOX_USER_AGENT : CHROME_USER_AGENT;
}

// Nota: cuando el UA esta sobrescrito, Chromium omite por completo las cabeceras Sec-CH-UA.
// Chrome real las envia siempre en https, asi que ademas de corregirlas hay que anadirlas.
// En los hosts con identidad Firefox ocurre lo contrario: UA de Firefox y ningun Client Hint.
function identityHeadersFor(requestHeaders, url = '') {
  const headers = { ...requestHeaders };
  const present = {};
  for (const name of Object.keys(headers)) present[name.toLowerCase()] = name;

  if (usesFirefoxIdentity(url)) {
    for (const lower of Object.keys(present)) {
      if (lower.startsWith('sec-ch-ua')) delete headers[present[lower]];
    }
    headers[present['user-agent'] || 'User-Agent'] = FIREFOX_USER_AGENT;
    return headers;
  }

  // Fuera de esos hosts el UA de red es siempre el de Chrome, aunque el webContents venga de
  // una pagina de Google (loadURL no dispara will-navigate y did-start-navigation llega tarde
  // para la primera peticion).
  if (present['user-agent'] && headers[present['user-agent']] !== CHROME_USER_AGENT) {
    headers[present['user-agent']] = CHROME_USER_AGENT;
  }

  if (present['sec-ch-ua']) headers[present['sec-ch-ua']] = CHROME_BRANDS;
  if (present['sec-ch-ua-full-version-list']) headers[present['sec-ch-ua-full-version-list']] = CHROME_FULL_VERSION_LIST;

  if (url.startsWith('https://')) {
    if (!present['sec-ch-ua']) headers['Sec-CH-UA'] = CHROME_BRANDS;
    if (!present['sec-ch-ua-mobile']) headers['Sec-CH-UA-Mobile'] = '?0';
    if (!present['sec-ch-ua-platform']) headers['Sec-CH-UA-Platform'] = CHROME_PLATFORM;
  }
  return headers;
}

const configuredPartitions = new Set();

function configureWorkspaceSession(partition) {
  const ses = session.fromPartition(partition);
  if (configuredPartitions.has(partition)) return ses;
  configuredPartitions.add(partition);
  // UA en la sesion, no solo en el webContents, para que los popups de login lo hereden.
  ses.setUserAgent(CHROME_USER_AGENT);
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({ requestHeaders: identityHeadersFor(details.requestHeaders, details.url) });
  });
  return ses;
}

// Registro de ventanas de workspace abiertas: Map<`${partitionId}::${target}`, BrowserWindow>
const openWindows = new Map();

let mainWindow = null;

function isLive(win) {
  return Boolean(win) && !win.isDestroyed();
}

function windowKey(partitionId, target) {
  return `${partitionId}::${target}`;
}

function listOpenWorkspaces() {
  const list = [];
  for (const [key, win] of openWindows) {
    if (!isLive(win)) continue;
    const [partitionId, target] = key.split('::');
    list.push({ partitionId, target });
  }
  return list;
}

function broadcastOpenWorkspaces() {
  if (isLive(mainWindow)) {
    mainWindow.webContents.send('open-workspaces-changed', listOpenWorkspaces());
  }
  refreshTray();
}

function getIconPath() {
  if (isMac) return path.join(__dirname, 'icon.icns');
  if (isWin) return path.join(__dirname, 'icon.ico');
  return path.join(__dirname, 'icon.png');
}

// --- Persistencia de la posicion/tamano de la ventana principal ---

function restoredBounds() {
  const saved = store.getWindowBounds();
  if (!saved) return { width: 1100, height: 750 };
  const display = screen.getDisplayMatching(saved);
  const area = display.workArea;
  const visible =
    saved.x + saved.width > area.x + 50 &&
    saved.x < area.x + area.width - 50 &&
    saved.y >= area.y - 10 &&
    saved.y < area.y + area.height - 50;
  return visible ? saved : { width: saved.width, height: saved.height };
}

function trackBounds(win) {
  let timer = null;
  const save = () => {
    if (!isLive(win) || win.isMinimized() || win.isMaximized() || win.isFullScreen()) return;
    store.setWindowBounds(win.getBounds());
  };
  const debounced = () => {
    clearTimeout(timer);
    timer = setTimeout(save, 400);
  };
  win.on('resize', debounced);
  win.on('move', debounced);
  win.on('close', () => {
    clearTimeout(timer);
    save();
  });
}

// --- Codex CLI / IDE: un CODEX_HOME por cuenta ---
// Codex guarda la sesion en $CODEX_HOME/auth.json (por defecto ~/.codex). Dando a cada cuenta
// su propia carpeta, la CLI y la extension del IDE pueden estar logueadas con cuentas distintas.

function codexHomeFor(accountId) {
  return path.join(app.getPath('userData'), 'codex', accountId);
}

function ensureCodexHome(accountId) {
  const home = codexHomeFor(accountId);
  fs.mkdirSync(home, { recursive: true });
  const config = path.join(home, 'config.toml');
  if (!fs.existsSync(config)) {
    fs.writeFileSync(config, [
      '# Generated by GPT Switcher.',
      '# Credentials must live in this folder (auth.json), not in the OS keychain,',
      '# otherwise every account would share the same login.',
      'cli_auth_credentials_store = "file"',
      '',
    ].join('\n'), 'utf8');
  }
  return home;
}

function codexShellCommand(home) {
  if (isWin) {
    // PowerShell
    return `$env:CODEX_HOME = '${home.replace(/'/g, "''")}'; codex`;
  }
  const escaped = home.replace(/(["\\$`])/g, '\\$1');
  return `export CODEX_HOME="${escaped}" && codex`;
}

function openCodexTerminal(accountId) {
  const home = ensureCodexHome(accountId);
  const command = codexShellCommand(home);
  try {
    if (isMac) {
      const script = command.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      spawn('osascript', ['-e', 'tell application "Terminal"', '-e', `do script "${script}"`, '-e', 'activate', '-e', 'end tell'], { detached: true, stdio: 'ignore' }).unref();
      return true;
    }
    if (isWin) {
      spawn('cmd.exe', ['/c', 'start', 'powershell.exe', '-NoExit', '-Command', command], { detached: true, stdio: 'ignore', windowsHide: false }).unref();
      return true;
    }
    spawn('x-terminal-emulator', ['-e', `bash -lc '${command.replace(/'/g, "'\\''")}; exec bash'`], { detached: true, stdio: 'ignore' }).unref();
    return true;
  } catch (err) {
    console.error('Could not open a terminal for Codex', err);
    return false;
  }
}

function removeCodexHome(accountId) {
  fs.rmSync(codexHomeFor(accountId), { recursive: true, force: true });
}

function createMenu() {
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Window',
      // En macOS, role 'window' hace que el sistema anada la lista de ventanas abiertas al final.
      ...(isMac ? { role: 'window' } : {}),
      submenu: [
        { role: 'minimize' },
        ...(isMac
          ? [{ role: 'zoom' }, { type: 'separator' }, { role: 'front' }]
          : [{ role: 'close' }])
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    ...restoredBounds(),
    minWidth: 720,
    minHeight: 480,
    ...(isMac ? { titleBarStyle: 'hiddenInset' } : { frame: false }),
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: !app.isPackaged
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  trackBounds(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

function openWorkspace({ partitionId, target, title }) {
  const targetDef = WORKSPACE_TARGETS[target] || WORKSPACE_TARGETS.chatgpt;
  const resolvedTarget = WORKSPACE_TARGETS[target] ? target : 'chatgpt';
  const key = windowKey(partitionId, resolvedTarget);

  const existing = openWindows.get(key);
  if (isLive(existing)) {
    if (existing.isMinimized()) existing.restore();
    existing.show();
    existing.focus();
    return;
  }
  openWindows.delete(key);

  const partition = `persist:${partitionId}`;
  configureWorkspaceSession(partition);
  const workspacePreload = path.join(__dirname, 'workspace-preload.js');

  const childWin = new BrowserWindow({
    width: 1200,
    height: 900,
    title: title ? `${title} · ${targetDef.label}` : targetDef.label,
    icon: getIconPath(),
    webPreferences: {
      partition,
      preload: workspacePreload,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  openWindows.set(key, childWin);
  trackIdentity(childWin.webContents);

  childWin.webContents.setWindowOpenHandler(({ url }) => {
    if (shouldOpenInApp(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          webPreferences: { partition, preload: workspacePreload, nodeIntegration: false, contextIsolation: true }
        }
      };
    }
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  childWin.webContents.on('did-create-window', (popup, { url }) => {
    trackIdentity(popup.webContents);
    popup.webContents.setUserAgent(userAgentForUrl(url));
  });

  childWin.loadURL(targetDef.url);

  childWin.on('page-title-updated', (e) => {
    e.preventDefault();
  });

  childWin.on('closed', () => {
    openWindows.delete(key);
    broadcastOpenWorkspaces();
  });

  broadcastOpenWorkspaces();
}

// Ajusta navigator.userAgent del webContents al destino de cada navegacion, incluidas las
// redirecciones (auth.openai.com -> accounts.google.com llega por 302).
function trackIdentity(contents) {
  const apply = (url) => {
    const ua = userAgentForUrl(url);
    if (contents.getUserAgent() !== ua) contents.setUserAgent(ua);
  };
  contents.on('will-navigate', (event, url) => apply(url));
  contents.on('will-redirect', (event, url) => apply(url));
  contents.on('did-start-navigation', (details) => {
    if (details.isMainFrame) apply(details.url);
  });
}

function closeWorkspacesFor(partitionId) {
  for (const [key, win] of openWindows) {
    if (key.startsWith(`${partitionId}::`)) {
      if (isLive(win)) win.destroy();
      openWindows.delete(key);
    }
  }
  broadcastOpenWorkspaces();
}

// --- Ventana principal: mostrar/recuperar ---

function showMainWindow() {
  if (isLive(mainWindow)) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
}

// --- Icono en la bandeja / barra de menus ---

let tray = null;

function trayIcon() {
  if (isMac) {
    const img = nativeImage.createFromPath(path.join(__dirname, 'trayTemplate.png'));
    img.setTemplateImage(true);
    return img;
  }
  if (isWin) return nativeImage.createFromPath(path.join(__dirname, 'icon.ico'));
  return nativeImage.createFromPath(path.join(__dirname, 'tray.png'));
}

function accountLabel(account, index) {
  const shortcut = index < 9 ? `  ${isMac ? '⌘⌥' : 'Ctrl+Alt+'}${index + 1}` : '';
  return `${account.name}${shortcut}`;
}

function buildTrayMenu() {
  const { accounts } = store.getState();
  const settings = store.getSettings();
  const open = new Set(listOpenWorkspaces().map((w) => `${w.partitionId}::${w.target}`));

  const accountItems = accounts.length
    ? accounts.map((account, index) => ({
        label: accountLabel(account, index),
        submenu: [
          {
            label: open.has(windowKey(account.id, 'chatgpt')) ? 'Focus ChatGPT' : 'Launch ChatGPT',
            click: () => openWorkspace({ partitionId: account.id, target: 'chatgpt', title: account.name }),
          },
          {
            label: open.has(windowKey(account.id, 'codex')) ? 'Focus Codex' : 'Launch Codex',
            click: () => openWorkspace({ partitionId: account.id, target: 'codex', title: account.name }),
          },
        ],
      }))
    : [{ label: 'No accounts yet', enabled: false }];

  return Menu.buildFromTemplate([
    { label: 'Show GPT Switcher', click: showMainWindow },
    { type: 'separator' },
    ...accountItems,
    { type: 'separator' },
    {
      label: `Global shortcuts (${isMac ? '⌘⌥1-9' : 'Ctrl+Alt+1-9'})`,
      type: 'checkbox',
      checked: settings.globalShortcuts,
      click: (item) => {
        store.setSettings({ globalShortcuts: item.checked });
        refreshShortcuts();
        refreshTray();
      },
    },
    { type: 'separator' },
    { role: 'quit', label: 'Quit GPT Switcher' },
  ]);
}

function refreshTray() {
  if (!tray) return;
  tray.setContextMenu(buildTrayMenu());
}

function createTray() {
  try {
    tray = new Tray(trayIcon());
  } catch (err) {
    console.error('Tray icon unavailable', err);
    return;
  }
  tray.setToolTip('GPT Switcher');
  // En Windows/Linux el clic izquierdo abre la ventana; en macOS abre el menu.
  if (!isMac) tray.on('click', showMainWindow);
  refreshTray();
}

// --- Atajos globales: CommandOrControl+Alt+1..9 abre ChatGPT de la cuenta N, +0 muestra la app ---

const SHORTCUT_MODIFIER = 'CommandOrControl+Alt';

function refreshShortcuts() {
  globalShortcut.unregisterAll();
  if (!store.getSettings().globalShortcuts) return;

  globalShortcut.register(`${SHORTCUT_MODIFIER}+0`, showMainWindow);
  for (let n = 1; n <= 9; n++) {
    globalShortcut.register(`${SHORTCUT_MODIFIER}+${n}`, () => {
      const { accounts } = store.getState();
      const account = accounts[n - 1];
      if (!account) return;
      openWorkspace({ partitionId: account.id, target: 'chatgpt', title: account.name });
    });
  }
}

// --- IPC HANDLERS ---

ipcMain.on('open-isolated-browser', (event, data) => {
  if (!data || typeof data.partitionId !== 'string' || !data.partitionId) return;
  openWorkspace(data);
});

ipcMain.handle('get-open-workspaces', () => listOpenWorkspaces());

// Persistencia de cuentas (fuente de verdad: <userData>/accounts.json)
ipcMain.handle('store:get', () => store.getState());
ipcMain.handle('store:set', (event, state) => {
  if (!state || typeof state !== 'object') return store.getState();
  const result = store.setState(state);
  refreshTray();
  return result;
});
ipcMain.handle('settings:get', () => store.getSettings());
ipcMain.handle('settings:set', (event, patch) => {
  const result = store.setSettings(patch);
  refreshShortcuts();
  refreshTray();
  return result;
});

// Codex CLI / IDE por cuenta
ipcMain.handle('codex:get-home', (event, accountId) => {
  if (typeof accountId !== 'string' || !/^[A-Za-z0-9-]+$/.test(accountId)) return null;
  const home = ensureCodexHome(accountId);
  return { home, command: codexShellCommand(home) };
});
ipcMain.handle('codex:open-terminal', (event, accountId) => {
  if (typeof accountId !== 'string' || !/^[A-Za-z0-9-]+$/.test(accountId)) return false;
  return openCodexTerminal(accountId);
});
ipcMain.handle('codex:copy-command', (event, accountId) => {
  if (typeof accountId !== 'string' || !/^[A-Za-z0-9-]+$/.test(accountId)) return false;
  clipboard.writeText(codexShellCommand(ensureCodexHome(accountId)));
  return true;
});

// Borra por completo la sesion de una cuenta: cierra sus ventanas y limpia cookies, storage y cache.
ipcMain.handle('clear-account-session', async (event, partitionId) => {
  if (typeof partitionId !== 'string' || !partitionId) return false;
  closeWorkspacesFor(partitionId);
  const ses = session.fromPartition(`persist:${partitionId}`);
  await ses.clearStorageData();
  await ses.clearCache();
  if (/^[A-Za-z0-9-]+$/.test(partitionId)) removeCodexHome(partitionId);
  return true;
});

// Window controls for frameless windows (Windows/Linux)
ipcMain.on('window-minimize', () => {
  if (isLive(mainWindow)) mainWindow.minimize();
});
ipcMain.on('window-maximize', () => {
  if (!isLive(mainWindow)) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.on('window-close', () => {
  if (isLive(mainWindow)) mainWindow.close();
});

app.on('ready', () => {
  app.setName('GPT Switcher');
  createMenu();
  createWindow();
  createTray();
  refreshShortcuts();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});

app.on('activate', () => {
  // Recupera la ventana principal aunque sigan abiertos workspaces.
  showMainWindow();
});

// Exportado solo para las pruebas (npm test); main.js sigue siendo el entry point de Electron.
module.exports = { shouldOpenInApp, codexShellCommand, identityHeadersFor, userAgentForUrl, trackIdentity, WORKSPACE_TARGETS };
