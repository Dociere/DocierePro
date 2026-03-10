import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/useAuth";
import { useNavigate } from "react-router-dom";
import {
  TbX,
  TbCopy,
  TbDeviceFloppy,
  TbListNumbers,
  TbSearch,
  TbLoader,
} from "react-icons/tb";
import ConfirmModal from "./confirmModal";

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
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("create");
  const [formData, setFormData] = useState(initialFormData);
  const [previewUrl, setPreviewUrl] = useState("");
  const [latexCode, setLatexCode] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);
  const [savedCitations, setSavedCitations] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [citationToDelete, setCitationToDelete] = useState(null);

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
      const res = await fetch(`${API_BASE_URL}/api/citation/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData }),
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
  }, [formData]);

  const handleSave = useCallback(async () => {
    if (!latexCode) {
      alert("Please generate a citation first");
      return;
    }
    try {
      const autoFileName = formData.title
        ? formData.title
            .replace(/[^a-zA-Z0-9 ]/g, "")
            .replace(/\s+/g, "_")
            .substring(0, 50)
        : `citation_${Date.now()}`;
      const res = await fetch(`${API_BASE_URL}/api/citation/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: autoFileName,
          citationData: formData,
          latexCode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Citation saved as [${data.citationNumber}]`);
        loadSavedCitations();
      } else {
        alert("Save failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save citation");
    }
    // eslint-disable-next-line
  }, [formData, latexCode, loadSavedCitations]);

  const copyToClipboard = useCallback(async (text, message) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(message);
    } catch {
      alert("Failed to copy");
    }
  }, []);

  const handleDeleteCitation = useCallback(
    (fileName) => {
      setCitationToDelete(fileName);
      setShowDeleteConfirm(true);
    },
    [],
  );

  const confirmDelete = useCallback(async () => {
    if (!citationToDelete) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/citation/${citationToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadSavedCitations();
        setShowDeleteConfirm(false);
        setCitationToDelete(null);
      } else {
        alert("Failed to delete citation");
      }
    } catch (err) {
      alert("Failed to delete citation");
    }
  }, [citationToDelete, loadSavedCitations]);

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

  // --- Academic Search & Auto-Fill ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState(null);

  const performSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchStatus({ type: "error", message: "Please enter a search term" });
      return;
    }
    setIsSearching(true);
    setSearchStatus(null);
    setSearchResults([]);
    try {
      // Check if it's a DOI first for prioritized lookups
      const isDoi = /^10.\d{4,9}\/[-._;()/:a-zA-Z0-9]+$/.test(q);
      const url = isDoi
        ? `${API_BASE_URL}/api/citation/doi-lookup?doi=${encodeURIComponent(q)}`
        : `${API_BASE_URL}/api/citation/search?q=${encodeURIComponent(q)}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        if (isDoi) {
          // Direct populate if it was a DOI
          setFormData((prev) => ({ ...prev, ...data.data }));
          setSearchStatus({
            type: "success",
            message: `Found: ${data.data.title}`,
          });
        } else {
          setSearchResults(data.results || []);
          if (data.results.length === 0) {
            setSearchStatus({ type: "error", message: "No results found" });
          }
        }
      } else {
        setSearchStatus({
          type: "error",
          message: data.error || "Search failed",
        });
      }
    } catch (err) {
      console.error("Search error:", err);
      setSearchStatus({ type: "error", message: "Network error" });
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const selectResult = useCallback((result) => {
    setFormData((prev) => ({
      ...prev,
      ...result,
      format: prev.format, // preserve format
    }));
    setSearchResults([]);
    setSearchQuery("");
    setSearchStatus({
      type: "success",
      message: `Selected: "${result.title}"`,
    });
  }, []);

  // --- Render ---

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 font-inter text-gray-800">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-300 w-[95vw] max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <TbListNumbers className="text-gray-700" /> Citation Manager
            </h2>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("create")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === "create"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Create Reference
              </button>
              <button
                onClick={() => setActiveTab("saved")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === "saved"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Library
                {savedCitations.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded-md text-[10px] font-bold">
                    {savedCitations.length}
                  </span>
                )}
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <TbX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex bg-white">
          {activeTab === "create" ? (
            <>
              {/* Form Section */}
              <div className="w-1/2 p-8 overflow-y-auto border-r border-gray-100 scrollbar-thin scrollbar-thumb-gray-200">
                <div className="space-y-6 max-w-xl mx-auto">
                  {/* Unified Academic Search Section */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-2 relative">
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Academic Search & Auto-Fill
                    </label>
                    <div className="flex gap-2">
                      {!isAuthenticated ? (
                        <div className="flex-1 text-center py-3">
                          <p className="text-xs text-[#7D7D7D] font-inter mb-2">Sign in to search academic papers</p>
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => navigate("/login")}
                              className="px-4 py-1.5 bg-[#AB2D2D] text-white rounded-md font-inter text-xs hover:bg-[#8a2424] transition-colors"
                            >
                              Sign In
                            </button>
                            <button
                              onClick={() => navigate("/signup")}
                              className="px-4 py-1.5 border border-[#CFCFCF] text-[#343434] rounded-md font-inter text-xs hover:bg-[#F9F9F9] transition-colors"
                            >
                              Create Account
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setSearchStatus(null);
                              }}
                              onKeyDown={(e) =>
                                e.key === "Enter" && performSearch()
                              }
                              placeholder="Search by Title, Author, Journal or DOI..."
                              className="w-full bg-white px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all text-sm shadow-sm"
                            />
                            <TbSearch
                              size={18}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                          </div>
                          <button
                            onClick={performSearch}
                            disabled={isSearching}
                            className="px-6 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-all text-sm font-bold flex items-center gap-2 shadow-md disabled:opacity-50 shrink-0"
                          >
                            {isSearching ? (
                              <TbLoader size={16} className="animate-spin" />
                            ) : (
                              "Search"
                            )}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-[110] max-h-80 overflow-y-auto overflow-x-hidden p-2 space-y-1">
                        <div className="flex justify-between items-center px-3 py-1 mb-1 border-b border-gray-100">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                            Select a Paper
                          </span>
                          <button
                            onClick={() => setSearchResults([])}
                            className="text-gray-400 hover:text-black transition-colors"
                          >
                            <TbX size={14} />
                          </button>
                        </div>
                        {searchResults.map((res, idx) => (
                          <button
                            key={idx}
                            onClick={() => selectResult(res)}
                            className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors group border border-transparent hover:border-gray-200"
                          >
                            <h5
                              title={res.title}
                              className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-black mb-0.5"
                            >
                              {res.title}
                            </h5>
                            <div
                              title={`${res.authors} • ${res.journal} • ${res.year}`}
                              className="flex items-center gap-2 text-[11px] text-gray-400 font-medium"
                            >
                              <span className="truncate max-w-[150px]">
                                {res.authors}
                              </span>
                              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                              <span className="shrink-0">{res.journal}</span>
                              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                              <span className="shrink-0">{res.year}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchStatus && (
                      <p
                        className={`mt-2 text-xs font-medium ${
                          searchStatus.type === "success"
                            ? "text-green-600"
                            : "text-red-500"
                        }`}
                      >
                        {searchStatus.type === "success" ? "✓" : "✗"}{" "}
                        {searchStatus.message}
                      </p>
                    )}
                    <div className="text-[10px] text-gray-500 mt-3 text-center font-inter border-t border-gray-200 pt-2">
                      Content generated by AI is purely for reference. We do not promote academic dishonesty.
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Citation Format
                      </label>
                      <select
                        name="format"
                        value={formData.format}
                        onChange={handleInputChange}
                        className="w-full bg-white px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all text-sm cursor-pointer shadow-sm appearance-none"
                        style={{
                          backgroundImage:
                            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E\")",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 1rem center",
                          backgroundSize: "1rem",
                        }}
                      >
                        {citationFormats.map((format) => (
                          <option key={format} value={format}>
                            {format}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Authors
                      </label>
                      <textarea
                        name="authors"
                        value={formData.authors}
                        onChange={handleInputChange}
                        placeholder="e.g. A. Ali, S. A. Razak"
                        className="w-full bg-white px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all text-sm shadow-sm"
                        rows="2"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Paper Title
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Enter full title of the paper"
                        className="w-full bg-white px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all text-sm shadow-sm"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Journal / Publication
                      </label>
                      <input
                        type="text"
                        name="journal"
                        value={formData.journal}
                        onChange={handleInputChange}
                        className="w-full bg-white px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 transition-all text-sm shadow-sm"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3 col-span-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">
                          Vol
                        </label>
                        <input
                          name="volume"
                          value={formData.volume}
                          onChange={handleInputChange}
                          className="w-full bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">
                          Issue
                        </label>
                        <input
                          name="issue"
                          value={formData.issue}
                          onChange={handleInputChange}
                          className="w-full bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">
                          Pages
                        </label>
                        <input
                          name="pages"
                          value={formData.pages}
                          onChange={handleInputChange}
                          className="w-full bg-white px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="col-span-1">
                      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">
                        Year
                      </label>
                      <input
                        name="year"
                        value={formData.year}
                        onChange={handleInputChange}
                        className="w-full bg-white px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">
                        DOI
                      </label>
                      <input
                        name="doi"
                        value={formData.doi}
                        onChange={handleInputChange}
                        className="w-full bg-white px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={compileCitation}
                    disabled={isCompiling}
                    className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-all disabled:bg-gray-200 disabled:text-gray-400 font-bold shadow-md flex items-center justify-center gap-2 text-sm mt-4"
                  >
                    {isCompiling ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      "Generate Preview"
                    )}
                  </button>
                </div>
              </div>

              {/* Preview Section */}
              <div className="flex-1 flex flex-col p-8 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">
                    Reference Preview
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        copyToClipboard(latexCode, "LaTeX copied!")
                      }
                      disabled={!latexCode}
                      className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      <TbCopy size={16} /> LaTeX
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!latexCode}
                      className="px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                    >
                      <TbDeviceFloppy size={16} /> Save
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm relative overflow-hidden flex items-center justify-center">
                  {previewUrl ? (
                    <div className="p-8">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-w-full"
                      />
                    </div>
                  ) : (
                    <div className="text-center p-12">
                      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 mx-auto border border-gray-100">
                        <TbCopy size={32} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-1">
                        Preview Area
                      </p>
                      <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">
                        Fill the form and generate to see your reference here.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            // Library (Saved) Tab
            <div className="w-full flex flex-col overflow-hidden p-8 bg-gray-50">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    Citation Library
                  </h3>
                  <p className="text-sm text-gray-500">
                    Manage and export your saved references
                  </p>
                </div>
                <div className="bg-black text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-md">
                  {savedCitations.length} Total
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                <div className="grid grid-cols-1 gap-4">
                  {savedCitations.map((citation, index) => (
                    <div
                      key={citation.fileName || index}
                      className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-gray-400 transition-all relative group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-2">
                            <span className="shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-black text-xs border border-gray-200">
                              {index + 1}
                            </span>
                            <div>
                              <h4 className="font-bold text-gray-900 text-base leading-snug mb-0.5">
                                {citation.title || "Untitled Reference"}
                              </h4>
                              <p className="text-[13px] text-gray-500 font-medium">
                                {citation.authors} •{" "}
                                <span className="text-black font-semibold">
                                  {citation.year}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-11">
                            <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                              {citation.format}
                            </span>
                            <span className="truncate max-w-[300px]">
                              {citation.journal || "No Journal"}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            handleDeleteCitation(citation.fileName)
                          }
                          className="p-2 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <TbX size={18} />
                        </button>
                      </div>

                      <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `[${index + 1}]`,
                              "Citation number copied!",
                            )
                          }
                          className="px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-all text-[11px] font-bold inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <TbCopy size={13} /> Index
                        </button>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `^{[${index + 1}]}`,
                              "Superscript copied!",
                            )
                          }
                          className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-[11px] font-bold inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <TbCopy size={13} /> Super
                        </button>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              citation.latexCode,
                              "Full reference copied!",
                            )
                          }
                          className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-[11px] font-bold inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <TbCopy size={13} /> LaTeX
                        </button>
                        <div className="flex-1"></div>
                        <button
                          onClick={() => loadCitation(citation)}
                          className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-[11px] font-bold"
                        >
                          Load Reference
                        </button>
                      </div>
                    </div>
                  ))}
                  {savedCitations.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-dashed border-gray-300">
                      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-3">
                        <TbDeviceFloppy size={24} className="text-gray-300" />
                      </div>
                      <h4 className="font-bold text-gray-800 text-sm">
                        Library is empty
                      </h4>
                      <p className="text-xs text-gray-400 mt-1">
                        Saved references will appear here.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setCitationToDelete(null);
        }}
        title="Delete Citation"
        message={`Are you sure you want to delete the citation "${citationToDelete}"? This action cannot be undone.`}
        confirmText="Delete"
        isDanger={true}
      />
    </div>
  );
};

export default CitationManager;
