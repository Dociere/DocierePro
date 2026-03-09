import React, { useState } from "react";
import { TbX, TbTemplate, TbArrowRight } from "react-icons/tb";
import { PAGE_SIZE_PRESETS } from "../utils/layoutSchema";

const TEMPLATE_TYPES = [
  { value: "article", label: "Article", desc: "Research papers, short documents" },
  { value: "report", label: "Report / Thesis", desc: "Multi-chapter documents with frontmatter" },
  { value: "presentation", label: "Presentation", desc: "Slide decks (Beamer)" },
  { value: "resume", label: "Resume / CV", desc: "Professional resume layouts" },
  { value: "letter", label: "Letter", desc: "Formal letter format" },
  { value: "custom", label: "Custom", desc: "Start with a blank slate" },
];

const LAYOUT_MODES = [
  {
    value: "flow",
    label: "Flow Mode",
    desc: "Components follow a top-down order. Best for reports, theses, and articles.",
  },
  {
    value: "absolute",
    label: "Absolute Mode",
    desc: "Drag components freely on the X/Y axis. Best for resumes and presentations.",
  },
];

const TemplateSetupModal = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState("");
  const [type, setType] = useState("article");
  const [pageSizeKey, setPageSizeKey] = useState("a4");
  const [customWidth, setCustomWidth] = useState("210");
  const [customHeight, setCustomHeight] = useState("297");
  const [layoutMode, setLayoutMode] = useState("flow");
  const [margins, setMargins] = useState({
    top: "25",
    bottom: "25",
    left: "20",
    right: "20",
  });
  const [useCustomSize, setUseCustomSize] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const pageSize = useCustomSize
      ? { width: `${customWidth}mm`, height: `${customHeight}mm`, label: "Custom" }
      : PAGE_SIZE_PRESETS[pageSizeKey];

    onSubmit({
      templateName: name.trim(),
      templateType: type,
      pageSize,
      layoutMode,
      margins: {
        top: `${margins.top}mm`,
        bottom: `${margins.bottom}mm`,
        left: `${margins.left}mm`,
        right: `${margins.right}mm`,
      },
    });
  };

  // Auto-select layout for certain template types
  const handleTypeChange = (val) => {
    setType(val);
    if (val === "presentation" || val === "resume") {
      setLayoutMode("absolute");
    } else {
      setLayoutMode("flow");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm font-inter"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[95vw] max-w-[580px] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-7 py-5 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-9 h-9 bg-black rounded-lg flex items-center justify-center">
              <TbTemplate className="text-white" size={20} />
            </div>
            New Custom Template
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors p-1.5 rounded-full hover:bg-gray-100"
          >
            <TbX size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-7 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Template Name */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              <span className="text-red-400 mr-0.5">*</span>Template Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Custom Template"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-gray-400 transition-all"
              autoFocus
            />
          </div>

          {/* Template Type */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Template Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTypeChange(t.value)}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    type === t.value
                      ? "border-black bg-gray-50 shadow-sm"
                      : "border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className={`text-sm font-semibold ${type === t.value ? "text-black" : "text-gray-700"}`}>
                    {t.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Page Size */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Page Size
            </label>
            <div className="flex gap-2 mb-3">
              {Object.entries(PAGE_SIZE_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setPageSizeKey(key); setUseCustomSize(false); }}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    !useCustomSize && pageSizeKey === key
                      ? "bg-black text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUseCustomSize(true)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  useCustomSize
                    ? "bg-black text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Custom
              </button>
            </div>
            {useCustomSize && (
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <span className="text-xs text-gray-400">Width (mm)</span>
                  <input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
                  />
                </div>
                <span className="text-gray-300 mt-4">×</span>
                <div className="flex-1">
                  <span className="text-xs text-gray-400">Height (mm)</span>
                  <input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Layout Mode */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Layout Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LAYOUT_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setLayoutMode(m.value)}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    layoutMode === m.value
                      ? "border-black bg-gray-50 shadow-sm"
                      : "border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className={`text-sm font-semibold ${layoutMode === m.value ? "text-black" : "text-gray-700"}`}>
                    {m.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Margins */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Margins (mm)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {["top", "bottom", "left", "right"].map((side) => (
                <div key={side}>
                  <span className="text-xs text-gray-400 capitalize">{side}</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={margins[side]}
                    onChange={(e) =>
                      setMargins((prev) => ({ ...prev, [side]: e.target.value }))
                    }
                    className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/20 text-center"
                  />
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-between items-center px-7 py-4 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-400">All settings can be changed later in the builder</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl font-semibold text-sm hover:bg-gray-800 shadow-lg shadow-black/10 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Start Building
              <TbArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateSetupModal;
