import React, { useContext, useState } from "react";
import { projectContext } from "../context/useProject";
import { useSettings } from "../context/useSettings";
import { saveProject } from "../api/projectHandling";
import { useAuth } from "../context/useAuth";
import AddFileIcon from "../assets/icons/addFile.svg?react";
import AddFolderIcon from "../assets/icons/addFolder.svg?react";
import UploadFileIcon from "../assets/icons/upload.svg?react";
import axios from "axios";
import { TbAlertTriangle, TbCheck, TbX } from "react-icons/tb";

// Confirmation Modal Component
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <TbAlertTriangle className="text-amber-500" size={24} />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 font-medium">Confirm</button>
        </div>
      </div>
    </div>
  );
};

// Alert Modal Component
const AlertModal = ({ isOpen, message, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <TbAlertTriangle className="text-amber-500" size={24} />
          <h3 className="text-lg font-semibold text-gray-900">Notice</h3>
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 font-medium">OK</button>
        </div>
      </div>
    </div>
  );
};

// Toast Component
const Toast = ({ message, isVisible }) => {
  if (!isVisible) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-[fadeIn_0.2s_ease-out]">
      <TbCheck size={16} className="text-green-400" />
      <span className="text-sm">{message}</span>
    </div>
  );
};

const SectionSpace = () => {
  const { projectDetails, updateProjectDetails } = useContext(projectContext);
  const { currentProject, activeFile, compilationStatus, compilationMessage } =
    projectDetails;
  const { settings } = useSettings();
  const { user, isServerConnected, isAuthenticated } = useAuth();

  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });
  const [uploadPendingFiles, setUploadPendingFiles] = useState([]);
  const [uploadOverwriteFile, setUploadOverwriteFile] = useState(null);

  const fileInputRef = React.useRef(null);

  const isDark = settings.appearance.mode === "dark";

  const handleFileClick = (fileName) => {
    // If switching files, save the current file content back to the project first?
    // The textEditor usually updates the 'latexContent' in context.
    // We should ensure 'latexContent' is saved to the 'files' object before switching.

    // However, the textEditor likely updates `currentProject.files[activeFile].content`
    // or just `latexContent`. Let's assume for now we just switch the view.
    // A more robust implementation would ensure state sync.

    updateProjectDetails({
      activeFile: fileName,
      latexContent: currentProject.files[fileName]?.content || "",
    });
  };

  const handleAddFile = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors

    if (!currentProject) return;
    if (!newFileName.trim()) {
      setError("File name cannot be empty");
      return;
    }

    try {
      // Auto-append .tex if no extension provided
      let finalName = newFileName.trim();
      if (!finalName.includes(".")) {
        finalName += ".tex";
      }

      if (currentProject.files[finalName]) {
        setError("File already exists");
        return;
      }

      const newFile = {
        name: finalName,
        content: "",
        type: finalName.split(".").pop(),
      };

      const updatedProject = {
        ...currentProject,
        files: {
          ...currentProject.files,
          [finalName]: newFile,
        },
      };

      // Update context first for instant UI feedback
      updateProjectDetails({
        currentProject: updatedProject,
        activeFile: finalName,
        latexContent: "",
      });

      // Persist to server
      await saveProject(
        updatedProject,
        finalName,
        compilationStatus,
        compilationMessage,
        isServerConnected,
        isAuthenticated,
      );

      setIsCreatingFile(false);
      setNewFileName("");
    } catch (err) {
      console.error("Failed to add file:", err);
      setError("Failed to create file on server");
    }
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const handleDeleteFile = async (e, fileName) => {
    e.stopPropagation(); // Prevent file selection when clicking delete

    if (fileName === "main.tex") {
      setAlertMessage("Cannot delete the main root file.");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Delete File",
      message: `Are you sure you want to delete ${fileName}?`,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: null });
        try {
          const response = await axios.delete(
            `http://localhost:5000/api/projects/${currentProject.id}/files/${fileName}`,
          );

          if (response.data.success) {
            // Determine next file to focus if we deleted the active one
            let nextActiveFile = activeFile;
            if (activeFile === fileName) {
              nextActiveFile = "main.tex";
            }

            updateProjectDetails({
              currentProject: response.data.project,
              activeFile: nextActiveFile,
              latexContent:
                response.data.project.files[nextActiveFile]?.content || "",
            });
            showToast(`Deleted ${fileName}`);
          }
        } catch (err) {
          console.error("Delete failed:", err);
          setError("Failed to delete file");
        }
      },
    });
  };

  // Handle file upload - reads file client-side and adds to project
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentProject) return;

    setIsUploading(true);
    setError("");

    try {
      const newFiles = { ...currentProject.files };
      const filesToProcess = Array.from(files);
      let skippedCount = 0;
      
      for (const file of filesToProcess) {
        const fileName = file.name;
        
        // Check if file already exists - skip with info (no blocking confirm)
        if (newFiles[fileName]) {
          // Overwrite silently if same name
          console.log(`Overwriting existing file: ${fileName}`);
        }
        
        // Determine file type
        const isImage = /\.(png|jpg|jpeg|gif|svg|pdf|eps)$/i.test(fileName);
        const isText = /\.(tex|bib|sty|cls|txt)$/i.test(fileName);
        
        if (isImage) {
          // Read as base64 data URL
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          
          newFiles[fileName] = {
            name: fileName,
            content: dataUrl,
            type: fileName.split(".").pop(),
            isImage: true,
          };
        } else if (isText) {
          // Read as text
          const content = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
          });
          
          newFiles[fileName] = {
            name: fileName,
            content: content,
            type: fileName.split(".").pop(),
          };
        } else {
          // Unsupported file type
          console.warn(`Skipping unsupported file type: ${fileName}`);
          skippedCount++;
          continue;
        }
      }
      
      // Update project with new files
      const updatedProject = {
        ...currentProject,
        files: newFiles,
      };
      
      updateProjectDetails({
        currentProject: updatedProject,
      });
      
      // Save to server
      await saveProject(
        updatedProject,
        activeFile,
        compilationStatus,
        compilationMessage,
        isServerConnected,
        isAuthenticated
      );
      
      const uploadedCount = filesToProcess.length - skippedCount;
      if (uploadedCount > 0) {
        showToast(`Uploaded ${uploadedCount} file${uploadedCount > 1 ? 's' : ''}`);
      }
      
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Failed to upload file: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const sortedFiles = currentProject?.files
    ? Object.keys(currentProject.files).sort()
    : [];

  return (
    <div
      className={`fixed top-7 left-10 h-[calc(100vh-2.75rem)] w-64 border-r transition-colors duration-300 z-30 ${
        isDark
          ? "bg-[#252525] border-[#404040] text-[#e5e5e5]"
          : "bg-[#F9F9F9] border-[#CFCFCF] text-[#585858]"
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${isDark ? "border-[#404040]" : "border-[#CFCFCF]"}`}
        >
          <span className="font-medium text-black font-inter text-sm">
            Project Files
          </span>
          <div className="space-x-3">
            <button
              onClick={() => setIsCreatingFile(true)}
              className={`p-1 rounded hover:bg-opacity-20 ${isDark ? "hover:bg-white" : "hover:bg-black"}`}
              title="New File"
            >
              <AddFileIcon
                style={{ fill: "#9BC59D" }}
                className="w-[14px] h-[14px]"
              />
            </button>
            <button>
              <AddFolderIcon
                style={{ fill: "#9BC59D" }}
                className="w-[14px] h-[14px]"
              />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`p-1 rounded hover:bg-opacity-20 ${isDark ? "hover:bg-white" : "hover:bg-black"} ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
              title="Upload File"
            >
              {isUploading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#9BC59D" strokeWidth="2" opacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="#9BC59D" strokeWidth="2" />
                </svg>
              ) : (
                <UploadFileIcon style={{ fill: "#0a0a0a" }} className="w-4 h-4" />
              )}
            </button>
            {/* Hidden file input for uploads */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.pdf,.eps,.svg,.tex,.bib,.sty,.cls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* New File Input */}
        {isCreatingFile && (
          <div className="p-3">
            <form onSubmit={handleAddFile} className="flex flex-col gap-2">
              <input
                autoFocus
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="filename.tex"
                className={`w-full px-2 py-1 text-sm rounded border focus:outline-none ${
                  isDark
                    ? "bg-[#333] border-[#555] text-white focus:border-[#777]"
                    : "bg-white border-gray-300 text-black focus:border-gray-500"
                }`}
              />
              {error && <span className="text-xs text-red-500">{error}</span>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingFile(false)}
                  className="text-xs px-2 py-1 opacity-70 hover:opacity-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`text-xs px-2 py-1 rounded ${isDark ? "bg-[#404040] hover:bg-[#505050]" : "bg-gray-200 hover:bg-gray-300"}`}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        )}

        {/* File List */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {sortedFiles.map((fileName) => (
            <div
              key={fileName}
              onClick={() => handleFileClick(fileName)}
              className={`px-3 py-2 text-[13px] cursor-pointer flex items-center gap-3 rounded-md border transition-all duration-200 group truncate ${
                activeFile === fileName
                  ? isDark
                    ? "bg-[#333] border-[#555] text-white shadow-sm"
                    : "bg-white border-[#CFCFCF] text-black shadow-sm ring-1 ring-gray-100"
                  : isDark
                    ? "bg-transparent border-transparent text-[#a0a0a0] hover:bg-[#2d2d2d] hover:border-[#404040]"
                    : "bg-transparent border-transparent text-[#585858] hover:bg-white hover:border-[#CFCFCF] hover:shadow-sm"
              }`}
            >
              {/* File Icon */}
              <div
                className={`p-1.5 rounded transition-colors ${
                  activeFile === fileName
                    ? isDark
                      ? "bg-gray-400/20 text-gray-50"
                      : "bg-gray-50 text-black"
                    : isDark
                      ? "bg-[#333] text-[#777] group-hover:text-[#aaa]"
                      : "bg-gray-100 text-[#888] group-hover:bg-gray-200 group-hover:text-[#555]"
                }`}
              >
                {fileName.endsWith(".tex") ? (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                ) : fileName.endsWith(".png") || fileName.endsWith(".jpg") ? (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </div>
              <span className="truncate flex-1 font-medium tracking-tight">
                {fileName}
              </span>

              {/* Actions Area */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {fileName !== "main.tex" && (
                  <button
                    onClick={(e) => handleDeleteFile(e, fileName)}
                    className={`p-1 rounded hover:bg-red-500/10 hover:text-red-500 transition-colors ${isDark ? "text-gray-500" : "text-gray-400"}`}
                    title="Delete File"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Active Indicator Dot */}
              {activeFile === fileName && (
                <div
                  className={`w-2 h-2 rounded-full ${isDark ? "bg-white" : "bg-gray-700"} shadow-[0_0_8px_rgba(59,130,246,0.5)]`}
                ></div>
              )}
            </div>
          ))}

          {sortedFiles.length === 0 && (
            <div className="p-4 text-xs opacity-50 text-center">
              No files in project
            </div>
          )}
        </div>
      </div>
      
      <Toast message={toast} isVisible={!!toast} />
      <AlertModal isOpen={!!alertMessage} message={alertMessage} onClose={() => setAlertMessage(null)} />
      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        title={confirmModal.title} 
        message={confirmModal.message} 
        onConfirm={confirmModal.onConfirm} 
        onCancel={() => setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: null })} 
      />
    </div>
  );
};

export default SectionSpace;
