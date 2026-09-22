// DOM Elements - Views
const authView = document.getElementById("authView");
const dashboardView = document.getElementById("dashboardView");
const loginStep = document.getElementById("loginStep");
const otpStep = document.getElementById("otpStep");

// DOM Elements - Forms & Inputs
const loginForm = document.getElementById("loginForm");
const cloudUrlInput = document.getElementById("cloudUrlInput");
const btnSetCloudMbh = document.getElementById("btnSetCloudMbh");
const btnSetCloudPhcrm = document.getElementById("btnSetCloudPhcrm");
const btnSetCloudLocal = document.getElementById("btnSetCloudLocal");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

const otpForm = document.getElementById("otpForm");
const otpCodeInput = document.getElementById("otpCodeInput");
const otpTargetEmail = document.getElementById("otpTargetEmail");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");
const backToLoginBtn = document.getElementById("backToLoginBtn");
const otpError = document.getElementById("otpError");

// DOM Elements - Top Nav & Status
const netStatusBadge = document.getElementById("netStatusBadge");
const navUserInitial = document.getElementById("navUserInitial");
const navUserName = document.getElementById("navUserName");
const logoutBtn = document.getElementById("logoutBtn");

// DOM Elements - Config Form
const configForm = document.getElementById("configForm");
const companyNameInput = document.getElementById("companyNameInput");
const companyCodeInput = document.getElementById("companyCodeInput");
const sourceDirInput = document.getElementById("sourceDirInput");
const destDirInput = document.getElementById("destDirInput");
const licenseKeyInput = document.getElementById("licenseKeyInput");
const intervalSelect = document.getElementById("intervalSelect");
const browseSourceBtn = document.getElementById("browseSourceBtn");
const browseDestBtn = document.getElementById("browseDestBtn");
const editConfigBtn = document.getElementById("editConfigBtn");
const saveConfigBtn = document.getElementById("saveConfigBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const saveNotice = document.getElementById("saveNotice");

// DOM Elements - // DOM Elements - Unlock Modal
const unlockModal = document.getElementById("unlockModal");
const unlockOtpSection = document.getElementById("unlockOtpSection");
const unlockPasswordSection = document.getElementById("unlockPasswordSection");
const unlockModalEmail = document.getElementById("unlockModalEmail");
const unlockPasswordEmail = document.getElementById("unlockPasswordEmail");
const unlockOtpForm = document.getElementById("unlockOtpForm");
const unlockOtpInput = document.getElementById("unlockOtpInput");
const unlockOtpError = document.getElementById("unlockOtpError");
const verifyUnlockBtn = document.getElementById("verifyUnlockBtn");
const closeUnlockModalBtn = document.getElementById("closeUnlockModalBtn");

const unlockPasswordForm = document.getElementById("unlockPasswordForm");
const unlockPasswordInput = document.getElementById("unlockPasswordInput");
const unlockPasswordError = document.getElementById("unlockPasswordError");
const verifyPasswordUnlockBtn = document.getElementById("verifyPasswordUnlockBtn");
const closeUnlockPasswordModalBtn = document.getElementById("closeUnlockPasswordModalBtn");
const switchToPasswordBtn = document.getElementById("switchToPasswordBtn");
const switchToOtpBtn = document.getElementById("switchToOtpBtn");
const unlockDirectBtn = document.getElementById("unlockDirectBtn");
const unlockDirectPasswordBtn = document.getElementById("unlockDirectPasswordBtn");

// DOM Elements - Action & Stats & Terminal
const syncNowBtn = document.getElementById("syncNowBtn");
const statTablesCount = document.getElementById("statTablesCount");
const statQueuedCount = document.getElementById("statQueuedCount");
const statLastStatus = document.getElementById("statLastStatus");
const terminalBody = document.getElementById("terminalBody");
const clearLogBtn = document.getElementById("clearLogBtn");

let currentAuthEmail = "";

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  setupIpcListeners();

  // 1. Preload config immediately so cloudUrlInput and emailInput are populated
  try {
    const cfg = await window.electronAPI.getConfig();
    if (cfg) {
      if (cfg.cloudUrl) cloudUrlInput.value = cfg.cloudUrl;
      if (cfg.userEmail && !emailInput.value) emailInput.value = cfg.userEmail;
    }
  } catch (err) {
    console.warn("Could not pre-load config:", err);
  }

  // 2. Check current session
  try {
    const sessionRes = await window.electronAPI.checkSession();
    if (sessionRes && sessionRes.authenticated && sessionRes.session) {
      currentAuthEmail = sessionRes.session.email || "";
      showDashboard(sessionRes.session);
    } else {
      if (sessionRes?.accountSuspended) {
        if (sessionRes.email) emailInput.value = sessionRes.email;
        loginError.textContent = sessionRes.message || "Your account has been deactivated or suspended. Please contact administrator.";
        loginError.classList.remove("hidden");
      } else if (sessionRes?.sessionExpired) {
        if (sessionRes.email) emailInput.value = sessionRes.email;
        loginError.textContent = "Your cloud session has expired. Please sign in to verify identity and unlock sync.";
        loginError.classList.remove("hidden");
      }
      showLogin();
    }
  } catch (err) {
    showLogin();
  }
});

