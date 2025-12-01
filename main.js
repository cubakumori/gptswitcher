const { app, BrowserWindow, shell, ipcMain, Menu } = require('electron');
const path = require('path');

// Mantiene un registro de las ventanas de chat abiertas: Map<partitionId, BrowserWindow>
const openWindows = new Map();

let mainWindow;

function createMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    // 1. App Menu (GPT Switcher)
    {
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
    },
    // 2. Edit Menu (Necesario para Copiar/Pegar dentro de los chats)
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
    // 3. Window Menu (Solo gestión de ventanas)
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' } // Esto lista las ventanas abiertas automáticamente al final
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
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true
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
  // 1. Comprobar si ya existe una ventana para esta cuenta
  if (openWindows.has(partitionId)) {
    const existingWin = openWindows.get(partitionId);
    if (!existingWin.isDestroyed()) {
      existingWin.show();
      existingWin.focus();
      return; // No abrimos una nueva
    }
    // Si estaba destruida (cerrada forzosamente), la borramos del mapa y creamos otra
    openWindows.delete(partitionId);
  }

  // 2. Crear nueva ventana si no existe
  const childWin = new BrowserWindow({
    width: 1200,
    height: 900,
    title: title || 'Workspace',
    webPreferences: {
      partition: `persist:${partitionId}`, // Cookies aisladas
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  // Guardar referencia
  openWindows.set(partitionId, childWin);

  childWin.loadURL(url);

  // Evitar que ChatGPT renombre la ventana
  childWin.on('page-title-updated', (e) => {
    e.preventDefault();
  });

  // Limpiar referencia al cerrar
  childWin.on('closed', () => {
    openWindows.delete(partitionId);
  });
});

app.on('ready', () => {
  // Establecer nombre de la App para el menú (solo efectivo en desarrollo, en prod usa Info.plist)
  app.setName('GPT Switcher');
  createMenu();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});