"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { 
  FolderOpen, 
  Database, 
  RefreshCw, 
  Play, 
  Clock,
  Plus,
  X,
  Check,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UploadCloud,
  Laptop,
  Server,
  Terminal,
  Download,
  Copy,
  HelpCircle,
  Lock,
  Unlock,
  Key,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface VfpSyncActionsProps {
  currentPath?: string;
  destinationPath?: string;
  enabledFiles?: string[];
  initialAutoSync?: boolean;
  initialAutoSyncInterval?: number;
  workerOnline?: boolean;
  workerStatus?: string;
  lastSyncedAt?: Date | string;
  pendingCommandCount?: number;
  userEmail?: string;
}

function formatIntervalSummary(mins: number): string {
  if (!mins || mins <= 0) return "Every 10 minutes";
  if (mins < 60) return `Every ${mins} minute${mins === 1 ? "" : "s"}`;
  if (mins % 1440 === 0) {
    const d = mins / 1440;
    return `Every ${d} day${d === 1 ? "" : "s"}`;
  }
  if (mins % 60 === 0) {
    const h = mins / 60;
    return `Every ${h} hour${h === 1 ? "" : "s"}`;
  }
  return `Every ${mins} minutes`;
}

function maskFileName(fileName: string): string {
  if (!fileName) return "••••••••.DBF";
  const parts = fileName.split(".");
  const ext = parts.length > 1 ? `.${parts.pop()}` : ".DBF";
  return "••••••••" + ext.toUpperCase();
}

