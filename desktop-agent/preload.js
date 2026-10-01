const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Auth
  login: (payload) => ipcRenderer.invoke("auth:login", payload),
  register: (payload) => ipcRenderer.invoke("auth:register", payload),
  verifyOtp: (payload) => ipcRenderer.invoke("auth:verify-otp", payload),
  resendOtp: (payload) => ipcRenderer.invoke("auth:resend-otp", payload),
  verifyGst: (payload) => ipcRenderer.invoke("auth:verify-gst", payload),
  checkExists: (payload) => ipcRenderer.invoke("auth:check-exists", payload),
  sendEmailOtp: (payload) => ipcRenderer.invoke("auth:send-email-otp", payload),
  verifyEmailOtp: (payload) => ipcRenderer.invoke("auth:verify-email-otp", payload),
  sendMobileOtp: (payload) => ipcRenderer.invoke("auth:send-mobile-otp", payload),
  verifyMobileOtp: (payload) => ipcRenderer.invoke("auth:verify-mobile-otp", payload),
  checkSession: () => ipcRenderer.invoke("auth:check-session"),
  logout: () => ipcRenderer.invoke("auth:logout"),
  sendEditOtp: (payload) => ipcRenderer.invoke("auth:send-edit-otp", payload),
  verifyEditOtp: (payload) => ipcRenderer.invoke("auth:verify-edit-otp", payload),

  // Config & License
  getConfig: () => ipcRenderer.invoke("config:get"),
  saveConfig: (cfg) => ipcRenderer.invoke("config:save", cfg),
  getLicenseDetails: () => ipcRenderer.invoke("license:get-details"),
  checkDeviceLicense: (payload) => ipcRenderer.invoke("license:check-device", payload),
  sendDeviceOtp: (payload) => ipcRenderer.invoke("license:send-device-otp", payload),
  activateDevice: (payload) => ipcRenderer.invoke("license:activate-device", payload),

  // File dialogs & validation
  selectFolder: (title) => ipcRenderer.invoke("dialog:select-folder", title),
  validateFolder: (folderPath, companyCode) => ipcRenderer.invoke("dialog:validate-folder", folderPath, companyCode),

  // Sync operations
  startSync: () => ipcRenderer.invoke("sync:start"),
  stopSync: () => ipcRenderer.invoke("sync:stop"),
  resumeSync: () => ipcRenderer.invoke("sync:resume"),
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
