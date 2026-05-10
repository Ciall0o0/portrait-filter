const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Native folder dialog
  selectFolder: () => ipcRenderer.invoke("select-folder"),

  // App info
  getBackendPort: () => ipcRenderer.invoke("get-backend-port"),

  // Platform info
  platform: process.platform,
});
