// DOM Elements - Views
const authView = document.getElementById("authView");
const dashboardView = document.getElementById("dashboardView");
const loginStep = document.getElementById("loginStep");
const otpStep = document.getElementById("otpStep");

// DOM Elements - Forms & Inputs
const loginForm = document.getElementById("loginForm");
const cloudUrlInput = document.getElementById("cloudUrlInput");
const btnServerPhcrm = document.getElementById("btnServerPhcrm");
const btnServerMbh = document.getElementById("btnServerMbh");
const btnServerLocal = document.getElementById("btnServerLocal");
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

// DOM Elements - Auth & Registration Tabs
const authTabs = document.getElementById("authTabs");
const tabSignIn = document.getElementById("tabSignIn");
const tabSignUp = document.getElementById("tabSignUp");
const signupStep = document.getElementById("signupStep");
const signupForm = document.getElementById("signupForm");
const signupCompanyName = document.getElementById("signupCompanyName");
const signupFullName = document.getElementById("signupFullName");
const signupEmail = document.getElementById("signupEmail");
const signupMobile = document.getElementById("signupMobile");
const signupPassword = document.getElementById("signupPassword");
const signupConfirmPassword = document.getElementById("signupConfirmPassword");
const signupBtn = document.getElementById("signupBtn");
const signupError = document.getElementById("signupError");
const linkToSignup = document.getElementById("linkToSignup");
const linkToSignin = document.getElementById("linkToSignin");
const pendingApprovalStep = document.getElementById("pendingApprovalStep");
const pendingCompanyNameText = document.getElementById("pendingCompanyNameText");
const pendingEmailText = document.getElementById("pendingEmailText");
const pendingBackToLoginBtn = document.getElementById("pendingBackToLoginBtn");

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
const licenseCountdownBadge = document.getElementById("licenseCountdownBadge");
const licenseCountdownText = document.getElementById("licenseCountdownText");
const licenseCountdownDetail = document.getElementById("licenseCountdownDetail");
const licenseExpiryNotice = document.getElementById("licenseExpiryNotice");
const intervalSelect = document.getElementById("intervalSelect");
const browseSourceBtn = document.getElementById("browseSourceBtn");
const browseDestBtn = document.getElementById("browseDestBtn");
const editConfigBtn = document.getElementById("editConfigBtn");
const saveConfigBtn = document.getElementById("saveConfigBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const saveNotice = document.getElementById("saveNotice");
const syncTargetSelect = document.getElementById("syncTargetSelect");
const autoSyncCheckbox = document.getElementById("autoSyncCheckbox");
const autoSyncLabelText = document.getElementById("autoSyncLabelText");
const toggleAutoSyncBtn = document.getElementById("toggleAutoSyncBtn");
const toggleSyncIcon = document.getElementById("toggleSyncIcon");
const toggleSyncText = document.getElementById("toggleSyncText");

// DOM Elements - Sync Target Dropdown in Top Nav
const syncTargetDropdown = document.getElementById("syncTargetDropdown");
const syncTargetBtn = document.getElementById("syncTargetBtn");
const syncTargetMenu = document.getElementById("syncTargetMenu");
const currentSyncTargetName = document.getElementById("currentSyncTargetName");

// DOM Elements - Unlock Modal
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

// DOM Elements - Action & Stats & Terminal
const syncNowBtn = document.getElementById("syncNowBtn");
const statTablesCount = document.getElementById("statTablesCount");
const statQueuedCount = document.getElementById("statQueuedCount");
const statLastStatus = document.getElementById("statLastStatus");
const terminalBody = document.getElementById("terminalBody");
const clearLogBtn = document.getElementById("clearLogBtn");

let currentAuthEmail = "";

function updateActiveServerButtons(url) {
  const normalized = (url || "").trim().toLowerCase().replace(/\/+$/, "");
  const buttons = [
    { btn: btnServerPhcrm, url: "https://phcrm.mabsolinfotech.cloud" },
    { btn: btnServerMbh, url: "https://mbh.crm.mabsolinfotech.cloud" },
    { btn: btnServerLocal, url: "http://localhost:3000" }
  ];

  buttons.forEach(({ btn, url: targetUrl }) => {
    if (!btn) return;
    if (normalized === targetUrl.toLowerCase()) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

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
  updateActiveServerButtons(cloudUrlInput.value);

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
  } catch { }
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
      const isAutoSyncOn = cfg.autoSync !== false && String(cfg.intervalMins) !== "0";
      if (autoSyncCheckbox) {
        autoSyncCheckbox.checked = isAutoSyncOn;
        if (autoSyncLabelText) autoSyncLabelText.textContent = isAutoSyncOn ? "Auto-Sync ON" : "Auto-Sync OFF";
      }
      intervalSelect.value = String(cfg.intervalMins !== undefined ? cfg.intervalMins : "realtime");
      if (syncTargetSelect) syncTargetSelect.value = cfg.syncTarget || "mabsolcrm";

      // Always lock the form by default when on dashboard
      setFormLocked(true);

      // Fetch active license validity & start live countdown timer
      fetchAndShowLicenseDetails();
    }
  } catch (err) {
    console.error("Failed to load config:", err);
  } finally {
    setFormLocked(true);
  }
}

