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
const authCardBox = document.getElementById("authCardBox");
const authSubtitle = document.getElementById("authSubtitle");
const authTabs = document.getElementById("authTabs");
const tabSignIn = document.getElementById("tabSignIn");
const tabSignUp = document.getElementById("tabSignUp");
const signupStep = document.getElementById("signupStep");
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
const operatorNameInput = document.getElementById("operatorNameInput");
const operatorEmailInput = document.getElementById("operatorEmailInput");
const operatorStatusBadge = document.getElementById("operatorStatusBadge");
const termsConsentCheckbox = document.getElementById("termsConsentCheckbox");
const termsNoticeWarning = document.getElementById("termsNoticeWarning");
const companyNameInput = document.getElementById("companyNameInput");
const crmCompanyCodeInput = document.getElementById("crmCompanyCodeInput");
const companyCodeInput = document.getElementById("companyCodeInput");
const sourceDirInput = document.getElementById("sourceDirInput");
const sourceDirStatusBadge = document.getElementById("sourceDirStatusBadge");
const destDirInput = document.getElementById("destDirInput");
const licenseKeyInput = document.getElementById("licenseKeyInput");
const productKeyInput = document.getElementById("productKeyInput");
const btnVerifyLicenseKeyManual = document.getElementById("btnVerifyLicenseKeyManual");
const licenseVerifiedBadge = document.getElementById("licenseVerifiedBadge");
const btnChangeLicenseKey = document.getElementById("btnChangeLicenseKey");
const licenseCountdownBadge = document.getElementById("licenseCountdownBadge");
const licenseCountdownText = document.getElementById("licenseCountdownText");
const licenseCountdownDetail = document.getElementById("licenseCountdownDetail");
const licenseExpiryNotice = document.getElementById("licenseExpiryNotice");
let isMachineLocallyAuthorized = false;
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

// DOM Elements - Branch & Multi-Company Selector
const branchSelectDropdown = document.getElementById("branchSelectDropdown");
const btnRefreshBranches = document.getElementById("btnRefreshBranches");
const btnAddBranchProfile = document.getElementById("btnAddBranchProfile");
const branchBadgeStatus = document.getElementById("branchBadgeStatus");
const syncAllBranchesBtn = document.getElementById("syncAllBranchesBtn");
let currentBranchProfiles = [];

// DOM Elements - Action & Stats & Terminal
const syncNowBtn = document.getElementById("syncNowBtn");
const statTablesCount = document.getElementById("statTablesCount");
const statQueuedCount = document.getElementById("statQueuedCount");
const statLastStatus = document.getElementById("statLastStatus");
const terminalBody = document.getElementById("terminalBody");
const clearLogBtn = document.getElementById("clearLogBtn");

let currentAuthEmail = "";

// ---------------------------------------------------------------------------
// Global Utilities: HTML Escaping & Toast Notifications
// ---------------------------------------------------------------------------
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const item = document.createElement("div");
  item.className = `toast-item toast-${type}`;
  const icon = type === "success" ? "✓" : type === "error" ? "✕" : type === "warning" ? "⚠️" : "ℹ️";
  item.innerHTML = `<span style="font-size:14px; font-weight:bold;">${icon}</span><span>${escapeHtml(String(message || ""))}</span>`;
  container.appendChild(item);
  setTimeout(() => {
    item.style.opacity = "0";
    item.style.transform = "translateX(20px)";
    item.style.transition = "all 0.3s ease";
    setTimeout(() => item.remove(), 300);
  }, 4500);
}
window.escapeHtml = escapeHtml;
window.showToast = showToast;

function updateTermsState(isAgreed) {
  if (syncNowBtn) {
    if (isAgreed) {
      syncNowBtn.classList.remove("terms-disabled");
    } else {
      syncNowBtn.classList.add("terms-disabled");
    }
  }
  if (saveConfigBtn) {
    if (isAgreed) {
      saveConfigBtn.classList.remove("terms-disabled");
    } else {
      saveConfigBtn.classList.add("terms-disabled");
    }
  }
  if (termsNoticeWarning && isAgreed) {
    termsNoticeWarning.classList.add("hidden");
  }
  const box = document.querySelector(".terms-consent-box");
  if (box && isAgreed) {
    box.classList.remove("has-warning");
  }
}
window.updateTermsState = updateTermsState;

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
      if (sessionRes?.isExeChanged) {
        if (sessionRes.email) emailInput.value = sessionRes.email;
        loginError.textContent = "New desktop agent executable detected. Please sign in and verify your account.";
        loginError.classList.remove("hidden");
        // Clear prefilled fields so newly downloaded/installed EXE starts completely clean
        if (operatorNameInput) operatorNameInput.value = "";
        if (companyNameInput) companyNameInput.value = "";
        if (companyCodeInput) companyCodeInput.value = "";
        if (sourceDirInput) sourceDirInput.value = "";
        if (licenseKeyInput) licenseKeyInput.value = "";
        if (productKeyInput) productKeyInput.value = "";
      } else if (sessionRes?.accountSuspended) {
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
  signupStep?.classList.add("hidden");
  authCardBox?.classList.remove("expanded-signup-mode");
  if (authSubtitle) authSubtitle.textContent = "Desktop Data Synchronization Agent";
}

async function showDashboard(session) {
  authView.classList.add("hidden");
  dashboardView.classList.remove("hidden");

  // Populate user pill and top operator fields
  const userName = session.user?.name || session.email || "Operator";
  navUserName.textContent = userName;
  navUserInitial.textContent = userName.charAt(0).toUpperCase();
  currentAuthEmail = session.email || "";

  if (operatorNameInput && (!operatorNameInput.value || operatorNameInput.value === "Operator")) {
    operatorNameInput.value = userName;
  }
  if (operatorEmailInput && !operatorEmailInput.value) {
    operatorEmailInput.value = currentAuthEmail;
  }

  // Load configuration
  await loadAndDisplayConfig();

  // Load sync status
  try {
    const status = await window.electronAPI.getSyncStatus();
    updateStatusDisplay(status);
  } catch { }

  // Multi-device license check & prompt
  try {
    await checkAndPromptDeviceLicense(session?.email || currentAuthEmail);
  } catch { }
}

async function loadAndDisplayConfig() {
  try {
    const cfg = await window.electronAPI.getConfig();
    if (cfg) {
      if (cfg.cloudUrl) cloudUrlInput.value = cfg.cloudUrl;
      let compNameFromUser = "";
      try {
        const sessionRes = await window.electronAPI.checkSession();
        compNameFromUser = sessionRes?.session?.user?.companyName || sessionRes?.session?.user?.companyId?.companyName || "";
      } catch {}
      const isPlaceholderComp = (val) => {
        if (!val) return true;
        const s = String(val).trim().toLowerCase();
        return s === "your organization" || s === "organization" || s === "default" || s === "test";
      };

      if (cfg.companyName && !isPlaceholderComp(cfg.companyName)) {
        companyNameInput.value = cfg.companyName;
      } else if (compNameFromUser && !isPlaceholderComp(compNameFromUser)) {
        companyNameInput.value = compNameFromUser;
      } else {
        companyNameInput.value = "";
      }
      if (crmCompanyCodeInput) {
        crmCompanyCodeInput.value = cfg.selectedCompanyCode || "";
      }
      if (cfg.companyCode && !isPlaceholderComp(cfg.companyCode)) {
        companyCodeInput.value = (cfg.companyCode || "").toUpperCase();
      } else {
        companyCodeInput.value = "";
      }
      sourceDirInput.value = cfg.sourceDir || "";
      destDirInput.value = cfg.destDir || "";
      licenseKeyInput.value = cfg.licenseKey || "";
      if (cfg.operatorName && operatorNameInput) {
        operatorNameInput.value = cfg.operatorName;
      }
      if (cfg.userEmail && operatorEmailInput) {
        operatorEmailInput.value = cfg.userEmail;
      }
      if (productKeyInput) {
        productKeyInput.value = cfg.productKey || "";
      }
      if (termsConsentCheckbox) {
        const isTermsAccepted = cfg.termsAccepted !== undefined ? Boolean(cfg.termsAccepted) : false;
        termsConsentCheckbox.checked = isTermsAccepted;
        updateTermsState(isTermsAccepted);
      }
      const isAutoSyncOn = cfg.autoSync !== false && String(cfg.intervalMins) !== "0";
      if (autoSyncCheckbox) {
        autoSyncCheckbox.checked = isAutoSyncOn;
        if (autoSyncLabelText) autoSyncLabelText.textContent = isAutoSyncOn ? "Auto-Sync ON" : "Auto-Sync OFF";
      }
      intervalSelect.value = String(cfg.intervalMins !== undefined ? cfg.intervalMins : "realtime");
      if (syncTargetSelect) syncTargetSelect.value = cfg.syncTarget || "mabsolcrm";

      // If source folder is not yet configured OR does not exist on this computer, leave form unlocked
      const isFolderValid = cfg.isSourceDirValid !== undefined ? cfg.isSourceDirValid : Boolean(cfg.sourceDir && cfg.sourceDir.trim());
      if (!cfg.sourceDir || !cfg.sourceDir.trim() || !isFolderValid) {
        setFormLocked(false);
      } else {
        setFormLocked(true);
      }

      // Check and display live folder validation status
      if (cfg.sourceDir) {
        updateFolderValidation(cfg.sourceDir, cfg.companyCode);
      } else if (sourceDirStatusBadge) {
        sourceDirStatusBadge.className = "source-dir-status-badge warning";
        sourceDirStatusBadge.innerHTML = "<span>⚠️</span> <span>Please click Browse to select your ERP Data folder on this computer.</span>";
        sourceDirStatusBadge.classList.remove("hidden");
      }

      // Fetch active license validity & start live countdown timer
      fetchAndShowLicenseDetails();
      updateSyncButtonRequirementState();
      loadBranches();
    }
  } catch (err) {
    console.error("Failed to load config:", err);
  }
}

// ---------------------------------------------------------------------------
// Multi-Branch & Multi-Company Profile Operations
// ---------------------------------------------------------------------------
async function loadBranches(forceRefresh = false) {
  if (!window.electronAPI?.fetchBranches) return;
  try {
    if (btnRefreshBranches) btnRefreshBranches.disabled = true;
    const cfg = await window.electronAPI.getConfig();
    const sessionRes = await window.electronAPI.checkSession().catch(() => null);
    const email = cfg?.userEmail || sessionRes?.session?.user?.email || currentAuthEmail;
    const token = sessionRes?.session?.token || "";

    const res = await window.electronAPI.fetchBranches({ email, token, cloudUrl: cfg?.cloudUrl });
    if (res && res.success && Array.isArray(res.branches)) {
      currentBranchProfiles = res.branches;
      renderBranchDropdown(res.branches, res.selectedCompanyCode || cfg?.selectedCompanyCode || cfg?.companyCode);
    }
  } catch (err) {
    console.error("Failed to load branches:", err);
  } finally {
    if (btnRefreshBranches) btnRefreshBranches.disabled = false;
  }
}

function renderBranchDropdown(branches, selectedCode) {
  if (!branchSelectDropdown) return;
  branchSelectDropdown.innerHTML = "";

  if (!branches || branches.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "-- Click 'Fetch Branches' to load companies --";
    branchSelectDropdown.appendChild(opt);
    if (branchBadgeStatus) {
      branchBadgeStatus.textContent = "Unconfigured";
      branchBadgeStatus.style.borderColor = "rgba(148, 163, 184, 0.3)";
      branchBadgeStatus.style.color = "#94a3b8";
    }
    return;
  }

  let matched = false;
  branches.forEach(b => {
    const opt = document.createElement("option");
    const crmCode = b.crmCompanyCode || b.companyCode || "";
    opt.value = crmCode;
    const isSelected = selectedCode && crmCode.toUpperCase() === selectedCode.toUpperCase();
    if (isSelected) matched = true;
    opt.selected = isSelected;
    const folderHint = b.sourceDir ? "📁 Linked" : "⚠️ No folder";
    const decCode = b.decryptCode || (b.companyCode !== crmCode ? b.companyCode : "");
    const decHint = decCode ? decCode : "";
    opt.textContent = `${b.companyName || crmCode} [${crmCode}]${decHint} (${folderHint})`;
    branchSelectDropdown.appendChild(opt);
  });

  if (!matched && branches.length > 0) {
    branchSelectDropdown.selectedIndex = 0;
  }

  const activeVal = branchSelectDropdown.value || "";
  const active = branches.find(b => (b.crmCompanyCode || b.companyCode || "").toUpperCase() === activeVal.toUpperCase());
  if (branchBadgeStatus) {
    if (active?.sourceDir) {
      branchBadgeStatus.textContent = "Folder Linked ✓";
      branchBadgeStatus.style.borderColor = "rgba(34, 197, 94, 0.4)";
      branchBadgeStatus.style.color = "#4ade80";
    } else {
      branchBadgeStatus.textContent = "Needs Folder";
      branchBadgeStatus.style.borderColor = "rgba(245, 158, 11, 0.4)";
      branchBadgeStatus.style.color = "#fbbf24";
    }
  }
}

async function handleBranchChange(newCode) {
  if (!newCode || !window.electronAPI?.switchBranchProfile) return;
  try {
    const res = await window.electronAPI.switchBranchProfile(newCode);
    if (res && res.success && res.profile) {
      const p = res.profile;
      if (companyNameInput) companyNameInput.value = p.companyName || "";
      if (crmCompanyCodeInput) crmCompanyCodeInput.value = p.crmCompanyCode || p.companyCode || "";
      const extractVal = p.decryptCode || p.extractCode || (p.companyCode !== (p.crmCompanyCode || "") ? p.companyCode : "");
      if (companyCodeInput) companyCodeInput.value = extractVal || "";
      if (sourceDirInput) sourceDirInput.value = p.sourceDir || "";

      if (p.sourceDir) {
        updateFolderValidation(p.sourceDir, p.companyCode);
        setFormLocked(true);
      } else {
        if (sourceDirStatusBadge) {
          sourceDirStatusBadge.className = "source-dir-status-badge warning";
          sourceDirStatusBadge.innerHTML = "<span>⚠️</span> <span>Please click Browse to select this branch's ERP Data folder.</span>";
          sourceDirStatusBadge.classList.remove("hidden");
        }
        setFormLocked(false);
      }
      if (branchBadgeStatus) {
        if (p.sourceDir) {
          branchBadgeStatus.textContent = "Folder Linked ✓";
          branchBadgeStatus.style.borderColor = "rgba(34, 197, 94, 0.4)";
          branchBadgeStatus.style.color = "#4ade80";
        } else {
          branchBadgeStatus.textContent = "Needs Folder";
          branchBadgeStatus.style.borderColor = "rgba(245, 158, 11, 0.4)";
          branchBadgeStatus.style.color = "#fbbf24";
        }
      }
      updateSyncButtonRequirementState();
      showToast(`Switched active branch to ${p.companyName || p.companyCode}`, "info");
    }
  } catch (err) {
    console.error("Failed to switch branch:", err);
    showToast(`Error switching branch: ${err.message}`, "error");
  }
}

