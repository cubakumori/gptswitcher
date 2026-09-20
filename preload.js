const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openIsolatedBrowser: (data) => ipcRenderer.send('open-isolated-browser', data),
  clearAccountSession: (partitionId) => ipcRenderer.invoke('clear-account-session', partitionId),
  getOpenWorkspaces: () => ipcRenderer.invoke('get-open-workspaces'),
  onOpenWorkspacesChanged: (callback) => {
    const listener = (_event, list) => callback(list);
    ipcRenderer.on('open-workspaces-changed', listener);
    return () => ipcRenderer.removeListener('open-workspaces-changed', listener);
  },
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  getPlatform: () => process.platform,
});