let licenseCountdownInterval = null;

function updateLicenseCountdown(expiresAtStr) {
  if (licenseCountdownInterval) {
    clearInterval(licenseCountdownInterval);
    licenseCountdownInterval = null;
  }

  if (!expiresAtStr) {
    if (licenseCountdownBadge) licenseCountdownBadge.classList.add("hidden");
    if (licenseCountdownDetail) licenseCountdownDetail.classList.add("hidden");
    return;
  }

  const target = new Date(expiresAtStr).getTime();

  function tick() {
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      if (licenseCountdownBadge) {
        licenseCountdownBadge.classList.remove("hidden", "warning");
        licenseCountdownBadge.classList.add("expired");
        if (licenseCountdownText) licenseCountdownText.textContent = "Expired";
      }
      if (licenseCountdownDetail) {
        licenseCountdownDetail.classList.remove("hidden");
        if (licenseExpiryNotice) licenseExpiryNotice.textContent = "License key expired. Please renew from Web Settings.";
      }
      if (licenseCountdownInterval) {
        clearInterval(licenseCountdownInterval);
        licenseCountdownInterval = null;
      }
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (n) => String(n).padStart(2, "0");
    const formatted = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;

    if (licenseCountdownBadge) {
      licenseCountdownBadge.classList.remove("hidden", "expired");
      if (days < 3) {
        licenseCountdownBadge.classList.add("warning");
      } else {
        licenseCountdownBadge.classList.remove("warning");
      }
      if (licenseCountdownText) licenseCountdownText.textContent = formatted;
    }

    if (licenseCountdownDetail) {
      licenseCountdownDetail.classList.remove("hidden");
      if (licenseExpiryNotice) {
        licenseExpiryNotice.textContent = `${days} days remaining in 30-day term`;
      }
    }
  }

  tick();
  licenseCountdownInterval = setInterval(tick, 1000);
}

async function fetchAndShowLicenseDetails() {
  try {
    if (!window.electronAPI?.getLicenseDetails) return;
    const res = await window.electronAPI.getLicenseDetails();
    if (res && res.success && res.licenseExpiresAt) {
      updateLicenseCountdown(res.licenseExpiresAt);
    } else {
      updateLicenseCountdown(null);
    }
  } catch (err) {
    console.error("Failed to query license details:", err);
  }
}