function showLogin() {
  authView.classList.remove("hidden");
  dashboardView.classList.add("hidden");
  loginStep.classList.remove("hidden");
  otpStep.classList.add("hidden");
}

async function showDashboard(session) {
  authView.classList.add("hidden");
  dashboardView.classList.remove("hidden");

  // Populate user pill
  const userName = session.user?.name || session.email || "Operator";
  navUserName.textContent = userName;
  navUserInitial.textContent = userName.charAt(0).toUpperCase();
  currentAuthEmail = session.email || "";

  // Load configuration
  await loadAndDisplayConfig();

  // Load sync status
  try {
    const status = await window.electronAPI.getSyncStatus();
    updateStatusDisplay(status);
  } catch {}
}

async function loadAndDisplayConfig() {
  try {
    const cfg = await window.electronAPI.getConfig();
    if (cfg) {
      if (cfg.cloudUrl) cloudUrlInput.value = cfg.cloudUrl;
      if (cfg.userEmail && !currentAuthEmail) currentAuthEmail = cfg.userEmail;
      companyNameInput.value = cfg.companyName || "";
      companyCodeInput.value = (cfg.companyCode || "A01").toUpperCase();
      sourceDirInput.value = cfg.sourceDir || "";
      destDirInput.value = cfg.destDir || "";
      licenseKeyInput.value = cfg.licenseKey || "";
      intervalSelect.value = String(cfg.intervalMins || 10);

      // If configuration already has data saved, lock the form by default
      const hasConfig = Boolean(cfg.companyName || cfg.sourceDir || cfg.licenseKey);
      setFormLocked(hasConfig);
    }
  } catch (err) {
    console.error("Failed to load config:", err);
  }
}

function setFormLocked(isLocked) {
  companyNameInput.disabled = isLocked;
  companyCodeInput.disabled = isLocked;
  sourceDirInput.disabled = isLocked;
  licenseKeyInput.disabled = isLocked;
  intervalSelect.disabled = isLocked;
  browseSourceBtn.disabled = isLocked;

  // Mask sensitive folder paths and license key when locked
  if (isLocked) {
    sourceDirInput.type = "password";
    licenseKeyInput.type = "password";
    editConfigBtn.classList.remove("hidden");
    saveConfigBtn.classList.add("hidden");
    cancelEditBtn.classList.add("hidden");
  } else {
    sourceDirInput.type = "text";
    licenseKeyInput.type = "text";
    editConfigBtn.classList.add("hidden");
    saveConfigBtn.classList.remove("hidden");
    cancelEditBtn.classList.remove("hidden");
  }
}

