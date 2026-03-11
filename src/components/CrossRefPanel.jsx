import React, { useState, useEffect } from "react";
import { TbX, TbCopy, TbCheck, TbPlus, TbSearch } from "react-icons/tb";

const CrossRefPanel = ({ projectFiles, onClose, onInsert, showInsertButton, isModal }) => {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [copiedItem, setCopiedItem] = useState(null);

  useEffect(() => {
    // Parse the LaTeX for sections, labels, equations, figures, tables
    if (!projectFiles || Object.keys(projectFiles).length === 0) {
      setItems([]);
      return;
    }

    // Concatenate all .tex files down to a single string for parsing
    let combinedLatex = "";
    for (const [fileName, fileData] of Object.entries(projectFiles)) {
      if (fileName.endsWith(".tex") && fileData && fileData.content) {
        combinedLatex += fileData.content + "\n";
      }
    }

    const newItems = [];
    
    // We'll run a simple regex to capture sections and labels
    // Format: \section{Title} or \label{id}
    // For a real cross-reference, the user needs to \ref{labelName}.
    // If a section doesn't have a label, we technically can't \ref it in standard LaTeX without one,
    // but we can list labels that *do* exist so they know what they can reference.

    // 1. Find all \label{...} instances and try to grab surrounding context
    const labelRegex = /\\label\{([^}]+)\}/g;
    let match;
    while ((match = labelRegex.exec(combinedLatex)) !== null) {
      const labelValue = match[1];
      
      const contextStr = combinedLatex.substring(Math.max(0, match.index - 150), match.index);
      
      let type = "unknown";
      let title = labelValue;

      if (labelValue.startsWith("sec:") || labelValue.startsWith("sec-")) type = "Section";
      else if (labelValue.startsWith("fig:") || labelValue.startsWith("fig-") || contextStr.includes("\\begin{figure}")) type = "Figure";
      else if (labelValue.startsWith("tab:") || labelValue.startsWith("tab-") || contextStr.includes("\\begin{table}")) type = "Table";
      else if (labelValue.startsWith("eq:") || labelValue.startsWith("eqn:") || contextStr.includes("\\begin{equation}")) type = "Equation";
      
      // Attempt to find a title if it's a section
      if (type === "unknown" || type === "Section") {
        const sectionMatch = contextStr.match(/\\(?:sub)*section\*?\{([^}]+)\}/);
        if (sectionMatch) {
          type = "Section";
          title = sectionMatch[1];
        }
      }
      
      // Attempt to find caption if figure/table
      if (type === "Figure" || type === "Table") {
         const captionMatch = contextStr.match(/\\caption\{([^}]+)\}/);
         if (captionMatch) {
            title = captionMatch[1];
         }
      }

      newItems.push({ label: labelValue, type, title });
    }

    // De-duplicate just in case
    const uniqueItems = Array.from(new Map(newItems.map(item => [item.label, item])).values());
    setItems(uniqueItems);
  }, [projectFiles]);

  const filteredItems = items.filter(
    (i) =>
      i.label.toLowerCase().includes(search.toLowerCase()) ||
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.type.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = async (label) => {
    const latex = `\\ref{${label}}`;
    try {
      await navigator.clipboard.writeText(latex);
      setCopiedItem(label);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleInsert = (label) => {
    if (onInsert) onInsert(label);
  };

  return (
    <div className={isModal ? "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 text-gray-800" : "flex flex-col h-full bg-[#FAFAFA] font-inter text-gray-800"}>
      <div className={isModal ? "bg-white rounded-xl shadow-2xl border border-gray-300 w-[95vw] max-w-2xl h-[70vh] flex flex-col overflow-hidden" : "flex flex-col flex-1 overflow-hidden bg-white"}>
        {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10 shrink-0">
        <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
          Cross-References
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Close Panel"
        >
          <TbX className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-gray-100 bg-white shrink-0">
          <div className="relative">
            <input
              type="text"
              placeholder="Search labels, sections, figures..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none shadow-sm transition-all"
            />
            <TbSearch className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-8">
              No \label{'{'}...{'}'} tags found in the document.
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-8">
              No matches found for "{search}"
            </div>
          ) : (
            filteredItems.map((item, i) => (
              <div
                key={i}
                className="bg-white border text-left border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group flex flex-col gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0a0a0a] bg-gray-100 px-2 py-0.5 rounded">
                      {item.type}
                    </span>
                    <span className="text-xs font-mono text-gray-400 bg-gray-50 px-1.5 rounded border border-gray-100">
                      {item.label}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                    {item.title}
                  </h3>
                </div>

                <div className="flex gap-2 mt-1">
                  {showInsertButton && (
                    <button
                      onClick={() => handleInsert(item.label)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[#0a0a0a] text-white py-1.5 px-3 rounded-lg hover:bg-gray-800 transition-colors text-[13px] font-medium"
                    >
                      <TbPlus className="w-3.5 h-3.5" />
                      Insert
                    </button>
                  )}
                  <button
                    onClick={() => handleCopy(item.label)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white text-gray-700 py-1.5 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-[13px] font-medium"
                  >
                    {copiedItem === item.label ? (
                      <TbCheck className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <TbCopy className="w-3.5 h-3.5" />
                    )}
                    {copiedItem === item.label ? "Copied!" : "Copy \\ref"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  </div>
  );
};

export default CrossRefPanel;