async function handleAddNewBranchProfile() {
  const code = prompt("Enter new Branch Company Code (e.g. B02 or A02):");
  if (!code || !code.trim()) return;
  const cleanCode = code.trim().toUpperCase();
  const name = prompt(`Enter Branch Company Name for [${cleanCode}]:`, `Branch ${cleanCode}`);
  if (name === null) return;

  try {
    const res = await window.electronAPI.saveBranchProfile({
      companyCode: cleanCode,
      companyName: (name || cleanCode).trim(),
      sourceDir: ""
    });
    if (res && res.success) {
      showToast(`Branch profile [${cleanCode}] created. Please select its ERP data folder.`, "success");
      await loadBranches();
      if (branchSelectDropdown) {
        branchSelectDropdown.value = cleanCode;
        await handleBranchChange(cleanCode);
      }
      setFormLocked(false);
      if (browseSourceBtn) browseSourceBtn.focus();
    }
  } catch (err) {
    showToast(`Failed to add branch: ${err.message}`, "error");
  }
}

let folderValidateTimer = null;
async function updateFolderValidation(folderPath, companyCode) {
  if (!sourceDirStatusBadge || !window.electronAPI?.validateFolder) return;
  const path = (folderPath || "").trim();
  if (!path) {
    sourceDirStatusBadge.className = "source-dir-status-badge warning";
    sourceDirStatusBadge.innerHTML = "<span>⚠️</span> <span>Please click Browse to select your ERP Data folder on this computer.</span>";
    sourceDirStatusBadge.classList.remove("hidden");
    return;
  }

  try {
    const res = await window.electronAPI.validateFolder(path, companyCode || (companyCodeInput ? companyCodeInput.value.trim() : ""));
    if (!res) return;
    sourceDirStatusBadge.classList.remove("hidden");
    if (res.valid) {
      if (res.matchingFiles > 0) {
        sourceDirStatusBadge.className = "source-dir-status-badge valid";
        sourceDirStatusBadge.innerHTML = `<span>✓</span> <span>${res.message}</span>`;
      } else if (res.dbfFiles > 0) {
        sourceDirStatusBadge.className = "source-dir-status-badge valid";
        sourceDirStatusBadge.innerHTML = `<span>✓</span> <span>${res.message}</span>`;
      } else {
        const codeDisplay = (companyCode || (companyCodeInput ? companyCodeInput.value : "")).trim().toUpperCase();
        sourceDirStatusBadge.className = "source-dir-status-badge warning";
        sourceDirStatusBadge.innerHTML = `<span>⚠️</span> <span>${res.message} — No matching files found for Company Code [${codeDisplay || "N/A"}]</span>`;
      }
    } else {
      sourceDirStatusBadge.className = "source-dir-status-badge invalid";
      sourceDirStatusBadge.innerHTML = `<span>❌</span> <span>${res.message}</span>`;
    }
  } catch (err) {
    sourceDirStatusBadge.className = "source-dir-status-badge invalid";
    sourceDirStatusBadge.innerHTML = `<span>❌</span> <span>Error checking path: ${err.message}</span>`;
    sourceDirStatusBadge.classList.remove("hidden");
  }
}

function isPlaceholderComp(val) {
  if (!val) return true;
  const s = String(val).trim().toLowerCase();
  return s === "your organization" || s === "organization" || s === "default" || s === "test";
}

function updateLicenseStatusUI(isVerified, expiresAt) {
  const verifiedBadge = document.getElementById("licenseVerifiedBadge");
  const pinBtn = document.getElementById("btnGeneratePinAgent");
  const newKeyBtn = document.getElementById("btnGenerateNewLicenseKey");
  const verifyBtn = document.getElementById("btnVerifyLicenseKeyManual");
  const changeBtn = document.getElementById("btnChangeLicenseKey");
  const countdownBadge = document.getElementById("licenseCountdownBadge");

  const keyVal = (licenseKeyInput?.value || "").trim();
  const hasKey = Boolean(keyVal);
  const isExpired = countdownBadge?.classList.contains("expired");

  const isActuallyVerified = Boolean(isVerified && hasKey && !isExpired);

  if (isActuallyVerified) {
    if (verifiedBadge) verifiedBadge.classList.remove("hidden");
    if (pinBtn) pinBtn.classList.add("hidden");
    if (newKeyBtn) newKeyBtn.classList.add("hidden");
    if (verifyBtn) verifyBtn.classList.add("hidden");

    // Only show Change Key button if the form is currently in edit mode (unlocked)
    const isEditMode = editConfigBtn && editConfigBtn.classList.contains("hidden");
    if (changeBtn) {
      if (isEditMode) {
        changeBtn.classList.remove("hidden");
      } else {
        changeBtn.classList.add("hidden");
      }
    }
  } else {
    if (verifiedBadge) verifiedBadge.classList.add("hidden");
    if (pinBtn) pinBtn.classList.remove("hidden");
    if (newKeyBtn) newKeyBtn.classList.remove("hidden");
    if (verifyBtn) verifyBtn.classList.remove("hidden");
    if (changeBtn) changeBtn.classList.add("hidden");
  }
}

function updateSyncButtonRequirementState() {
  if (!syncNowBtn) return;

  const licenseKey = (licenseKeyInput?.value || "").trim();
  const companyCode = (companyCodeInput?.value || "").trim();
  const sourceDir = (sourceDirInput?.value || "").trim();
  const termsAccepted = Boolean(termsConsentCheckbox && termsConsentCheckbox.checked);

  const missingFields = [];
  if (!licenseKey) missingFields.push("License Key");
  if (!companyCode || isPlaceholderComp(companyCode)) missingFields.push("Company Code");
  if (!sourceDir) missingFields.push("Encrypted Data Folder");
  if (!termsAccepted) missingFields.push("Terms & Conditions");

  const allFilled = missingFields.length === 0;

  if (allFilled) {
    syncNowBtn.disabled = false;
    syncNowBtn.classList.remove("terms-disabled", "btn-disabled-requirements");
    syncNowBtn.title = "Extract & Sync Now";
    if (toggleAutoSyncBtn) {
      toggleAutoSyncBtn.classList.remove("terms-disabled", "btn-disabled-requirements");
      toggleAutoSyncBtn.title = "Pause or Resume Automatic Synchronization";
    }
  } else {
    syncNowBtn.disabled = true;
    syncNowBtn.classList.add("terms-disabled", "btn-disabled-requirements");
    syncNowBtn.title = `Sync disabled: Please fill all required fields (${missingFields.join(", ")})`;
    if (toggleAutoSyncBtn) {
      toggleAutoSyncBtn.classList.add("terms-disabled", "btn-disabled-requirements");
      toggleAutoSyncBtn.title = `Sync disabled: Please fill all required fields (${missingFields.join(", ")})`;
    }
  }

  if (syncAllBranchesBtn) {
    if (licenseKey && termsAccepted) {
      syncAllBranchesBtn.disabled = false;
      syncAllBranchesBtn.classList.remove("terms-disabled", "btn-disabled-requirements");
      syncAllBranchesBtn.title = "Sync all configured branch folders sequentially";
    } else {
      syncAllBranchesBtn.disabled = true;
      syncAllBranchesBtn.classList.add("terms-disabled", "btn-disabled-requirements");
      syncAllBranchesBtn.title = "Batch sync disabled: Please verify License Key and accept Terms";
    }
  }
}
window.updateSyncButtonRequirementState = updateSyncButtonRequirementState;

let licenseCountdownInterval = null;

function updateLicenseCountdown(expiresAtStr) {
  if (licenseCountdownInterval) {
    clearInterval(licenseCountdownInterval);
    licenseCountdownInterval = null;
  }

  if (!expiresAtStr) {
    if (licenseCountdownBadge) licenseCountdownBadge.classList.add("hidden");
    if (licenseCountdownDetail) licenseCountdownDetail.classList.add("hidden");
    updateLicenseStatusUI(false, null);
    updateSyncButtonRequirementState();
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
      updateLicenseStatusUI(false, null);
      updateSyncButtonRequirementState();
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

    updateLicenseStatusUI(true, expiresAtStr);
  }

  tick();
  licenseCountdownInterval = setInterval(tick, 1000);
}

async function fetchAndShowLicenseDetails() {
  try {
    if (!window.electronAPI?.getLicenseDetails) return;
    const res = await window.electronAPI.getLicenseDetails();
    if (res && res.success) {
      // Auto-fill company information & license key from cloud server if not yet populated
      if (res.license) {
        licenseKeyInput.value = res.license;
      }
      if (res.companyName && !isPlaceholderComp(res.companyName) && (!companyNameInput.value || isPlaceholderComp(companyNameInput.value))) {
        companyNameInput.value = res.companyName;
      }
      if (res.companyCode && !isPlaceholderComp(res.companyCode) && (!companyCodeInput.value || isPlaceholderComp(companyCodeInput.value))) {
        companyCodeInput.value = res.companyCode.toUpperCase();
        if (sourceDirInput.value) {
          updateFolderValidation(sourceDirInput.value, res.companyCode);
        }
      }
      if (res.licenseExpiresAt && res.license && !res.isExpired) {
        updateLicenseCountdown(res.licenseExpiresAt);
        updateLicenseStatusUI(true, res.licenseExpiresAt);
      } else {
        updateLicenseCountdown(null);
        updateLicenseStatusUI(false, null);
      }
      if (res.license && !isMachineLocallyAuthorized) {
        checkAndPromptDeviceLicense(currentAuthEmail, res.license);
      }
    } else {
      updateLicenseCountdown(null);
      updateLicenseStatusUI(false, null);
    }
  } catch (err) {
    console.error("Failed to query license details:", err);
  } finally {
    updateSyncButtonRequirementState();
  }
}