// ---------------------------------------------------------------------------
// Event Listeners: Forms & Buttons
// ---------------------------------------------------------------------------
function setupEventListeners() {
  // Disable right-click inspect context menu
  document.addEventListener("contextmenu", (e) => e.preventDefault());

  // Cloud URL quick toggles
  if (btnSetCloudMbh) {
    btnSetCloudMbh.addEventListener("click", () => {
      cloudUrlInput.value = "https://mbh.crm.mabsolinfotech.cloud";
      cloudUrlInput.focus();
    });
  }
  if (btnSetCloudPhcrm) {
    btnSetCloudPhcrm.addEventListener("click", () => {
      cloudUrlInput.value = "https://phcrm.mabsolinfotech.cloud";
      cloudUrlInput.focus();
    });
  }
  if (btnSetCloudLocal) {
    btnSetCloudLocal.addEventListener("click", () => {
      cloudUrlInput.value = "http://localhost:3000";
      cloudUrlInput.focus();
    });
  }

  // Login Form Submit (Step 1)
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.classList.add("hidden");
    setButtonLoading(loginBtn, true);

    const cloudUrl = cloudUrlInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      const res = await window.electronAPI.login({ cloudUrl, email, password });
      setButtonLoading(loginBtn, false);

      if (res.success && res.directLogin) {
        currentAuthEmail = res.email || email;
        showDashboard(res.session);
        return;
      }

      if (res.success && res.otpRequired) {
        currentAuthEmail = res.email || email;
        otpTargetEmail.textContent = currentAuthEmail;
        loginStep.classList.add("hidden");
        otpStep.classList.remove("hidden");
        otpCodeInput.value = "";
        otpCodeInput.focus();
      } else {
        loginError.textContent = res.message || "Invalid credentials.";
        loginError.classList.remove("hidden");
      }
    } catch (err) {
      setButtonLoading(loginBtn, false);
      loginError.textContent = err.message || "Connection error.";
      loginError.classList.remove("hidden");
    }
  });

  // Back Button (from OTP step to Login step)
  backToLoginBtn.addEventListener("click", () => {
    otpStep.classList.add("hidden");
    loginStep.classList.remove("hidden");
    loginError.classList.add("hidden");
  });

  // OTP Form Submit (Step 2)
  otpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    otpError.classList.add("hidden");
    setButtonLoading(verifyOtpBtn, true);

    const cloudUrl = cloudUrlInput.value.trim();
    const email = currentAuthEmail || emailInput.value.trim();
    const otp = otpCodeInput.value.trim();

    try {
      const res = await window.electronAPI.verifyOtp({ cloudUrl, email, otp });
      setButtonLoading(verifyOtpBtn, false);

      if (res.success && res.session) {
        currentAuthEmail = res.session.email || email;
        showDashboard(res.session);
      } else {
        otpError.textContent = res.message || "Invalid or expired OTP.";
        otpError.classList.remove("hidden");
      }
    } catch (err) {
      setButtonLoading(verifyOtpBtn, false);
      otpError.textContent = err.message || "Verification error.";
      otpError.classList.remove("hidden");
    }
  });

  // Logout Button
  logoutBtn.addEventListener("click", async () => {
    await window.electronAPI.logout();
    currentAuthEmail = "";
    showLogin();
  });

  // Browse Source Folder
  browseSourceBtn.addEventListener("click", async () => {
    const selected = await window.electronAPI.selectFolder("Select Encrypted Data Folder");
    if (selected) sourceDirInput.value = selected;
  });

  // Browse Destination Folder (Optional/Legacy)
  browseDestBtn?.addEventListener("click", async () => {
    const selected = await window.electronAPI.selectFolder("Select Output Data Folder");
    if (selected && destDirInput) destDirInput.value = selected;
  });

  function showUnlockView(mode) {
    unlockModal.classList.remove("hidden");
    if (mode === "password") {
      unlockOtpSection.classList.add("hidden");
      unlockPasswordSection.classList.remove("hidden");
      unlockPasswordInput.value = "";
      unlockPasswordError.classList.add("hidden");
      setTimeout(() => unlockPasswordInput.focus(), 50);
    } else {
      unlockPasswordSection.classList.add("hidden");
      unlockOtpSection.classList.remove("hidden");
      unlockOtpInput.value = "";
      unlockOtpError.classList.add("hidden");
      setTimeout(() => unlockOtpInput.focus(), 50);
    }
  }

  function unlockDirectly() {
    unlockModal.classList.add("hidden");
    setFormLocked(false);
  }

  // Click "Edit Configuration" -> Triggers OTP verification or Password verification to unlock!
  editConfigBtn.addEventListener("click", async () => {
    editConfigBtn.disabled = true;
    const targetEmail = currentAuthEmail || emailInput.value.trim();
    unlockModalEmail.textContent = targetEmail || "your registered email";
    unlockPasswordEmail.textContent = targetEmail || "your registered email";
    unlockOtpError.classList.add("hidden");
    unlockPasswordError.classList.add("hidden");

    try {
      const res = await window.electronAPI.sendEditOtp({
        email: targetEmail,
        cloudUrl: cloudUrlInput.value.trim()
      });
      editConfigBtn.disabled = false;

      if (res && res.success) {
        if (res.email) {
          unlockModalEmail.textContent = res.email;
          unlockPasswordEmail.textContent = res.email;
        }
        showUnlockView("otp");
      } else {
        // If unauthorized or token expired, switch directly to password verification instead of blocking
        showUnlockView("password");
        if (res?.message && !res.unauthorized) {
          unlockPasswordError.textContent = res.message;
          unlockPasswordError.classList.remove("hidden");
        }
      }
    } catch (err) {
      editConfigBtn.disabled = false;
      showUnlockView("password");
    }
  });

  // Switch between OTP and Password in Unlock Modal
  switchToPasswordBtn.addEventListener("click", (e) => {
    e.preventDefault();
    showUnlockView("password");
  });

  switchToOtpBtn.addEventListener("click", (e) => {
    e.preventDefault();
    showUnlockView("otp");
  });

  // Direct Unlock buttons (for offline or immediate local setup)
  unlockDirectBtn.addEventListener("click", (e) => {
    e.preventDefault();
    unlockDirectly();
  });

  unlockDirectPasswordBtn.addEventListener("click", (e) => {
    e.preventDefault();
    unlockDirectly();
  });

  // Close Unlock Modal Buttons
  closeUnlockModalBtn.addEventListener("click", () => {
    unlockModal.classList.add("hidden");
  });

  closeUnlockPasswordModalBtn.addEventListener("click", () => {
    unlockModal.classList.add("hidden");
  });

  // Submit Unlock OTP Form
  unlockOtpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    unlockOtpError.classList.add("hidden");
    setButtonLoading(verifyUnlockBtn, true);

    const otp = unlockOtpInput.value.trim();
    const targetEmail = currentAuthEmail || unlockModalEmail.textContent.trim();

    try {
      const res = await window.electronAPI.verifyEditOtp({
        otp,
        email: targetEmail,
        cloudUrl: cloudUrlInput.value.trim()
      });
      setButtonLoading(verifyUnlockBtn, false);

      if (res && res.success) {
        unlockModal.classList.add("hidden");
        setFormLocked(false); // Unlocks form fields!
      } else {
        const isUnauth = res?.unauthorized || (typeof res?.message === "string" && res.message.toLowerCase().includes("unauthorized"));
        if (isUnauth) {
          unlockOtpError.innerHTML = `Cloud session expired. <a href="#" id="inlineDirectUnlock" style="color: #38bdf8; text-decoration: underline; font-weight: bold;">Unlock Directly</a> or <a href="#" id="inlinePasswordUnlock" style="color: #38bdf8; text-decoration: underline; font-weight: bold;">Use Password</a>`;
          unlockOtpError.classList.remove("hidden");
          document.getElementById("inlineDirectUnlock")?.addEventListener("click", (ev) => {
            ev.preventDefault();
            unlockDirectly();
          });
          document.getElementById("inlinePasswordUnlock")?.addEventListener("click", (ev) => {
            ev.preventDefault();
            showUnlockView("password");
          });
        } else {
          unlockOtpError.textContent = res?.message || "Invalid or expired security code.";
          unlockOtpError.classList.remove("hidden");
        }
      }
    } catch (err) {
      setButtonLoading(verifyUnlockBtn, false);
      unlockOtpError.textContent = err.message || "Verification failed.";
      unlockOtpError.classList.remove("hidden");
    }
  });

  // Submit Unlock Password Form (Authenticates with cloud and updates token)
  unlockPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    unlockPasswordError.classList.add("hidden");
    setButtonLoading(verifyPasswordUnlockBtn, true);

    const password = unlockPasswordInput.value.trim();
    const email = currentAuthEmail || unlockPasswordEmail.textContent.trim();
    const cloudUrl = cloudUrlInput.value.trim();

    try {
      const res = await window.electronAPI.login({ cloudUrl, email, password });
      setButtonLoading(verifyPasswordUnlockBtn, false);

      if (res && res.success) {
        // If OTP is required by server, prompt OTP
        if (res.otpRequired) {
          showUnlockView("otp");
          unlockOtpError.textContent = "Verification code sent to your email. Enter code to unlock.";
          unlockOtpError.classList.remove("hidden");
          unlockOtpError.style.color = "#34d399";
        } else {
          unlockModal.classList.add("hidden");
          setFormLocked(false); // Unlocks form fields!
        }
      } else {
        unlockPasswordError.textContent = res?.message || "Invalid account password.";
        unlockPasswordError.classList.remove("hidden");
      }
    } catch (err) {
      setButtonLoading(verifyPasswordUnlockBtn, false);
      unlockPasswordError.textContent = err.message || "Authentication error.";
      unlockPasswordError.classList.remove("hidden");
    }
  });

  // Cancel Edit Button
  cancelEditBtn.addEventListener("click", async () => {
    await loadAndDisplayConfig();
    setFormLocked(true);
  });

  // Save Config
  configForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newCfg = {
      companyName: companyNameInput.value.trim(),
      companyCode: companyCodeInput.value.trim().toUpperCase(),
      sourceDir: sourceDirInput.value.trim(),
      destDir: destDirInput ? destDirInput.value.trim() : "",
      licenseKey: licenseKeyInput.value.trim(),
      autoSync: intervalSelect.value !== "0",
      intervalMins: Number(intervalSelect.value) || 10,
      cloudUrl: cloudUrlInput.value.trim(),
      userEmail: currentAuthEmail || emailInput.value.trim()
    };

    const res = await window.electronAPI.saveConfig(newCfg);
    if (res.success) {
      saveNotice.classList.remove("hidden");
      setTimeout(() => saveNotice.classList.add("hidden"), 3000);
      setFormLocked(true); // Re-locks after save!
    }
  });

  // Decrypt & Sync Now Action
  syncNowBtn.addEventListener("click", async () => {
    setSyncButtonLoading(true);
    try {
      const res = await window.electronAPI.startSync();
      if (!res.success) {
        statLastStatus.textContent = "Error";
        statLastStatus.style.color = "#f87171";
      }
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setSyncButtonLoading(false);
    }
  });

  // Clear Log Console
  clearLogBtn.addEventListener("click", () => {
    terminalBody.innerHTML = "";
  });
}

