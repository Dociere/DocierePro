import React, { useState, useEffect, useContext } from "react";
import { projectContext } from "../context/useProject";
import { useSettings } from "../context/useSettings";
import { createDraftVersion, loadDraftVersion } from "../api/projectHandling";
import { useAuth } from "../context/useAuth";

const VersionManager = ({ onClose }) => {
  const { projectDetails, updateProjectDetails } = useContext(projectContext);
  const { settings } = useSettings();
  const isDark = settings.appearance.mode === "dark";

  const [versions, setVersions] = useState([]);
  const [vName, setVName] = useState("");
  const [vDesc, setVDesc] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [showConfirmRestore, setShowConfirmRestore] = useState(null);
  const { isAuthenticated, isServerConnected } = useAuth();

  useEffect(() => {
    loadHistory();
    console.log(
      "isAuthenticated, isServerConnected",
      isAuthenticated,
      isServerConnected,
    );
  }, []);

  const loadHistory = async () => {
    const history = await loadDraftVersion(projectDetails?.currentProject?.id);
    console.log("history", history.draft);

    setVersions(
      Object.entries(history.draft).map(([name, data]) => ({
        _id: name,
        name,
        ...data,
      })),
    );
  };

  const handlePublish = async () => {
    if (!vName.trim()) return;
    setIsPublishing(true);
    try {
      await createDraftVersion(
        projectDetails?.currentProject?.id,
        vName,
        vDesc,
        projectDetails?.currentProject?.files,
        isAuthenticated,
        isServerConnected,
      );
      setVName("");
      setVDesc("");
      await loadHistory();
    } catch (error) {
      console.error("Publish failed:", error);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRestore = async (version) => {
    try {
      // const restoredContent = await restoreVersion(
      //   projectDetails?.currentProject?.id,
      //   version._id,
      // );
      // updateProjectDetails({ latexContent: restoredContent });
      updateProjectDetails({
        currentProject: {
          ...projectDetails.currentProject,
          files: version.content,
        },
      });
      setShowConfirmRestore(null);
      onClose();
    } catch (error) {
      console.error("Restore failed:", error);
    }
  };

  const formatDate = (ts) => {
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className={`w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors duration-300 ${
          isDark
            ? "bg-[#1a1a1a] border border-[#333] text-white"
            : "bg-white text-black"
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${isDark ? "border-[#333]" : "border-gray-200"}`}
        >
          <h2 className="text-xl font-inter font-semibold">Draft Versions</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${isDark ? "hover:bg-[#333]" : "hover:bg-gray-100"}`}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Publish Section */}
          <section className="space-y-4">
            <h3
              className={`text-sm font-medium uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              Publish Milestone
            </h3>
            <div
              className={`p-4 rounded-lg border space-y-3 ${isDark ? "bg-[#252525] border-[#333]" : "bg-gray-50 border-gray-200"}`}
            >
              <input
                type="text"
                placeholder="Version Name (e.g. V1, Initial Draft)"
                value={vName}
                onChange={(e) => setVName(e.target.value)}
                className={`w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors ${
                  isDark
                    ? "bg-[#1a1a1a] border-[#444] text-white"
                    : "bg-white border-gray-300"
                }`}
              />
              <textarea
                placeholder="Description of changes..."
                value={vDesc}
                onChange={(e) => setVDesc(e.target.value)}
                rows={2}
                className={`w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors ${
                  isDark
                    ? "bg-[#1a1a1a] border-[#444] text-white"
                    : "bg-white border-gray-300"
                }`}
              />
              <button
                onClick={handlePublish}
                disabled={isPublishing || !vName.trim()}
                className="w-full bg-black hover:bg-gray-700 text-white font-normal py-2 rounded-lg transition-colors disabled:opacity-50 font-inter"
              >
                {isPublishing ? "Publishing..." : "Snapshot Current Draft"}
              </button>
            </div>
          </section>

          {/* History List */}
          <section className="space-y-4">
            <h3
              className={`text-sm font-medium uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              Previous Versions
            </h3>
            <div className="space-y-3">
              {versions.length === 0 ? (
                <p
                  className={`text-center py-8 italic ${isDark ? "text-gray-500" : "text-gray-400"}`}
                >
                  No versions recorded yet.
                </p>
              ) : (
                versions
                  .slice()
                  .reverse()
                  .map((v) => (
                    <div
                      key={v._id}
                      className={`p-4 rounded-lg border group relative transition-colors ${
                        isDark
                          ? "bg-[#252525] border-[#333] hover:border-[#444]"
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold font-inter text-black">
                            {v.name}
                          </h4>
                          <p
                            className={`text-xs mt-1 font-inter ${isDark ? "text-gray-400" : "text-gray-500"}`}
                          >
                            {formatDate(v.timestamp)}
                          </p>
                          {v.description && (
                            <p
                              className={`text-sm mt-2 line-clamp-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}
                            >
                              {v.description}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => setShowConfirmRestore(v)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-all ${
                            isDark
                              ? "border-blue-900/50 text-gray-400 hover:bg-blue-900/20"
                              : "border-blue-100 text-black hover:bg-gray-50"
                          }`}
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        {/* <div
          className={`p-4 border-t text-center text-xs ${isDark ? "border-[#333] text-gray-500" : "border-gray-200 text-gray-400"}`}
        >
          Version snapshots are stored locally.
        </div> */}
      </div>

      {/* Confirmation Modal */}
      {showConfirmRestore && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div
            className={`max-w-md w-full p-6 rounded-xl shadow-2xl transition-colors duration-300 ${
              isDark
                ? "bg-[#252525] text-white border border-[#444]"
                : "bg-white text-black"
            }`}
          >
            <h3 className="text-xl font-bold mb-2">Confirm Restore</h3>
            <p
              className={`mb-6 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}
            >
              Restoring{" "}
              <span className="font-semibold text-black">
                {showConfirmRestore.name}
              </span>{" "}
              will overwrite your current draft content.
              <br />
              <br />
              Any unsaved changes in your live draft will be lost. Do you want
              to continue?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmRestore(null)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDark
                    ? "bg-[#333] hover:bg-[#444]"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRestore(showConfirmRestore)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionManager;
