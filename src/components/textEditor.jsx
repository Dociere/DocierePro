import React, { useRef, useEffect, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import "../utils/latexBlots.jsx";
import "../assets/styles/synctex.css";
import { RichTextToolbar } from "./richTextToolbar.jsx";

const RichTextEditorPanel = ({
  value,
  onChange,
  quillModules,
  compilationStatus,
  compilationMessage,
  pdfUrl,
  highlightLine,
  onHighlightClear,
}) => {
  const quillRef = useRef(null);
  const [highlightRange, setHighlightRange] = useState(null);

  useEffect(() => {
    if (!quillRef.current) return;
    const editor = quillRef.current.getEditor();
    
    // Track cursor so toolbar buttons know where to insert
    // even after the editor loses focus when the button is clicked
    const handleSelectionChange = (range) => {
      if (range) {
        editor.savedCursorPosition = range.index;
      }
    };
    
    editor.on("selection-change", handleSelectionChange);
    return () => editor.off("selection-change", handleSelectionChange);
  }, []);

  useEffect(() => {
    // If we have a highlight request and the editor is ready
    if (highlightLine && quillRef.current) {
      const editor = quillRef.current.getEditor();
      const text = editor.getText();

      // Map LaTeX line number to approximate position in rich text
      // Rich text paragraphs roughly correspond to LaTeX lines
      const lines = text.split("\n");

      // Calculate the character index for the target line
      let charIndex = 0;
      const targetLine = Math.min(highlightLine - 1, lines.length - 1);

      for (let i = 0; i < targetLine && i < lines.length; i++) {
        charIndex += lines[i].length + 1; // +1 for newline
      }

      // Get the length of the target line (for highlighting)
      const lineLength = lines[targetLine]?.length || 1;

      // Set cursor position and scroll to it
      editor.setSelection(charIndex, lineLength);

      // Store the range for visual highlighting
      setHighlightRange({ index: charIndex, length: Math.max(1, lineLength) });

      // Apply visual highlight using Quill's formatting
      editor.formatText(charIndex, Math.max(1, lineLength), {
        background: "rgba(255, 234, 0, 0.4)",
      });

      console.log(
        `📍 SyncTeX: Highlighting line ${highlightLine} at char ${charIndex}`,
      );

      // Focus the editor
      editor.focus();

      // Remove highlight after 2 seconds
      const timer = setTimeout(() => {
        if (quillRef.current) {
          const ed = quillRef.current.getEditor();
          // Remove the background highlight
          ed.formatText(charIndex, Math.max(1, lineLength), {
            background: false,
          });
          setHighlightRange(null);
          onHighlightClear();
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [highlightLine]);

  // Clear highlight when user clicks
  const handleClick = () => {
    if (highlightRange && quillRef.current) {
      const editor = quillRef.current.getEditor();
      editor.formatText(highlightRange.index, highlightRange.length, {
        background: false,
      });
      setHighlightRange(null);
      onHighlightClear();
    }
  };

  // Clear highlight when user types
  const handleChange = (content, delta, source, editor) => {
    // Only process user-initiated changes, not our formatting changes
    if (source === "user") {
      if (highlightRange) {
        editor.formatText(highlightRange.index, highlightRange.length, {
          background: false,
        });
        setHighlightRange(null);
      }
      onChange(content);
    }
  };

  const docStyles = `
    .ql-editor {
      padding: 40px 60px !important;
      font-family: 'Inter', system-ui, sans-serif !important;
      line-height: 1.8 !important;
    }
    .ql-editor p {
      margin-bottom: 1.5em !important;
      color: #374151;
    }
    .ql-editor h1, .ql-editor h2, .ql-editor h3 {
      margin-top: 1.5em !important;
      margin-bottom: 0.8em !important;
      padding-bottom: 0.3em !important;
      border-bottom: 1px solid #e5e7eb !important;
      color: #111827;
      font-weight: 400 !important;
      font-family: 'Inter', system-ui, sans-serif !important;
    }
    .ql-editor h3 { border-bottom: none !important; }
  `;

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <style>{docStyles}</style>
      <RichTextToolbar id="richtext-main-toolbar" />
      {/* Rich Text Editor with proper scrolling */}
      <div className="flex-1 overflow-hidden flex flex-col" onClick={handleClick}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={handleChange}
          modules={quillModules}
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: "Arial",
            fontSize: "20px",
          }}
          className="h-full flex-1 flex flex-col min-h-0"
        />
      </div>
    </div>
  );
};

export default RichTextEditorPanel;
