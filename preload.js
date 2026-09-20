const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Workspaces
  openIsolatedBrowser: (data) => ipcRenderer.send('open-isolated-browser', data),
  clearAccountSession: (partitionId) => ipcRenderer.invoke('clear-account-session', partitionId),
  getOpenWorkspaces: () => ipcRenderer.invoke('get-open-workspaces'),
  onOpenWorkspacesChanged: (callback) => {
    const listener = (_event, list) => callback(list);
    ipcRenderer.on('open-workspaces-changed', listener);
    return () => ipcRenderer.removeListener('open-workspaces-changed', listener);
  },
  // Persistencia
  getState: () => ipcRenderer.invoke('store:get'),
  saveState: (state) => ipcRenderer.invoke('store:set', state),
  // Codex CLI / IDE
  getCodexHome: (accountId) => ipcRenderer.invoke('codex:get-home', accountId),
  openCodexTerminal: (accountId) => ipcRenderer.invoke('codex:open-terminal', accountId),
  copyCodexCommand: (accountId) => ipcRenderer.invoke('codex:copy-command', accountId),
  // Ventana
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  getPlatform: () => process.platform,
});
