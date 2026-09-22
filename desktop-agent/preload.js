const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Auth
  login: (payload) => ipcRenderer.invoke("auth:login", payload),
  verifyOtp: (payload) => ipcRenderer.invoke("auth:verify-otp", payload),
  resendOtp: (payload) => ipcRenderer.invoke("auth:resend-otp", payload),
  checkSession: () => ipcRenderer.invoke("auth:check-session"),
  logout: () => ipcRenderer.invoke("auth:logout"),
  sendEditOtp: (payload) => ipcRenderer.invoke("auth:send-edit-otp", payload),
  verifyEditOtp: (payload) => ipcRenderer.invoke("auth:verify-edit-otp", payload),

  // Config
  getConfig: () => ipcRenderer.invoke("config:get"),
  saveConfig: (cfg) => ipcRenderer.invoke("config:save", cfg),

  // File dialogs
  selectFolder: (title) => ipcRenderer.invoke("dialog:select-folder", title),

  // Sync operations
  startSync: () => ipcRenderer.invoke("sync:start"),
  getSyncStatus: () => ipcRenderer.invoke("sync:status"),

  // Event listeners from main process
  onSyncLog: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("sync:log", handler);
    return () => ipcRenderer.removeListener("sync:log", handler);
  },
  onStatusChange: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("sync:status-changed", handler);
    return () => ipcRenderer.removeListener("sync:status-changed", handler);
  },
  onNetworkChange: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("network:status-changed", handler);
    return () => ipcRenderer.removeListener("network:status-changed", handler);
  },
  onSessionRevoked: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("auth:session-revoked", handler);
    return () => ipcRenderer.removeListener("auth:session-revoked", handler);
  }
});
