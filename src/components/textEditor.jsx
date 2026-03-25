import React, { useRef, useEffect, useState } from "react";
import RichTextCanvas from "./RichTextCanvas.jsx";
import "../assets/styles/canvasStyles.css";
import "../assets/styles/synctex.css";
import { RichTextToolbar } from "./richTextToolbar.jsx";

const RichTextEditorPanel = ({
  value,
  onChange,
  compilationStatus,
  compilationMessage,
  pdfUrl,
  highlightLine,
  onHighlightClear,
}) => {
  const canvasRef = useRef(null);
  const [highlightTimer, setHighlightTimer] = useState(null);

  // ── SyncTeX Highlighting ──
  useEffect(() => {
    if (highlightLine && canvasRef.current) {
      const editor = canvasRef.current.getEditor();
      if (!editor) return;

      const text = editor.textContent || "";
      const lines = text.split("\n");
      const targetLine = Math.min(highlightLine - 1, lines.length - 1);

      // Calculate approximate character offset
      let charIndex = 0;
      for (let i = 0; i < targetLine && i < lines.length; i++) {
        charIndex += lines[i].length + 1;
      }

      const lineLength = lines[targetLine]?.length || 1;

      // Use DOM Range to highlight
      try {
        const walker = document.createTreeWalker(
          editor,
          NodeFilter.SHOW_TEXT,
          null,
          false,
        );
        let currentOffset = 0;
        let startNode = null,
          startOffset = 0;
        let endNode = null,
          endOffset = 0;

        while (walker.nextNode()) {
          const node = walker.currentNode;
          const nodeLen = node.textContent.length;

          if (!startNode && currentOffset + nodeLen >= charIndex) {
            startNode = node;
            startOffset = charIndex - currentOffset;
          }
          if (!endNode && currentOffset + nodeLen >= charIndex + lineLength) {
            endNode = node;
            endOffset = Math.min(
              charIndex + lineLength - currentOffset,
              nodeLen,
            );
            break;
          }
          currentOffset += nodeLen;
        }

        if (startNode && endNode) {
          // Wrap in highlight span
          const range = document.createRange();
          range.setStart(
            startNode,
            Math.min(startOffset, startNode.textContent.length),
          );
          range.setEnd(
            endNode,
            Math.min(endOffset, endNode.textContent.length),
          );

          const highlight = document.createElement("span");
          highlight.className = "dc-synctex-highlight";
          try {
            range.surroundContents(highlight);
          } catch (e) {
            // If range crosses element boundaries, just scroll to approximate position
          }

          // Scroll into view
          highlight.scrollIntoView({ behavior: "smooth", block: "center" });

          // Focus editor
          editor.focus();

          console.log(`📍 SyncTeX: Highlighting line ${highlightLine}`);

          // Remove highlight after 2 seconds
          const timer = setTimeout(() => {
            if (highlight.parentNode) {
              const parent = highlight.parentNode;
              while (highlight.firstChild) {
                parent.insertBefore(highlight.firstChild, highlight);
              }
              parent.removeChild(highlight);
            }
            onHighlightClear?.();
          }, 2000);

          setHighlightTimer(timer);
        }
      } catch (err) {
        console.warn("SyncTeX highlight failed:", err);
      }
    }

    return () => {
      if (highlightTimer) clearTimeout(highlightTimer);
    };
  }, [highlightLine]);

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <RichTextToolbar id="richtext-main-toolbar" editorRef={canvasRef} />
      <div className="flex-1 overflow-y-auto">
        <RichTextCanvas ref={canvasRef} value={value} onChange={onChange} />
      </div>
    </div>
  );
};

export default RichTextEditorPanel;
