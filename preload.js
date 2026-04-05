const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openIsolatedBrowser: (data) => ipcRenderer.send('open-isolated-browser', data),
  getPlatform: () => process.platform,
});