function setFormLocked(isLocked) {
  if (operatorNameInput) {
    operatorNameInput.disabled = isLocked;
    operatorNameInput.readOnly = isLocked;
  }
  if (operatorEmailInput) {
    operatorEmailInput.disabled = isLocked;
    operatorEmailInput.readOnly = isLocked;
  }
  companyNameInput.disabled = isLocked;
  companyNameInput.readOnly = isLocked;
  if (crmCompanyCodeInput) {
    crmCompanyCodeInput.disabled = true;
    crmCompanyCodeInput.readOnly = true;
  }
  companyCodeInput.disabled = isLocked;
  companyCodeInput.readOnly = isLocked;
  sourceDirInput.disabled = isLocked;
  sourceDirInput.readOnly = isLocked;
  licenseKeyInput.disabled = isLocked;
  licenseKeyInput.readOnly = isLocked;
  if (productKeyInput) {
    productKeyInput.disabled = isLocked;
    productKeyInput.readOnly = isLocked;
  }
  if (autoSyncCheckbox) autoSyncCheckbox.disabled = isLocked;
  intervalSelect.disabled = isLocked || (autoSyncCheckbox && !autoSyncCheckbox.checked);
  browseSourceBtn.disabled = isLocked;
  if (syncTargetSelect) syncTargetSelect.disabled = isLocked;

  // License key is masked when locked, folder path is always readable text
  if (isLocked) {
    sourceDirInput.type = "text";
    licenseKeyInput.type = "password";
    editConfigBtn.classList.remove("hidden");
    saveConfigBtn.classList.add("hidden");
    cancelEditBtn.classList.add("hidden");
    if (btnChangeLicenseKey) btnChangeLicenseKey.classList.add("hidden");
  } else {
    sourceDirInput.type = "text";
    licenseKeyInput.type = "text";
    saveConfigBtn.disabled = false;
    setButtonLoading(saveConfigBtn, false);
    editConfigBtn.classList.add("hidden");
    saveConfigBtn.classList.remove("hidden");
    cancelEditBtn.classList.remove("hidden");
    // If license key is verified in edit mode, show Change Key button
    const hasKey = Boolean(licenseKeyInput && licenseKeyInput.value.trim());
    if (hasKey && licenseVerifiedBadge && !licenseVerifiedBadge.classList.contains("hidden")) {
      if (btnChangeLicenseKey) btnChangeLicenseKey.classList.remove("hidden");
    }
  }
  updateSyncButtonRequirementState();
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

  // ---------------------------------------------------------------------------
  // Clean Onboarding & Multi-Branch Signup Wizard (Identical to Website)
  // ---------------------------------------------------------------------------

  // Wizard State
  const signupWizardState = {
    currentStep: 1, // 1: HO & Account, 2: Branch Details (if branches > 0), 3: Review & Launch
    branchCount: 0,
    isPrimaryGstVerified: false,
    isVerifyingPrimaryGst: false,
    mobileVerified: false,
    mobileOtpSent: false,
    mobileSending: false,
    mobileVerifying: false,
    mobileCountdown: 0,
    mobileOtpCode: "",
    emailVerified: false,
    emailOtpSent: false,
    emailSending: false,
    emailVerifying: false,
    emailCountdown: 0,
    emailOtpCode: "",
    additionalBranches: [],
    activeBranchIndex: 0,
    termsAccepted: false
  };

  // Helper: Bind 6-digit square OTP grid
  function setupSquareOtpGrid(gridEl, onCodeChange) {
    if (!gridEl) return null;
    const inputs = Array.from(gridEl.querySelectorAll(".otp-square-input"));
    const getCode = () => inputs.map((inp) => inp.value).join("");

    inputs.forEach((inp, idx) => {
      inp.addEventListener("input", () => {
        const val = inp.value.replace(/\D/g, "");
        inp.value = val ? val.slice(-1) : "";
        if (inp.value) {
          inp.classList.add("filled");
          if (idx < inputs.length - 1) inputs[idx + 1].focus();
        } else {
          inp.classList.remove("filled");
        }
        const full = getCode();
        if (onCodeChange) onCodeChange(full);
      });

      inp.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !inp.value && idx > 0) {
          inputs[idx - 1].focus();
        } else if (e.key === "ArrowLeft" && idx > 0) {
          inputs[idx - 1].focus();
        } else if (e.key === "ArrowRight" && idx < inputs.length - 1) {
          inputs[idx + 1].focus();
        }
      });

      inp.addEventListener("paste", (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 6);
        if (!pasted) return;
        for (let i = 0; i < inputs.length; i++) {
          inputs[i].value = pasted[i] || "";
          if (inputs[i].value) inputs[i].classList.add("filled");
          else inputs[i].classList.remove("filled");
        }
        const targetIdx = Math.min(inputs.length - 1, pasted.length - 1);
        if (targetIdx >= 0) inputs[targetIdx].focus();
        const full = getCode();
        if (onCodeChange) onCodeChange(full);
      });
    });

    return {
      getCode,
      clear: () => {
        inputs.forEach((inp) => {
          inp.value = "";
          inp.classList.remove("filled");
        });
        if (onCodeChange) onCodeChange("");
      },
      focusFirst: () => {
        if (inputs[0]) inputs[0].focus();
      }
    };
  }

  // 60-Second Countdown Timer Loop
  let signupCountdownTimer = null;
  function startSignupCountdownTimer() {
    if (signupCountdownTimer) return;
    signupCountdownTimer = setInterval(() => {
      let anyActive = false;
      const sendEmailBtn = document.getElementById("regSendEmailOtpBtn");

      if (signupWizardState.emailCountdown > 0) {
        signupWizardState.emailCountdown--;
        anyActive = true;
        if (sendEmailBtn && !signupWizardState.emailVerified) {
          if (signupWizardState.emailCountdown > 0) {
            sendEmailBtn.textContent = `Resend in ${signupWizardState.emailCountdown}s`;
            sendEmailBtn.disabled = true;
          } else {
            sendEmailBtn.textContent = "Resend OTP";
            sendEmailBtn.disabled = false;
          }
        }
      }

      signupWizardState.additionalBranches.forEach((br, bIdx) => {
        if (br.emailCountdown > 0) {
          br.emailCountdown--;
          anyActive = true;
          if (bIdx === signupWizardState.activeBranchIndex) {
            const brBtn = document.getElementById(`brSendEmailOtpBtn_${bIdx}`);
            if (brBtn && !br.emailVerified) {
              if (br.emailCountdown > 0) {
                brBtn.textContent = `Resend in ${br.emailCountdown}s`;
                brBtn.disabled = true;
              } else {
                brBtn.textContent = "Resend OTP";
                brBtn.disabled = false;
              }
            }
          }
        }
      });

      if (!anyActive) {
        clearInterval(signupCountdownTimer);
        signupCountdownTimer = null;
      }
    }, 1000);
  }

  // DOM Elements - Registration Inputs
  const regCompanyName = document.getElementById("regCompanyName");
  const regBranchCount = document.getElementById("regBranchCount");
  const regFullName = document.getElementById("regFullName");
  const regGstNo = document.getElementById("regGstNo");
  const regVerifyGstBtn = document.getElementById("regVerifyGstBtn");
  const regGstStatusPill = document.getElementById("regGstStatusPill");
  const regAddress = document.getElementById("regAddress");
  const regState = document.getElementById("regState");
  const regCity = document.getElementById("regCity");
  const regPincode = document.getElementById("regPincode");
  const regMobile = document.getElementById("regMobile");
  const regEmail = document.getElementById("regEmail");
  const regSendEmailOtpBtn = document.getElementById("regSendEmailOtpBtn");
  const regEmailVerifiedBadge = document.getElementById("regEmailVerifiedBadge");
  const regEmailOtpBox = document.getElementById("regEmailOtpBox");
  const regEmailOtpTarget = document.getElementById("regEmailOtpTarget");
  const regEmailSquareGrid = document.getElementById("regEmailSquareGrid");
  const regConfirmEmailOtpBtn = document.getElementById("regConfirmEmailOtpBtn");
  const regPassword = document.getElementById("regPassword");
  const regConfirmPassword = document.getElementById("regConfirmPassword");
  const regTogglePwBtn = document.getElementById("regTogglePwBtn");
  const regToggleConfirmPwBtn = document.getElementById("regToggleConfirmPwBtn");
  const regDrugLicense = document.getElementById("regDrugLicense");

  const signupSubstep1 = document.getElementById("signupSubstep1");
  const signupSubstep2 = document.getElementById("signupSubstep2");
  const signupSubstep3 = document.getElementById("signupSubstep3");
  const signupErrorBanner = document.getElementById("signupErrorBanner");

  const stepTrackBtn1 = document.getElementById("stepTrackBtn1");
  const stepTrackBtn2 = document.getElementById("stepTrackBtn2");
  const stepTrackBtn3 = document.getElementById("stepTrackBtn3");
  const stepTrackLine1 = document.getElementById("stepTrackLine1");
  const stepTrackLine2 = document.getElementById("stepTrackLine2");
  const stepTrackNum3 = document.getElementById("stepTrackNum3");

  const regPrevStepBtn = document.getElementById("regPrevStepBtn");
  const regNextStepBtn = document.getElementById("regNextStepBtn");
  const regCompleteBtn = document.getElementById("regCompleteBtn");

  const branchNavTabs = document.getElementById("branchNavTabs");
  const activeBranchCard = document.getElementById("activeBranchCard");

  // Review Elements
  const revCompanyName = document.getElementById("revCompanyName");
  const revGstNo = document.getElementById("revGstNo");
  const revAddress = document.getElementById("revAddress");
  const revDrugLicenseRow = document.getElementById("revDrugLicenseRow");
  const revDrugLicense = document.getElementById("revDrugLicense");
  const revBranchCount = document.getElementById("revBranchCount");
  const revBranchListBox = document.getElementById("revBranchListBox");
  const revBranchItems = document.getElementById("revBranchItems");
  const revAdminName = document.getElementById("revAdminName");
  const revEmail = document.getElementById("revEmail");
  const revMobile = document.getElementById("revMobile");
  const regTermsAccepted = document.getElementById("regTermsAccepted");

  // Wire Square OTP Grid for Step 1 Email
  const emailOtpGridHelper = setupSquareOtpGrid(regEmailSquareGrid, (code) => {
    signupWizardState.emailOtpCode = code;
    if (regConfirmEmailOtpBtn) {
      regConfirmEmailOtpBtn.disabled = code.length !== 6;
    }
  });

  // Switch between Sign In and Sign Up tabs
  const switchToSignIn = () => {
    authCardBox?.classList.remove("expanded-signup-mode");
    if (authSubtitle) authSubtitle.textContent = "Desktop Data Synchronization Agent";
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
    authCardBox?.classList.add("expanded-signup-mode");
    if (authSubtitle) authSubtitle.textContent = "Workspace Onboarding & Account Registration";
    tabSignUp?.classList.add("active");
    tabSignIn?.classList.remove("active");
    signupStep?.classList.remove("hidden");
    loginStep?.classList.add("hidden");
    pendingApprovalStep?.classList.add("hidden");
    otpStep?.classList.add("hidden");
    if (signupErrorBanner) signupErrorBanner.classList.add("hidden");
    authTabs?.classList.remove("hidden");
    renderSignupStep(1);
  };

  const showPendingApprovalView = (data) => {
    authCardBox?.classList.remove("expanded-signup-mode");
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

  // Password Visibility Toggles
  regTogglePwBtn?.addEventListener("click", () => {
    if (!regPassword) return;
    regPassword.type = regPassword.type === "password" ? "text" : "password";
  });
  regToggleConfirmPwBtn?.addEventListener("click", () => {
    if (!regConfirmPassword) return;
    regConfirmPassword.type = regConfirmPassword.type === "password" ? "text" : "password";
  });

  // Password Validation Rules & Live Indicator
  function validatePasswordRule(pw) {
    if (!pw) return "Password is required.";
    if (pw.length < 8) return "Password must be at least 8 characters long.";
    if (pw.length > 50) return "Password cannot exceed 50 characters.";
    if (!/[a-zA-Z]/.test(pw)) return "Password must contain at least one letter (a-z, A-Z).";
    if (!/[0-9]/.test(pw)) return "Password must contain at least one number (0-9).";
    return null;
  }

  function updateCriteriaPill(id, met, label) {
    const el = document.getElementById(id);
    if (!el) return;
    if (met) {
      el.classList.add("met");
      el.textContent = `✓ ${label}`;
    } else {
      el.classList.remove("met");
      el.textContent = `✕ ${label}`;
    }
  }

  const regConfirmPwErrorText = document.getElementById("regConfirmPwErrorText");

  regPassword?.addEventListener("input", () => {
    const val = regPassword.value || "";
    updateCriteriaPill("critLength", val.length >= 8, "Min 8 chars");
    updateCriteriaPill("critLetter", /[a-zA-Z]/.test(val), "1 letter");
    updateCriteriaPill("critNumber", /[0-9]/.test(val), "1 number");

    if (regConfirmPassword?.value) {
      if (regPassword.value !== regConfirmPassword.value) {
        if (regConfirmPwErrorText) regConfirmPwErrorText.classList.remove("hidden");
        regConfirmPassword.classList.add("input-has-error");
      } else {
        if (regConfirmPwErrorText) regConfirmPwErrorText.classList.add("hidden");
        regConfirmPassword.classList.remove("input-has-error");
      }
    }
  });

  regConfirmPassword?.addEventListener("input", () => {
    if (regConfirmPassword.value && regPassword && regPassword.value !== regConfirmPassword.value) {
      if (regConfirmPwErrorText) regConfirmPwErrorText.classList.remove("hidden");
      regConfirmPassword.classList.add("input-has-error");
    } else {
      if (regConfirmPwErrorText) regConfirmPwErrorText.classList.add("hidden");
      regConfirmPassword?.classList.remove("input-has-error");
    }
  });

  // GST Verification Handler
  regVerifyGstBtn?.addEventListener("click", async () => {
    const cleanGst = (regGstNo?.value || "").trim().toUpperCase();
    if (!cleanGst || cleanGst.length !== 15) {
      showToast("Please enter a valid 15-character GSTIN", "error");
      return;
    }

    setButtonLoading(regVerifyGstBtn, true);
    signupWizardState.isVerifyingPrimaryGst = true;
    try {
      const cloudUrl = cloudUrlInput.value.trim();
      const res = await window.electronAPI.verifyGst({ cloudUrl, gstin: cleanGst });
      setButtonLoading(regVerifyGstBtn, false);

      if (res && res.success && res.data) {
        const d = res.data;
        signupWizardState.isPrimaryGstVerified = true;
        if (regGstNo) regGstNo.value = d.gstin || cleanGst;
        if (regCompanyName && !regCompanyName.value.trim()) {
          regCompanyName.value = d.businessName || d.legalName || d.tradeName || "";
        }
        if (regAddress && d.address) regAddress.value = d.address;
        if (regCity && d.city) regCity.value = d.city;
        if (regState && (d.state || d.stateName)) regState.value = d.state || d.stateName;
        if (regPincode && d.pincode) regPincode.value = d.pincode;

        const displayName = d.businessName || d.legalName || d.tradeName || cleanGst;
        if (regGstStatusPill) {
          regGstStatusPill.className = "gst-verified-pill";
          regGstStatusPill.textContent = `✓ Verified: ${displayName}`;
          regGstStatusPill.classList.remove("hidden");
        }
        showToast(`GSTIN Verified: ${displayName}`, "success");
      } else {
        signupWizardState.isPrimaryGstVerified = false;
        if (regGstStatusPill) regGstStatusPill.classList.add("hidden");
        showToast(res?.message || "GSTIN verification failed. Please check number.", "error");
      }
    } catch (err) {
      setButtonLoading(regVerifyGstBtn, false);
      signupWizardState.isPrimaryGstVerified = false;
      showToast("Network error verifying GSTIN. Please check connection.", "error");
    }
  });

  // Pincode Blur Auto-Lookup
  regPincode?.addEventListener("blur", async () => {
    const pin = (regPincode.value || "").trim();
    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) return;
    try {
      const cloudUrl = cloudUrlInput.value.trim();
      const res = await window.electronAPI.verifyGst({ cloudUrl, pincode: pin });
      if (res && res.success && res.data) {
        if (regCity && !regCity.value.trim() && res.data.city) regCity.value = res.data.city;
        if (regState && !regState.value.trim() && res.data.state) regState.value = res.data.state;
        showToast(`Postal PIN resolved: ${res.data.city || ""}, ${res.data.state || ""}`, "info");
      }
    } catch {}
  });

  const regMobileErrorText = document.getElementById("regMobileErrorText");
  const regEmailErrorText = document.getElementById("regEmailErrorText");

  // Live Check: Mobile already registered in Step 1
  let mobileCheckDebounce = null;
  regMobile?.addEventListener("input", () => {
    if (regMobileErrorText) regMobileErrorText.classList.add("hidden");
    regMobile?.classList.remove("input-has-error");
    if (mobileCheckDebounce) clearTimeout(mobileCheckDebounce);

    const cleanMobile = (regMobile?.value || "").replace(/\D/g, "");
    if (cleanMobile.length === 10) {
      mobileCheckDebounce = setTimeout(async () => {
        const cloudUrl = cloudUrlInput.value.trim();
        try {
          const checkRes = await window.electronAPI.checkExists({ cloudUrl, mobile: cleanMobile });
          if (checkRes && checkRes.exists) {
            const msg = checkRes.message || "This mobile number is already registered. Please sign in or use another.";
            if (regMobileErrorText) {
              regMobileErrorText.textContent = `❌ ${msg}`;
              regMobileErrorText.classList.remove("hidden");
            }
            regMobile?.classList.add("input-has-error");
            showToast(msg, "error");
          }
        } catch {}
      }, 350);
    }
  });

  // Live Check: Email already registered in Step 1
  let emailCheckDebounce = null;
  regEmail?.addEventListener("input", () => {
    if (regEmailErrorText) regEmailErrorText.classList.add("hidden");
    regEmail?.classList.remove("input-has-error");
    if (emailCheckDebounce) clearTimeout(emailCheckDebounce);

    const cleanEmail = (regEmail?.value || "").trim().toLowerCase();
    if (cleanEmail && cleanEmail.includes("@") && cleanEmail.includes(".")) {
      emailCheckDebounce = setTimeout(async () => {
        const cloudUrl = cloudUrlInput.value.trim();
        try {
          const checkRes = await window.electronAPI.checkExists({ cloudUrl, email: cleanEmail });
          if (checkRes && checkRes.exists) {
            const msg = checkRes.message || "This email address is already registered. Please sign in or use another.";
            if (regEmailErrorText) {
              regEmailErrorText.textContent = `❌ ${msg}`;
              regEmailErrorText.classList.remove("hidden");
            }
            regEmail?.classList.add("input-has-error");
            showToast(msg, "error");
          }
        } catch {}
      }, 350);
    }
  });

  // Send Email OTP
  regSendEmailOtpBtn?.addEventListener("click", async () => {
    if (signupWizardState.emailSending || signupWizardState.emailCountdown > 0) return;
    const cleanEmail = (regEmail?.value || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      const msg = "Please enter a valid work email address";
      if (regEmailErrorText) {
        regEmailErrorText.textContent = `❌ ${msg}`;
        regEmailErrorText.classList.remove("hidden");
      }
      regEmail?.classList.add("input-has-error");
      showToast(msg, "error");
      return;
    }

    setButtonLoading(regSendEmailOtpBtn, true);
    signupWizardState.emailSending = true;
    const cloudUrl = cloudUrlInput.value.trim();

    try {
      // 1. Check if email already exists - DO NOT SEND OTP IF REGISTERED
      const checkRes = await window.electronAPI.checkExists({ cloudUrl, email: cleanEmail });
      if (checkRes && checkRes.exists) {
        setButtonLoading(regSendEmailOtpBtn, false);
        signupWizardState.emailSending = false;
        const msg = checkRes.message || "This email address is already registered in the system. Please sign in or use another email.";
        if (regEmailErrorText) {
          regEmailErrorText.textContent = `❌ ${msg}`;
          regEmailErrorText.classList.remove("hidden");
        }
        regEmail?.classList.add("input-has-error");
        if (signupErrorBanner) {
          signupErrorBanner.textContent = msg;
          signupErrorBanner.classList.remove("hidden");
        }
        showToast(msg, "error");
        return; // Do NOT send OTP
      }

      // 2. Send Email OTP only if email is completely unregistered
      const res = await window.electronAPI.sendEmailOtp({ cloudUrl, email: cleanEmail });
      setButtonLoading(regSendEmailOtpBtn, false);
      signupWizardState.emailSending = false;

      if (res && res.success) {
        signupWizardState.emailOtpSent = true;
        signupWizardState.emailCountdown = 60;
        startSignupCountdownTimer();
        if (regEmailOtpTarget) regEmailOtpTarget.textContent = cleanEmail;
        regEmailOtpBox?.classList.remove("hidden");
        emailOtpGridHelper?.clear();
        emailOtpGridHelper?.focusFirst();
        showToast(`Verification code sent to ${cleanEmail}`, "success");
      } else {
        const msg = res?.message || "Failed to send email verification code.";
        if (regEmailErrorText) {
          regEmailErrorText.textContent = `❌ ${msg}`;
          regEmailErrorText.classList.remove("hidden");
        }
        regEmail?.classList.add("input-has-error");
        showToast(msg, "error");
      }
    } catch (err) {
      setButtonLoading(regSendEmailOtpBtn, false);
      signupWizardState.emailSending = false;
      showToast("Network error sending email verification code.", "error");
    }
  });

  // Confirm Email OTP
  regConfirmEmailOtpBtn?.addEventListener("click", async () => {
    if (signupWizardState.emailVerifying) return;
    const cleanEmail = (regEmail?.value || "").trim().toLowerCase();
    const otp = (signupWizardState.emailOtpCode || "").trim();
    if (!otp || otp.length !== 6) {
      showToast("Please enter the complete 6-digit OTP", "error");
      return;
    }

    setButtonLoading(regConfirmEmailOtpBtn, true);
    signupWizardState.emailVerifying = true;
    try {
      const cloudUrl = cloudUrlInput.value.trim();
      const res = await window.electronAPI.verifyEmailOtp({ cloudUrl, email: cleanEmail, otp });
      setButtonLoading(regConfirmEmailOtpBtn, false);
      signupWizardState.emailVerifying = false;

      if (res && res.success) {
        signupWizardState.emailVerified = true;
        signupWizardState.emailOtpSent = false;
        signupWizardState.emailCountdown = 0;
        regEmailOtpBox?.classList.add("hidden");
        regEmailVerifiedBadge?.classList.remove("hidden");
        if (regEmailErrorText) regEmailErrorText.classList.add("hidden");
        regEmail?.classList.remove("input-has-error");
        if (regEmail) regEmail.disabled = true;
        if (regSendEmailOtpBtn) {
          regSendEmailOtpBtn.textContent = "Verified ✓";
          regSendEmailOtpBtn.disabled = true;
        }
        showToast("Work email verified successfully!", "success");
      } else {
        showToast(res?.message || "Incorrect verification code. Please try again.", "error");
      }
    } catch (err) {
      setButtonLoading(regConfirmEmailOtpBtn, false);
      signupWizardState.emailVerifying = false;
      showToast("Error verifying email OTP. Please try again.", "error");
    }
  });

  // Dynamic Branch Count Adjuster
  regBranchCount?.addEventListener("change", () => {
    const count = parseInt(regBranchCount.value, 10) || 0;
    signupWizardState.branchCount = count;
    adjustBranchCount(count);
  });

  function adjustBranchCount(count) {
    const list = signupWizardState.additionalBranches;
    if (count > list.length) {
      for (let i = list.length; i < count; i++) {
        list.push({
          branchName: "",
          gstNo: "",
          state: "",
          city: "",
          pincode: "",
          address: "",
          mobile: "",
          email: "",
          password: "",
          confirmPassword: "",
          showPassword: false,
          showConfirm: false,
          verified: false,
          emailVerified: false,
          emailOtpSent: false,
          emailOtp: "",
          emailSending: false,
          emailVerifying: false,
          emailCountdown: 0
        });
      }
    } else if (count < list.length) {
      signupWizardState.additionalBranches = list.slice(0, count);
    }
    if (signupWizardState.activeBranchIndex >= count) {
      signupWizardState.activeBranchIndex = Math.max(0, count - 1);
    }
  }

  // Branch Validation Helpers
  function validateBranchEmailField(curIdx, cleanEmail, showUiError = true) {
    const errEl = document.getElementById("brEmailErrorText");
    const inputEl = document.getElementById("brEmailInput");
    const hoEmail = (regEmail?.value || "").trim().toLowerCase();

    if (!cleanEmail) {
      if (errEl) errEl.classList.add("hidden");
      inputEl?.classList.remove("input-has-error");
      return { valid: false, message: "Branch email is required" };
    }

    // 1. Cannot equal Head Office email from Step 1
    if (cleanEmail === hoEmail) {
      const msg = `Cannot use Head Office email (${hoEmail}) for Branch #${curIdx + 1}. Each branch requires a unique email.`;
      if (showUiError) {
        if (errEl) { errEl.textContent = `❌ ${msg}`; errEl.classList.remove("hidden"); }
        inputEl?.classList.add("input-has-error");
      }
      return { valid: false, message: msg };
    }

    // 2. Cannot duplicate other branches
    for (let j = 0; j < signupWizardState.additionalBranches.length; j++) {
      if (j !== curIdx && (signupWizardState.additionalBranches[j].email || "").trim().toLowerCase() === cleanEmail) {
        const msg = `This email is already assigned to Branch #${j + 1}. Each branch requires a unique email.`;
        if (showUiError) {
          if (errEl) { errEl.textContent = `❌ ${msg}`; errEl.classList.remove("hidden"); }
          inputEl?.classList.add("input-has-error");
        }
        return { valid: false, message: msg };
      }
    }

    if (errEl) errEl.classList.add("hidden");
    inputEl?.classList.remove("input-has-error");
    return { valid: true };
  }

  function validateBranchMobileField(curIdx, cleanMob, showUiError = true) {
    const errEl = document.getElementById("brMobileErrorText");
    const inputEl = document.getElementById("brMobileInput");
    const hoMob = (regMobile?.value || "").replace(/\D/g, "");

    if (!cleanMob) {
      if (errEl) errEl.classList.add("hidden");
      inputEl?.classList.remove("input-has-error");
      return { valid: false, message: "Branch phone number is required" };
    }

    // 1. Cannot equal Head Office phone from Step 1
    if (cleanMob.length === 10 && cleanMob === hoMob) {
      const msg = `Cannot use Head Office phone (+91 ${hoMob}) for Branch #${curIdx + 1}. Each branch requires a unique phone number.`;
      if (showUiError) {
        if (errEl) { errEl.textContent = `❌ ${msg}`; errEl.classList.remove("hidden"); }
        inputEl?.classList.add("input-has-error");
      }
      return { valid: false, message: msg };
    }

    // 2. Cannot duplicate other branches
    if (cleanMob.length === 10) {
      for (let j = 0; j < signupWizardState.additionalBranches.length; j++) {
        const otherMob = (signupWizardState.additionalBranches[j].mobile || "").replace(/\D/g, "");
        if (j !== curIdx && otherMob === cleanMob) {
          const msg = `This phone number is already assigned to Branch #${j + 1}. Each branch requires a unique phone number.`;
          if (showUiError) {
            if (errEl) { errEl.textContent = `❌ ${msg}`; errEl.classList.remove("hidden"); }
            inputEl?.classList.add("input-has-error");
          }
          return { valid: false, message: msg };
        }
      }
    }

    if (errEl) errEl.classList.add("hidden");
    inputEl?.classList.remove("input-has-error");
    return { valid: true };
  }

  // Branch Tabs & Active Branch Card Renderer
  function renderBranchTabsAndCard() {
    if (!branchNavTabs || !activeBranchCard) return;
    const count = signupWizardState.branchCount;
    if (count === 0) return;

    adjustBranchCount(count);

    // 1. Render Tabs
    branchNavTabs.innerHTML = "";
    signupWizardState.additionalBranches.forEach((br, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `branch-tab-btn ${idx === signupWizardState.activeBranchIndex ? "active" : ""}`;
      const nameLabel = br.branchName ? ` - ${escapeHtml(br.branchName)}` : "";
      const checkLabel = br.emailVerified ? " ✓" : "";
      btn.textContent = `Branch #${idx + 1}${nameLabel}${checkLabel}`;
      btn.addEventListener("click", () => {
        signupWizardState.activeBranchIndex = idx;
        renderBranchTabsAndCard();
      });
      branchNavTabs.appendChild(btn);
    });

    // 2. Render Active Branch Form Card
    const curIdx = signupWizardState.activeBranchIndex;
    const curBranch = signupWizardState.additionalBranches[curIdx];
    if (!curBranch) return;

    activeBranchCard.innerHTML = `
      <div class="branch-top-bar">
        <h4>🏢 Branch #${curIdx + 1} Configuration</h4>
        <button type="button" class="btn-copy-ho" id="brCopyHoBtn">📋 Copy Head Office Details (GST &amp; Address)</button>
      </div>

      <div class="clean-field">
        <label><span class="req-star">*</span> Branch Company / Entity Name</label>
        <div class="clean-input-row">
          <input type="text" id="brNameInput" placeholder="E.g. ${escapeHtml(regCompanyName?.value || 'Company')} - Branch ${curIdx + 1}" value="${escapeHtml(curBranch.branchName)}">
        </div>
      </div>

      <div class="clean-field">
        <div class="clean-label-row">
          <label>Branch GSTIN (Optional if using Head Office GST)</label>
          <span class="field-hint">Auto-fills branch address</span>
        </div>
        <div class="clean-input-row">
          <span class="clean-field-icon">📋</span>
          <input type="text" id="brGstInput" placeholder="ENTER 15-DIGIT GSTIN" maxlength="15" value="${escapeHtml(curBranch.gstNo)}" style="text-transform:uppercase; font-family:monospace;">
          <button type="button" id="brVerifyGstBtn" class="clean-inline-btn">${curBranch.verified ? 'Verified ✓' : 'Verify GST'}</button>
        </div>
        <div id="brGstStatusPill" class="gst-verified-pill ${curBranch.verified ? '' : 'hidden'}">✓ Branch GSTIN Verified</div>
      </div>

      <div class="clean-field">
        <label><span class="req-star">*</span> Branch Full Address</label>
        <div class="clean-input-row">
          <input type="text" id="brAddressInput" placeholder="Enter branch street address" value="${escapeHtml(curBranch.address)}">
        </div>
      </div>

      <div class="clean-grid-2">
        <div class="clean-field">
          <label><span class="req-star">*</span> State</label>
          <div class="clean-input-row">
            <input type="text" id="brStateInput" placeholder="Branch State" value="${escapeHtml(curBranch.state)}">
          </div>
        </div>
        <div class="clean-field">
          <label><span class="req-star">*</span> City</label>
          <div class="clean-input-row">
            <input type="text" id="brCityInput" placeholder="Branch City" value="${escapeHtml(curBranch.city)}">
          </div>
        </div>
      </div>

      <div class="clean-grid-2">
        <div class="clean-field">
          <label><span class="req-star">*</span> Postal PIN Code</label>
          <div class="clean-input-row">
            <input type="text" id="brPincodeInput" placeholder="6-digit pincode" maxlength="6" value="${escapeHtml(curBranch.pincode)}">
          </div>
        </div>
        <div class="clean-field">
          <label><span class="req-star">*</span> Branch Contact Phone (Must be unique)</label>
          <div class="clean-input-row">
            <span class="clean-field-icon">📞</span>
            <input type="tel" id="brMobileInput" placeholder="10-digit mobile number" maxlength="10" value="${escapeHtml(curBranch.mobile)}">
          </div>
          <div id="brMobileErrorText" class="clean-field-error hidden"></div>
        </div>
      </div>

      <div class="clean-field">
        <div class="clean-label-row">
          <label><span class="req-star">*</span> Branch Manager / Work Email (Must be unique)</label>
          <span class="verified-badge ${curBranch.emailVerified ? '' : 'hidden'}" id="brEmailBadge">✓ Branch Email Verified</span>
        </div>
        <div class="clean-input-row">
          <span class="clean-field-icon">✉️</span>
          <input type="email" id="brEmailInput" placeholder="branch${curIdx + 1}@company.com (Must be unique)" value="${escapeHtml(curBranch.email)}" ${curBranch.emailVerified ? 'disabled' : ''}>
          <button type="button" id="brSendEmailOtpBtn_${curIdx}" class="clean-inline-btn" ${curBranch.emailVerified ? 'disabled' : ''}>${curBranch.emailVerified ? 'Verified ✓' : (curBranch.emailCountdown > 0 ? `Resend in ${curBranch.emailCountdown}s` : 'Send OTP')}</button>
        </div>
        <div id="brEmailErrorText" class="clean-field-error hidden"></div>
      </div>

      <div id="brOtpBox" class="clean-otp-box ${curBranch.emailOtpSent && !curBranch.emailVerified ? '' : 'hidden'}">
        <label>Enter 6-digit verification code sent to <strong>${escapeHtml(curBranch.email)}</strong></label>
        <div class="otp-compact-row">
          <div class="otp-square-grid" id="brSquareGrid">
            <input type="text" maxlength="1" class="otp-square-input" data-idx="0">
            <input type="text" maxlength="1" class="otp-square-input" data-idx="1">
            <input type="text" maxlength="1" class="otp-square-input" data-idx="2">
            <input type="text" maxlength="1" class="otp-square-input" data-idx="3">
            <input type="text" maxlength="1" class="otp-square-input" data-idx="4">
            <input type="text" maxlength="1" class="otp-square-input" data-idx="5">
          </div>
          <button type="button" id="brConfirmOtpBtn" class="clean-otp-confirm-btn" disabled>Confirm OTP ✓</button>
        </div>
      </div>

      <div class="clean-grid-2">
        <div class="clean-field">
          <label><span class="req-star">*</span> Branch Operator Password</label>
          <div class="clean-input-row">
            <input type="${curBranch.showPassword ? 'text' : 'password'}" id="brPasswordInput" placeholder="Min 8 chars (1 letter, 1 number)" value="${escapeHtml(curBranch.password || '')}">
            <button type="button" id="brTogglePwBtn" class="clean-eye-btn">👁️</button>
          </div>
        </div>
        <div class="clean-field">
          <label><span class="req-star">*</span> Confirm Password</label>
          <div class="clean-input-row">
            <input type="${curBranch.showConfirm ? 'text' : 'password'}" id="brConfirmPasswordInput" placeholder="Confirm password" value="${escapeHtml(curBranch.confirmPassword || '')}">
            <button type="button" id="brToggleConfirmPwBtn" class="clean-eye-btn">👁️</button>
          </div>
        </div>
      </div>
    `;

    // Wire Copy Head Office Details (Copies GST & Address only, NOT email or phone)
    document.getElementById("brCopyHoBtn")?.addEventListener("click", () => {
      curBranch.branchName = curBranch.branchName || `${regCompanyName?.value || 'Branch'} - Branch ${curIdx + 1}`;
      curBranch.gstNo = curBranch.gstNo || (regGstNo?.value || "").trim();
      curBranch.address = curBranch.address || (regAddress?.value || "").trim();
      curBranch.city = curBranch.city || (regCity?.value || "").trim();
      curBranch.state = curBranch.state || (regState?.value || "").trim();
      curBranch.pincode = curBranch.pincode || (regPincode?.value || "").trim();
      renderBranchTabsAndCard();
      showToast("Copied Head Office address, city & GST to Branch!", "info");
    });

    // Wire Branch Inputs
    document.getElementById("brNameInput")?.addEventListener("input", (e) => {
      curBranch.branchName = e.target.value;
      const activeTabBtn = branchNavTabs.children[curIdx];
      if (activeTabBtn) {
        activeTabBtn.textContent = `Branch #${curIdx + 1}${curBranch.branchName ? ` - ${curBranch.branchName}` : ''}${curBranch.emailVerified ? ' ✓' : ''}`;
      }
    });

    document.getElementById("brGstInput")?.addEventListener("input", (e) => {
      curBranch.gstNo = e.target.value.toUpperCase();
    });

    document.getElementById("brAddressInput")?.addEventListener("input", (e) => {
      curBranch.address = e.target.value;
    });

    document.getElementById("brStateInput")?.addEventListener("input", (e) => {
      curBranch.state = e.target.value;
    });

    document.getElementById("brCityInput")?.addEventListener("input", (e) => {
      curBranch.city = e.target.value;
    });

    document.getElementById("brPincodeInput")?.addEventListener("input", (e) => {
      curBranch.pincode = e.target.value;
    });

    // Branch Mobile input with live duplicate check
    let brMobCheckDebounce = null;
    document.getElementById("brMobileInput")?.addEventListener("input", (e) => {
      curBranch.mobile = e.target.value;
      const cleanMob = e.target.value.replace(/\D/g, "");
      validateBranchMobileField(curIdx, cleanMob, true);

      if (cleanMob.length === 10) {
        if (brMobCheckDebounce) clearTimeout(brMobCheckDebounce);
        brMobCheckDebounce = setTimeout(async () => {
          const cloudUrl = cloudUrlInput.value.trim();
          try {
            const checkRes = await window.electronAPI.checkExists({ cloudUrl, mobile: cleanMob });
            if (checkRes && checkRes.exists) {
              const errEl = document.getElementById("brMobileErrorText");
              const inputEl = document.getElementById("brMobileInput");
              const msg = checkRes.message || "This phone number is already registered in the system.";
              if (errEl) { errEl.textContent = `❌ ${msg}`; errEl.classList.remove("hidden"); }
              inputEl?.classList.add("input-has-error");
              showToast(msg, "error");
            }
          } catch {}
        }, 350);
      }
    });

    // Branch Email input with live duplicate check
    let brEmailCheckDebounce = null;
    document.getElementById("brEmailInput")?.addEventListener("input", (e) => {
      curBranch.email = e.target.value.trim().toLowerCase();
      curBranch.emailVerified = false; // Reset verified if email changes
      validateBranchEmailField(curIdx, curBranch.email, true);

      if (curBranch.email && curBranch.email.includes("@") && curBranch.email.includes(".")) {
        if (brEmailCheckDebounce) clearTimeout(brEmailCheckDebounce);
        brEmailCheckDebounce = setTimeout(async () => {
          const cloudUrl = cloudUrlInput.value.trim();
          try {
            const checkRes = await window.electronAPI.checkExists({ cloudUrl, email: curBranch.email });
            if (checkRes && checkRes.exists) {
              const errEl = document.getElementById("brEmailErrorText");
              const inputEl = document.getElementById("brEmailInput");
              const msg = checkRes.message || "This email address is already registered in the system.";
              if (errEl) { errEl.textContent = `❌ ${msg}`; errEl.classList.remove("hidden"); }
              inputEl?.classList.add("input-has-error");
              showToast(msg, "error");
            }
          } catch {}
        }, 350);
      }
    });

    document.getElementById("brPasswordInput")?.addEventListener("input", (e) => {
      curBranch.password = e.target.value;
    });

    document.getElementById("brConfirmPasswordInput")?.addEventListener("input", (e) => {
      curBranch.confirmPassword = e.target.value;
    });

    document.getElementById("brTogglePwBtn")?.addEventListener("click", () => {
      curBranch.showPassword = !curBranch.showPassword;
      const inp = document.getElementById("brPasswordInput");
      if (inp) inp.type = curBranch.showPassword ? "text" : "password";
    });

    document.getElementById("brToggleConfirmPwBtn")?.addEventListener("click", () => {
      curBranch.showConfirm = !curBranch.showConfirm;
      const inp = document.getElementById("brConfirmPasswordInput");
      if (inp) inp.type = curBranch.showConfirm ? "text" : "password";
    });

    // Wire Branch GST Verification
    document.getElementById("brVerifyGstBtn")?.addEventListener("click", async () => {
      const cleanGst = (curBranch.gstNo || "").trim().toUpperCase();
      if (!cleanGst || cleanGst.length !== 15) {
        showToast("Please enter a valid 15-character GSTIN", "error");
        return;
      }
      try {
        const cloudUrl = cloudUrlInput.value.trim();
        const res = await window.electronAPI.verifyGst({ cloudUrl, gstin: cleanGst });
        if (res && res.success && res.data) {
          curBranch.verified = true;
          if (res.data.address) curBranch.address = res.data.address;
          if (res.data.city) curBranch.city = res.data.city;
          if (res.data.state || res.data.stateName) curBranch.state = res.data.state || res.data.stateName;
          if (res.data.pincode) curBranch.pincode = res.data.pincode;
          renderBranchTabsAndCard();
          showToast(`Branch #${curIdx + 1} GSTIN Verified: ${res.data.businessName || cleanGst}`, "success");
        } else {
          showToast(res?.message || "GSTIN verification failed", "error");
        }
      } catch (err) {
        showToast("Network error verifying GSTIN", "error");
      }
    });

    // Wire Branch Square OTP Grid
    const brSquareGrid = document.getElementById("brSquareGrid");
    const brConfirmOtpBtn = document.getElementById("brConfirmOtpBtn");
    const brOtpGridHelper = setupSquareOtpGrid(brSquareGrid, (code) => {
      curBranch.emailOtp = code;
      if (brConfirmOtpBtn) {
        brConfirmOtpBtn.disabled = code.length !== 6;
      }
    });

    // Wire Branch Send Email OTP
    const brSendOtpBtn = document.getElementById(`brSendEmailOtpBtn_${curIdx}`);
    brSendOtpBtn?.addEventListener("click", async () => {
      if (curBranch.emailSending || curBranch.emailCountdown > 0) return;
      const cleanEmail = (curBranch.email || "").trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        showToast(`Please enter a valid email address for Branch #${curIdx + 1}`, "error");
        return;
      }

      // 1. Strict Check: Email cannot match Head Office or other branches
      const emailValidation = validateBranchEmailField(curIdx, cleanEmail, true);
      if (!emailValidation.valid) {
        showToast(emailValidation.message, "error");
        return; // DO NOT SEND OTP
      }

      setButtonLoading(brSendOtpBtn, true);
      curBranch.emailSending = true;
      const cloudUrl = cloudUrlInput.value.trim();

      try {
        // 2. Strict Check: Email cannot be already registered in the system
        const checkRes = await window.electronAPI.checkExists({ cloudUrl, email: cleanEmail });
        if (checkRes && checkRes.exists) {
          setButtonLoading(brSendOtpBtn, false);
          curBranch.emailSending = false;
          const msg = checkRes.message || "This email address is already registered in the system. Please use a different email.";
          const errEl = document.getElementById("brEmailErrorText");
          const inputEl = document.getElementById("brEmailInput");
          if (errEl) { errEl.textContent = `❌ ${msg}`; errEl.classList.remove("hidden"); }
          inputEl?.classList.add("input-has-error");
          showToast(msg, "error");
          return; // DO NOT SEND OTP
        }

        // 3. Send Email OTP
        const res = await window.electronAPI.sendEmailOtp({ cloudUrl, email: cleanEmail });
        setButtonLoading(brSendOtpBtn, false);
        curBranch.emailSending = false;

        if (res && res.success) {
          curBranch.emailOtpSent = true;
          curBranch.emailCountdown = 60;
          startSignupCountdownTimer();
          renderBranchTabsAndCard();
          brOtpGridHelper?.clear();
          brOtpGridHelper?.focusFirst();
          showToast(`Verification code sent to Branch email (${cleanEmail})`, "success");
        } else {
          showToast(res?.message || "Failed to send email verification code", "error");
        }
      } catch (err) {
        setButtonLoading(brSendOtpBtn, false);
        curBranch.emailSending = false;
        showToast("Network error sending OTP", "error");
      }
    });

    // Wire Branch Confirm OTP
    brConfirmOtpBtn?.addEventListener("click", async () => {
      if (curBranch.emailVerifying) return;
      const cleanEmail = (curBranch.email || "").trim().toLowerCase();
      const otp = (curBranch.emailOtp || "").trim();
      if (!otp || otp.length !== 6) {
        showToast("Please enter the complete 6-digit OTP", "error");
        return;
      }

      setButtonLoading(brConfirmOtpBtn, true);
      curBranch.emailVerifying = true;
      try {
        const cloudUrl = cloudUrlInput.value.trim();
        const res = await window.electronAPI.verifyEmailOtp({ cloudUrl, email: cleanEmail, otp });
        setButtonLoading(brConfirmOtpBtn, false);
        curBranch.emailVerifying = false;

        if (res && res.success) {
          curBranch.emailVerified = true;
          curBranch.emailOtpSent = false;
          curBranch.emailCountdown = 0;
          renderBranchTabsAndCard();
          showToast(`Branch #${curIdx + 1} email verified successfully!`, "success");
        } else {
          showToast(res?.message || "Incorrect verification code", "error");
        }
      } catch (err) {
        setButtonLoading(brConfirmOtpBtn, false);
        curBranch.emailVerifying = false;
        showToast("Error verifying email OTP", "error");
      }
    });
  }

  // Populate Review Details
  function populateReviewDetails() {
    if (revCompanyName) revCompanyName.textContent = regCompanyName?.value || "N/A";
    if (revGstNo) revGstNo.textContent = (regGstNo?.value || "").trim().toUpperCase() || "Unregistered";
    if (revAddress) {
      const parts = [regAddress?.value, regCity?.value, regState?.value].filter(Boolean).join(", ");
      revAddress.textContent = `${parts}${regPincode?.value ? ` - ${regPincode.value}` : ''}` || "N/A";
    }

    if (regDrugLicense?.value && regDrugLicense.value.trim()) {
      if (revDrugLicenseRow) revDrugLicenseRow.classList.remove("hidden");
      if (revDrugLicense) revDrugLicense.textContent = regDrugLicense.value.trim().toUpperCase();
    } else if (revDrugLicenseRow) {
      revDrugLicenseRow.classList.add("hidden");
    }

    const count = signupWizardState.branchCount;
    if (revBranchCount) {
      revBranchCount.textContent = count > 0 ? `${count} Branch Entity(s)` : "0 (Single Head Office)";
    }

    if (count > 0 && revBranchListBox && revBranchItems) {
      revBranchListBox.classList.remove("hidden");
      revBranchItems.innerHTML = "";
      signupWizardState.additionalBranches.slice(0, count).forEach((br, i) => {
        const div = document.createElement("div");
        div.className = "review-branch-row";
        div.innerHTML = `
          <strong>Branch #${i + 1}: ${escapeHtml(br.branchName || 'Branch')}</strong>
          <span style="color:#64748b; font-size:12px;">(${escapeHtml(br.city || 'City')}, ${escapeHtml(br.state || 'State')})</span>
          <span class="mono-font" style="font-size:11.5px; color:#f97316;">${escapeHtml(br.email)}</span>
        `;
        revBranchItems.appendChild(div);
      });
    } else if (revBranchListBox) {
      revBranchListBox.classList.add("hidden");
    }

    if (revAdminName) revAdminName.textContent = regFullName?.value || "N/A";
    if (revEmail) revEmail.textContent = regEmail?.value || "N/A";
    if (revMobile) revMobile.textContent = regMobile?.value ? `+91 ${regMobile.value}` : "N/A";
  }

  // Step Switcher
  function renderSignupStep(step) {
    signupWizardState.currentStep = step;
    const hasBranches = signupWizardState.branchCount > 0;

    if (signupErrorBanner) signupErrorBanner.classList.add("hidden");

    // Stepper header buttons
    if (!hasBranches) {
      stepTrackBtn2?.classList.add("hidden");
      stepTrackLine2?.classList.add("hidden");
      if (stepTrackNum3) stepTrackNum3.textContent = "2";
    } else {
      stepTrackBtn2?.classList.remove("hidden");
      stepTrackLine2?.classList.remove("hidden");
      if (stepTrackNum3) stepTrackNum3.textContent = "3";
    }

    stepTrackBtn1?.classList.toggle("active", step === 1);
    stepTrackBtn2?.classList.toggle("active", hasBranches && step === 2);
    stepTrackBtn3?.classList.toggle("active", (!hasBranches && step === 2) || (hasBranches && step === 3));

    // Substeps
    signupSubstep1?.classList.toggle("hidden", step !== 1);
    signupSubstep2?.classList.toggle("hidden", !(hasBranches && step === 2));
    signupSubstep3?.classList.toggle("hidden", !( (!hasBranches && step === 2) || (hasBranches && step === 3) ));

    // Action buttons
    if (step === 1) {
      regPrevStepBtn?.classList.add("hidden");
      regNextStepBtn?.classList.remove("hidden");
      regCompleteBtn?.classList.add("hidden");
      if (regNextStepBtn) {
        regNextStepBtn.textContent = hasBranches ? "Next: Branch Details →" : "Next: Review & Launch →";
      }
    } else if (hasBranches && step === 2) {
      regPrevStepBtn?.classList.remove("hidden");
      regNextStepBtn?.classList.remove("hidden");
      regCompleteBtn?.classList.add("hidden");
      if (regNextStepBtn) {
        regNextStepBtn.textContent = "Next: Review & Launch →";
      }
      renderBranchTabsAndCard();
    } else {
      // Step 3 / Review
      regPrevStepBtn?.classList.remove("hidden");
      regNextStepBtn?.classList.add("hidden");
      regCompleteBtn?.classList.remove("hidden");
      populateReviewDetails();
    }
  }

  // Navigation Click Handlers
  regPrevStepBtn?.addEventListener("click", () => {
    const cur = signupWizardState.currentStep;
    const hasBranches = signupWizardState.branchCount > 0;
    if (cur === 3 || (!hasBranches && cur === 2)) {
      renderSignupStep(hasBranches ? 2 : 1);
    } else if (cur === 2 && hasBranches) {
      renderSignupStep(1);
    }
  });

  stepTrackBtn1?.addEventListener("click", () => renderSignupStep(1));
  stepTrackBtn2?.addEventListener("click", () => {
    if (signupWizardState.branchCount > 0) renderSignupStep(2);
  });

  // Next Step Validation & Advance
  regNextStepBtn?.addEventListener("click", async () => {
    const cur = signupWizardState.currentStep;
    const hasBranches = signupWizardState.branchCount > 0;

    if (cur === 1) {
      // Validate Step 1
      if (!regCompanyName?.value.trim()) {
        const msg = "Please enter your Company Name.";
        if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
        showToast(msg, "error");
        regCompanyName?.focus();
        return;
      }

      if (!regFullName?.value.trim()) {
        const msg = "Please enter the Administrator Full Name.";
        if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
        showToast(msg, "error");
        regFullName?.focus();
        return;
      }

      if (!regAddress?.value.trim()) {
        const msg = "Please enter the complete Full Address.";
        if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
        showToast(msg, "error");
        regAddress?.focus();
        return;
      }

      if (!regState?.value.trim() || !regCity?.value.trim()) {
        const msg = "Please enter State and City.";
        if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
        showToast(msg, "error");
        return;
      }

      const cleanPin = (regPincode?.value || "").trim();
      if (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
        const msg = "Please enter a valid 6-digit Postal Code.";
        if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
        showToast(msg, "error");
        regPincode?.focus();
        return;
      }

      const cleanMob = (regMobile?.value || "").replace(/\D/g, "");
      if (cleanMob.length !== 10) {
        const msg = "Please enter a valid 10-digit phone number.";
        if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
        showToast(msg, "error");
        regMobile?.focus();
        return;
      }

      // Check if mobile already exists before proceeding
      try {
        const cloudUrl = cloudUrlInput.value.trim();
        const checkMob = await window.electronAPI.checkExists({ cloudUrl, mobile: cleanMob });
        if (checkMob && checkMob.exists) {
          const msg = checkMob.message || "This phone number is already registered. Please sign in or use another number.";
          if (regMobileErrorText) {
            regMobileErrorText.textContent = `❌ ${msg}`;
            regMobileErrorText.classList.remove("hidden");
          }
          regMobile?.classList.add("input-has-error");
          if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
          showToast(msg, "error");
          regMobile?.focus();
          return;
        }
      } catch {}

      const cleanEmail = (regEmail?.value || "").trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        const msg = "Please enter a valid work email address.";
        if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
        showToast(msg, "error");
        regEmail?.focus();
        return;
      }

      if (!signupWizardState.emailVerified) {
        const msg = "Please verify your work email with the OTP before continuing.";
        if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
        showToast(msg, "error");
        return;
      }

      const pw = regPassword?.value || "";
      const confirmPw = regConfirmPassword?.value || "";
      const pwErr = validatePasswordRule(pw);
      if (pwErr) {
        if (signupErrorBanner) { signupErrorBanner.textContent = pwErr; signupErrorBanner.classList.remove("hidden"); }
        showToast(pwErr, "error");
        regPassword?.focus();
        return;
      }

      if (pw !== confirmPw) {
        const msg = "Passwords do not match. Please re-enter confirm password.";
        if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
        showToast(msg, "error");
        regConfirmPassword?.focus();
        return;
      }

      // Step 1 Validated
      if (hasBranches) {
        renderSignupStep(2);
        showToast(`Head office details verified! Please configure ${signupWizardState.branchCount} branch(es).`, "info");
      } else {
        renderSignupStep(2); // Review step when 0 branches
        showToast("Head office details verified! Please review your submission.", "info");
      }
    } else if (cur === 2 && hasBranches) {
      // Validate Step 2 (Branch Details)
      for (let i = 0; i < signupWizardState.additionalBranches.length; i++) {
        const br = signupWizardState.additionalBranches[i];
        if (!br.branchName.trim()) {
          const msg = `Please enter the branch entity name for Branch #${i + 1}`;
          if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
          showToast(msg, "error");
          signupWizardState.activeBranchIndex = i;
          renderBranchTabsAndCard();
          return;
        }

        const brMob = (br.mobile || "").replace(/\D/g, "");
        if (brMob.length !== 10) {
          const msg = `Please enter a valid 10-digit phone number for Branch #${i + 1}`;
          if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
          showToast(msg, "error");
          signupWizardState.activeBranchIndex = i;
          renderBranchTabsAndCard();
          return;
        }

        const hoMob = (regMobile?.value || "").replace(/\D/g, "");
        if (brMob === hoMob) {
          const msg = `Branch #${i + 1} phone number cannot be the same as Head Office phone (+91 ${hoMob}). Each branch must have a unique phone number.`;
          if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
          showToast(msg, "error");
          signupWizardState.activeBranchIndex = i;
          renderBranchTabsAndCard();
          return;
        }

        for (let k = 0; k < i; k++) {
          const prevMob = (signupWizardState.additionalBranches[k].mobile || "").replace(/\D/g, "");
          if (prevMob === brMob) {
            const msg = `Branch #${i + 1} phone number is already used for Branch #${k + 1}. Each branch requires a unique phone number.`;
            if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
            showToast(msg, "error");
            signupWizardState.activeBranchIndex = i;
            renderBranchTabsAndCard();
            return;
          }
        }

        const brEmail = (br.email || "").trim().toLowerCase();
        if (!brEmail || !brEmail.includes("@")) {
          const msg = `Please enter a valid email address for Branch #${i + 1}`;
          if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
          showToast(msg, "error");
          signupWizardState.activeBranchIndex = i;
          renderBranchTabsAndCard();
          return;
        }

        const hoEmail = (regEmail?.value || "").trim().toLowerCase();
        if (brEmail === hoEmail) {
          const msg = `Branch #${i + 1} email cannot be the same as Head Office email (${hoEmail}).`;
          if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
          showToast(msg, "error");
          signupWizardState.activeBranchIndex = i;
          renderBranchTabsAndCard();
          return;
        }

        for (let j = 0; j < i; j++) {
          if ((signupWizardState.additionalBranches[j].email || "").trim().toLowerCase() === brEmail) {
            const msg = `Branch #${i + 1} email is already used for Branch #${j + 1}. Each branch requires a unique email.`;
            if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
            showToast(msg, "error");
            signupWizardState.activeBranchIndex = i;
            renderBranchTabsAndCard();
            return;
          }
        }

        if (!br.emailVerified) {
          const msg = `Please verify the email OTP for Branch #${i + 1} (${br.email})`;
          if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
          showToast(msg, "error");
          signupWizardState.activeBranchIndex = i;
          renderBranchTabsAndCard();
          return;
        }

        const brPwErr = validatePasswordRule(br.password);
        if (brPwErr) {
          const msg = `Branch #${i + 1} password: ${brPwErr}`;
          if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
          showToast(msg, "error");
          signupWizardState.activeBranchIndex = i;
          renderBranchTabsAndCard();
          return;
        }

        if (br.password !== br.confirmPassword) {
          const msg = `Passwords do not match for Branch #${i + 1}. Please re-enter.`;
          if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
          showToast(msg, "error");
          signupWizardState.activeBranchIndex = i;
          renderBranchTabsAndCard();
          return;
        }
      }

      renderSignupStep(3);
      showToast("All branch details verified! Please review your submission.", "info");
    }
  });

  // Final Registration Submission (Launch Workspace)
  regCompleteBtn?.addEventListener("click", async () => {
    if (!regTermsAccepted?.checked) {
      const msg = "Please review and agree to the Terms of Service & Privacy Policy to proceed.";
      if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
      showToast(msg, "error");
      return;
    }

    setButtonLoading(regCompleteBtn, true);
    if (signupErrorBanner) signupErrorBanner.classList.add("hidden");

    const cloudUrl = cloudUrlInput.value.trim();
    const adminName = (regFullName?.value || "").trim() || (regCompanyName?.value || "").trim();
    const cleanMob = (regMobile?.value || "").replace(/\D/g, "");
    const cleanEmail = (regEmail?.value || "").trim().toLowerCase();

    const payload = {
      cloudUrl,
      name: adminName,
      email: cleanEmail,
      mobile: cleanMob,
      password: regPassword?.value || "",
      role: "Admin",
      companyName: (regCompanyName?.value || "").trim(),
      gstNo: (regGstNo?.value || "").trim().toUpperCase(),
      drugLicenseNo: (regDrugLicense?.value || "").trim().toUpperCase(),
      address: (regAddress?.value || "").trim(),
      city: (regCity?.value || "").trim(),
      pincode: (regPincode?.value || "").trim(),
      additionalGstins: signupWizardState.branchCount > 0 ? signupWizardState.additionalBranches.slice(0, signupWizardState.branchCount) : [],
      termsAccepted: true
    };

    try {
      const res = await window.electronAPI.register(payload);
      setButtonLoading(regCompleteBtn, false);

      if (res && res.success) {
        showToast("🎉 Workspace created successfully! Redirecting to login...", "success");
        if (emailInput) emailInput.value = cleanEmail;

        if (res.pendingApproval) {
          showPendingApprovalView({
            companyName: payload.companyName,
            email: payload.email
          });
        } else {
          setTimeout(() => {
            switchToSignIn();
          }, 1200);
        }
      } else {
        const msg = sanitizeMessage(res?.message || "Registration failed. Please check inputs.");
        if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
        showToast(msg, "error");
      }
    } catch (err) {
      setButtonLoading(regCompleteBtn, false);
      const msg = sanitizeMessage(err.message || "Network error while setting up workspace.");
      if (signupErrorBanner) { signupErrorBanner.textContent = msg; signupErrorBanner.classList.remove("hidden"); }
      showToast(msg, "error");
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
    isMachineLocallyAuthorized = false;
    await window.electronAPI.logout();
    currentAuthEmail = "";
    showLogin();
  });

  // Browse Source Folder
  browseSourceBtn.addEventListener("click", async () => {
    const selected = await window.electronAPI.selectFolder("Select Encrypted Data Folder");
    if (selected) {
      sourceDirInput.value = selected;
      updateFolderValidation(selected, companyCodeInput.value);
      updateSyncButtonRequirementState();
    }
  });

  // Live input validation on typing or pasting path/code
  sourceDirInput.addEventListener("input", () => {
    updateSyncButtonRequirementState();
    if (folderValidateTimer) clearTimeout(folderValidateTimer);
    folderValidateTimer = setTimeout(() => {
      updateFolderValidation(sourceDirInput.value, companyCodeInput.value);
    }, 400);
  });

  companyCodeInput.addEventListener("input", () => {
    updateSyncButtonRequirementState();
    if (folderValidateTimer) clearTimeout(folderValidateTimer);
    folderValidateTimer = setTimeout(() => {
      if (sourceDirInput.value) {
        updateFolderValidation(sourceDirInput.value, companyCodeInput.value);
      }
    }, 400);
  });

  licenseKeyInput?.addEventListener("input", () => {
    updateSyncButtonRequirementState();
    const hasKey = Boolean(licenseKeyInput.value.trim());
    if (!hasKey) {
      updateLicenseStatusUI(false);
    }
  });

  companyNameInput?.addEventListener("input", () => {
    updateSyncButtonRequirementState();
  });

  btnChangeLicenseKey?.addEventListener("click", () => {
    updateLicenseStatusUI(false);
    licenseKeyInput.readOnly = false;
    licenseKeyInput.disabled = false;
    licenseKeyInput.focus();
    licenseKeyInput.select();
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

  // Click "Edit Configuration" -> Unlocks form fields immediately for direct editing!
  editConfigBtn.addEventListener("click", () => {
    setFormLocked(false);
  });

  // Click "Verify Key with OTP" button
  btnVerifyLicenseKeyManual?.addEventListener("click", () => {
    isMachineLocallyAuthorized = false;
    openDeviceActivationModal({
      email: currentAuthEmail || (emailInput ? emailInput.value.trim() : ""),
      licenseKey: licenseKeyInput ? licenseKeyInput.value.trim() : ""
    });
  });

  // When user edits license key, reset authorization state
  licenseKeyInput?.addEventListener("input", () => {
    isMachineLocallyAuthorized = false;
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

    // Verify Terms and Conditions are checked before saving
    if (termsConsentCheckbox && !termsConsentCheckbox.checked) {
      setButtonLoading(saveConfigBtn, false);
      saveConfigBtn.disabled = false;
      const box = document.querySelector(".terms-consent-box");
      if (box) box.classList.add("has-warning");
      if (termsNoticeWarning) termsNoticeWarning.classList.remove("hidden");
      showToast("Please agree to the Terms & Conditions and Privacy Policy before saving.", "warning");
      termsConsentCheckbox.focus();
      return;
    }

    setButtonLoading(saveConfigBtn, true);
    saveNotice.classList.add("hidden");

    const isAutoSync = autoSyncCheckbox ? (autoSyncCheckbox.checked && intervalSelect.value !== "0") : (intervalSelect.value !== "0");
    const newCfg = {
      operatorName: operatorNameInput ? operatorNameInput.value.trim() : "",
      userEmail: operatorEmailInput ? operatorEmailInput.value.trim() : (currentAuthEmail || emailInput.value.trim()),
      termsAccepted: termsConsentCheckbox ? termsConsentCheckbox.checked : false,
      companyName: companyNameInput.value.trim(),
      companyCode: companyCodeInput.value.trim().toUpperCase(),
      sourceDir: sourceDirInput.value.trim(),
      destDir: destDirInput ? destDirInput.value.trim() : "",
      licenseKey: licenseKeyInput.value.trim(),
      productKey: productKeyInput ? productKeyInput.value.trim() : "",
      syncTarget: syncTargetSelect ? syncTargetSelect.value : "mabsolcrm",
      autoSync: isAutoSync,
      intervalMins: isAutoSync ? (intervalSelect.value === "realtime" ? "realtime" : (Number(intervalSelect.value) || 10)) : 0,
      cloudUrl: cloudUrlInput.value.trim()
    };

    // Before saving the config, if a license key is entered, verify email OTP first!
    if (newCfg.licenseKey && !isMachineLocallyAuthorized && window.electronAPI?.checkDeviceLicense) {
      try {
        const checkRes = await window.electronAPI.checkDeviceLicense({
          email: newCfg.userEmail,
          cloudUrl: newCfg.cloudUrl,
          licenseKey: newCfg.licenseKey
        });
        if (checkRes && (!checkRes.authorized || checkRes.requiresVerification || checkRes.isNewDevice)) {
          setButtonLoading(saveConfigBtn, false);
          saveConfigBtn.disabled = false;
          pendingConfigToSave = newCfg;
          const warnMsg = checkRes.message || "Email OTP verification required before saving license key.";
          saveNotice.textContent = warnMsg;
          saveNotice.className = "save-notice warning";
          saveNotice.classList.remove("hidden");
          openDeviceActivationModal({
            email: checkRes.email || newCfg.userEmail,
            deviceName: checkRes.deviceName,
            deviceId: checkRes.deviceId,
            licenseKey: newCfg.licenseKey,
            error: warnMsg,
            autoSend: true
          });
          showToast("Please verify the OTP code sent to your email before saving.", "warning");
          return;
        } else if (checkRes && checkRes.authorized && !checkRes.isExpired) {
          isMachineLocallyAuthorized = true;
        }
      } catch (checkErr) {
        console.warn("Pre-save license check error:", checkErr);
      }
    }

    try {
      const res = await window.electronAPI.saveConfig(newCfg);
      setButtonLoading(saveConfigBtn, false);
      saveConfigBtn.disabled = false;

      const needsDevVerification = Boolean(
        res?.requiresVerification ||
        res?.deviceMismatch ||
        (!res?.success && (res?.licenseWarning || res?.error)) ||
        (res?.licenseWarning && (res.licenseWarning.includes("locked to machine") || res.licenseWarning.includes("not authorized") || res.licenseWarning.includes("requires") || res.licenseWarning.includes("Verification Required"))) ||
        (typeof res?.error === "string" && (res.error.includes("locked to machine") || res.error.includes("not authorized") || res.error.includes("requires")))
      );

      if (needsDevVerification) {
        isMachineLocallyAuthorized = false;
        pendingConfigToSave = newCfg;
        const warnMsg = res?.message || res?.licenseWarning || res?.error || "License verification required to authorize this machine.";
        saveNotice.textContent = warnMsg;
        saveNotice.className = "save-notice warning";
        saveNotice.classList.remove("hidden");
        appendLogEntry("warn", `[License Verification Required] ${warnMsg}`);
        openDeviceActivationModal({
          email: res?.email || newCfg.userEmail || currentAuthEmail,
          deviceName: res?.deviceName,
          deviceId: res?.deviceId,
          licenseKey: res?.licenseKey || newCfg.licenseKey,
          error: warnMsg,
          autoSend: true
        });
        showToast("Please verify the OTP code sent to your email to authorize this machine.", "warning");
        return;
      } else if (res && res.success) {
        saveNotice.textContent = res.message || "Configuration saved successfully!";
        saveNotice.className = "save-notice";
        saveNotice.classList.remove("hidden");
        setTimeout(() => saveNotice.classList.add("hidden"), 4000);
        setFormLocked(true); // Re-locks after successful save!
        fetchAndShowLicenseDetails();
        updateFolderValidation(newCfg.sourceDir, newCfg.companyCode);
        loadBranches();
      } else {
        const errorText = sanitizeMessage(res?.error || "Failed to save configuration.");
        saveNotice.textContent = errorText;
        saveNotice.className = "save-notice error";
        saveNotice.classList.remove("hidden");
        appendLogEntry("error", `[Config Error] ${errorText}`);
      }
    } catch (err) {
      setButtonLoading(saveConfigBtn, false);
      saveConfigBtn.disabled = false;
      const errorText = sanitizeMessage(err.message || "Failed to save configuration.");
      saveNotice.textContent = errorText;
      saveNotice.className = "save-notice error";
      saveNotice.classList.remove("hidden");
      appendLogEntry("error", `[Config Error] ${errorText}`);
    }
  });

  // Whenever user types or edits any field, ensure save button is enabled & ready!
  configForm.addEventListener("input", () => {
    saveConfigBtn.disabled = false;
    setButtonLoading(saveConfigBtn, false);
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

  // Wire Terms & Conditions Checkbox
  if (termsConsentCheckbox) {
    termsConsentCheckbox.addEventListener("change", () => {
      const isChecked = termsConsentCheckbox.checked;
      updateTermsState(isChecked);
      if (isChecked) {
        window.electronAPI?.saveConfig({ termsAccepted: true }).catch(() => {});
      } else {
        window.electronAPI?.saveConfig({ termsAccepted: false }).catch(() => {});
      }
    });
  }

  // Decrypt & Sync Now Action
  syncNowBtn.addEventListener("click", async () => {
    const licenseKey = (licenseKeyInput?.value || "").trim();
    const companyCode = (companyCodeInput?.value || "").trim();
    const sourceDir = (sourceDirInput?.value || "").trim();
    const termsAccepted = Boolean(termsConsentCheckbox && termsConsentCheckbox.checked);

    if (!licenseKey || !companyCode || isPlaceholderComp(companyCode) || !sourceDir || !termsAccepted) {
      updateSyncButtonRequirementState();
      if (!termsAccepted) {
        const box = document.querySelector(".terms-consent-box");
        if (box) box.classList.add("has-warning");
        if (termsNoticeWarning) termsNoticeWarning.classList.remove("hidden");
        termsConsentCheckbox?.focus();
      }
      showToast("Please fill in all required fields (License Key, Company Code, Data Folder, Terms) before syncing.", "warning");
      return;
    }

    setSyncButtonLoading(true);
    try {
      const res = await window.electronAPI.startSync();
      if (!res.success) {
        statLastStatus.textContent = "Error";
        const needsDevVerification = Boolean(
          res.requiresVerification ||
          res.deviceMismatch ||
          (typeof res.message === "string" && (res.message.includes("locked to machine") || res.message.includes("not authorized") || res.message.includes("License Blocked") || res.message.includes("requires")))
        );
        if (needsDevVerification) {
          isMachineLocallyAuthorized = false;
          openDeviceActivationModal({
            email: currentAuthEmail || (emailInput ? emailInput.value.trim() : ""),
            licenseKey: licenseKeyInput ? licenseKeyInput.value.trim() : "",
            error: res.message
          });
          showToast("Verification code required to authorize this machine before sync.", "warning");
        }
      }
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setSyncButtonLoading(false);
    }
  });

  // Branch & Multi-Company Selector Events
  if (branchSelectDropdown) {
    branchSelectDropdown.addEventListener("change", (e) => {
      handleBranchChange(e.target.value);
    });
  }

  if (btnRefreshBranches) {
    btnRefreshBranches.addEventListener("click", () => {
      showToast("Fetching linked branches from cloud...", "info");
      loadBranches(true);
    });
  }

  if (btnAddBranchProfile) {
    btnAddBranchProfile.addEventListener("click", () => {
      handleAddNewBranchProfile();
    });
  }

  // Batch Multi-Branch Sync Action
  if (syncAllBranchesBtn) {
    syncAllBranchesBtn.addEventListener("click", async () => {
      const licenseKey = (licenseKeyInput?.value || "").trim();
      const termsAccepted = Boolean(termsConsentCheckbox && termsConsentCheckbox.checked);

      if (!licenseKey || !termsAccepted) {
        showToast("Please verify License Key and accept Terms & Conditions before syncing.", "warning");
        return;
      }

      syncAllBranchesBtn.disabled = true;
      syncNowBtn.disabled = true;
      const textSpan = syncAllBranchesBtn.querySelector(".sync-all-text");
      const originalText = textSpan ? textSpan.textContent : "Sync All Branches";
      if (textSpan) textSpan.textContent = "Syncing All...";

      appendLogEntry("info", "🔄 Initiating batch synchronization across all configured branch profiles...");
      try {
        const res = await window.electronAPI.startMultiBranchSync();
        if (res && res.success) {
          showToast("Batch multi-branch sync completed!", "success");
          await loadBranches();
        } else {
          showToast(res?.message || "Multi-branch sync encountered an issue.", "warning");
        }
      } catch (err) {
        showToast(`Sync failed: ${err.message}`, "error");
      } finally {
        if (textSpan) textSpan.textContent = originalText;
        updateSyncButtonRequirementState();
      }
    });
  }

  // Clear Log Console
  clearLogBtn.addEventListener("click", () => {
    terminalBody.innerHTML = `
      <div class="log-entry info"><span class="time">[System]</span> Mabsol Desktop Sync Agent initialized and ready.</div>
      <div class="log-entry privacy-notice"><span class="time">[Data Privacy]</span> We are just accessing your files data, not collecting any personal or confidential details. We keep your data privacy.</div>
    `;
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

  // Device license verification prompt from server / sync attempt
  if (window.electronAPI.onVerificationRequired) {
    window.electronAPI.onVerificationRequired((data) => {
      isMachineLocallyAuthorized = false;
      openDeviceActivationModal(data);
      showToast(data?.error || "Verification code required to authorize this machine for syncing.", "warning");
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

  if (typeof status.tablesCount === "number" && (status.tablesCount > 0 || status.lastStatus === "failed")) {
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
  if (!btn) return;
  const text = btn.querySelector(".btn-text") || btn.querySelector("span");
  const spinner = btn.querySelector(".spinner");
  btn.disabled = Boolean(isLoading);
  if (text) {
    if (isLoading && spinner) {
      text.classList.add("hidden");
    } else {
      text.classList.remove("hidden");
    }
  }
  if (spinner) {
    if (isLoading) {
      spinner.classList.remove("hidden");
    } else {
      spinner.classList.add("hidden");
    }
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
    updateSyncButtonRequirementState();
  }
}

// ---------------------------------------------------------------------------
// Multi-Device License Check & Activation Modal
// ---------------------------------------------------------------------------
const deviceActivationModal = document.getElementById("deviceActivationModal");
const devActMachineName = document.getElementById("devActMachineName");
const devActDeviceId = document.getElementById("devActDeviceId");
const devActEmail = document.getElementById("devActEmail");
const devActLicenseKey = document.getElementById("devActLicenseKey");
const devActSendSection = document.getElementById("devActSendSection");
const devActVerifySection = document.getElementById("devActVerifySection");
const btnDevActSendOtp = document.getElementById("btnDevActSendOtp");
const devActOtpInput = document.getElementById("devActOtpInput");
const btnDevActConfirm = document.getElementById("btnDevActConfirm");
const btnDevActResend = document.getElementById("btnDevActResend");
const btnDevActBack = document.getElementById("btnDevActBack");
const btnCloseDevActModal = document.getElementById("btnCloseDevActModal");
const btnXCloseDevActModal = document.getElementById("btnXCloseDevActModal");
const devActError = document.getElementById("devActError");
const devActSentToEmail = document.getElementById("devActSentToEmail");

// Web PIN Link Elements
const tabDevActPin = document.getElementById("tabDevActPin");
const tabDevActOtp = document.getElementById("tabDevActOtp");
const devActPinSection = document.getElementById("devActPinSection");
const devActOtpSection = document.getElementById("devActOtpSection");
const devActPinInitial = document.getElementById("devActPinInitial");
const devActPinActiveCard = document.getElementById("devActPinActiveCard");
const devActPinDisplay = document.getElementById("devActPinDisplay");
const btnDevActRequestPin = document.getElementById("btnDevActRequestPin");
const btnCopyAgentPin = document.getElementById("btnCopyAgentPin");
const btnDevActRegenPin = document.getElementById("btnDevActRegenPin");
const btnDevActCheckPinNow = document.getElementById("btnDevActCheckPinNow");
const btnGeneratePinAgent = document.getElementById("btnGeneratePinAgent");

// Target Server Switcher Elements
const devActServerSelect = document.getElementById("devActServerSelect");
const serverEnvToggleBtn = document.getElementById("serverEnvToggleBtn");
const serverEnvIcon = document.getElementById("serverEnvIcon");
const serverEnvLabel = document.getElementById("serverEnvLabel");

function updateServerEnvDisplay(url) {
  const isLocal = Boolean(url && (url.includes("localhost") || url.includes("127.0.0.1")));
  if (serverEnvLabel) serverEnvLabel.textContent = isLocal ? "Localhost (3000)" : "Cloud";
  if (serverEnvIcon) serverEnvIcon.textContent = isLocal ? "💻" : "☁️";
  if (devActServerSelect) {
    devActServerSelect.value = isLocal ? "http://localhost:3000" : "https://phcrm.mabsolinfotech.cloud";
  }
}

serverEnvToggleBtn?.addEventListener("click", async () => {
  const currentVal = devActServerSelect?.value || (serverEnvLabel?.textContent?.includes("Local") ? "http://localhost:3000" : "https://phcrm.mabsolinfotech.cloud");
  const nextVal = currentVal.includes("localhost") ? "https://phcrm.mabsolinfotech.cloud" : "http://localhost:3000";
  if (window.electronAPI?.setCloudUrl) {
    const res = await window.electronAPI.setCloudUrl(nextVal);
    if (res?.success) {
      updateServerEnvDisplay(nextVal);
      showToast(`Target server set to ${nextVal.includes("localhost") ? "Local Dev (localhost:3000)" : "Cloud Production"}`, "info");
    }
  }
});

devActServerSelect?.addEventListener("change", async () => {
  const chosen = devActServerSelect.value;
  if (window.electronAPI?.setCloudUrl) {
    await window.electronAPI.setCloudUrl(chosen);
  }
  updateServerEnvDisplay(chosen);
  showToast(`Target server set to: ${chosen}`, "info");
});

let currentActiveAgentPin = "";
let agentPinPollTimer = null;

function switchDevActTab(mode) {
  if (mode === "pin") {
    if (tabDevActPin) { tabDevActPin.style.background = "#2563eb"; tabDevActPin.style.color = "#fff"; }
    if (tabDevActOtp) { tabDevActOtp.style.background = "transparent"; tabDevActOtp.style.color = "#94a3b8"; }
    devActPinSection?.classList.remove("hidden");
    devActOtpSection?.classList.add("hidden");
  } else {
    if (tabDevActOtp) { tabDevActOtp.style.background = "#2563eb"; tabDevActOtp.style.color = "#fff"; }
    if (tabDevActPin) { tabDevActPin.style.background = "transparent"; tabDevActPin.style.color = "#94a3b8"; }
    devActOtpSection?.classList.remove("hidden");
    devActPinSection?.classList.add("hidden");
  }
}

tabDevActPin?.addEventListener("click", () => switchDevActTab("pin"));
tabDevActOtp?.addEventListener("click", () => switchDevActTab("otp"));

function stopPinPolling() {
  if (agentPinPollTimer) {
    clearInterval(agentPinPollTimer);
    agentPinPollTimer = null;
  }
}

async function requestAndDisplayAgentPin() {
  stopPinPolling();
  setButtonLoading(btnDevActRequestPin, true);
  try {
    let email = devActTargetEmail || currentAuthEmail || (emailInput ? emailInput.value.trim() : "");
    const cloudUrl = devActServerSelect?.value || (cloudUrlInput ? cloudUrlInput.value.trim() : "");
    const res = await window.electronAPI.requestAgentPin({ cloudUrl, email });
    setButtonLoading(btnDevActRequestPin, false);
    if (res && res.success && res.pin) {
      if (res.cloudUrl) {
        updateServerEnvDisplay(res.cloudUrl);
      }
      currentActiveAgentPin = res.pin;
      if (devActPinDisplay) devActPinDisplay.textContent = res.pin;
      devActPinInitial?.classList.add("hidden");
      devActPinActiveCard?.classList.remove("hidden");
      startPinPolling(res.pin);
      showToast(`Agent PIN generated: ${res.pin}. Enter this on Web CRM!`, "success");
    } else {
      showToast(res?.error || "Failed to generate Agent PIN.", "error");
    }
  } catch (err) {
    setButtonLoading(btnDevActRequestPin, false);
    showToast(err.message || "Failed to generate PIN.", "error");
  }
}

btnDevActRequestPin?.addEventListener("click", requestAndDisplayAgentPin);
btnDevActRegenPin?.addEventListener("click", requestAndDisplayAgentPin);

btnGeneratePinAgent?.addEventListener("click", () => {
  openDeviceActivationModal({
    email: currentAuthEmail,
    licenseKey: licenseKeyInput ? licenseKeyInput.value.trim() : ""
  });
  switchDevActTab("pin");
  requestAndDisplayAgentPin();
});

btnCopyAgentPin?.addEventListener("click", () => {
  if (currentActiveAgentPin) {
    navigator.clipboard.writeText(currentActiveAgentPin);
    showToast(`PIN ${currentActiveAgentPin} copied to clipboard!`, "success");
  }
});

async function checkPinStatusOnce() {
  if (!currentActiveAgentPin) return;
  try {
    const cloudUrl = devActServerSelect?.value || (cloudUrlInput ? cloudUrlInput.value.trim() : "");
    const res = await window.electronAPI.checkAgentPinStatus({
      pin: currentActiveAgentPin,
      cloudUrl
    });

    if (res && res.success && res.status === "activated" && res.licenseKey) {
      stopPinPolling();
      isMachineLocallyAuthorized = true;
      if (licenseKeyInput) licenseKeyInput.value = res.licenseKey;
      if (res.companyName && companyNameInput && !isPlaceholderComp(res.companyName) && (!companyNameInput.value || isPlaceholderComp(companyNameInput.value))) {
        companyNameInput.value = res.companyName;
      }
      if (res.companyCode && companyCodeInput && !isPlaceholderComp(res.companyCode) && (!companyCodeInput.value || isPlaceholderComp(companyCodeInput.value))) {
        companyCodeInput.value = res.companyCode;
      }
      if (res.expiresAt) {
        updateLicenseCountdown(res.expiresAt);
        updateLicenseStatusUI(true, res.expiresAt);
      }
      dismissDeviceActivationModal();
      showToast(`🎉 Machine authorized from Web CRM! License key ${res.licenseKey} activated!`, "success");
      await loadAndDisplayConfig();
      updateSyncButtonRequirementState();
    }
  } catch (err) {
    console.warn("PIN poll check warning:", err);
  }
}

function startPinPolling(pin) {
  stopPinPolling();
  currentActiveAgentPin = pin;
  agentPinPollTimer = setInterval(checkPinStatusOnce, 3000);
}

btnDevActCheckPinNow?.addEventListener("click", async () => {
  showToast("Checking Web verification status...", "info");
  await checkPinStatusOnce();
});

isMachineLocallyAuthorized = false;
let devActTargetEmail = "";
let pendingConfigToSave = null;

// Unified OTP Input: listen for typing or pasting 6 digits together
devActOtpInput?.addEventListener("input", () => {
  const val = devActOtpInput.value.replace(/\D/g, "").slice(0, 6);
  devActOtpInput.value = val;
  if (btnDevActConfirm) {
    btnDevActConfirm.disabled = val.length !== 6;
  }
});

devActOtpInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && devActOtpInput.value.length === 6) {
    e.preventDefault();
    btnDevActConfirm?.click();
  }
});

async function openDeviceActivationModal(data) {
  isMachineLocallyAuthorized = false;
  let email = (data?.email || currentAuthEmail || (emailInput ? emailInput.value.trim() : "")).trim().toLowerCase();
  if (!email && window.electronAPI?.getConfig) {
    try {
      const cfg = await window.electronAPI.getConfig();
      if (cfg?.userEmail) email = cfg.userEmail.trim().toLowerCase();
    } catch {}
  }
  if (!email && window.electronAPI?.checkSession) {
    try {
      const sess = await window.electronAPI.checkSession();
      if (sess?.session?.email) email = sess.session.email.trim().toLowerCase();
    } catch {}
  }
  devActTargetEmail = email;
  const targetLicense = data?.licenseKey || (licenseKeyInput ? licenseKeyInput.value.trim() : "");
  if (devActEmail) devActEmail.textContent = devActTargetEmail || "Account Email";
  if (devActMachineName) devActMachineName.textContent = data?.deviceName || "This Computer";
  if (devActDeviceId) devActDeviceId.textContent = data?.deviceId || "...";
  if (devActSentToEmail) devActSentToEmail.textContent = devActTargetEmail || "your email";
  if (devActLicenseKey) devActLicenseKey.textContent = targetLicense || "Account License";
  if (window.electronAPI?.getConfig) {
    try {
      const cfg = await window.electronAPI.getConfig();
      if (cfg?.cloudUrl) {
        updateServerEnvDisplay(cfg.cloudUrl);
      }
    } catch {}
  }

  // Default to Web PIN tab
  switchDevActTab("pin");

  // Reset modal sections & input
  devActSendSection?.classList.remove("hidden");
  devActVerifySection?.classList.add("hidden");
  if (devActError) {
    if (data?.error) {
      devActError.textContent = sanitizeMessage(data.error);
      devActError.classList.remove("hidden");
    } else {
      devActError.textContent = "";
      devActError.classList.add("hidden");
    }
  }
  if (devActOtpInput) devActOtpInput.value = "";
  if (btnDevActConfirm) btnDevActConfirm.disabled = true;
  deviceActivationModal?.classList.remove("hidden");

  // Auto request PIN if not yet displayed
  if (!currentActiveAgentPin) {
    requestAndDisplayAgentPin();
  }

  if (data?.autoSend) {
    switchDevActTab("otp");
    setTimeout(() => {
      btnDevActSendOtp?.click();
    }, 150);
  }
}

async function checkAndPromptDeviceLicense(userEmail, explicitLicenseKey) {
  if (!window.electronAPI?.checkDeviceLicense) return;
  try {
    const email = userEmail || currentAuthEmail || (emailInput ? emailInput.value.trim() : "");
    const cloudUrl = cloudUrlInput ? cloudUrlInput.value.trim() : "";
    const licenseKey = explicitLicenseKey || (licenseKeyInput ? licenseKeyInput.value.trim() : "");
    const res = await window.electronAPI.checkDeviceLicense({ email, cloudUrl, licenseKey });

    if (res && res.success) {
      if (res.authorized && !res.isExpired) {
        // Machine is authorized!
        isMachineLocallyAuthorized = true;
        deviceActivationModal?.classList.add("hidden");
        if (licenseKeyInput && !licenseKeyInput.value && res.licenseKey) {
          licenseKeyInput.value = res.licenseKey;
        }
        if (res.expiresAt) {
          updateLicenseCountdown(res.expiresAt);
          updateLicenseStatusUI(true, res.expiresAt);
        }
        updateSyncButtonRequirementState();
      } else if (res.isNewDevice || !res.authorized || res.requiresVerification) {
        isMachineLocallyAuthorized = false;
        updateLicenseStatusUI(false, null);
        updateSyncButtonRequirementState();
        openDeviceActivationModal({
          email: res.email || email,
          deviceName: res.deviceName,
          deviceId: res.deviceId,
          licenseKey: res.licenseKey || licenseKey,
          error: res.message
        });
      }
    }
  } catch (err) {
    console.error("Device license check failed:", err);
  }
}

// Send Device OTP
btnDevActSendOtp?.addEventListener("click", async () => {
  setButtonLoading(btnDevActSendOtp, true);
  if (devActError) devActError.classList.add("hidden");

  try {
    let email = devActTargetEmail || currentAuthEmail || (emailInput ? emailInput.value.trim() : "");
    if (!email && window.electronAPI?.getConfig) {
      try {
        const cfg = await window.electronAPI.getConfig();
        if (cfg?.userEmail) email = cfg.userEmail.trim();
      } catch {}
    }
    const cloudUrl = cloudUrlInput ? cloudUrlInput.value.trim() : "";
    const licenseKey = licenseKeyInput ? licenseKeyInput.value.trim() : "";
    const res = await window.electronAPI.sendDeviceOtp({ email, cloudUrl, licenseKey });
    setButtonLoading(btnDevActSendOtp, false);

    if (res && res.success) {
      devActSendSection?.classList.add("hidden");
      devActVerifySection?.classList.remove("hidden");
      const targetDisplay = (res.targetEmails && Array.isArray(res.targetEmails)) ? res.targetEmails.join(", ") : (res.email || email);
      devActTargetEmail = res.email || email;
      if (devActSentToEmail) devActSentToEmail.textContent = targetDisplay;
      if (devActOtpInput) {
        devActOtpInput.value = "";
        setTimeout(() => devActOtpInput.focus(), 100);
      }
      if (btnDevActConfirm) btnDevActConfirm.disabled = true;
      showToast(`Verification code sent to ${targetDisplay}`, "success");
    } else {
      const msg = res?.error || "Failed to send verification code.";
      if (devActError) { devActError.textContent = msg; devActError.classList.remove("hidden"); }
      showToast(msg, "error");
    }
  } catch (err) {
    setButtonLoading(btnDevActSendOtp, false);
    const msg = err.message || "Network error sending OTP.";
    if (devActError) { devActError.textContent = msg; devActError.classList.remove("hidden"); }
    showToast(msg, "error");
  }
});

// Resend Device OTP
btnDevActResend?.addEventListener("click", () => {
  btnDevActSendOtp?.click();
});

// Back button from verify section to send section
btnDevActBack?.addEventListener("click", () => {
  devActVerifySection?.classList.add("hidden");
  devActSendSection?.classList.remove("hidden");
  if (devActError) devActError.classList.add("hidden");
});

// Confirm Device Activation
btnDevActConfirm?.addEventListener("click", async () => {
  const otpVal = devActOtpInput ? devActOtpInput.value.trim() : "";
  if (otpVal.length !== 6) {
    showToast("Please enter the complete 6-digit code.", "warning");
    return;
  }
  setButtonLoading(btnDevActConfirm, true);
  if (devActError) devActError.classList.add("hidden");

  try {
    let email = devActTargetEmail || currentAuthEmail || (emailInput ? emailInput.value.trim() : "");
    if (!email && window.electronAPI?.getConfig) {
      try {
        const cfg = await window.electronAPI.getConfig();
        if (cfg?.userEmail) email = cfg.userEmail.trim();
      } catch {}
    }
    const cloudUrl = cloudUrlInput ? cloudUrlInput.value.trim() : "";
    const licenseKey = licenseKeyInput ? licenseKeyInput.value.trim() : "";
    const res = await window.electronAPI.activateDevice({
      email,
      cloudUrl,
      licenseKey,
      otp: otpVal
    });
    setButtonLoading(btnDevActConfirm, false);

    if (res && res.success) {
      isMachineLocallyAuthorized = true;
      showToast(res.message || "Machine authorized successfully!", "success");
      if (licenseKeyInput && res.licenseKey) {
        licenseKeyInput.value = res.licenseKey;
      }
      if (res.expiresAt) {
        updateLicenseCountdown(res.expiresAt);
      }
      deviceActivationModal?.classList.add("hidden");

      // If configuration was waiting for email OTP verification, save it now!
      if (pendingConfigToSave) {
        pendingConfigToSave.licenseKey = res.licenseKey || pendingConfigToSave.licenseKey;
        await window.electronAPI.saveConfig(pendingConfigToSave);
        pendingConfigToSave = null;
      }

      setFormLocked(true); // Lock form after save
      saveNotice.textContent = "Configuration saved and license verified!";
      saveNotice.className = "save-notice";
      saveNotice.classList.remove("hidden");
      setTimeout(() => saveNotice.classList.add("hidden"), 4000);

      if (statLastStatus && (statLastStatus.textContent === "Error" || statLastStatus.textContent === "Failed")) {
        statLastStatus.textContent = "Ready";
        statLastStatus.style.color = "#10b981";
      }
      try {
        await loadAndDisplayConfig();
      } catch (reloadErr) {
        console.warn("Post-activation config display warning:", reloadErr);
      }
    } else {
      const msg = res?.error || "Activation failed. Please check the code.";
      if (devActError) { devActError.textContent = msg; devActError.classList.remove("hidden"); }
      showToast(msg, "error");
    }
  } catch (err) {
    setButtonLoading(btnDevActConfirm, false);
    const msg = err.message || "Network error during device activation.";
    if (devActError) { devActError.textContent = msg; devActError.classList.remove("hidden"); }
    showToast(msg, "error");
  }
});

// Dismiss / Close Modal
const dismissDeviceActivationModal = () => {
  stopPinPolling();
  deviceActivationModal?.classList.add("hidden");
};
btnCloseDevActModal?.addEventListener("click", dismissDeviceActivationModal);
btnXCloseDevActModal?.addEventListener("click", dismissDeviceActivationModal);

// ---------------------------------------------------------------------------
// Terms & Conditions Modal Handlers
// ---------------------------------------------------------------------------
const termsModal = document.getElementById("termsModal");
const btnXCloseTermsModal = document.getElementById("btnXCloseTermsModal");
const btnCloseTermsModal = document.getElementById("btnCloseTermsModal");
const btnAcceptTermsModal = document.getElementById("btnAcceptTermsModal");
const openTermsFromLogin = document.getElementById("openTermsFromLogin");
const openTermsFromSignup = document.getElementById("openTermsFromSignup");
const openTermsFromSettings = document.getElementById("openTermsFromSettings");

function showTermsModal() {
  if (termsModal) termsModal.classList.remove("hidden");
}

function hideTermsModal() {
  if (termsModal) termsModal.classList.add("hidden");
}

openTermsFromLogin?.addEventListener("click", (e) => {
  e.preventDefault();
  showTermsModal();
});

openTermsFromSignup?.addEventListener("click", (e) => {
  e.preventDefault();
  showTermsModal();
});

openTermsFromSettings?.addEventListener("click", (e) => {
  e.preventDefault();
  showTermsModal();
});

btnXCloseTermsModal?.addEventListener("click", hideTermsModal);
btnCloseTermsModal?.addEventListener("click", hideTermsModal);

btnAcceptTermsModal?.addEventListener("click", () => {
  if (termsConsentCheckbox) {
    termsConsentCheckbox.checked = true;
    updateTermsState(true);
  }
  const regTermsAccepted = document.getElementById("regTermsAccepted");
  if (regTermsAccepted) {
    regTermsAccepted.checked = true;
  }
  hideTermsModal();
  showToast("Terms & Conditions and Data Privacy agreement accepted.", "success");
});

// ---------------------------------------------------------------------------
// Resend Verification Code in Step 2 OTP screen
// ---------------------------------------------------------------------------
const resendOtpBtn = document.getElementById("resendOtpBtn");
resendOtpBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  const cloudUrl = cloudUrlInput ? cloudUrlInput.value.trim() : "";
  const email = currentAuthEmail || (emailInput ? emailInput.value.trim() : "");
  if (!email) {
    showToast("Email address missing. Please go back to login.", "error");
    return;
  }

  showToast("Sending new verification code...", "info");
  try {
    const res = await window.electronAPI.resendOtp({ cloudUrl, email });
    if (res && res.success) {
      showToast(res.message || "Verification code resent successfully.", "success");
    } else {
      showToast(res?.message || "Failed to resend verification code.", "error");
    }
  } catch (err) {
    showToast(err.message || "Network error while resending verification code.", "error");
  }
});

// ---------------------------------------------------------------------------
// Generate New License Key Feature
// ---------------------------------------------------------------------------
const btnGenerateNewLicenseKey = document.getElementById("btnGenerateNewLicenseKey");
const btnDevActGenerateKey = document.getElementById("btnDevActGenerateKey");

async function handleGenerateNewLicenseKey() {
  const cloudUrl = cloudUrlInput ? cloudUrlInput.value.trim() : "";
  const email = currentAuthEmail || (operatorEmailInput ? operatorEmailInput.value.trim() : "") || (emailInput ? emailInput.value.trim() : "");

  const confirmGen = confirm(
    "Generate a new license key for this workstation?\n\n" +
    "A brand new 30-day active license key will be generated from the cloud server and bound to this computer."
  );
  if (!confirmGen) return;

  showToast("Generating new license key from cloud server...", "info");
  if (btnGenerateNewLicenseKey) {
    btnGenerateNewLicenseKey.disabled = true;
    btnGenerateNewLicenseKey.textContent = "⏳ Generating...";
  }

  try {
    const res = await window.electronAPI.generateNewLicenseKey({ cloudUrl, email });
    if (res && res.success && res.license) {
      showToast(`New license key generated: ${res.license}`, "success");

      if (licenseKeyInput) {
        licenseKeyInput.value = res.license;
      }
      if (devActLicenseKey) {
        devActLicenseKey.textContent = res.license;
      }
      if (licenseCountdownBadge) {
        licenseCountdownBadge.classList.remove("hidden");
        if (licenseCountdownText) licenseCountdownText.textContent = `${res.daysRemaining || 30} Days Left`;
      }
      if (operatorStatusBadge) {
        operatorStatusBadge.textContent = "Authorized";
        operatorStatusBadge.className = "operator-status-badge authorized";
      }

      isMachineLocallyAuthorized = true;
      updateLicenseStatusUI(true, res.expiresAt || new Date(Date.now() + 30 * 86400000).toISOString());
      updateSyncButtonRequirementState();

      // Close device activation modal if open
      if (deviceActivationModal && !deviceActivationModal.classList.contains("hidden")) {
        deviceActivationModal.classList.add("hidden");
      }

      await loadAndDisplayConfig();
    } else {
      const errMsg = res?.error || res?.message || "Could not generate new license key.";
      showToast(errMsg, "error");
    }
  } catch (err) {
    showToast(err.message || "Failed to generate new license key.", "error");
  } finally {
    if (btnGenerateNewLicenseKey) {
      btnGenerateNewLicenseKey.disabled = false;
      btnGenerateNewLicenseKey.textContent = "⚡ New Key Gen";
    }
  }
}

btnGenerateNewLicenseKey?.addEventListener("click", handleGenerateNewLicenseKey);
btnDevActGenerateKey?.addEventListener("click", handleGenerateNewLicenseKey);