// ---------------------------------------------------------------------------
// IPC Event Listeners from Main Process
// ---------------------------------------------------------------------------
function setupIpcListeners() {
  // Real-time terminal log entries
  window.electronAPI.onSyncLog(({ timestamp, level, message }) => {
    appendLog(timestamp, level, message);
  });

  // Sync status updates
  window.electronAPI.onStatusChange((status) => {
    updateStatusDisplay(status);
  });

  // Network online/offline status updates
  window.electronAPI.onNetworkChange(({ isOnline }) => {
    updateNetworkBadge(isOnline);
  });

  // Real-time access revocation (account suspended/deactivated)
  if (window.electronAPI.onSessionRevoked) {
    window.electronAPI.onSessionRevoked(({ message }) => {
      showLogin();
      loginError.textContent = message || "Your account has been deactivated or suspended. Please contact administrator.";
      loginError.classList.remove("hidden");
    });
  }
}

// ---------------------------------------------------------------------------
// UI Helpers
// ---------------------------------------------------------------------------
function appendLog(timestamp, level, message) {
  const entry = document.createElement("div");
  entry.className = `log-entry ${level}`;
  entry.innerHTML = `<span class="time">[${timestamp}]</span> ${escapeHtml(message)}`;
  terminalBody.appendChild(entry);
  terminalBody.scrollTop = terminalBody.scrollHeight;
}

