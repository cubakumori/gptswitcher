const { app, BrowserWindow, shell, ipcMain, Menu, session } = require('electron');
const path = require('path');

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
}

function getIconPath() {
  if (isMac) return path.join(__dirname, 'icon.icns');
  if (isWin) return path.join(__dirname, 'icon.ico');
  return path.join(__dirname, 'icon.png');
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
    width: 1100,
    height: 750,
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
  // El UA se fija en la sesion, no solo en el webContents, para que los popups de login lo hereden.
  session.fromPartition(partition).setUserAgent(CHROME_USER_AGENT);

  const childWin = new BrowserWindow({
    width: 1200,
    height: 900,
    title: title ? `${title} · ${targetDef.label}` : targetDef.label,
    icon: getIconPath(),
    webPreferences: {
      partition,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  openWindows.set(key, childWin);

  childWin.webContents.setWindowOpenHandler(({ url }) => {
    if (shouldOpenInApp(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          webPreferences: { partition, nodeIntegration: false, contextIsolation: true }
        }
      };
    }
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
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

function closeWorkspacesFor(partitionId) {
  for (const [key, win] of openWindows) {
    if (key.startsWith(`${partitionId}::`)) {
      if (isLive(win)) win.destroy();
      openWindows.delete(key);
    }
  }
  broadcastOpenWorkspaces();
}

// --- IPC HANDLERS ---

ipcMain.on('open-isolated-browser', (event, data) => {
  if (!data || typeof data.partitionId !== 'string' || !data.partitionId) return;
  openWorkspace(data);
});

ipcMain.handle('get-open-workspaces', () => listOpenWorkspaces());

// Borra por completo la sesion de una cuenta: cierra sus ventanas y limpia cookies, storage y cache.
ipcMain.handle('clear-account-session', async (event, partitionId) => {
  if (typeof partitionId !== 'string' || !partitionId) return false;
  closeWorkspacesFor(partitionId);
  const ses = session.fromPartition(`persist:${partitionId}`);
  await ses.clearStorageData();
  await ses.clearCache();
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
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});

app.on('activate', () => {
  // Recupera la ventana principal aunque sigan abiertos workspaces.
  if (isLive(mainWindow)) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
});
