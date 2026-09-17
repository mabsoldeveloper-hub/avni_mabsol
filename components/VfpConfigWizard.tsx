"use client";

import { useState, useEffect, useRef } from "react";
import {
  FaFolderOpen,
  FaFolder,
  FaArrowRight,
  FaDatabase,
  FaCheckCircle,
  FaTimes,
  FaSearch,
  FaSyncAlt,
} from "react-icons/fa";

interface VfpConfigWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentDataDir?: string;
}

export default function VfpConfigWizard({
  isOpen,
  onClose,
  onSuccess,
  currentDataDir = "",
}: VfpConfigWizardProps) {
  const [dataDir, setDataDir] = useState("");
  const [sourceDir, setSourceDir] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [enabledFiles, setEnabledFiles] = useState<string[]>([]);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [useVfpEngine, setUseVfpEngine] = useState(false);
  const [vfpExePath, setVfpExePath] = useState("C:\\MabsolCRM\\Engine\\MabsolCRM.exe");
  
  // Folder browsing state
  const [browsingField, setBrowsingField] = useState<"source" | "dest" | null>(null);
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);

  // Search filter for tables
  const [searchQuery, setSearchQuery] = useState("");

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedCount, setCopiedCount] = useState(0);

  // Load existing config on open
  useEffect(() => {
    if (isOpen) {
      setError("");
      setLoading(true);
      fetch("/api/mabsolcrmsync/config")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setDataDir(data.dataDir || currentDataDir || "");
            setSourceDir(data.sourceDir || "");
            setCompanyName(data.companyName || "");
            setEnabledFiles(data.enabledFiles || []);
            setUseVfpEngine(data.useVfpEngine || false);
            setVfpExePath(data.vfpExePath || "C:\\MabsolCRM\\Engine\\MabsolCRM.exe");
          }
        })
        .catch(() => setError("Failed to fetch current MabsolCRM configuration."))
        .finally(() => setLoading(false));
    }
  }, [isOpen, currentDataDir]);

  if (!isOpen) return null;

  const nativeFolderInputRef = useRef<HTMLInputElement>(null);
  const activeFieldRef = useRef<"source" | "dest">("dest");

  // Directly trigger native Windows Explorer directory picker
  function handleBrowseFolder(field: "source" | "dest") {
    activeFieldRef.current = field;
    nativeFolderInputRef.current?.click();
  }

  function handleNativeFolderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    const field = activeFieldRef.current;
    if (files && files.length > 0) {
      const relPath = files[0].webkitRelativePath || "";
      const folderName = relPath.split("/")[0] || relPath.split("\\")[0] || "SelectedFolder";
      let nativePath = (files[0] as any).path;
      if (nativePath) {
        const lastSlash = Math.max(nativePath.lastIndexOf("/"), nativePath.lastIndexOf("\\"));
        if (lastSlash !== -1) nativePath = nativePath.substring(0, lastSlash);
      }
      const currentVal = field === "source" ? sourceDir : dataDir;
      const finalPath = nativePath || prompt(
        `Selected directory: "${folderName}".\nConfirm Windows path:`,
        currentVal || `C:\\${folderName}`
      );
      if (finalPath) {
        if (field === "source") setSourceDir(finalPath);
        else setDataDir(finalPath);
      }
    }
    e.target.value = "";
  }

  // Action: Scan directory and list DBF files
  async function handleTransferData() {
    if (!dataDir.trim()) {
      setError("Destination sync folder directory path is required.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/mabsolcrmsync/transfer-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, sourceDir, dataDir }),
      });
      const data = await response.json();

      if (data.success) {
        setCopiedCount(data.copiedCount || data.dbfFiles?.length || 0);
        setAvailableFiles(data.dbfFiles || []);
        setStep(2); // Proceed to selecting files
      } else {
        setError(data.error || "Failed to load database files.");
      }
    } catch {
      setError("An error occurred during database file scan.");
    } finally {
      setLoading(false);
    }
  }

  // Checkbox toggle logic
  function handleToggleFile(fileName: string) {
    setEnabledFiles((prev) => {
      if (prev.includes(fileName)) {
        return prev.filter((f) => f !== fileName);
      } else {
        return [...prev, fileName];
      }
    });
  }

  function handleSelectAll() {
    setEnabledFiles(availableFiles);
  }

  function handleDeselectAll() {
    setEnabledFiles([]);
  }

  // Action: Save enabled files and trigger sync command
  async function handleSaveAndSync() {
    setLoading(true);
    setError("");
    try {
      // 1. Save config (enabledFiles, dataDir, sourceDir, companyName, useVfpEngine, vfpExePath)
      const configRes = await fetch("/api/mabsolcrmsync/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataDir, sourceDir, companyName, enabledFiles, useVfpEngine, vfpExePath }),
      });
      const configData = await configRes.json();

      if (!configData.success) {
        throw new Error(configData.error || "Failed to save file selection.");
      }

      // 2. Trigger worker rescan
      await fetch("/api/mabsolcrmsync/rescan", {
        method: "POST",
      });

      setStep(3); // Show Success Screen
    } catch (err: any) {
      setError(err.message || "An error occurred while saving the configuration.");
    } finally {
      setLoading(false);
    }
  }

  const filteredFiles = availableFiles.filter((file) =>
    file.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      role="dialog"
      style={{
        backgroundColor: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(5px)",
        zIndex: 1040,
      }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-white">
          {/* Modal Header */}
          <div className="modal-header border-bottom px-4 py-3 bg-light d-flex align-items-center justify-content-between">
            <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
              <FaSyncAlt className="text-primary spin-animation" />
              Configure & Sync MabsolCRM Database Wizard
            </h5>
            <button
              type="button"
              className="btn-close shadow-none"
              onClick={onClose}
              disabled={loading}
              aria-label="Close"
            ></button>
          </div>

          {/* Modal Body */}
          <div className="modal-body p-4" style={{ minHeight: "360px" }}>
            {error && (
              <div className="alert alert-danger border-0 shadow-sm py-2 px-3 mb-4 small d-flex align-items-center gap-2">
                <span>{error}</span>
              </div>
            )}

            {/* Steps Progress Indicator */}
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
              <div className={`d-flex align-items-center gap-2 ${step >= 1 ? "text-primary fw-bold" : "text-muted"}`}>
                <span className={`badge rounded-circle ${step >= 1 ? "bg-primary text-white" : "bg-secondary-subtle text-secondary"}`}>1</span>
                <span>Configure Folders</span>
              </div>
              <FaArrowRight className="text-secondary small" />
              <div className={`d-flex align-items-center gap-2 ${step >= 2 ? "text-primary fw-bold" : "text-muted"}`}>
                <span className={`badge rounded-circle ${step >= 2 ? "bg-primary text-white" : "bg-secondary-subtle text-secondary"}`}>2</span>
                <span>Select Tables</span>
              </div>
              <FaArrowRight className="text-secondary small" />
              <div className={`d-flex align-items-center gap-2 ${step >= 3 ? "text-primary fw-bold" : "text-muted"}`}>
                <span className={`badge rounded-circle ${step >= 3 ? "bg-primary text-white" : "bg-secondary-subtle text-secondary"}`}>3</span>
                <span>Done</span>
              </div>
            </div>

            {/* Step 1: Configure Paths */}
            {step === 1 && (
              <div>
                <p className="text-secondary small mb-4">
                  Select the source MabsolCRM data folder (where to select data) and destination folder (where to copy data).
                </p>

                {/* Company Name / Code */}
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary small">
                    Company / Organization Name (e.g. A01 to Z01)
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm text-dark bg-light"
                    placeholder="e.g. A01"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={loading}
                  />
                </div>

                {/* Source Data Directory */}
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary small d-flex align-items-center gap-2">
                    <FaFolder className="text-primary" />
                    Source Data Directory (Where to select data folder)
                  </label>
                  <div className="input-group input-group-sm">
                    <input
                      type="text"
                      className="form-control font-monospace text-secondary bg-light"
                      placeholder="e.g. C:\MabsolCRM\DATA"
                      value={sourceDir}
                      onChange={(e) => setSourceDir(e.target.value)}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => handleBrowseFolder("source")}
                      disabled={loading}
                    >
                      Browse...
                    </button>
                  </div>
                  <div className="form-text text-muted" style={{ fontSize: "0.75rem" }}>
                    Select the directory containing original MabsolCRM database (.dbf) files.
                  </div>
                </div>

                {/* Destination Data Directory */}
                <div className="mb-4">
                  <label className="form-label fw-semibold text-secondary small d-flex align-items-center gap-2">
                    <FaFolder className="text-primary" />
                    Destination Sync Directory (Where to copy data)
                  </label>
                  <div className="input-group input-group-sm">
                    <input
                      type="text"
                      className="form-control font-monospace text-secondary bg-light"
                      placeholder="e.g. C:\MabsolCRM_Data"
                      value={dataDir}
                      onChange={(e) => setDataDir(e.target.value)}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => handleBrowseFolder("dest")}
                      disabled={loading}
                    >
                      Browse...
                    </button>
                  </div>
                  <div className="form-text text-muted" style={{ fontSize: "0.75rem" }}>
                    Select the directory where data files should be copied and synchronized.
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Select Sync Tables */}
            {step === 2 && (
              <div>
                <div className="alert alert-success border-0 shadow-sm py-2.5 px-3 mb-3 d-flex align-items-center gap-2 small">
                  <FaCheckCircle className="text-success fs-5 flex-shrink-0" />
                  <div>
                    <strong>Success!</strong> Transferred {copiedCount} database files to <code>{dataDir}</code>. Select which of these files you want to synchronize.
                  </div>
                </div>

                {/* File Selection Filter & Actions */}
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                  <div className="input-group input-group-sm w-50" style={{ minWidth: "220px" }}>
                    <span className="input-group-text bg-white text-muted">
                      <FaSearch size={12} />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search files..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="btn-group btn-group-sm">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleSelectAll}
                      disabled={loading || availableFiles.length === 0}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleDeselectAll}
                      disabled={loading || availableFiles.length === 0}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Checkbox List */}
                <div className="border rounded-3 p-3 bg-light">
                  <div className="overflow-auto bg-white border rounded-2" style={{ maxHeight: "200px" }}>
                    {filteredFiles.length === 0 ? (
                      <div className="p-4 text-center text-muted small">
                        {availableFiles.length === 0 ? "No MabsolCRM database (.dbf) files found." : "No matching files."}
                      </div>
                    ) : (
                      <div className="list-group list-group-flush">
                        {filteredFiles.map((file) => (
                          <label
                            key={file}
                            className="list-group-item list-group-item-action py-2 px-3 d-flex align-items-center gap-2.5 small font-monospace cursor-pointer border-0"
                          >
                            <input
                              type="checkbox"
                              className="form-check-input mt-0"
                              checked={enabledFiles.includes(file)}
                              onChange={() => handleToggleFile(file)}
                              disabled={loading}
                            />
                            <FaDatabase className="text-secondary small" />
                            <span className="text-dark">{file}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-muted small mt-2" style={{ fontSize: "0.75rem" }}>
                    💡 Selecting a table automatically copies/synchronizes any corresponding memo (.fpt) or index (.cdx) files.
                  </div>
                  <div className="text-primary fw-semibold small mt-2.5">
                    {enabledFiles.length} of {availableFiles.length} file(s) selected
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Success Screen */}
            {step === 3 && (
              <div className="text-center py-4 px-2">
                <FaCheckCircle className="text-success display-4 mb-3" />
                <h4 className="fw-bold text-dark">Configuration Saved!</h4>
                <p className="text-secondary small mb-4">
                  The MabsolCRM database directory path is configured and sync table selection is saved.
                </p>
                <div className="p-3 border rounded-3 bg-light text-start font-monospace small mb-4 mx-auto" style={{ maxWidth: "500px" }}>
                  <div className="d-flex justify-content-between mb-1 text-break">
                    <strong className="text-secondary">Destination:</strong>
                    <span className="text-dark text-end ms-2">{dataDir}</span>
                  </div>
                  <div className="d-flex justify-content-between text-break">
                    <strong className="text-secondary">Synced Tables:</strong>
                    <span className="text-dark text-end ms-2">{enabledFiles.length} configured</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer border-top px-4 py-3 bg-light">
            {step === 1 && (
              <>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm px-4 fw-semibold d-flex align-items-center gap-1.5"
                  onClick={handleTransferData}
                  disabled={loading || !dataDir.trim()}
                >
                  {loading ? "Scanning MabsolCRM directory..." : "Scan & Next"}
                  {!loading && <FaArrowRight />}
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Back to Folders
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm px-4 fw-semibold"
                  onClick={handleSaveAndSync}
                  disabled={loading}
                >
                  {loading ? "Saving Config..." : "Save Selection & Sync Now"}
                </button>
              </>
            )}

            {step === 3 && (
              <button
                type="button"
                className="btn btn-success btn-sm px-4 fw-semibold"
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
              >
                Close & Refresh
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Native Directory Explorer Input */}
      <input
        type="file"
        ref={nativeFolderInputRef}
        //@ts-ignore
        webkitdirectory=""
        directory=""
        style={{ display: "none" }}
        onChange={handleNativeFolderChange}
      />
    </div>
  );
}
