import React, { useState } from "react";
import { TbX, TbCopy, TbCheck, TbPlus } from "react-icons/tb";

const FootnotePanel = ({ onClose, onInsert, showInsertButton, isModal }) => {
  const [footnoteText, setFootnoteText] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!footnoteText.trim()) return;
    const latex = `\\footnote{${footnoteText}}`;
    try {
      await navigator.clipboard.writeText(latex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleInsert = () => {
    if (!footnoteText.trim() || !onInsert) return;
    onInsert(footnoteText.trim());
    setFootnoteText(""); // Clear after insert
  };

  return (
    <div className={isModal ? "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" : "flex flex-col h-full bg-[#FAFAFA] font-inter text-gray-800"}>
      <div className={isModal ? "bg-white rounded-xl shadow-2xl border border-gray-300 w-[95vw] max-w-2xl h-[70vh] flex flex-col overflow-hidden" : "flex flex-col flex-1 overflow-hidden bg-white"}>
        {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10 shrink-0">
        <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
          Insert Footnote
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Close Panel"
        >
          <TbX className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-2">
            Footnote Text
          </label>
          <textarea
            value={footnoteText}
            onChange={(e) => setFootnoteText(e.target.value)}
            className="w-full h-40 p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none resize-none shadow-sm font-inter"
            placeholder="Enter the text for your footnote here..."
          />
        </div>

        <div className="flex flex-col gap-3">
          {showInsertButton && (
            <button
              onClick={handleInsert}
              disabled={!footnoteText.trim()}
              className="w-full flex items-center justify-center gap-2 bg-[#0a0a0a] text-white py-2.5 px-4 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-sm"
            >
              <TbPlus className="w-4 h-4" />
              Insert at Cursor
            </button>
          )}

          <button
            onClick={handleCopy}
            disabled={!footnoteText.trim()}
            className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 py-2.5 px-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-sm"
          >
            {copied ? (
              <TbCheck className="w-4 h-4 text-green-600" />
            ) : (
              <TbCopy className="w-4 h-4" />
            )}
            {copied ? "Copied LaTeX!" : "Copy LaTeX"}
          </button>
        </div>

        {footnoteText.trim() && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              LaTeX Preview
            </h3>
            <code className="text-[13px] text-gray-800 font-mono break-all line-clamp-3">
              \footnote{'{'}{footnoteText}{'}'}
            </code>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};

export default FootnotePanel;