function setFormLocked(isLocked) {
  companyNameInput.disabled = isLocked;
  companyNameInput.readOnly = isLocked;
  companyCodeInput.disabled = isLocked;
  companyCodeInput.readOnly = isLocked;
  sourceDirInput.disabled = isLocked;
  sourceDirInput.readOnly = isLocked;
  licenseKeyInput.disabled = isLocked;
  licenseKeyInput.readOnly = isLocked;
  if (autoSyncCheckbox) autoSyncCheckbox.disabled = isLocked;
  intervalSelect.disabled = isLocked || (autoSyncCheckbox && !autoSyncCheckbox.checked);
  browseSourceBtn.disabled = isLocked;
  if (syncTargetSelect) syncTargetSelect.disabled = isLocked;

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

  // Cloud URL quick toggles & presets
  const bindServerBtn = (btn, url) => {
    if (!btn) return;
    btn.addEventListener("click", () => {
      cloudUrlInput.value = url;
      updateActiveServerButtons(url);
      cloudUrlInput.focus();
    });
  };

  bindServerBtn(btnServerPhcrm, "https://phcrm.mabsolinfotech.cloud");
  bindServerBtn(btnServerMbh, "https://mbh.crm.mabsolinfotech.cloud");
  bindServerBtn(btnServerLocal, "http://localhost:3000");

  if (cloudUrlInput) {
    cloudUrlInput.addEventListener("input", () => {
      updateActiveServerButtons(cloudUrlInput.value);
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
        return;
      }

      if (res.pendingApproval) {
        showPendingApprovalView({
          email: email,
          companyName: "Your Organization"
        });
        return;
      }

      loginError.textContent = sanitizeMessage(res.message || "Invalid credentials.");
      loginError.classList.remove("hidden");
    } catch (err) {
      setButtonLoading(loginBtn, false);
      loginError.textContent = sanitizeMessage(err.message || "Connection error.");
      loginError.classList.remove("hidden");
    }
  });

  // Switch between Sign In and Sign Up tabs
  const switchToSignIn = () => {
    tabSignIn?.classList.add("active");
    tabSignUp?.classList.remove("active");
    loginStep?.classList.remove("hidden");
    signupStep?.classList.add("hidden");
    pendingApprovalStep?.classList.add("hidden");
    otpStep?.classList.add("hidden");
    loginError?.classList.add("hidden");
    authTabs?.classList.remove("hidden");
  };

  const switchToSignUp = () => {
    tabSignUp?.classList.add("active");
    tabSignIn?.classList.remove("active");
    signupStep?.classList.remove("hidden");
    loginStep?.classList.add("hidden");
    pendingApprovalStep?.classList.add("hidden");
    otpStep?.classList.add("hidden");
    signupError?.classList.add("hidden");
    authTabs?.classList.remove("hidden");
  };

  const showPendingApprovalView = (data) => {
    authTabs?.classList.add("hidden");
    loginStep?.classList.add("hidden");
    signupStep?.classList.add("hidden");
    otpStep?.classList.add("hidden");
    pendingApprovalStep?.classList.remove("hidden");
    if (pendingCompanyNameText) pendingCompanyNameText.textContent = data.companyName || "Your Organization";
    if (pendingEmailText) pendingEmailText.textContent = data.email || "";
  };

  tabSignIn?.addEventListener("click", switchToSignIn);
  tabSignUp?.addEventListener("click", switchToSignUp);
  linkToSignup?.addEventListener("click", switchToSignUp);
  linkToSignin?.addEventListener("click", switchToSignIn);
  pendingBackToLoginBtn?.addEventListener("click", switchToSignIn);

  // Sign Up Form Submit (Pending Superadmin Approval)
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      signupError.classList.add("hidden");

      const password = signupPassword.value;
      const confirmPassword = signupConfirmPassword.value;

      if (password !== confirmPassword) {
        signupError.textContent = "Passwords do not match. Please verify.";
        signupError.classList.remove("hidden");
        return;
      }

      if (password.length < 6) {
        signupError.textContent = "Password must be at least 6 characters long.";
        signupError.classList.remove("hidden");
        return;
      }

      setButtonLoading(signupBtn, true);

      const cloudUrl = cloudUrlInput.value.trim();
      const payload = {
        cloudUrl,
        companyName: signupCompanyName.value.trim(),
        name: signupFullName.value.trim(),
        email: signupEmail.value.trim().toLowerCase(),
        mobile: signupMobile ? signupMobile.value.trim() : "",
        password
      };

      try {
        const res = await window.electronAPI.register(payload);
        setButtonLoading(signupBtn, false);

        if (res && res.success && res.pendingApproval) {
          showPendingApprovalView({
            companyName: payload.companyName,
            email: payload.email
          });
          signupForm.reset();
        } else {
          signupError.textContent = sanitizeMessage(res?.message || "Failed to create account.");
          signupError.classList.remove("hidden");
        }
      } catch (err) {
        setButtonLoading(signupBtn, false);
        signupError.textContent = sanitizeMessage(err.message || "Network error while creating account.");
        signupError.classList.remove("hidden");
      }
    });
  }

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

  // Sync Target Dropdown Trigger & Selection
  if (syncTargetBtn && syncTargetMenu) {
    syncTargetBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      syncTargetMenu.classList.toggle("hidden");
      syncTargetDropdown.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
      if (syncTargetDropdown && !syncTargetDropdown.contains(e.target)) {
        syncTargetMenu.classList.add("hidden");
        syncTargetDropdown.classList.remove("open");
      }
    });

    const targetItems = syncTargetMenu.querySelectorAll(".sync-target-item");
    targetItems.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-id");
        if (targetId !== "mabsolcrm") {
          const name = btn.querySelector(".item-name")?.textContent || "Target ERP";
          appendLogEntry("info", `[Sync Target] ${name} is coming soon. MabsolCRM sync remains active.`);
          alert(`${name} integration is coming soon!\nMabsolCRM native database sync is currently active.`);
          return;
        }

        // Activate MabsolCRM
        targetItems.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        if (currentSyncTargetName) currentSyncTargetName.textContent = "Sync MabsolCRM";
        if (syncTargetSelect) syncTargetSelect.value = "mabsolcrm";
        syncTargetMenu.classList.add("hidden");
        syncTargetDropdown.classList.remove("open");
      });
    });
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
          unlockOtpError.innerHTML = `Cloud session expired. <a href="#" id="inlinePasswordUnlock" style="color: #38bdf8; text-decoration: underline; font-weight: bold;">Use Account Password</a>`;
          unlockOtpError.classList.remove("hidden");
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
        unlockPasswordError.textContent = sanitizeMessage(res?.message || "Invalid account password.");
        unlockPasswordError.classList.remove("hidden");
      }
    } catch (err) {
      setButtonLoading(verifyPasswordUnlockBtn, false);
      unlockPasswordError.textContent = sanitizeMessage(err.message || "Authentication error.");
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
    setButtonLoading(saveConfigBtn, true);
    saveNotice.classList.add("hidden");

    const isAutoSync = autoSyncCheckbox ? (autoSyncCheckbox.checked && intervalSelect.value !== "0") : (intervalSelect.value !== "0");
    const newCfg = {
      companyName: companyNameInput.value.trim(),
      companyCode: companyCodeInput.value.trim().toUpperCase(),
      sourceDir: sourceDirInput.value.trim(),
      destDir: destDirInput ? destDirInput.value.trim() : "",
      licenseKey: licenseKeyInput.value.trim(),
      syncTarget: syncTargetSelect ? syncTargetSelect.value : "mabsolcrm",
      autoSync: isAutoSync,
      intervalMins: isAutoSync ? (intervalSelect.value === "realtime" ? "realtime" : (Number(intervalSelect.value) || 10)) : 0,
      cloudUrl: cloudUrlInput.value.trim(),
      userEmail: currentAuthEmail || emailInput.value.trim()
    };

    try {
      const res = await window.electronAPI.saveConfig(newCfg);
      setButtonLoading(saveConfigBtn, false);

      if (res && res.success) {
        saveNotice.textContent = "Saved & Verified on this machine!";
        saveNotice.className = "save-notice";
        saveNotice.classList.remove("hidden");
        setTimeout(() => saveNotice.classList.add("hidden"), 3500);
        setFormLocked(true); // Re-locks after successful save!
        fetchAndShowLicenseDetails();
      } else {
        const errorText = sanitizeMessage(res?.error || "Failed to verify/save license key.");
        saveNotice.textContent = errorText;
        saveNotice.className = "save-notice error";
        saveNotice.classList.remove("hidden");
        appendLogEntry("error", `[Config Error] ${errorText}`);
      }
    } catch (err) {
      setButtonLoading(saveConfigBtn, false);
      const errorText = sanitizeMessage(err.message || "Failed to save configuration.");
      saveNotice.textContent = errorText;
      saveNotice.className = "save-notice error";
      saveNotice.classList.remove("hidden");
      appendLogEntry("error", `[Config Error] ${errorText}`);
    }
  });

  // Auto-Sync Enable/Disable Checkbox
  if (autoSyncCheckbox) {
    autoSyncCheckbox.addEventListener("change", () => {
      const isChecked = autoSyncCheckbox.checked;
      if (autoSyncLabelText) autoSyncLabelText.textContent = isChecked ? "Auto-Sync ON" : "Auto-Sync OFF";
      intervalSelect.disabled = !isChecked;
      if (!isChecked) {
        intervalSelect.value = "0";
      } else if (intervalSelect.value === "0") {
        intervalSelect.value = "realtime";
      }
    });
  }

  // Interval Select change
  if (intervalSelect) {
    intervalSelect.addEventListener("change", () => {
      const isOff = intervalSelect.value === "0";
      if (autoSyncCheckbox) {
        autoSyncCheckbox.checked = !isOff;
        if (autoSyncLabelText) autoSyncLabelText.textContent = isOff ? "Auto-Sync OFF" : "Auto-Sync ON";
      }
    });
  }

  // Stop / Resume Auto-Sync Button
  let isAutoSyncPausedState = false;
  if (toggleAutoSyncBtn) {
    toggleAutoSyncBtn.addEventListener("click", async () => {
      toggleAutoSyncBtn.disabled = true;
      try {
        if (!isAutoSyncPausedState) {
          const res = await window.electronAPI.stopSync();
          if (res && res.success) {
            isAutoSyncPausedState = true;
            toggleAutoSyncBtn.classList.add("resumed");
            if (toggleSyncIcon) toggleSyncIcon.textContent = "▶️";
            if (toggleSyncText) toggleSyncText.textContent = "Resume Sync";
            statLastStatus.textContent = "Sync Paused";
            statLastStatus.style.color = "#f59e0b";
          }
        } else {
          const res = await window.electronAPI.resumeSync();
          if (res && res.success) {
            isAutoSyncPausedState = false;
            toggleAutoSyncBtn.classList.remove("resumed");
            if (toggleSyncIcon) toggleSyncIcon.textContent = "🛑";
            if (toggleSyncText) toggleSyncText.textContent = "Stop Sync";
            statLastStatus.textContent = "Sync Active";
            statLastStatus.style.color = "#34d399";
          }
        }
      } catch (err) {
        console.error("Failed to toggle auto sync:", err);
      } finally {
        toggleAutoSyncBtn.disabled = false;
      }
    });
  }

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

