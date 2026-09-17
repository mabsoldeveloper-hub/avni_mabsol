"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Folder, 
  FolderOpen, 
  ArrowUp, 
  Search, 
  X, 
  Check, 
  Loader2 
} from "lucide-react";

interface FolderSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  onFolderSelected: (newPath: string) => void;
  title?: string;
  selectOnly?: boolean;
}

export default function FolderSelectorModal({
  isOpen,
  onClose,
  currentPath,
  onFolderSelected,
  title = "Configure MabsolCRM Sync Directory",
  selectOnly = false,
}: FolderSelectorModalProps) {
  const [pathInput, setPathInput] = useState("");
  const [folderInput, setFolderInput] = useState("");
  const [folders, setFolders] = useState<string[]>([]);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const crumbTrackRef = useRef<HTMLDivElement>(null);

  // Auto-scroll breadcrumbs when pathInput changes
  useEffect(() => {
    if (crumbTrackRef.current) {
      crumbTrackRef.current.scrollLeft = crumbTrackRef.current.scrollWidth;
    }
  }, [pathInput]);

  const wasOpenRef = useRef(false);

  // Initialize paths when modal opens
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      setError("");
      setSuccess("");
      setFilterText("");
      
      let basePath = "";
      let folderName = "";

      if (currentPath) {
        const lastSlash = Math.max(currentPath.lastIndexOf("/"), currentPath.lastIndexOf("\\"));
        if (lastSlash !== -1 && lastSlash < currentPath.length - 1) {
          basePath = currentPath.substring(0, lastSlash);
          folderName = currentPath.substring(lastSlash + 1);
        } else {
          basePath = currentPath;
          folderName = "";
        }
      } else {
        basePath = "";
        folderName = "";
      }

      setPathInput(basePath);
      setFolderInput(folderName);
      loadFolders(basePath);
    } else if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen]);

  async function loadFolders(targetPath: string) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/mabsolcrmsync/browse-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPath }),
      });
      const data = await response.json();

      if (data.success) {
        setFolders(data.folders || []);
        setPathInput(data.currentPath || targetPath);
        setParentPath(data.parentPath);
      } else {
        setError(data.error || "Failed to load folders.");
        setFolders([]);
        setParentPath(null);
      }
    } catch {
      setError("An error occurred while connecting to the server.");
      setFolders([]);
      setParentPath(null);
    } finally {
      setLoading(false);
    }
  }

  const handleFolderClick = (folderName: string) => {
    setFolderInput(folderName);
  };

  const handleFolderDoubleClick = (folderName: string) => {
    const separator = pathInput.endsWith("/") || pathInput.endsWith("\\") ? "" : "\\";
    const newPath = `${pathInput}${separator}${folderName}`;
    setFolderInput("");
    loadFolders(newPath);
  };

  const handleUpClick = () => {
    if (parentPath) {
      setFolderInput("");
      loadFolders(parentPath);
    }
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (!pathInput.trim()) {
      setError("Base path is required.");
      return;
    }

    const separator = pathInput.endsWith("/") || pathInput.endsWith("\\") ? "" : "\\";
    const fullPath = folderInput.trim()
      ? `${pathInput.trim()}${separator}${folderInput.trim()}`
      : pathInput.trim();

    if (selectOnly) {
      onFolderSelected(fullPath);
      onClose();
      return;
    }

    setLoading(true);
    try {
      const configRes = await fetch("/api/mabsolcrmsync/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataDir: fullPath }),
      });
      const configData = await configRes.json();

      if (configData.success) {
        setSuccess("Sync folder configured successfully!");
        onFolderSelected(fullPath);
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setError(configData.error || "Failed to update configuration.");
      }
    } catch {
      setError("An error occurred while saving the configuration.");
    } finally {
      setLoading(false);
    }
  };

  const getCrumbs = () => {
    const crumbs = [{ name: "Root", path: "" }];
    if (!pathInput) return crumbs;

    const parts = pathInput.split(/[\\/]/).filter(Boolean);
    let tempPath = "";
    
    parts.forEach((part, index) => {
      if (index === 0) {
        tempPath = part;
        if (tempPath.endsWith(":")) {
          tempPath += "\\";
        }
      } else {
        const separator = tempPath.endsWith("\\") || tempPath.endsWith("/") ? "" : "\\";
        tempPath = `${tempPath}${separator}${part}`;
      }
      crumbs.push({ name: part, path: tempPath });
    });
    return crumbs;
  };

  if (!isOpen) return null;

  const filteredFolders = folders.filter((folder) =>
    folder.toLowerCase().includes(filterText.toLowerCase())
  );

  const crumbs = getCrumbs();
  const separator = pathInput.endsWith("/") || pathInput.endsWith("\\") ? "" : "\\";
  const selectedFullPath = folderInput.trim()
    ? `${pathInput.trim()}${separator}${folderInput.trim()}`
    : pathInput.trim();

  return (
    <div className="fixed inset-0 bg-[#16181D]/40 flex items-center justify-center p-6 z-[1050] backdrop-blur-xs">
      <div className="bg-white w-full max-w-[480px] rounded-[10px] shadow-2xl flex flex-col max-h-[88vh] overflow-hidden border border-[#E4E6EB]">
        
        {/* Header */}
        <div className="flex items-start justify-between p-[20px_22px_16px] gap-[14px] bg-white shrink-0">
          <div className="flex gap-3 items-start">
            <div className="w-[34px] h-[34px] rounded-[8px] border border-[#E4E6EB] bg-[#F7F8FA] text-[#63676F] flex items-center justify-center shrink-0">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-sans text-base font-bold text-[#16181D] m-0 mb-[3px] tracking-[-0.01em] leading-snug">
                {title}
              </h2>
              <p className="text-[12.5px] text-[#9297A1] m-0 leading-normal">
                Browse your server filesystem to configure MabsolCRM paths
              </p>
            </div>
          </div>
          <button 
            type="button"
            className="w-7 h-7 rounded-md border-0 bg-transparent text-[#9297A1] cursor-pointer flex items-center justify-center shrink-0 hover:bg-[#F7F8FA] hover:text-[#16181D] transition-colors mt-0.5"
            onClick={onClose}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Navigation Bar */}
        <div className="flex items-center gap-2 p-[0_22px_14px] shrink-0">
          <button
            type="button"
            className="w-[30px] h-[30px] rounded-[7px] border border-[#E4E6EB] bg-white flex items-center justify-center cursor-pointer text-[#63676F] shrink-0 hover:bg-[#F7F8FA] disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
            onClick={handleUpClick}
            disabled={!parentPath || loading}
            title="Up one level"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          
          <div ref={crumbTrackRef} className="flex-1 min-w-0 flex items-center gap-1.5 bg-[#F7F8FA] border border-[#E4E6EB] rounded-[7px] p-[8px_12px] overflow-x-auto whitespace-nowrap scrollbar-none">
            {crumbs.map((crumb, idx) => (
              <span key={idx} className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  className={`text-[12.5px] font-medium cursor-pointer px-[3px] py-[2px] rounded font-mono transition-colors focus:outline-none ${
                    idx === crumbs.length - 1 
                      ? "text-[#16181D] font-bold pointer-events-none" 
                      : "text-[#9297A1] hover:text-[#16181D]"
                  }`}
                  onClick={() => {
                    setFolderInput("");
                    loadFolders(crumb.path);
                  }}
                >
                  {crumb.name}
                </button>
                {idx < crumbs.length - 1 && (
                  <span className="text-[#D4D7DE] text-[12px] select-none font-mono">/</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Filter Input */}
        <div className="px-[22px] pb-[14px] shrink-0">
          <div className="flex items-center gap-2.5 bg-[#F7F8FA] border border-[#E4E6EB] rounded-[7px] p-[9px_12px]">
            <Search className="w-3.5 h-3.5 text-[#9297A1] shrink-0" />
            <input
              type="text"
              className="w-full text-xs bg-transparent outline-none border-none text-[#16181D] placeholder-[#9297A1]"
              placeholder="Filter subfolders..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              disabled={loading || folders.length === 0}
            />
            {filterText && (
              <button
                type="button"
                className="p-0.5 text-[#9297A1] hover:text-[#16181D] transition-colors focus:outline-none"
                onClick={() => setFilterText("")}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Message Banner (Errors & Success) */}
        {error && (
          <div className="mx-[22px] mb-[14px] flex items-center gap-2.5 bg-[#FCEBEA] border border-[#F3C9C6] rounded-[7px] p-[10px_13px] text-[12.5px] text-[#C0332A] font-medium animate-in fade-in duration-100 shrink-0">
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mx-[22px] mb-[14px] flex items-center gap-2.5 bg-[#E2F6F3] border border-[#A7E2D8] rounded-[7px] p-[10px_13px] text-[12.5px] text-[#0D9488] font-medium animate-in fade-in duration-100 shrink-0">
            <span>{success}</span>
          </div>
        )}

        {/* Folders Navigation List */}
        <div className="mx-[22px] mb-[22px] border border-[#E4E6EB] rounded-[9px] flex-1 min-h-[180px] max-h-[260px] overflow-y-auto bg-white">
          {loading ? (
            <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-[#9297A1] gap-2.5">
              <Loader2 className="w-6 h-6 animate-spin text-[#3457D5]" />
              <span className="text-xs font-semibold">Loading subfolders...</span>
            </div>
          ) : filteredFolders.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-[36px_20px] text-center text-[#9297A1] min-h-[180px]">
              <Folder className="w-7 h-7 mb-2 text-[#D4D7DE]" />
              <div className="text-[13px] font-semibold text-[#63676F] mb-0.5">No folders found</div>
              <div className="text-[11.5px] text-[#9297A1]">No subfolders available at this path.</div>
            </div>
          ) : (
            <div className="divide-y divide-[#E4E6EB]">
              {filteredFolders.map((folderName) => {
                const isSelected = folderInput === folderName;
                return (
                  <div
                    key={folderName}
                    className={`flex items-center gap-[12px] p-[12px_14px] cursor-pointer transition-colors group ${
                      isSelected ? "bg-[#EEEFFD]" : "hover:bg-[#F7F8FA]"
                    }`}
                    onClick={() => handleFolderClick(folderName)}
                    onDoubleClick={() => handleFolderDoubleClick(folderName)}
                  >
                    <div className={`w-[28px] h-[28px] rounded-[6px] flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "bg-white text-[#3457D5]" : "bg-[#F7F8FA] text-[#9297A1]"
                    }`}>
                      <Folder className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold text-[#16181D] truncate font-sans">
                        {folderName}
                      </div>
                      <div className="text-[11.5px] text-[#9297A1] font-sans">Folder</div>
                    </div>
                    <Check className={`w-3.5 h-3.5 text-[#3457D5] shrink-0 ml-auto transition-all ${
                      isSelected ? "opacity-100 scale-100" : "opacity-0 scale-75"
                    }`} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Target Folder Name Input (Optional Helper) */}
        <div className="mx-[22px] mb-[22px] shrink-0">
          <label htmlFor="folderNameInput" className="block text-[11px] font-semibold text-[#63676F] uppercase tracking-wider mb-1.5">
            Target Folder Name
          </label>
          <input
            id="folderNameInput"
            type="text"
            className="w-full px-[12px] py-[9px] border border-[#E4E6EB] rounded-[7px] text-xs font-mono bg-white text-[#16181D] focus:outline-none focus:border-[#3457D5] focus:ring-1 focus:ring-[#3457D5] transition-all"
            placeholder="Folder name (leave blank to select Base Path directory)"
            value={folderInput}
            onChange={(e) => setFolderInput(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-4 p-[15px_22px] border-t border-[#E4E6EB] bg-white shrink-0">
          <div className="text-[12px] text-[#9297A1] truncate max-w-[220px]">
            Selected: <span className="text-[#63676F] font-mono font-medium ml-1" title={selectedFullPath}>{selectedFullPath}</span>
          </div>
          <div className="flex gap-2.5 shrink-0">
            <button
              type="button"
              className="text-[13px] font-semibold rounded-[7px] px-[16px] py-[9px] cursor-pointer border border-[#D4D7DE] bg-white text-[#16181D] hover:bg-[#F7F8FA] active:scale-[0.98] transition-all disabled:opacity-50"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="text-[13px] font-semibold rounded-[7px] px-[16px] py-[9px] cursor-pointer border border-[#3457D5] bg-[#3457D5] text-white hover:bg-[#2C48B8] active:scale-[0.98] transition-all disabled:bg-[#B7C1EE] disabled:border-[#B7C1EE] disabled:cursor-not-allowed disabled:active:scale-100"
              onClick={handleSave}
              disabled={loading || !pathInput.trim()}
            >
              Confirm selection
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
