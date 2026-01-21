import React, { useState, useEffect, useCallback } from "react";
import { TbX, TbCopy, TbDeviceFloppy } from "react-icons/tb";
import { useSettings } from "../context/useSettings";

const API_BASE_URL = "http://localhost:5000";

const citationFormats = ["IEEE", "APA", "MLA", "Chicago", "Harvard"];

const initialFormData = {
  authors: "",
  title: "",
  journal: "",
  volume: "",
  issue: "",
  pages: "",
  year: "",
  doi: "",
  format: "IEEE",
};

const CitationManager = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState("create");
  const [formData, setFormData] = useState(initialFormData);
  const [previewUrl, setPreviewUrl] = useState("");
  const [latexCode, setLatexCode] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);
  const [savedCitations, setSavedCitations] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFileName, setSaveFileName] = useState("");
  const { settings } = useSettings();
  const isDark = settings.appearance.mode === "dark";

  // Fetch citations only when on saved tab
  useEffect(() => {
    if (activeTab === "saved") {
      loadSavedCitations();
    }
    // eslint-disable-next-line
  }, [activeTab]);

  const loadSavedCitations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/citation/list`);
      const data = await res.json();
      setSavedCitations(data);
    } catch (err) {
      console.error("Failed to load citations:", err);
    }
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const compileCitation = useCallback(async () => {
    const { authors, title, year } = formData;
    if (!authors || !title || !year) {
      alert("Please fill in at least Authors, Title, and Year");
      return;
    }
    setIsCompiling(true);
    setPreviewUrl("");
    try {
      const citationNumber = savedCitations.length + 1;
      const res = await fetch(`${API_BASE_URL}/api/citation/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, citationNumber }),
      });
      const data = await res.json();
      if (data.success) {
        setPreviewUrl(`${API_BASE_URL}${data.previewUrl}?t=${Date.now()}`);
        setLatexCode(data.latexCode);
      } else {
        alert("Compilation failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Compilation error:", err);
      alert("Failed to compile citation");
    } finally {
      setIsCompiling(false);
    }
    // eslint-disable-next-line
  }, [formData, savedCitations]);

  const handleSave = useCallback(async () => {
    if (!saveFileName.trim()) {
      alert("Please enter a file name");
      return;
    }
    try {
      const citationNumber = savedCitations.length + 1;
      const res = await fetch(`${API_BASE_URL}/api/citation/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: saveFileName,
          citationData: formData,
          latexCode,
          citationNumber,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Citation saved as [${citationNumber}]`);
        setShowSaveDialog(false);
        setSaveFileName("");
        loadSavedCitations(); // reload after save
      } else {
        alert("Save failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save citation");
    }
    // eslint-disable-next-line
  }, [saveFileName, formData, latexCode, savedCitations, loadSavedCitations]);

  const copyToClipboard = useCallback(async (text, message) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(message);
    } catch {
      alert("Failed to copy");
    }
  }, []);

  const handleDeleteCitation = useCallback(
    async (fileName) => {
      if (!window.confirm(`Delete citation "${fileName}"?`)) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/citation/${fileName}`, {
          method: "DELETE",
        });
        if (res.ok) {
          loadSavedCitations();
        } else {
          alert("Failed to delete citation");
        }
      } catch (err) {
        alert("Failed to delete citation");
      }
    },
    [loadSavedCitations]
  );

  const loadCitation = useCallback((citation) => {
    setFormData({
      authors: citation.authors || "",
      title: citation.title || "",
      journal: citation.journal || "",
      volume: citation.volume || "",
      issue: citation.issue || "",
      pages: citation.pages || "",
      year: citation.year || "",
      doi: citation.doi || "",
      format: citation.format || "IEEE",
    });
    setLatexCode(citation.latexCode || "");
    setActiveTab("create");
  }, []);

  // --- Render ---

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 transition-colors duration-300">
      <div className={`rounded-lg shadow-2xl w-[95%] h-[90%] flex flex-col border transition-colors duration-300 ${isDark ? "bg-[#1a1a1a] border-[#333]" : "bg-white border-gray-200"}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b transition-colors duration-300 ${isDark ? "border-[#333]" : "border-gray-200"}`}>
          <h2 className={`text-xl font-bold transition-colors duration-300 ${isDark ? "text-white" : "text-gray-800"}`}>Citation Manager</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors duration-300 ${isDark ? "text-white hover:bg-[#333]" : "text-gray-600 hover:bg-gray-100"}`}
          >
            <TbX size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b transition-colors duration-300 ${isDark ? "border-[#333]" : "border-gray-200"}`}>
          <button
            onClick={() => setActiveTab("create")}
            className={`px-6 py-3 font-medium transition-colors duration-300 ${activeTab === "create"
                ? "text-blue-500 border-b-2 border-blue-500 font-bold"
                : isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-800"
              }`}
          >
            Create Citation
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`px-6 py-3 font-medium transition-colors duration-300 ${activeTab === "saved"
                ? "text-blue-500 border-b-2 border-blue-500 font-bold"
                : isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-800"
              }`}
          >
            Saved Citations
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {activeTab === "create" ? (
            // Create Citation Tab
            <>
              {/* Form Section */}
              <div className={`w-1/2 p-6 overflow-y-auto border-r transition-colors duration-300 ${isDark ? "border-[#333]" : "border-gray-200"}`}>
                <div className="space-y-4">
                  {/* Citation Format */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Citation Format *
                    </label>
                    <select
                      name="format"
                      value={formData.format}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${isDark ? "bg-[#2d2d2d] border-[#444] text-white" : "bg-white border-gray-300"
                        }`}
                    >
                      {citationFormats.map((format) => (
                        <option key={format} value={format} className={isDark ? "bg-[#2d2d2d]" : ""}>
                          {format}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Authors */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Authors *
                    </label>
                    <textarea
                      name="authors"
                      value={formData.authors}
                      onChange={handleInputChange}
                      placeholder="A. Ali, S. A. Razak, S. H. Othman..."
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${isDark ? "bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500" : "bg-white border-gray-300"
                        }`}
                      rows="2"
                    />
                  </div>

                  {/* Title */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Paper Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Financial Fraud Detection Based on Machine Learning..."
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${isDark ? "bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500" : "bg-white border-gray-300"
                        }`}
                    />
                  </div>

                  {/* Journal */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Journal Name
                    </label>
                    <input
                      type="text"
                      name="journal"
                      value={formData.journal}
                      onChange={handleInputChange}
                      placeholder="Applied Sciences"
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${isDark ? "bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500" : "bg-white border-gray-300"
                        }`}
                    />
                  </div>

                  {/* Volume, Issue, Pages - Row */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        Volume
                      </label>
                      <input
                        type="text"
                        name="volume"
                        value={formData.volume}
                        onChange={handleInputChange}
                        placeholder="12"
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${isDark ? "bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500" : "bg-white border-gray-300"
                          }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        Issue
                      </label>
                      <input
                        type="text"
                        name="issue"
                        value={formData.issue}
                        onChange={handleInputChange}
                        placeholder="3"
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${isDark ? "bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500" : "bg-white border-gray-300"
                          }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        Pages
                      </label>
                      <input
                        type="text"
                        name="pages"
                        value={formData.pages}
                        onChange={handleInputChange}
                        placeholder="101-115"
                        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${isDark ? "bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500" : "bg-white border-gray-300"
                          }`}
                      />
                    </div>
                  </div>

                  {/* Year */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Year *
                    </label>
                    <input
                      type="text"
                      name="year"
                      value={formData.year}
                      onChange={handleInputChange}
                      placeholder="2022"
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${isDark ? "bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500" : "bg-white border-gray-300"
                        }`}
                    />
                  </div>

                  {/* DOI */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      DOI (optional)
                    </label>
                    <input
                      type="text"
                      name="doi"
                      value={formData.doi}
                      onChange={handleInputChange}
                      placeholder="10.1234/example.doi"
                      className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${isDark ? "bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-500" : "bg-white border-gray-300"
                        }`}
                    />
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={compileCitation}
                    disabled={isCompiling}
                    className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed font-medium shadow-md"
                  >
                    {isCompiling ? "Generating..." : "Generate Citation"}
                  </button>
                </div>
              </div>

              {/* Preview Section */}
              <div className="flex-1 flex flex-col p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold transition-colors duration-300 ${isDark ? "text-white" : "text-gray-800"}`}>
                    Reference Preview
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        copyToClipboard(
                          latexCode,
                          "LaTeX code copied to clipboard!"
                        )
                      }
                      disabled={!latexCode}
                      className={`px-3 py-2 rounded transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium ${isDark ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-600 text-white hover:bg-gray-700"
                        }`}
                      title="Copy LaTeX"
                    >
                      <TbCopy size={18} />
                      Copy LaTeX
                    </button>
                    <button
                      onClick={() => setShowSaveDialog(true)}
                      disabled={!latexCode}
                      className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                      title="Save Citation"
                    >
                      <TbDeviceFloppy size={18} />
                      Save
                    </button>
                  </div>
                </div>

                <div className={`flex-1 border rounded overflow-auto transition-colors duration-300 ${isDark ? "bg-[#111] border-[#333]" : "bg-gray-50 border-gray-300"
                  }`}>
                  {previewUrl ? (
                    <div className={`w-full p-4 flex justify-center ${isDark ? "bg-white" : ""}`}>
                      <img
                        src={previewUrl}
                        alt="Reference Preview"
                        className="max-w-full h-auto"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className={`transition-colors duration-300 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                        Fill in the form and click "Generate Citation" to see
                        reference
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            // Saved Citations Tab
            <div className="w-full h-full flex flex-col overflow-hidden">
              <div className="p-6 pb-2">
                <h3 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${isDark ? "text-white" : "text-gray-800"}`}>
                  Saved Citations ({savedCitations.length})
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-hide">
                <div className="space-y-4">
                  {savedCitations.map((citation, index) => (
                    <div
                      key={citation.fileName || index}
                      className={`border rounded p-4 transition-all duration-300 hover:shadow-lg ${isDark ? "bg-[#2d2d2d] border-[#444] hover:bg-[#333]" : "bg-white border-gray-200 hover:shadow-gray-200"
                        }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-blue-500 text-lg">
                              [{citation.citationNumber || index + 1}]
                            </span>
                            <h4 className={`font-semibold transition-colors duration-300 ${isDark ? "text-gray-100" : "text-gray-800"}`}>
                              {citation.title}
                            </h4>
                          </div>
                          <p className={`text-sm transition-colors duration-300 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            {citation.authors}
                          </p>
                          <p className={`text-xs mt-1 transition-colors duration-300 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                            Format: {citation.format} | Year: {citation.year}
                          </p>
                        </div>
                      </div>
                      <div className={`flex flex-wrap gap-2 mt-3 pt-3 border-t ${isDark ? "border-[#444]" : "border-gray-200"}`}>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `[${citation.citationNumber || index + 1}]`,
                              `Citation number [${citation.citationNumber || index + 1
                              }] copied!`
                            )
                          }
                          className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-xs flex items-center gap-1 font-medium"
                          title="Copy citation number"
                        >
                          <TbCopy size={14} />
                          Copy [{citation.citationNumber || index + 1}]
                        </button>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `^{[${citation.citationNumber || index + 1}]}`,
                              `Superscript citation ^{[${citation.citationNumber || index + 1
                              }]} copied!`
                            )
                          }
                          className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-xs flex items-center gap-1 font-medium"
                          title="Copy superscript citation"
                        >
                          <TbCopy size={14} />
                          Copy ^
                          {"{[" + (citation.citationNumber || index + 1) + "]}"}
                        </button>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              citation.latexCode,
                              "Full reference copied!"
                            )
                          }
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs flex items-center gap-1 font-medium"
                          title="Copy full reference"
                        >
                          <TbCopy size={14} />
                          Copy Full Reference
                        </button>
                        <button
                          onClick={() => loadCitation(citation)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-medium"
                        >
                          Load
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteCitation(citation.fileName)
                          }
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {savedCitations.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <p className="text-gray-500 text-center">
                        No saved citations yet
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Dialog Modal */}
        {showSaveDialog && (
          <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[60]">
            <div className={`rounded-lg p-6 w-96 shadow-2xl transition-colors duration-300 border ${isDark ? "bg-[#2d2d2d] border-[#444]" : "bg-white border-gray-200"}`}>
              <h3 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${isDark ? "text-white" : "text-gray-800"}`}>
                Save Citation
              </h3>
              <p className={`text-sm mb-3 transition-colors duration-300 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                This will be saved as citation{" "}
                <strong className="text-blue-500">[{savedCitations.length + 1}]</strong>
              </p>
              <input
                type="text"
                value={saveFileName}
                onChange={(e) => setSaveFileName(e.target.value)}
                placeholder="Enter file name"
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 transition-colors duration-300 ${isDark ? "bg-[#1a1a1a] border-[#444] text-white placeholder:text-gray-600" : "bg-white border-gray-300"
                  }`}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className={`px-4 py-2 rounded transition-colors duration-300 font-medium ${isDark ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                    }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium shadow-md"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CitationManager;