// Universal sanitizer to ensure internal file names (efwin11, prg, vfp, fxp, fpw, fll, MabsolCRM.EXE)
// and raw paths are never exposed in user logs, terminal display, or error dialogs.
function sanitizeMessage(msg) {
  if (!msg) return "";
  let text = typeof msg === "string" ? msg : (msg.message || msg.error || JSON.stringify(msg));

  // 1. Scrub Windows absolute file paths pointing to engine or internal files
  text = text.replace(/[A-Za-z]:\\(?:[^'"\n\r\t<>\\\/]+\\)*([^'"\n\r\t<>\\\/]+)/g, (match, filename) => {
    if (/efwin11|mabsol_core|mabsolcrm|vfp|\.fll|\.prg|\.fpw|\.fxp/i.test(match)) {
      return "[System Module]";
    }
    return filename;
  });

  // 2. Scrub Unix-style paths containing engine files
  text = text.replace(/(?:\/[^'"\n\r\t<>\/]+)+\/(?:efwin11|mabsol_core|mabsolcrm|vfp)[^'"\n\r\t<>\/]*/gi, "[System Module]");

  // 3. Clean up node fs copyfile / lock / EBUSY error leaks
  text = text.replace(/(?:EBUSY:\s*)?copyfile\s+['"][^'"]+['"]\s*->\s*['"][^'"]+['"]/gi, "system module initialization");
  text = text.replace(/EBUSY:\s*resource busy or locked[^\n\r]*/gi, "Resource temporarily in use by background process.");

  // 4. Scrub specific internal names & extensions
  text = text.replace(/efwin11(?:\.fll)?/gi, "security module");
  text = text.replace(/mabsol_core\.(?:prg|fpw|fxp|bak)/gi, "data processing routine");
  text = text.replace(/mabsolcrm\.exe/gi, "data service");
  text = text.replace(/vfp9[a-z0-9]*\.dll/gi, "database driver");
  text = text.replace(/\bvfp9?\b/gi, "database engine");
  text = text.replace(/\bfoxpro\b/gi, "database engine");
  text = text.replace(/\b[a-zA-Z0-9_-]+\.fll\b/gi, "security library");
  text = text.replace(/\b[a-zA-Z0-9_-]+\.prg\b/gi, "processing task");
  text = text.replace(/\b[a-zA-Z0-9_-]+\.fpw\b/gi, "system config");
  text = text.replace(/\b[a-zA-Z0-9_-]+\.fxp\b/gi, "compiled routine");
  text = text.replace(/\.prg\b/gi, " routine");
  text = text.replace(/\.fll\b/gi, " module");
  text = text.replace(/\.fpw\b/gi, " config");
  text = text.replace(/\.fxp\b/gi, " binary");

  return text;
}

// ---------------------------------------------------------------------------
// UI Helpers
// ---------------------------------------------------------------------------
function appendLog(timestamp, level, message) {
  const cleanMessage = sanitizeMessage(message);
  const entry = document.createElement("div");
  entry.className = `log-entry ${level}`;
  entry.innerHTML = `<span class="time">[${timestamp}]</span> ${escapeHtml(cleanMessage)}`;
  terminalBody.appendChild(entry);
  terminalBody.scrollTop = terminalBody.scrollHeight;
}

function appendLogEntry(level, message) {
  const timestamp = new Date().toLocaleTimeString();
  appendLog(timestamp, level, message);
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
    statLastStatus.textContent = "Offline (Saved Locally)";
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
