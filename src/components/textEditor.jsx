import React, { useRef, useEffect, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import "../assets/styles/synctex.css";

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
    // If we have a highlight request and the editor is ready
    if (highlightLine && quillRef.current) {
      const editor = quillRef.current.getEditor();
      const text = editor.getText();
      
      // Map LaTeX line number to approximate position in rich text
      // Rich text paragraphs roughly correspond to LaTeX lines
      const lines = text.split('\n');
      
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
        'background': 'rgba(255, 234, 0, 0.4)'
      });
      
      console.log(`📍 SyncTeX: Highlighting line ${highlightLine} at char ${charIndex}`);
      
      // Focus the editor
      editor.focus();
      
      // Remove highlight after 2 seconds
      const timer = setTimeout(() => {
        if (quillRef.current) {
          const ed = quillRef.current.getEditor();
          // Remove the background highlight
          ed.formatText(charIndex, Math.max(1, lineLength), {
            'background': false
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
        'background': false
      });
      setHighlightRange(null);
      onHighlightClear();
    }
  };

  // Clear highlight when user types
  const handleChange = (content, delta, source, editor) => {
    // Only process user-initiated changes, not our formatting changes
    if (source === 'user') {
      if (highlightRange) {
        editor.formatText(highlightRange.index, highlightRange.length, {
          'background': false
        });
        setHighlightRange(null);
      }
      onChange(content);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Rich Text Editor with proper scrolling */}
      <div className="flex-1 overflow-hidden" onClick={handleClick}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={handleChange}
          modules={quillModules}
          style={{
            height: "calc(100% - 42px)", // Account for toolbar height
            display: "flex",
            flexDirection: "column",
            fontFamily: "Arial",
            fontSize: "20px",
          }}
          className="h-full"
        />
      </div>
    </div>
  );
};

export default RichTextEditorPanel;

