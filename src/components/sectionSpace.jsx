import React, { useContext, useState } from "react";
import { projectContext } from "../context/useProject";
import { useSettings } from "../context/useSettings";
import { saveProject } from "../api/projectHandling";
import { useAuth } from "../context/useAuth";
import axios from "axios";

const SectionSpace = () => {
  const { projectDetails, updateProjectDetails } = useContext(projectContext);
  const { currentProject, activeFile, compilationStatus, compilationMessage } =
    projectDetails;
  const { settings } = useSettings();
  const { user, isServerConnected, isAuthenticated } = useAuth();

  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [error, setError] = useState("");

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

  const handleDeleteFile = async (e, fileName) => {
    e.stopPropagation(); // Prevent file selection when clicking delete

    if (fileName === "main.tex") {
      alert("Cannot delete the main root file.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${fileName}?`)) {
      return;
    }

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
      }
    } catch (err) {
      console.error("Delete failed:", err);
      setError("Failed to delete file");
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
          <span className="font-semibold text-sm">Project Files</span>
          <button
            onClick={() => setIsCreatingFile(true)}
            className={`p-1 rounded hover:bg-opacity-20 ${isDark ? "hover:bg-white" : "hover:bg-black"}`}
            title="New File"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
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
    </div>
  );
};

export default SectionSpace;
