const { app, BrowserWindow, shell, ipcMain, Menu } = require('electron');
const path = require('path');

const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

// User agent de Chrome real para compatibilidad con servicios web
const chromeVersion = process.versions.chrome;
const osString = isMac
  ? 'Macintosh; Intel Mac OS X 10_15_7'
  : 'Windows NT 10.0; Win64; x64';
const CHROME_USER_AGENT = `Mozilla/5.0 (${osString}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;

// Mantiene un registro de las ventanas de chat abiertas: Map<partitionId, BrowserWindow>
const openWindows = new Map();

let mainWindow;

function getIconPath() {
  if (isMac) return path.join(__dirname, 'icon.icns');
  if (isWin) return path.join(__dirname, 'icons.ico');
  return path.join(__dirname, 'icons.png');
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
      return { action: 'deny' };
    }
    return { action: 'allow' };
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

// --- IPC HANDLERS ---

ipcMain.on('open-isolated-browser', (event, { url, partitionId, title }) => {
  if (openWindows.has(partitionId)) {
    const existingWin = openWindows.get(partitionId);
    if (!existingWin.isDestroyed()) {
      existingWin.show();
      existingWin.focus();
      return;
    }
    openWindows.delete(partitionId);
  }

  const childWin = new BrowserWindow({
    width: 1200,
    height: 900,
    title: title || 'Workspace',
    icon: getIconPath(),
    webPreferences: {
      partition: `persist:${partitionId}`,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  openWindows.set(partitionId, childWin);

  childWin.webContents.setUserAgent(CHROME_USER_AGENT);
  childWin.loadURL(url);

  childWin.on('page-title-updated', (e) => {
    e.preventDefault();
  });

  childWin.on('closed', () => {
    openWindows.delete(partitionId);
  });
});

// Window controls for frameless windows (Windows/Linux)
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());

app.on('ready', () => {
  app.setName('GPT Switcher');
  createMenu();
  createWindow();
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
