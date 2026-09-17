"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Folder, 
  FolderOpen,
  FileCode, 
  Terminal, 
  ChevronRight, 
  Search, 
  ArrowUp, 
  HardDrive, 
  X, 
  Loader2,
  Check,
  Database
} from "lucide-react";

interface FileSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedPath: string) => void;
  onSelectMultiple?: (selectedPaths: string[]) => void;
  title: string;
  filterType: "exe" | "prg" | "dir" | "dbf";
  initialPath?: string;
}

export default function FileSelectorModal({
  isOpen,
  onClose,
  onSelect,
  onSelectMultiple,
  title,
  filterType,
  initialPath = ""
}: FileSelectorModalProps) {
  const [currentDir, setCurrentDir] = useState("");
  const [parentDir, setParentDir] = useState<string | null>(null);
  const [drives, setDrives] = useState<string[]>([]);
  const [directories, setDirectories] = useState<string[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const crumbTrackRef = useRef<HTMLDivElement>(null);
  const localFolderInputRef = useRef<HTMLInputElement>(null);
  const localFileInputRef = useRef<HTMLInputElement>(null);

  const handlePickFromMyPC = async () => {
    if (filterType === "dir") {
      if ("showDirectoryPicker" in window) {
        try {
          const handle = await (window as any).showDirectoryPicker();
          if (handle && handle.name) {
            onSelect(handle.name);
            onClose();
          }
        } catch (e: any) {
          if (e.name !== "AbortError") {
            localFolderInputRef.current?.click();
          }
        }
      } else {
        localFolderInputRef.current?.click();
      }
    } else {
      localFileInputRef.current?.click();
    }
  };

  const handleLocalFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const firstFile = selectedFiles[0] as any;
      const nativePath = firstFile.path;
      if (nativePath) {
        const lastSlash = Math.max(nativePath.lastIndexOf("/"), nativePath.lastIndexOf("\\"));
        const parentPath = lastSlash !== -1 ? nativePath.substring(0, lastSlash) : nativePath;
        onSelect(parentPath);
      } else {
        const relPath = firstFile.webkitRelativePath || "";
        const folderName = relPath.split("/")[0] || firstFile.name || "";
        onSelect(folderName);
      }
      onClose();
    }
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFilesList = e.target.files;
    if (selectedFilesList && selectedFilesList.length > 0) {
      const selectedPathsList: string[] = [];
      Array.from(selectedFilesList).forEach((f: any) => {
        if (f.path) {
          selectedPathsList.push(f.path);
        } else if (f.webkitRelativePath) {
          selectedPathsList.push(f.webkitRelativePath.replace(/\//g, "\\"));
        } else {
          selectedPathsList.push(f.name);
        }
      });
      if (selectedPathsList.length > 0) {
        if (onSelectMultiple) {
          onSelectMultiple(selectedPathsList);
        } else {
          onSelect(selectedPathsList[0]);
        }
        onClose();
      }
    }
  };

  // Auto-scroll breadcrumbs when currentDir changes
  useEffect(() => {
    if (crumbTrackRef.current) {
      crumbTrackRef.current.scrollLeft = crumbTrackRef.current.scrollWidth;
    }
  }, [currentDir]);

  // Load directories and files
  const browsePath = async (dirPath: string) => {
    setLoading(true);
    setError("");
    setSelectedItem(null);
    setSelectedItems([]);
    try {
      const typeParam = filterType === "dir" ? "" : filterType;
      const response = await fetch(
        `/api/mabsolcrmsync/browse?dir=${encodeURIComponent(dirPath)}&type=${typeParam}`
      );
      const data = await response.json();
      if (data.success) {
        setCurrentDir(data.currentDir);
        setParentDir(data.parentDir);
        setDrives(data.drives || []);
        setDirectories(data.directories || []);
        setFiles(data.files || []);
      } else {
        setError(data.error || "Failed to load directory.");
      }
    } catch {
      setError("An error occurred while connecting to the file browser.");
    } finally {
      setLoading(false);
    }
  };

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      setError("");
      setSearchQuery("");
      setSelectedItems([]);
      let startDir = initialPath || "";
      if (filterType !== "dir" && (startDir.endsWith(".exe") || startDir.endsWith(".prg") || startDir.endsWith(".dbf"))) {
        const lastSlash = Math.max(startDir.lastIndexOf("/"), startDir.lastIndexOf("\\"));
        if (lastSlash !== -1) {
          startDir = startDir.substring(0, lastSlash);
        }
      }
      browsePath(startDir);
    } else if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen]);

  const handleSelectItem = (name: string) => {
    setSelectedItem(name);
    if (filterType !== "dir") {
      setSelectedItems((prev) => 
        prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
      );
    }
  };

  const handleSelectAllFiles = () => {
    const available = files.filter(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
    if (selectedItems.length === available.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems([...available]);
    }
  };

  const handleDoubleClickDirectory = (dirName: string) => {
    const separator = currentDir.endsWith("\\") || currentDir.endsWith("/") ? "" : "\\";
    browsePath(`${currentDir}${separator}${dirName}`);
  };

  const handleNavigateUp = () => {
    if (parentDir) {
      browsePath(parentDir);
    } else {
      browsePath("");
    }
  };

  const handleConfirmSelect = () => {
    const separator = currentDir.endsWith("\\") || currentDir.endsWith("/") ? "" : "\\";
    
    if (filterType === "dir") {
      if (selectedItem) {
        onSelect(`${currentDir}${separator}${selectedItem}`);
      } else {
        onSelect(currentDir);
      }
      onClose();
    } else {
      // Files multi-select
      const finalItems = selectedItems.length > 0 ? selectedItems : selectedItem ? [selectedItem] : [];
      if (finalItems.length > 0) {
        const fullPaths = finalItems.map((item) => `${currentDir}${separator}${item}`);
        if (onSelectMultiple) {
          onSelectMultiple(fullPaths);
        } else {
          onSelect(fullPaths[0]);
        }
        onClose();
      }
    }
  };

  // Split current directory into clickable breadcrumbs
  const getCrumbs = () => {
    const crumbs = [{ name: "Root", path: "" }];
    if (!currentDir) return crumbs;

    const parts = currentDir.split(/[\\/]/).filter(Boolean);
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

  const getSelectedFullPath = () => {
    if (selectedItems.length > 0) {
      return `${selectedItems.length} file(s) selected (${selectedItems.join(", ")})`;
    }
    if (!selectedItem) {
      return filterType === "dir" ? currentDir || "none" : "none";
    }
    const separator = currentDir.endsWith("\\") || currentDir.endsWith("/") ? "" : "\\";
    return currentDir ? `${currentDir}${separator}${selectedItem}` : selectedItem;
  };

  if (!isOpen) return null;

  const filteredDirectories = directories.filter(d => 
    d.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = files.filter(f => 
    f.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const crumbs = getCrumbs();
  const selectedFullPath = getSelectedFullPath();

  // Header icon selector based on filter type
  let HeaderIcon = FolderOpen;
  if (filterType === "dbf") {
    HeaderIcon = Database;
  } else if (filterType === "exe") {
    HeaderIcon = Terminal;
  }

  return (
    <div className="fixed inset-0 bg-[#16181D]/40 flex items-center justify-center p-3 sm:p-6 z-[1050] backdrop-blur-xs">
      <div className="bg-white w-full max-w-[520px] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden border border-[#E4E6EB]">
        
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 gap-3 bg-white shrink-0">
          <div className="flex gap-3 items-start">
            <div className="w-9 h-9 rounded-xl border border-[#E4E6EB] bg-[#F7F8FA] text-[#63676F] flex items-center justify-center shrink-0">
              <HeaderIcon className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="font-sans text-base font-bold text-[#16181D] m-0 mb-0.5 tracking-tight leading-snug">
                {title}
              </h2>
              <p className="text-xs text-[#9297A1] m-0 leading-normal">
                {filterType === "dbf" ? "Select one or multiple DBF files to synchronize" : "Browse local PC drives and folders to configure MabsolCRM paths"}
              </p>
            </div>
          </div>
          <button 
            type="button"
            className="w-7 h-7 rounded-full border-0 bg-transparent text-[#9297A1] cursor-pointer flex items-center justify-center shrink-0 hover:bg-[#F7F8FA] hover:text-[#16181D] transition-colors mt-0.5"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Local PC Pick Banner */}
        <div className="px-4 sm:px-5 pb-3 shrink-0">
          <button
            type="button"
            onClick={handlePickFromMyPC}
            className="w-full flex items-center justify-center gap-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] border border-[#CBD5E1] rounded-xl py-2 px-3 text-xs font-bold text-[#0F172A] transition-all cursor-pointer shadow-2xs active:scale-[0.99]"
          >
            <HardDrive className="w-4 h-4 text-[#2563EB]" />
            <span>Browse My Local PC (Windows Explorer)</span>
          </button>
          
          <input
            type="file"
            ref={localFolderInputRef}
            onChange={handleLocalFolderChange}
            // @ts-ignore
            webkitdirectory=""
            directory=""
            className="hidden"
          />
          <input
            type="file"
            ref={localFileInputRef}
            onChange={handleLocalFileChange}
            multiple={filterType === "dbf"}
            accept={filterType === "exe" ? ".exe" : filterType === "prg" ? ".prg" : filterType === "dbf" ? ".dbf" : "*"}
            className="hidden"
          />
        </div>

        {/* Navigation Bar */}
        <div className="flex items-center gap-2 px-4 sm:px-5 pb-3 shrink-0">
          <button
            type="button"
            className="w-8 h-8 rounded-xl border border-[#E4E6EB] bg-white flex items-center justify-center cursor-pointer text-[#63676F] shrink-0 hover:bg-[#F7F8FA] disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
            onClick={handleNavigateUp}
            disabled={!currentDir || loading}
            title="Up one level"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          
          <div ref={crumbTrackRef} className="flex-1 min-w-0 flex items-center gap-1.5 bg-[#F7F8FA] border border-[#E4E6EB] rounded-xl p-2 overflow-x-auto whitespace-nowrap scrollbar-none">
            {crumbs.map((crumb, idx) => (
              <span key={idx} className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  className={`text-xs font-medium cursor-pointer px-1 py-0.5 rounded font-mono transition-colors focus:outline-none ${
                    idx === crumbs.length - 1 
                      ? "text-[#16181D] font-bold pointer-events-none" 
                      : "text-[#9297A1] hover:text-[#16181D]"
                  }`}
                  onClick={() => browsePath(crumb.path)}
                >
                  {crumb.name}
                </button>
                {idx < crumbs.length - 1 && (
                  <span className="text-[#D4D7DE] text-xs select-none font-mono">/</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Filter Input & Select All Option */}
        {currentDir && (
          <div className="px-4 sm:px-5 pb-3 shrink-0 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2.5 bg-[#F7F8FA] border border-[#E4E6EB] rounded-xl px-3 py-2">
              <Search className="w-3.5 h-3.5 text-[#9297A1] shrink-0" />
              <input
                type="text"
                className="w-full text-xs bg-transparent outline-none border-none text-[#16181D] placeholder-[#9297A1]"
                placeholder="Filter contents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={loading}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="p-0.5 text-[#9297A1] hover:text-[#16181D] transition-colors focus:outline-none"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Select All Files Toggle for DBF / Multi-select */}
            {filterType !== "dir" && filteredFiles.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllFiles}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition-all shrink-0 cursor-pointer shadow-2xs whitespace-nowrap"
              >
                {selectedItems.length === filteredFiles.length ? "Deselect All" : "Select All"}
              </button>
            )}
          </div>
        )}

        {/* Message Banner (Errors) */}
        {error && (
          <div className="mx-4 sm:mx-5 mb-3 flex items-center gap-2 bg-[#FCEBEA] border border-[#F3C9C6] rounded-xl p-2.5 text-xs text-[#C0332A] font-medium animate-in fade-in duration-100 shrink-0">
            <span>{error}</span>
          </div>
        )}

        {/* Contents List */}
        <div className="mx-4 sm:mx-5 mb-4 border border-[#E4E6EB] rounded-xl flex-1 min-h-[180px] max-h-[280px] overflow-y-auto bg-white">
          {loading ? (
            <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-[#9297A1] gap-2.5">
              <Loader2 className="w-6 h-6 animate-spin text-[#3457D5]" />
              <span className="text-xs font-semibold">Scanning directory...</span>
            </div>
          ) : !currentDir && drives.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-[#9297A1] min-h-[180px]">
              <HardDrive className="w-7 h-7 mb-2 text-[#D4D7DE]" />
              <div className="text-xs font-semibold text-[#63676F] mb-0.5">No drives available</div>
              <div className="text-[11px] text-[#9297A1]">Could not scan standard drives on the host.</div>
            </div>
          ) : currentDir && filteredDirectories.length === 0 && filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-[#9297A1] min-h-[180px]">
              <Folder className="w-7 h-7 mb-2 text-[#D4D7DE]" />
              <div className="text-xs font-semibold text-[#63676F] mb-0.5">No items found</div>
              <div className="text-[11px] text-[#9297A1]">This location is empty or matches no filter.</div>
            </div>
          ) : (
            <div className="divide-y divide-[#E4E6EB]">
              {/* Render Drives (Only when at root) */}
              {!currentDir && drives.map((drive) => {
                const isSelected = selectedItem === drive;
                return (
                  <div
                    key={drive}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors group ${
                      isSelected ? "bg-[#EEF1FD]" : "hover:bg-[#F7F8FA]"
                    }`}
                    onClick={() => handleSelectItem(drive)}
                    onDoubleClick={() => browsePath(drive)}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "bg-white text-[#3457D5]" : "bg-[#F7F8FA] text-[#9297A1]"
                    }`}>
                      <HardDrive className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#16181D] truncate font-mono">
                        Local Disk ({drive})
                      </div>
                      <div className="text-[11px] text-[#9297A1] font-mono">System Drive</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#9297A1] shrink-0 ml-auto group-hover:translate-x-0.5 transition-transform" />
                  </div>
                );
              })}

              {/* Render Directories */}
              {filteredDirectories.map((dir) => {
                const isSelected = selectedItem === dir;
                return (
                  <div
                    key={dir}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors group ${
                      isSelected ? "bg-[#EEF1FD]" : "hover:bg-[#F7F8FA]"
                    }`}
                    onClick={() => {
                      if (filterType === "dir") {
                        handleSelectItem(dir);
                      } else {
                        handleDoubleClickDirectory(dir);
                      }
                    }}
                    onDoubleClick={() => handleDoubleClickDirectory(dir)}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "bg-white text-[#3457D5]" : "bg-[#F7F8FA] text-[#9297A1]"
                    }`}>
                      <Folder className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#16181D] truncate font-sans">
                        {dir}
                      </div>
                      <div className="text-[11px] text-[#9297A1] font-sans">Folder</div>
                    </div>
                    {filterType === "dir" ? (
                      <Check className={`w-3.5 h-3.5 text-[#3457D5] shrink-0 ml-auto transition-all ${
                        isSelected ? "opacity-100 scale-100" : "opacity-0 scale-75"
                      }`} />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[#9297A1] shrink-0 ml-auto group-hover:translate-x-0.5 transition-transform" />
                    )}
                  </div>
                );
              })}

              {/* Render Files */}
              {filterType !== "dir" && filteredFiles.map((file) => {
                const isChecked = selectedItems.includes(file);
                const isSelected = selectedItem === file || isChecked;
                
                let FileIcon = FileCode;
                let metaText = "File";
                let iconColor = "text-[#9297A1]";
                
                if (filterType === "dbf") {
                  FileIcon = Database;
                  metaText = "MabsolCRM Table";
                } else if (filterType === "exe") {
                  FileIcon = Terminal;
                  metaText = "Executable";
                }

                return (
                  <div
                    key={file}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors group ${
                      isChecked ? "bg-[#EEF1FD]" : "hover:bg-[#F7F8FA]"
                    }`}
                    onClick={() => handleSelectItem(file)}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="w-4 h-4 text-indigo-600 rounded cursor-pointer shrink-0"
                    />
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isChecked ? "bg-white text-[#3457D5]" : `bg-[#F7F8FA] ${iconColor}`
                    }`}>
                      <FileIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#16181D] truncate font-mono">
                        {file}
                      </div>
                      <div className="text-[11px] text-[#9297A1] font-sans">{metaText}</div>
                    </div>
                    {isChecked && (
                      <Check className="w-4 h-4 text-[#3457D5] shrink-0 ml-auto" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:px-5 border-t border-[#E4E6EB] bg-white shrink-0">
          <div className="text-xs text-[#9297A1] truncate max-w-full sm:max-w-[260px]">
            Selected: <span className="text-[#16181D] font-mono font-bold ml-1" title={selectedFullPath}>{selectedFullPath}</span>
          </div>
          <div className="flex gap-2.5 shrink-0 justify-end w-full sm:w-auto">
            <button
              type="button"
              className="flex-1 sm:flex-none text-xs font-bold rounded-xl px-4 py-2 cursor-pointer border border-[#D4D7DE] bg-white text-[#16181D] hover:bg-[#F7F8FA] active:scale-[0.98] transition-all disabled:opacity-50"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex-1 sm:flex-none text-xs font-bold rounded-xl px-4 py-2 cursor-pointer border border-[#3457D5] bg-[#3457D5] text-white hover:bg-[#2C48B8] active:scale-[0.98] transition-all disabled:bg-[#B7C1EE] disabled:border-[#B7C1EE] disabled:cursor-not-allowed disabled:active:scale-100 shadow-2xs"
              onClick={handleConfirmSelect}
              disabled={loading || (filterType !== "dir" && selectedItems.length === 0 && !selectedItem)}
            >
              {selectedItems.length > 1 ? `Confirm (${selectedItems.length} files)` : "Confirm selection"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