function formatCountdown(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s < 10 ? "0" : ""}${s}s`;
}

export default function VfpSyncActions({ 
  currentPath = "", 
  destinationPath = "",
  enabledFiles = [], 
  initialAutoSync = false,
  initialAutoSyncInterval = 10,
  workerOnline = false,
  workerStatus = "offline",
  lastSyncedAt,
  pendingCommandCount = 0,
  userEmail = ""
}: VfpSyncActionsProps) {
  const router = useRouter();

  const [dataDir, setDataDir] = useState(currentPath);
  const [syncScope, setSyncScope] = useState<"selected">("selected");
  const [selectedFiles, setSelectedFiles] = useState<string[]>(enabledFiles);
  const [autoSync, setAutoSync] = useState(initialAutoSync);
  const [autoSyncInterval, setAutoSyncInterval] = useState(initialAutoSyncInterval);
  const [isEditingInterval, setIsEditingInterval] = useState(false);
  
  // Custom unit state & preset calculation
  const [customValueStr, setCustomValueStr] = useState<string>(() => {
    if (initialAutoSyncInterval >= 1440 && initialAutoSyncInterval % 1440 === 0) {
      return String(initialAutoSyncInterval / 1440);
    }
    if (initialAutoSyncInterval >= 60 && initialAutoSyncInterval % 60 === 0) {
      return String(initialAutoSyncInterval / 60);
    }
    return String(Math.min(1440, Math.max(1, initialAutoSyncInterval)));
  });

  const [customUnit, setCustomUnit] = useState<"minutes" | "hours" | "days">( animateUnit(initialAutoSyncInterval) );

  function animateUnit(mins: number): "minutes" | "hours" | "days" {
    if (mins >= 1440 && mins % 1440 === 0) return "days";
    if (mins >= 60 && mins % 60 === 0) return "hours";
    return "minutes";
  }

  const [presetInterval, setPresetInterval] = useState<string>(() => {
    if ([10, 30, 60, 360, 720, 1440, 10080].includes(initialAutoSyncInterval)) {
      return String(initialAutoSyncInterval);
    }
    return "custom";
  });

  const [message, setMessage] = useState<{ type: "success" | "error" | "info" | ""; text: string }>({
    type: "",
    text: ""
  });

  const [busyAction, setBusyAction] = useState<string | null>(null);

  // User email & File Name Protection state
  const { toast } = useToast();
  const [isFilesUnlocked, setIsFilesUnlocked] = useState(false);
  const [unlockedRemainingSec, setUnlockedRemainingSec] = useState(0);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpStep, setOtpStep] = useState<"send" | "verify">("send");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpValue, setOtpValue] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpModalMsg, setOtpModalMsg] = useState<{ type: "success" | "error" | "info" | ""; text: string }>({ type: "", text: "" });
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check sessionStorage on mount for active 5-min unlock period
  useEffect(() => {
    const storageKey = `vfp_files_unlocked_until_${userEmail || "user"}`;
    const storedUntil = sessionStorage.getItem(storageKey);
    if (storedUntil) {
      const remainingMs = Number(storedUntil) - Date.now();
      if (remainingMs > 0) {
        setIsFilesUnlocked(true);
        setUnlockedRemainingSec(Math.ceil(remainingMs / 1000));
      } else {
        sessionStorage.removeItem(storageKey);
      }
    }
  }, [userEmail]);

  // Live 1s Countdown timer for 5-minute auto-hide
  useEffect(() => {
    if (!isFilesUnlocked || unlockedRemainingSec <= 0) return;

    const timer = setInterval(() => {
      setUnlockedRemainingSec((prev) => {
        if (prev <= 1) {
          setIsFilesUnlocked(false);
          const storageKey = `vfp_files_unlocked_until_${userEmail || "user"}`;
          sessionStorage.removeItem(storageKey);
          toast.info("🔒 5-minute view period expired. Table file names have automatically hidden.");
          setMessage({
            type: "info",
            text: "🔒 5-minute view period expired. Table file names have automatically hidden.",
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isFilesUnlocked, unlockedRemainingSec, userEmail, toast]);

  // Resend OTP cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleOpenOtpModal = () => {
    setShowOtpModal(true);
    setOtpStep("send");
    setOtpDigits(["", "", "", "", "", ""]);
    setOtpValue("");
    setOtpModalMsg({ type: "", text: "" });
  };

  const handleSendOtpCode = async () => {
    if (sendingOtp) return;
    setSendingOtp(true);
    const infoMsg = `Sending 6-digit verification code to ${userEmail || "your email"}...`;
    setOtpModalMsg({ type: "info", text: infoMsg });

    try {
      const res = await fetch("/api/mabsolcrmsync/send-otp", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setOtpStep("verify");
        const succMsg = data.message || `Verification OTP sent to ${userEmail}`;
        setOtpModalMsg({ type: "success", text: succMsg });
        toast.success(succMsg);
        setResendCooldown(30);
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 100);
      } else {
        const errMsg = data.message || "Failed to send verification code.";
        setOtpModalMsg({ type: "error", text: errMsg });
        toast.error(errMsg);
      }
    } catch {
      const errMsg = "Error sending verification email.";
      setOtpModalMsg({ type: "error", text: errMsg });
      toast.error(errMsg);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || sendingOtp) return;
    setSendingOtp(true);
    setOtpModalMsg({ type: "info", text: "Resending verification code..." });

    try {
      const res = await fetch("/api/mabsolcrmsync/send-otp", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const msg = data.message || "New OTP code sent!";
        setOtpModalMsg({ type: "success", text: msg });
        toast.success(msg);
        setResendCooldown(30);
      } else {
        const msg = data.message || "Failed to resend OTP.";
        setOtpModalMsg({ type: "error", text: msg });
        toast.error(msg);
      }
    } catch {
      const msg = "Error resending OTP.";
      setOtpModalMsg({ type: "error", text: msg });
      toast.error(msg);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);
    setOtpValue(newDigits.join(""));

    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      const newDigits = ["", "", "", "", "", ""];
      pasted.split("").forEach((char, i) => {
        if (i < 6) newDigits[i] = char;
      });
      setOtpDigits(newDigits);
      setOtpValue(newDigits.join(""));
      const focusIndex = Math.min(pasted.length, 5);
      otpInputRefs.current[focusIndex]?.focus();
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpValue || otpValue.trim().length === 0) {
      const msg = "Please enter the 6-digit verification code.";
      setOtpModalMsg({ type: "error", text: msg });
      toast.error(msg);
      return;
    }

    setVerifyingOtp(true);
    setOtpModalMsg({ type: "info", text: "Verifying code..." });

    try {
      const res = await fetch("/api/mabsolcrmsync/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpValue.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        const unlockMs = 5 * 60 * 1000;
        const expiresAt = Date.now() + unlockMs;
        const storageKey = `vfp_files_unlocked_until_${userEmail || "user"}`;
        sessionStorage.setItem(storageKey, String(expiresAt));

        setIsFilesUnlocked(true);
        setUnlockedRemainingSec(300);
        setShowOtpModal(false);
        const succMsg = "🔓 Email verified! DBF table file names unlocked for 5 minutes.";
        setMessage({
          type: "success",
          text: succMsg,
        });
        toast.success(succMsg);
      } else {
        const errMsg = data.message || "Invalid verification code.";
        setOtpModalMsg({ type: "error", text: errMsg });
        toast.error(errMsg);
      }
    } catch {
      const errMsg = "Verification request failed.";
      setOtpModalMsg({ type: "error", text: errMsg });
      toast.error(errMsg);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleLockNow = () => {
    setIsFilesUnlocked(false);
    setUnlockedRemainingSec(0);
    const storageKey = `vfp_files_unlocked_until_${userEmail || "user"}`;
    sessionStorage.removeItem(storageKey);
    toast.info("🔒 Table file names hidden.");
    setMessage({ type: "info", text: "🔒 Table file names are now locked and hidden." });
  };

  // Live sync progress state
  const [syncProgress, setSyncProgress] = useState<{
    isRunning: boolean;
    totalTables: number;
    doneTables: number;
    failedTables: number;
    runningTables: string[];
    completedTables: { tableName: string; importedCount: number }[];
    failedTablesList: { tableName: string; error?: string }[];
    startedAt?: string;
  } | null>(null);
  const progressPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSyncingRef = useRef(false);
  
  // Scanned folder DBF files
  const [folderDbfFiles, setFolderDbfFiles] = useState<string[]>([]);
  const [scanningFolder, setScanningFolder] = useState(false);

  // Direct DBF Upload & Worker Setup Modal State
  const [uploading, setUploading] = useState(false);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const directDbfInputRef = useRef<HTMLInputElement>(null);

  // Direct Browser Upload Handler for AWS Linux Cloud
  const handleDirectDbfUpload = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const dbfFiles = Array.from(files).filter((f) => f.name.toLowerCase().endsWith(".dbf"));
    if (dbfFiles.length === 0) {
      setMessage({ type: "error", text: "Please select valid .DBF files to upload." });
      return;
    }

    setUploading(true);
    let successCount = 0;
    let totalImportedRows = 0;
    const allUploadedNames: string[] = [];

    try {
      for (let i = 0; i < dbfFiles.length; i++) {
        const file = dbfFiles[i];
        const mbSize = (file.size / (1024 * 1024)).toFixed(1);
        setMessage({
          type: "info",
          text: `[${i + 1}/${dbfFiles.length}] Uploading & syncing ${file.name} (${mbSize} MB)... Please wait.`,
        });

        const formData = new FormData();
        formData.append("directSync", "true");
        formData.append("files", file);

        const res = await fetch("/api/mabsolcrmsync/upload-dbf", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          if (res.status === 413) {
            throw new Error(`File ${file.name} (${mbSize} MB) exceeds server upload limit. Run: sudo sed -i 's/client_max_body_size .*/client_max_body_size 500M;/' /etc/nginx/sites-available/* && sudo systemctl reload nginx on server.`);
          }
          const errText = await res.text().catch(() => "");
          throw new Error(errText || `Server returned HTTP status ${res.status}`);
        }

        const data = await res.json();
        if (data.success) {
          successCount++;
          const rows = data.result?.importedRows || 0;
          totalImportedRows += rows;
          if (data.uploadedFileNames) {
            allUploadedNames.push(...data.uploadedFileNames);
          }
          setMessage({
            type: "info",
            text: `[${i + 1}/${dbfFiles.length}] Synced ${file.name} (${rows.toLocaleString()} rows). Moving to next...`,
          });
        } else {
          throw new Error(data.error || `Failed to sync ${file.name}`);
        }
      }

      setMessage({
        type: "success",
        text: `Successfully synced ${successCount} DBF table(s) (${totalImportedRows.toLocaleString()} rows) directly into database! Server temporary files cleaned up.`,
      });
      if (allUploadedNames.length > 0) {
        setSelectedFiles((prev) => Array.from(new Set([...prev, ...allUploadedNames])));
      }
      router.refresh();
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.message || "Error occurred while uploading DBF files.",
      });
    } finally {
      setUploading(false);
    }
  };

  // Native file & directory input refs
  const nativeFolderInputRef = useRef<HTMLInputElement>(null);
  const nativeFileInputRef = useRef<HTMLInputElement>(null);

  const isMounted = useRef(false);
  const prevProps = useRef({ currentPath, enabledFiles });
  const lastUserEditTimeRef = useRef<number>(0);

  // Directly trigger native browser folder picker
  const handleOpenNativeFolderPicker = () => {
    if (autoSync) {
      setMessage({ type: "info", text: "Please turn off Auto-sync below to change folder." });
      return;
    }
    nativeFolderInputRef.current?.click();
  };

  const handleNativeFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const firstFile = files[0] as any;

      // 1. Extract full disk path if available from Electron/local browser
      let selectedPath = "";
      if (firstFile && firstFile.path) {
        const lastSlash = Math.max(firstFile.path.lastIndexOf("/"), firstFile.path.lastIndexOf("\\"));
        if (lastSlash !== -1) {
          selectedPath = firstFile.path.substring(0, lastSlash);
        }
      }

      // 2. Fallback: resolve relative folder name against current parent directory
      if (!selectedPath || (!selectedPath.includes(":") && !selectedPath.startsWith("/"))) {
        const relPath = firstFile.webkitRelativePath || "";
        let relFolder = "";
        if (relPath) {
          const firstSlash = relPath.indexOf("/");
          if (firstSlash !== -1) {
            relFolder = relPath.substring(0, firstSlash);
          }
        }

        const folderName = relFolder || firstFile.name || "";
        
        // Only use the console's own dataDir as base — do NOT fall back to
        // destinationPath which comes from the Settings page.
        const activeBase = (dataDir && (dataDir.includes(":") || dataDir.startsWith("/")))
          ? dataDir
          : "";

        if (activeBase && folderName) {
          const lastSlash = Math.max(activeBase.lastIndexOf("/"), activeBase.lastIndexOf("\\"));
          if (lastSlash !== -1) {
            const parentDir = activeBase.substring(0, lastSlash);
            selectedPath = `${parentDir}\\${folderName}`;
          } else {
            selectedPath = `${activeBase}\\${folderName}`;
          }
        } else if (folderName) {
          selectedPath = folderName;
        }
      }

      if (selectedPath) {
        setDataDir(selectedPath);
      }

      // Extract all .dbf files from the selected folder and populate them in the list
      const dbfNames: string[] = [];
      Array.from(files).forEach((f) => {
        if (f.name.toLowerCase().endsWith(".dbf")) {
          if (!dbfNames.includes(f.name)) dbfNames.push(f.name);
        }
      });

      const updatedFiles = dbfNames.length > 0 ? Array.from(new Set([...selectedFiles, ...dbfNames])) : selectedFiles;
      if (dbfNames.length > 0) {
        setSelectedFiles(updatedFiles);
      }
      setSyncScope("selected");
      saveConfiguration(selectedPath || dataDir, "selected", updatedFiles, autoSync, autoSyncInterval, true);
    }
    e.target.value = "";
  };

  // Directly trigger native file picker for DBF tables
  const handleOpenNativeFilePicker = () => {
    if (autoSync) {
      setMessage({ type: "info", text: "Please turn off Auto-sync below to add DBF tables." });
      return;
    }
    nativeFileInputRef.current?.click();
  };

  const handleNativeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleDirectDbfUpload(files);
    }
    e.target.value = "";
  };

  // Auto-scan DBF files in current folder
  useEffect(() => {
    if (!dataDir) {
      setFolderDbfFiles([]);
      return;
    }
    let isCancelled = false;
    async function scanDbf() {
      setScanningFolder(true);
      try {
        const res = await fetch(`/api/mabsolcrmsync/browse?dir=${encodeURIComponent(dataDir)}&type=dbf`);
        const data = await res.json();
        if (!isCancelled && data.success && Array.isArray(data.files)) {
          setFolderDbfFiles(data.files);
        }
      } catch {
        // Ignore scan error
      } finally {
        if (!isCancelled) setScanningFolder(false);
      }
    }
    scanDbf();
    return () => { isCancelled = true; };
  }, [dataDir]);

  // Sync state values when props change
  useEffect(() => {
    // Only set dataDir from props on first mount — after that the user owns
    // this field locally.  This prevents Settings-page data from ghosting
    // back into the Sync Console path after a router.refresh().
    if (!isMounted.current) {
      setDataDir(currentPath);
    }
    setAutoSync(initialAutoSync);
    setAutoSyncInterval(initialAutoSyncInterval);
    setPresetInterval([10, 30, 60].includes(initialAutoSyncInterval) ? String(initialAutoSyncInterval) : "custom");
    
    const enabledFilesChanged = JSON.stringify(prevProps.current.enabledFiles) !== JSON.stringify(enabledFiles);
    const userRecentlyEdited = Date.now() - lastUserEditTimeRef.current < 4000;

    if (!isMounted.current || (enabledFilesChanged && !userRecentlyEdited)) {
      setSelectedFiles(enabledFiles);
      setSyncScope("selected");
      isMounted.current = true;
    }

    prevProps.current = { currentPath, enabledFiles };
  }, [currentPath, enabledFiles, initialAutoSync, initialAutoSyncInterval]);

  // Unified save config function
  // NOTE: This only saves consoleSyncDir (the Sync Console's own path) and never
  // touches dataDir, prgPath, vfpExePath or any other Settings-page-only fields.
  async function saveConfiguration(
    updatedDir: string, 
    updatedScope: "all" | "selected", 
    updatedFiles: string[], 
    updatedAutoSync: boolean,
    updatedInterval: number,
    skipRefresh: boolean = false
  ) {
    lastUserEditTimeRef.current = Date.now();
    setMessage({ type: "info", text: "Saving configuration..." });
    
    const filesToSync = updatedFiles;
    
    // Only write consoleSyncDir — do NOT overwrite dataDir which is owned
    // by the Settings page (prgPath, vfpExePath, sourceDir, dataDir).
    const bodyPayload: any = {
      enabledFiles: filesToSync,
      autoSync: updatedAutoSync,
      autoSyncInterval: updatedInterval,
      consoleSyncDir: updatedDir ? updatedDir.trim() : "",
    };
    
    try {
      const response = await fetch("/api/mabsolcrmsync/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Settings saved successfully." });
        if (!skipRefresh) {
          router.refresh();
        }
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save configuration." });
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred while saving configuration." });
    }
  }

  // Handle folder path select
  function handleFolderSelect(selectedFolderPath: string) {
    setDataDir(selectedFolderPath);
    saveConfiguration(selectedFolderPath, syncScope, selectedFiles, autoSync, autoSyncInterval);
  }

  // Handle multiple DBF files selection
  function handleMultipleFilesSelect(selectedPaths: string[]) {
    if (!selectedPaths || selectedPaths.length === 0) return;
    
    let folderPath = dataDir;
    const newFileNames: string[] = [];

    selectedPaths.forEach((path) => {
      const lastSlash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
      const fileName = lastSlash !== -1 ? path.substring(lastSlash + 1) : path;
      if (lastSlash !== -1) {
        folderPath = path.substring(0, lastSlash);
      }
      if (!newFileNames.includes(fileName)) {
        newFileNames.push(fileName);
      }
    });

    setDataDir(folderPath);

    // Merge new file names with existing selected files
    const updated = Array.from(new Set([...selectedFiles, ...newFileNames]));
    setSelectedFiles(updated);
    setSyncScope("selected");
    saveConfiguration(folderPath, "selected", updated, autoSync, autoSyncInterval, true);
  }

  // Handle specific DBF file select (adds file to array if not present)
  function handleFileSelect(selectedFilePath: string) {
    const lastSlash = Math.max(selectedFilePath.lastIndexOf("/"), selectedFilePath.lastIndexOf("\\"));
    const fileName = lastSlash !== -1 ? selectedFilePath.substring(lastSlash + 1) : selectedFilePath;
    
    let folderPath = dataDir;
    if (lastSlash !== -1) {
      folderPath = selectedFilePath.substring(0, lastSlash);
      setDataDir(folderPath);
    }
    
    let updatedFiles = selectedFiles;
    if (!selectedFiles.includes(fileName)) {
      updatedFiles = [...selectedFiles, fileName];
    }
    
    setSelectedFiles(updatedFiles);
    setSyncScope("selected");
    saveConfiguration(folderPath, "selected", updatedFiles, autoSync, autoSyncInterval, true);
  }

  // Remove a specific file from selection
  function handleRemoveFile(fileToRemove: string) {
    const updated = selectedFiles.filter(f => f !== fileToRemove);
    setSelectedFiles(updated);
    const newScope = updated.length > 0 ? "selected" : "selected";
    saveConfiguration(dataDir, newScope, updated, autoSync, autoSyncInterval, true);
  }

  // Clear all selected DBF files
  function handleClearAllFiles() {
    setSelectedFiles([]);
    saveConfiguration(dataDir, "selected", [], autoSync, autoSyncInterval, true);
  }

  // Stop progress polling helper
  const stopProgressPolling = useCallback(() => {
    if (progressPollRef.current) {
      clearInterval(progressPollRef.current);
      progressPollRef.current = null;
    }
    isSyncingRef.current = false;
  }, []);

  // Start progress polling — polls every 2s until sync finishes
  const startProgressPolling = useCallback(() => {
    stopProgressPolling();
    isSyncingRef.current = true;
    const startTime = Date.now();
    const GRACE_PERIOD_MS = 4000; // don't declare done for at least 4s after start

    const poll = async () => {
      if (!isSyncingRef.current) return;
      try {
        const res = await fetch("/api/mabsolcrmsync/progress");
        const data = await res.json();
        if (!data.success) return;

        setSyncProgress({
          isRunning: data.isRunning,
          totalTables: data.totalTables || 0,
          doneTables: data.doneTables || 0,
          failedTables: data.failedTables || 0,
          runningTables: data.runningTables || [],
          completedTables: data.completedTables || [],
          failedTablesList: data.failedTablesList || [],
          startedAt: data.startedAt,
        });

        // Only declare done if grace period has passed (avoids race condition on first poll)
        const graceElapsed = Date.now() - startTime > GRACE_PERIOD_MS;
        if (!data.isRunning && isSyncingRef.current && graceElapsed) {
          stopProgressPolling();
          setBusyAction(null);
          setMessage({
            type: data.failedTables > 0 ? "info" : "success",
            text: `Sync complete! ${data.doneTables || 0} table(s) done${data.failedTables > 0 ? `, ${data.failedTables} failed` : ""}.`,
          });
          router.refresh();
        }
      } catch {
        // ignore poll errors
      }
    };

    // Poll immediately then every 2s
    poll();
    progressPollRef.current = setInterval(poll, 2000);
  }, [router, stopProgressPolling]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => stopProgressPolling();
  }, [stopProgressPolling]);

  // Client-side Auto Sync Scheduler Effect
  useEffect(() => {
    if (!autoSync || selectedFiles.length === 0) return;

    const intervalMins = Math.max(1, autoSyncInterval);
    const intervalMs = intervalMins * 60 * 1000;

    const timer = setInterval(() => {
      triggerSyncNow(true);
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [autoSync, autoSyncInterval, dataDir, syncScope, selectedFiles]);

  // Trigger manual or auto sync now
  async function triggerSyncNow(isAuto: boolean = false) {
    if (selectedFiles.length === 0) return;
    setBusyAction("sync");
    setSyncProgress(null);
    setMessage({ 
      type: "info", 
      text: isAuto ? "Running scheduled background auto-sync..." : "Starting DBF sync in background..." 
    });

    try {
      const response = await fetch("/api/mabsolcrmsync/sync-now", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        if (data.result?.background) {
          // Background sync started — begin polling for live progress
          setMessage({ 
            type: "info", 
            text: `Sync running in background... Tracking progress live below.` 
          });
          startProgressPolling();
          // Do NOT call router.refresh() here — wait until polling detects completion
        } else {
          // Queued mode (cloud/offline worker)
          setMessage({ 
            type: data.queued && !data.workerOnline ? "info" : "success", 
            text: data.message || "Sync queued."
          });
          setBusyAction(null);
          router.refresh();
        }
      } else {
        setMessage({ type: "error", text: data.error || "Failed to trigger sync." });
        setBusyAction(null);
      }
    } catch {
      setMessage({ type: "error", text: "Error occurred while executing sync." });
      setBusyAction(null);
    }
  }

  // Trigger cancel sync
  async function triggerCancelSync() {
    setBusyAction("cancel");
    stopProgressPolling();
    setSyncProgress(null);
    setMessage({ type: "info", text: "Cancelling sync and disabling Auto-sync..." });

    if (autoSync) {
      setAutoSync(false);
      saveConfiguration(dataDir, syncScope, selectedFiles, false, autoSyncInterval, true);
    }

    try {
      const response = await fetch("/api/mabsolcrmsync/cancel", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: data.message || "Sync cancelled and Auto-sync disabled." });
        router.refresh();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to cancel sync." });
      }
    } catch {
      setMessage({ type: "error", text: "Error occurred while cancelling sync." });
    } finally {
      setBusyAction(null);
    }
  }

  // Manual page refresh
  function handleRefreshStatus() {
    setBusyAction("refresh");
    setMessage({ type: "info", text: "Refreshing sync page status..." });
    setTimeout(() => {
      router.refresh();
      setMessage({ type: "success", text: "Sync status updated." });
      setBusyAction(null);
    }, 600);
  }

  function formatDate(value?: Date | string) {
    if (!value) {
      return "Never";
    }
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  return (
    <div 
      className="bg-white border border-slate-200/90 shadow-xs overflow-hidden w-full max-w-full box-border"
      style={{ borderRadius: "24px" }}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between p-2 sm:p-5 border-b border-slate-100 flex-wrap gap-3 w-full box-border bg-white">
        <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-900 tracking-tight">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-slate-700"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
          <span>Sync control panel</span>
        </div>
        <button 
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer shadow-2xs disabled:opacity-50 btn-pill" 
          style={{ borderRadius: "9999px" }}
          onClick={handleRefreshStatus} 
          disabled={Boolean(busyAction)} 
          type="button"
        >
          <RefreshCw size={13} className={`text-slate-500 ${busyAction === "refresh" ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="p-3.5 sm:p-6 w-full max-w-full overflow-hidden box-border">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5 sm:gap-6 items-start w-full box-border">
          
          {/* Left Column: Scope & Path Settings */}
          <div className="space-y-5 min-w-0">
            
            {/* TOP ITEM: SELECT DBF TABLES TO SYNC */}
            <div className="space-y-4">
              {/* SELECT DBF TABLES CONTAINER */}
              {(() => {
                const allClipsList = Array.from(new Set([...selectedFiles, ...folderDbfFiles]));
                return (
                  <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3.5 shadow-2xs">
                    
                    {/* DIRECT FILE UPLOAD AREA (REPLACES FOLDER PATH SELECTION) */}
                    <div className="space-y-2 pb-3 border-b border-slate-200/80">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <UploadCloud size={13} className="text-slate-700" />
                          <span>UPLOAD FILES DIRECTLY TO SYNC</span>
                        </span>
                        {selectedFiles.length > 0 ? (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full font-bold font-mono">
                            ✓ {selectedFiles.length} file(s) ready
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full font-bold font-mono">
                            No files uploaded
                          </span>
                        )}
                      </div>

                      {/* Dropzone & Browse button */}
                      <div
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (autoSync) {
                            setMessage({ type: "info", text: "Please turn off Auto-sync below to upload new files." });
                            return;
                          }
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            handleDirectDbfUpload(e.dataTransfer.files);
                          }
                        }}
                        onClick={() => {
                          if (autoSync) {
                            setMessage({ type: "info", text: "Please turn off Auto-sync below to upload new files." });
                            return;
                          }
                          nativeFileInputRef.current?.click();
                        }}
                        className={`border-2 border-dashed rounded-xl p-3.5 text-center transition-all cursor-pointer ${
                          uploading
                            ? "bg-slate-50 border-slate-300 pointer-events-none"
                            : autoSync
                            ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                            : "bg-white hover:bg-slate-50/80 border-slate-300 hover:border-slate-400 shadow-2xs"
                        }`}
                      >
                        {uploading ? (
                          <div className="flex items-center justify-center gap-2 py-1 text-xs font-semibold text-slate-700">
                            <Loader2 size={15} className="animate-spin text-slate-900" />
                            <span>Uploading files directly... Please wait</span>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <UploadCloud size={16} className="text-slate-700 shrink-0" />
                              <span className="font-bold text-slate-900 underline">Click to choose files</span>
                            </div>
                            <span className="text-slate-400 hidden sm:inline">|</span>
                            <span className="text-slate-500 text-[11px]">or drag & drop files here (.DBF)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                        <Database size={13} className="text-teal-600" />
                        <span>SELECT DBF TABLES TO SYNC</span>
                        {selectedFiles.length > 0 && (
                          <span className="text-teal-600 font-bold font-mono">({selectedFiles.length} active)</span>
                        )}
                        {scanningFolder && (
                          <span className="text-slate-400 text-[10px] animate-pulse">Scanning folder...</span>
                        )}
                      </span>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        <button 
                          type="button"
                          disabled={autoSync}
                          onClick={handleOpenNativeFilePicker}
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 bg-white border border-slate-200 text-slate-800 transition-all shadow-2xs btn-pill ${
                            autoSync ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-100 cursor-pointer"
                          }`}
                          style={{ borderRadius: "9999px" }}
                          title={autoSync ? "Turn off Auto-sync to add DBF tables" : "Open Windows Explorer to select DBF table(s)"}
                        >
                          <Plus size={12} className="text-slate-600" />
                          <span>Add DBF table(s)</span>
                        </button>

                        <button 
                          type="button"
                          disabled={autoSync || allClipsList.length === 0 || selectedFiles.length === allClipsList.length}
                          onClick={() => {
                            if (autoSync) {
                              setMessage({ type: "info", text: "Please turn off Auto-sync below to select all." });
                              return;
                            }
                            setSelectedFiles(allClipsList);
                            saveConfiguration(dataDir, "selected", allClipsList, autoSync, autoSyncInterval, true);
                          }}
                          className={`text-[11px] font-bold px-1.5 py-0.5 transition-colors ${
                            autoSync || allClipsList.length === 0 || selectedFiles.length === allClipsList.length
                              ? "text-slate-300 cursor-not-allowed"
                              : "text-teal-600 hover:text-teal-800 cursor-pointer"
                          }`}
                        >
                          Select all
                        </button>

                        <button 
                          type="button"
                          disabled={autoSync || selectedFiles.length === 0}
                          onClick={() => {
                            if (autoSync) {
                              setMessage({ type: "info", text: "Please turn off Auto-sync below to clear tables." });
                              return;
                            }
                            handleClearAllFiles();
                          }}
                          className={`text-[11px] font-bold px-1.5 py-0.5 transition-colors ${
                            autoSync || selectedFiles.length === 0
                              ? "text-slate-300 cursor-not-allowed"
                              : "text-red-500 hover:text-red-700 cursor-pointer"
                          }`}
                        >
                          Deselect all
                        </button>
                      </div>
                    </div>

                    {/* Privacy & File Unlock Section - Only show when tables are selected */}
                    {selectedFiles.length > 0 && (
                      !isFilesUnlocked ? (
                        <div className="p-3.5 sm:p-4 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ borderLeft: "3px solid #14b8a6" }}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200/70 flex items-center justify-center text-teal-600 shrink-0">
                              <Lock size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs sm:text-sm font-bold text-slate-800 leading-snug flex items-center gap-2 flex-wrap">
                                <span>DBF Table Names Hidden</span>
                                <span className="text-[10px] font-mono font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/80">
                                  {selectedFiles.length} active
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                Verify email OTP to reveal table names for 5 minutes.
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleOpenOtpModal}
                            className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-4.5 py-2 text-xs font-semibold text-teal-700 border border-teal-400 hover:bg-teal-50 hover:border-teal-500 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
                            style={{ borderRadius: "9999px" }}
                          >
                            <Key size={12} />
                            <span>Verify Email to View</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2.5 p-2.5 bg-emerald-50 border border-emerald-200/90 rounded-xl text-emerald-900 shadow-2xs">
                            <div className="flex items-center gap-2 text-xs font-bold">
                              <Unlock size={14} className="text-emerald-600 shrink-0" />
                              <span>File names unlocked (Auto-hides in <strong className="font-mono text-emerald-700 font-extrabold">{formatCountdown(unlockedRemainingSec)}</strong>)</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleLockNow}
                              className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer whitespace-nowrap shrink-0"
                              style={{ borderRadius: "9999px" }}
                            >
                              <Lock size={12} className="text-emerald-700" />
                              <span>Hide now</span>
                            </button>
                          </div>

                          {/* DBF Chips - Only visible when unlocked */}
                          {allClipsList.length > 0 ? (
                            <div className="flex items-center gap-2 flex-wrap pt-1">
                              {allClipsList.map((file) => {
                                const isSelected = selectedFiles.includes(file);
                                return (
                                  <button
                                    key={file}
                                    type="button"
                                    disabled={autoSync}
                                    onClick={() => {
                                      if (autoSync) {
                                        setMessage({ type: "info", text: "Please turn off Auto-sync below to select or deselect tables." });
                                        return;
                                      }
                                      lastUserEditTimeRef.current = Date.now();
                                      let updated: string[];
                                      if (isSelected) {
                                        updated = selectedFiles.filter((f) => f !== file);
                                      } else {
                                        updated = [...selectedFiles, file];
                                      }
                                      setSelectedFiles(updated);
                                      saveConfiguration(dataDir, "selected", updated, autoSync, autoSyncInterval, true);
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                                      isSelected
                                        ? "bg-slate-900 text-white shadow-xs"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                                    }`}
                                    style={{ borderRadius: "9999px" }}
                                    title={autoSync ? "Turn off Auto-sync to modify table selection" : `Click to toggle ${file}`}
                                  >
                                    {isSelected ? (
                                      <Check size={13} className="text-emerald-400 shrink-0 stroke-[3]" />
                                    ) : (
                                      <span className="text-teal-600 font-bold text-xs shrink-0">+</span>
                                    )}
                                    <span>{file}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500 font-mono italic">
                              No DBF tables selected. Click "Add DBF table(s)" to select files.
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                );
              })()}
            </div>

            {(() => {
              const isNoFilesSelected = selectedFiles.length === 0;
              const isAutoSyncDisabled = isNoFilesSelected;

              const disabledReason = isNoFilesSelected
                ? "Please select at least 1 DBF table before enabling Auto-sync."
                : "";

              return (
                <div 
                  className="flex items-center justify-between gap-4 p-3.5 bg-slate-50/50 border border-slate-200/80 w-full box-border"
                  style={{ borderRadius: "16px" }}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">Enable auto-sync</div>
                    <div className="text-[11px] text-slate-400 leading-tight mt-0.5">Run background synchronization on a schedule</div>
                    {isAutoSyncDisabled && (
                      <span className="text-[11px] font-bold text-amber-600 block mt-1">
                        ⚠️ Select at least 1 DBF table to enable auto-sync
                      </span>
                    )}
                  </div>
                  <div 
                    className={`w-10 h-5.5 rounded-full relative transition-colors shrink-0 p-0.5 ${
                      isAutoSyncDisabled
                        ? "bg-slate-200 cursor-not-allowed opacity-50"
                        : autoSync 
                        ? "bg-slate-900 cursor-pointer" 
                        : "bg-slate-200 cursor-pointer"
                    }`}
                    style={{ borderRadius: "9999px" }}
                    title={isAutoSyncDisabled ? disabledReason : "Toggle auto-sync"}
                    onClick={() => {
                      if (isAutoSyncDisabled) {
                        setMessage({ type: "error", text: disabledReason });
                        return;
                      }
                      const newAutoSync = !autoSync;
                      setAutoSync(newAutoSync);
                      if (newAutoSync) {
                        triggerSyncNow(true);
                      } else if (busyAction === "sync") {
                        triggerCancelSync();
                      }
                      saveConfiguration(dataDir, "selected", selectedFiles, newAutoSync, autoSyncInterval);
                    }}
                  >
                    <div 
                      className={`w-4.5 h-4.5 rounded-full bg-white transition-all shadow-xs ${
                        autoSync && !isAutoSyncDisabled ? "translate-x-4.5" : "translate-x-0"
                      }`} 
                      style={{ borderRadius: "9999px" }}
                    />
                  </div>
                </div>
              );
            })()}

            {autoSync && (
              !isEditingInterval ? (
                /* Collapsed Summary view showing schedule + Edit button */
                <div 
                  className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200/80 w-full box-border animate-in fade-in duration-150"
                  style={{ borderRadius: "16px" }}
                >
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-700 min-w-0">
                    <Clock size={14} className="text-teal-600 shrink-0" />
                    <span className="truncate font-semibold">
                      Schedule: <strong className="text-slate-900 font-bold">{formatIntervalSummary(autoSyncInterval)}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingInterval(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 transition-all shadow-2xs btn-pill shrink-0 cursor-pointer"
                    style={{ borderRadius: "9999px" }}
                  >
                    <Edit2 size={12} className="text-slate-500" />
                    <span>Edit schedule</span>
                  </button>
                </div>
              ) : (
                /* Expanded Edit Container */
                <div 
                  className="p-3.5 bg-slate-50 border border-slate-200/90 space-y-3 animate-in slide-in-from-top-2 duration-150"
                  style={{ borderRadius: "16px" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Sync Interval (Frequency)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingInterval(false)}
                      className="text-xs text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  <select
                    value={presetInterval}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPresetInterval(val);
                      if (val !== "custom") {
                        const mins = Number(val);
                        setAutoSyncInterval(mins);
                        saveConfiguration(dataDir, syncScope, selectedFiles, autoSync, mins);
                        setIsEditingInterval(false);
                      }
                    }}
                    className="w-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none shadow-2xs cursor-pointer"
                    style={{ borderRadius: "10px" }}
                  >
                    <option value="10">Every 10 minutes</option>
                    <option value="30">Every 30 minutes</option>
                    <option value="60">Every 1 hour</option>
                    <option value="360">Every 6 hours</option>
                    <option value="720">Every 12 hours</option>
                    <option value="1440">Every 1 day (24 hours)</option>
                    <option value="10080">Every 7 days (1 week)</option>
                    <option value="custom">Custom interval (specify unit)...</option>
                  </select>

                  {presetInterval === "custom" && (
                    <div className="space-y-2.5 pt-1 animate-in fade-in duration-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Custom Frequency & Unit
                      </span>
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        {/* Number input allows empty text while typing */}
                        <input
                          type="number"
                          min={1}
                          max={customUnit === "minutes" ? 1440 : customUnit === "hours" ? 168 : 30}
                          placeholder="e.g. 20"
                          className="w-20 bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-400 shadow-2xs"
                          style={{ borderRadius: "8px" }}
                          value={customValueStr}
                          onChange={(e) => {
                            setCustomValueStr(e.target.value);
                          }}
                        />

                        {/* Unit Selector Dropdown */}
                        <select
                          value={customUnit}
                          onChange={(e) => {
                            const unit = e.target.value as "minutes" | "hours" | "days";
                            setCustomUnit(unit);
                          }}
                          className="bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none shadow-2xs cursor-pointer"
                          style={{ borderRadius: "8px" }}
                        >
                          <option value="minutes">Minute(s)</option>
                          <option value="hours">Hour(s)</option>
                          <option value="days">Day(s)</option>
                        </select>

                        {/* Save Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const rawNum = Number(customValueStr);
                            const maxLimit = customUnit === "minutes" ? 1440 : customUnit === "hours" ? 168 : 30;
                            const clampedVal = Math.max(1, Math.min(maxLimit, rawNum || 1));
                            setCustomValueStr(String(clampedVal));

                            const multiplier = customUnit === "days" ? 1440 : customUnit === "hours" ? 60 : 1;
                            const totalMins = clampedVal * multiplier;
                            
                            setAutoSyncInterval(totalMins);
                            saveConfiguration(dataDir, syncScope, selectedFiles, autoSync, totalMins);
                            setIsEditingInterval(false);
                          }}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-black hover:bg-slate-900 transition-all btn-pill shadow-xs cursor-pointer shrink-0"
                          style={{ borderRadius: "9999px" }}
                        >
                          Save Interval
                        </button>
                      </div>

                      {/* Calculation helper note */}
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 pt-0.5">
                        <Clock size={12} className="text-teal-600 shrink-0" />
                        <span>
                          Frequency: <strong className="text-slate-800">
                            {Number(customValueStr) || 1} {customUnit}
                          </strong> ({(Number(customValueStr) || 1) * (customUnit === "days" ? 1440 : customUnit === "hours" ? 60 : 1)} total mins)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          <div className="space-y-4 min-w-0">
            {/* WORKER STATUS & SETUP CARD */}
            <div 
              className="border border-slate-200/80 p-4 sm:p-5 bg-white space-y-4 shadow-2xs"
              style={{ borderRadius: "20px" }}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">WORKER STATUS</span>
                <div className="flex items-center gap-1.5">
                  {workerOnline ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Worker ONLINE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Worker OFFLINE
                    </span>
                  )}
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                    <Clock size={11} />
                    <span>{formatDate(lastSyncedAt)}</span>
                  </div>
                </div>
              </div>



              <div className="flex flex-col gap-1.5 pt-1 w-full">
                <button 
                  className={`w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-bold transition-all btn-pill ${
                    autoSync 
                      ? "bg-slate-900 text-white opacity-90 cursor-not-allowed" 
                      : uploading || selectedFiles.length === 0
                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                      : "bg-black hover:bg-slate-900 text-white shadow-xs cursor-pointer active:scale-[0.99]"
                  } disabled:cursor-not-allowed`} 
                  style={{ borderRadius: "9999px" }}
                  id="sync-btn" 
                  onClick={() => triggerSyncNow(false)}
                  disabled={uploading || selectedFiles.length === 0 || Boolean(busyAction) || autoSync}
                  type="button"
                  title={
                    uploading
                      ? "Files are currently uploading... Please wait."
                      : autoSync 
                      ? "Auto-sync is running on a schedule. Click 'Cancel sync' below to stop." 
                      : selectedFiles.length === 0 
                      ? "No files uploaded. Please upload files directly to enable sync." 
                      : "Click to trigger immediate manual sync"
                  }
                >
                  {uploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-slate-500" />
                      <span>Uploading files...</span>
                    </>
                  ) : busyAction === "sync" ? (
                    <>
                      <RefreshCw size={14} className="animate-spin text-white" />
                      <span>Syncing data...</span>
                    </>
                  ) : autoSync ? (
                    <>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <RefreshCw size={13} className="animate-spin text-emerald-400" />
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      </span>
                      <span>Auto-sync active</span>
                    </>
                  ) : (
                    <>
                      <Play size={13} fill="currentColor" className={selectedFiles.length === 0 ? "text-slate-400" : "text-white"} />
                      <span>{selectedFiles.length === 0 ? "Upload files to sync" : "Sync now"}</span>
                    </>
                  )}
                </button>

                <button 
                  className={`w-full inline-flex items-center justify-center gap-2 py-2 px-4 text-xs sm:text-sm font-bold border transition-all btn-pill ${
                    busyAction === "sync" || autoSync
                      ? "border-red-500 bg-red-50 text-red-700 hover:bg-red-100 shadow-2xs cursor-pointer"
                      : "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60"
                  }`} 
                  style={{ borderRadius: "9999px", marginTop: "8px" }}
                  onClick={triggerCancelSync}
                  disabled={!autoSync && busyAction !== "sync"}
                  type="button"
                >
                  <X size={14} className={busyAction === "cancel" ? "animate-spin text-red-600" : busyAction === "sync" || autoSync ? "text-red-600" : "text-slate-400"} />
                  <span>{busyAction === "cancel" ? "Cancelling..." : "Cancel sync"}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed text-center max-w-xs mx-auto m-0 pt-0.5">
                Pushes DBF changes to CRM tables immediately and manages worker background tasks.
              </p>
            </div>

            {/* DIRECT CLOUD DBF UPLOAD CARD */}
            <div
              className="border border-slate-200 p-4 sm:p-5 bg-white space-y-3 shadow-2xs"
              style={{ borderRadius: "20px" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <UploadCloud size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-snug">Upload Files Directly</span>
                    <span className="text-[10px] text-slate-500 block">Browser upload directly into database</span>
                  </div>
                </div>
              </div>

              {/* Drag and drop / select area */}
              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleDirectDbfUpload(e.dataTransfer.files);
                  }
                }}
                onClick={() => directDbfInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/50 p-4 rounded-xl text-center cursor-pointer transition-all hover:bg-slate-50 group"
              >
                <input
                  type="file"
                  ref={directDbfInputRef}
                  accept=".dbf"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => handleDirectDbfUpload(e.target.files)}
                />
                {uploading ? (
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700 py-1">
                    <Loader2 size={16} className="animate-spin text-slate-900" />
                    <span>Uploading files & syncing...</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <UploadCloud size={22} className="mx-auto text-slate-600 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-bold text-slate-800">
                      Drop <span className="text-slate-900 font-mono">.DBF</span> files here, or <span className="underline">browse</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Supports multiple DBF tables (e.g. CUST.DBF, ITEM.DBF)
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live Sync Progress Panel */}
            {syncProgress && (
              <div
                className="border border-slate-200/80 bg-slate-50/60 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ borderRadius: "16px" }}
              >
                {/* Progress Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 bg-white">
                  <div className="flex items-center gap-2">
                    {syncProgress.isRunning ? (
                      <Loader2 size={14} className="text-sky-500 animate-spin" />
                    ) : syncProgress.failedTables > 0 ? (
                      <AlertCircle size={14} className="text-amber-500" />
                    ) : (
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    )}
                    <span className="text-xs font-bold text-slate-800">
                      {syncProgress.isRunning ? "Sync in Progress..." : "Sync Complete"}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold font-mono text-slate-400">
                    {syncProgress.doneTables}/{syncProgress.totalTables > 0 ? syncProgress.totalTables : "?"} tables
                  </span>
                </div>

                {/* Progress Bar */}
                {syncProgress.totalTables > 0 && (
                  <div className="px-4 pt-3 pb-1">
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.round((syncProgress.doneTables / syncProgress.totalTables) * 100)}%`,
                          background: syncProgress.isRunning
                            ? "linear-gradient(90deg,#38bdf8,#6366f1)"
                            : syncProgress.failedTables > 0
                            ? "#f59e0b"
                            : "#10b981",
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1 text-right">
                      {syncProgress.totalTables > 0
                        ? `${Math.round((syncProgress.doneTables / syncProgress.totalTables) * 100)}%`
                        : ""}
                    </div>
                  </div>
                )}

                {/* Currently running tables */}
                {syncProgress.isRunning && syncProgress.runningTables.length > 0 && (
                  <div className="px-4 py-2">
                    <div className="text-[10px] font-bold text-sky-600 uppercase tracking-wider mb-1">Now syncing</div>
                    {syncProgress.runningTables.map((t) => (
                      <div key={t} className="flex items-center gap-1.5 text-xs text-slate-600 font-mono py-0.5">
                        <Loader2 size={11} className="text-sky-500 animate-spin shrink-0" />
                        <span className="truncate">{t}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Completed tables list */}
                {syncProgress.completedTables.length > 0 && (
                  <div className="px-4 pb-3">
                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1 mt-2">Completed</div>
                    <div className="max-h-[160px] overflow-y-auto space-y-0.5 pr-1">
                      {syncProgress.completedTables.map((t, i) => (
                        <div
                          key={t.tableName + i}
                          className="flex items-center justify-between gap-2 text-[11px] font-mono py-0.5 border-b border-slate-100 last:border-0"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                            <span className="text-slate-700 truncate">{t.tableName}</span>
                          </div>
                          <span className="text-slate-400 shrink-0 whitespace-nowrap">
                            {t.importedCount.toLocaleString()} rows
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Failed tables list */}
                {syncProgress.failedTablesList.length > 0 && (
                  <div className="px-4 pb-3">
                    <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Failed</div>
                    {syncProgress.failedTablesList.map((t, i) => (
                      <div key={t.tableName + i} className="flex items-start gap-1.5 text-[11px] font-mono py-0.5">
                        <AlertCircle size={11} className="text-red-400 shrink-0 mt-0.5" />
                        <span className="text-red-600 truncate">{t.tableName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {message.text && (
        <div 
          className={`mx-4 mb-4 sm:mx-6 sm:mb-6 p-3.5 border text-xs font-semibold leading-relaxed flex items-start gap-2.5 animate-in fade-in duration-200 ${
            message.type === "success" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
              : message.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-slate-50 border-slate-200 text-slate-800"
          }`}
          style={{ borderRadius: "16px" }}
        >
          <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-current" />
          <span>{message.text}</span>
        </div>
      )}


      {/* EMAIL VERIFICATION OTP MODAL (2-STEP FLOW) */}
      {showOtpModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{ background: "linear-gradient(135deg, #0a2828 0%, #0d3535 50%, #0b2c2c 100%)" }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative shadow-2xl">
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setShowOtpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <X size={14} />
            </button>

            {/* Teal square icon */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: "#0d7b6e" }}>
              {otpStep === "send"
                ? <Mail size={18} className="text-white" />
                : <Key size={18} className="text-white" />}
            </div>

            {/* Title */}
            <h2 className="text-base font-bold text-slate-900 mb-1 leading-snug">
              {otpStep === "send" ? "Verify email to view files" : "Enter verification code"}
            </h2>

            {/* Step progress bar */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                <div className="w-5 h-1 rounded-full" style={{ backgroundColor: "#0d7b6e" }} />
                <div className={`w-5 h-1 rounded-full transition-all ${otpStep === "verify" ? "" : "bg-slate-200"}`}
                  style={otpStep === "verify" ? { backgroundColor: "#0d7b6e" } : {}} />
              </div>
              <span className="text-[11px] text-slate-500">
                Step <strong className="text-slate-700">{otpStep === "send" ? "1" : "2"}</strong> of 2 · {otpStep === "send" ? "Confirm email address" : "Enter your code"}
              </span>
            </div>



            {/* STEP 1: SEND OTP */}
            {otpStep === "send" ? (
              <>
                {/* Email info box */}
                <div className="rounded-xl border border-slate-100 p-3 mb-3" style={{ backgroundColor: "#f0faf9" }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Mail size={12} style={{ color: "#0d7b6e" }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#0d7b6e" }}>
                      Logged-in account email
                    </span>
                  </div>

                  {/* Email row with avatar */}
                  <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-lg px-2.5 py-2 mb-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                      style={{ color: "#0d7b6e", border: "1.5px solid #0d7b6e", backgroundColor: "#e6f7f5" }}
                    >
                      {(userEmail || "U").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-slate-800 truncate flex-1">
                      {userEmail
                        ? userEmail.length > 24
                          ? userEmail.slice(0, 24) + "..."
                          : userEmail
                        : "your@email.com"}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0"
                      style={{ color: "#0d7b6e", backgroundColor: "#e6f7f5", borderColor: "#a7ddd8" }}
                    >
                      ✓ Logged in
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    We&apos;ll send a 6-digit security code to this address to confirm it&apos;s you.
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex items-stretch gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowOtpModal(false)}
                    className="flex-1 min-h-[40px] text-xs font-semibold text-slate-600 border border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
                    style={{ borderRadius: "9999px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={sendingOtp}
                    onClick={handleSendOtpCode}
                    className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{ color: "#0d7b6e", border: "1.5px solid #0d7b6e", borderRadius: "9999px", backgroundColor: "transparent" }}
                    onMouseEnter={(e) => { if (!sendingOtp) e.currentTarget.style.backgroundColor = "#f0faf9"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {sendingOtp ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Mail size={13} />
                        <span className="text-center leading-snug">Send Otp</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* STEP 2: OTP DIGIT ENTRY */
              <form onSubmit={handleVerifyOtp}>
                {/* Code info box */}
                <div className="rounded-2xl border border-slate-100 p-4 mb-3" style={{ backgroundColor: "#f0faf9" }}>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Key size={13} style={{ color: "#0d7b6e" }} />
                    <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#0d7b6e" }}>
                      Verification code
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Enter the 6-digit code sent to <strong className="text-slate-700">{userEmail}</strong>. Unlocks file names for 5 minutes.
                  </p>
                </div>

                {/* 6-digit grid */}
                <div className="grid grid-cols-6 gap-2 sm:gap-2.5 mb-3">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { otpInputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-full h-10 text-center text-base font-bold font-mono border-2 rounded-xl outline-none transition-all"
                      style={digit
                        ? { borderColor: "#0d7b6e", backgroundColor: "#f0faf9", color: "#0b4a43" }
                        : { borderColor: "#e2e8f0", backgroundColor: "#f8fafc", color: "#1e293b" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#0d7b6e"; e.currentTarget.style.backgroundColor = "#fff"; }}
                      onBlur={(e) => { if (!digit) { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.backgroundColor = "#f8fafc"; } }}
                    />
                  ))}
                </div>

                {/* Footer: resend + buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || sendingOtp}
                    onClick={handleResendOtp}
                    className="text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer mr-auto whitespace-nowrap"
                    style={{ color: "#0d7b6e" }}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setOtpStep("send")}
                    className="h-9 px-3 text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap"
                    style={{ borderRadius: "9999px" }}
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={verifyingOtp || otpValue.length < 6}
                    className="h-9 inline-flex items-center gap-1.5 px-4 text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                    style={{ color: "#0d7b6e", border: "1.5px solid #0d7b6e", borderRadius: "9999px", backgroundColor: "transparent" }}
                    onMouseEnter={(e) => { if (!(verifyingOtp || otpValue.length < 6)) e.currentTarget.style.backgroundColor = "#f0faf9"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {verifyingOtp ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Check size={12} className="stroke-[2.5]" />
                        <span>Verify & Unlock</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Hidden Native File & Directory Inputs for Windows Explorer */}
      <input
        type="file"
        ref={nativeFolderInputRef}
        //@ts-ignore
        webkitdirectory=""
        directory=""
        style={{ display: "none" }}
        onChange={handleNativeFolderChange}
      />
      <input
        type="file"
        ref={nativeFileInputRef}
        accept=".dbf"
        multiple
        style={{ display: "none" }}
        onChange={handleNativeFileChange}
      />
    </div>
  );
}