function updateStatusDisplay(status) {
  if (!status) return;

  if (typeof status.tablesCount === "number") {
    statTablesCount.textContent = status.tablesCount;
  }
  if (typeof status.queuedBatches === "number") {
    statQueuedCount.textContent = status.queuedBatches;
  }

  if (status.isSyncing) {
    statLastStatus.textContent = "Storing...";
    statLastStatus.style.color = "#38bdf8";
  } else if (status.lastStatus === "stored" || status.lastStatus === "synced") {
    statLastStatus.textContent = "Stored (Cloud)";
    statLastStatus.style.color = "#34d399";
  } else if (status.lastStatus === "offline_queued") {
    statLastStatus.textContent = "Offline (Queued)";
    statLastStatus.style.color = "#fbbf24";
  } else if (status.error) {
    statLastStatus.textContent = "Failed";
    statLastStatus.style.color = "#f87171";
  }

  if (typeof status.isOnline === "boolean") {
    updateNetworkBadge(status.isOnline);
  }
}

function updateNetworkBadge(isOnline) {
  if (isOnline) {
    netStatusBadge.className = "status-pill online";
    netStatusBadge.querySelector(".label").textContent = "Online";
  } else {
    netStatusBadge.className = "status-pill offline";
    netStatusBadge.querySelector(".label").textContent = "Offline";
  }
}

function setButtonLoading(btn, isLoading) {
  const text = btn.querySelector(".btn-text");
  const spinner = btn.querySelector(".spinner");
  btn.disabled = isLoading;
  if (isLoading) {
    text.classList.add("hidden");
    spinner.classList.remove("hidden");
  } else {
    text.classList.remove("hidden");
    spinner.classList.add("hidden");
  }
}

function setSyncButtonLoading(isLoading) {
  const content = syncNowBtn.querySelector(".sync-btn-content");
  const spinner = syncNowBtn.querySelector(".spinner-large");
  syncNowBtn.disabled = isLoading;
  if (isLoading) {
    content.classList.add("hidden");
    spinner.classList.remove("hidden");
  } else {
    content.classList.remove("hidden");
    spinner.classList.add("hidden");
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
