import React, {
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";

/**
 * RichTextCanvas – contentEditable-based rich text editor.
 * Replaces React Quill. Works with the same HTML format produced by latexUtility.
 *
 * Props:
 *  - value        : HTML string to display
 *  - onChange      : (html: string) => void — called on user edits
 *  - placeholder   : optional placeholder text
 *  - readOnly      : boolean
 *
 * Ref exposes:
 *  - getEditor()   : returns the contentEditable DOM node
 *  - focus()       : focuses the editor
 *  - insertHTML(h) : inserts HTML at saved cursor position
 *  - savedCursorPosition : last known selection range
 */
const RichTextCanvas = forwardRef(
  ({ value, onChange, placeholder, readOnly = false }, ref) => {
    const editorRef = useRef(null);
    const savedRange = useRef(null);
    const isInternalUpdate = useRef(false);
    const lastSetValue = useRef("");

    // ── Save / Restore selection ──
    const saveSelection = useCallback(() => {
      const sel = window.getSelection();
      if (
        sel &&
        sel.rangeCount > 0 &&
        editorRef.current?.contains(sel.anchorNode)
      ) {
        savedRange.current = sel.getRangeAt(0).cloneRange();
      }
    }, []);

    const restoreSelection = useCallback(() => {
      if (savedRange.current && editorRef.current) {
        const sel = window.getSelection();
        try {
          sel.removeAllRanges();
          sel.addRange(savedRange.current);
        } catch (e) {
          /* range may be detached */
        }
      }
    }, []);

    // ── Sync external value → DOM ──
    useEffect(() => {
      if (!editorRef.current) return;
      // Only update DOM if value actually changed from external source
      if (value !== lastSetValue.current && !isInternalUpdate.current) {
        // Save current scroll position
        const scrollTop = editorRef.current.scrollTop;
        lastSetValue.current = value || "";
        editorRef.current.innerHTML = value || "";
        editorRef.current.scrollTop = scrollTop;
        // Attach click handlers to interactive blocks
        attachBlockHandlers();
      }
      isInternalUpdate.current = false;
    }, [value]);

    // ── Emit changes on input ──
    const handleInput = useCallback(() => {
      if (!editorRef.current || readOnly) return;
      isInternalUpdate.current = true;
      const html = editorRef.current.innerHTML;
      lastSetValue.current = html;
      saveSelection();
      onChange?.(html);
    }, [onChange, readOnly, saveSelection]);

    // ── Track selection changes ──
    useEffect(() => {
      const onSelChange = () => saveSelection();
      document.addEventListener("selectionchange", onSelChange);
      return () => document.removeEventListener("selectionchange", onSelChange);
    }, [saveSelection]);

    // ── Keyboard shortcuts ──
    const handleKeyDown = useCallback(
      (e) => {
        if (readOnly) {
          e.preventDefault();
          return;
        }

        // Ctrl+B / Ctrl+I / Ctrl+U
        if (e.ctrlKey || e.metaKey) {
          switch (e.key.toLowerCase()) {
            case "b":
              e.preventDefault();
              document.execCommand("bold", false, null);
              break;
            case "i":
              e.preventDefault();
              document.execCommand("italic", false, null);
              break;
            case "u":
              e.preventDefault();
              document.execCommand("underline", false, null);
              break;
            default:
              break;
          }
        }

        // Tab for indent
        if (e.key === "Tab") {
          e.preventDefault();
          if (e.shiftKey) {
            document.execCommand("outdent", false, null);
          } else {
            document.execCommand("indent", false, null);
          }
        }
      },
      [readOnly],
    );

    // ── Prevent editing uneditable blocks ──
    const handleClick = useCallback((e) => {
      const block = e.target.closest(".dc-latex-block");
      if (block) {
        e.stopPropagation();
        const type = block.getAttribute("data-type");
        if (type === "table") {
          document.dispatchEvent(
            new CustomEvent("trigger-insert-table", {
              detail: { editLatex: block.getAttribute("data-latex") },
            }),
          );
        } else if (type === "figure") {
          document.dispatchEvent(
            new CustomEvent("trigger-insert-image", {
              detail: { editLatex: block.getAttribute("data-latex") },
            }),
          );
        }
      }
    }, []);

    // ── Attach click handlers to block elements ──
    const attachBlockHandlers = useCallback(() => {
      if (!editorRef.current) return;
      // Make all dc-latex-block elements uneditable
      editorRef.current.querySelectorAll(".dc-latex-block").forEach((el) => {
        el.setAttribute("contenteditable", "false");
      });
      // Make markers uneditable
      editorRef.current
        .querySelectorAll(
          ".dc-file-marker, .dc-env-marker, .dc-latex-preamble, .dc-postamble-block",
        )
        .forEach((el) => {
          el.setAttribute("contenteditable", "false");
        });
      // Make inline blots selectable but not internally editable
      editorRef.current.querySelectorAll(".dc-latex-inline").forEach((el) => {
        el.setAttribute("contenteditable", "false");
      });
    }, []);

    // ── Paste handler: strip external formatting ──
    const handlePaste = useCallback(
      (e) => {
        if (readOnly) {
          e.preventDefault();
          return;
        }
        e.preventDefault();

        // Get HTML if available from clipboard, otherwise plain text
        const html = e.clipboardData.getData("text/html");
        const text = e.clipboardData.getData("text/plain");

        if (html) {
          // Strip dangerous/unnecessary tags but keep basic formatting
          const cleaned = html
            .replace(/<meta[^>]*>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/\sclass="[^"]*"/gi, "")
            .replace(/\sstyle="[^"]*"/gi, "");
          document.execCommand("insertHTML", false, cleaned);
        } else {
          document.execCommand("insertText", false, text);
        }
      },
      [readOnly],
    );

    // ── Expose methods via ref ──
    useImperativeHandle(
      ref,
      () => ({
        getEditor: () => editorRef.current,
        focus: () => editorRef.current?.focus(),
        savedCursorPosition: savedRange.current,
        getSavedRange: () => savedRange.current,
        saveSelection,

        insertHTML: (html) => {
          if (!editorRef.current) return;
          editorRef.current.focus();
          if (savedRange.current) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedRange.current);
          }
          document.execCommand("insertHTML", false, html);
          saveSelection();
          handleInput();
        },

        execFormat: (command, value = null) => {
          if (!editorRef.current) return;
          editorRef.current.focus();
          restoreSelection();
          document.execCommand(command, false, value);
          saveSelection();
          handleInput();
        },

        getFormat: () => {
          return {
            bold: document.queryCommandState("bold"),
            italic: document.queryCommandState("italic"),
            underline: document.queryCommandState("underline"),
            strikeThrough: document.queryCommandState("strikeThrough"),
            superscript: document.queryCommandState("superscript"),
            subscript: document.queryCommandState("subscript"),
          };
        },
      }),
      [saveSelection, restoreSelection, handleInput],
    );

    return (
      <div
        ref={editorRef}
        className="dc-canvas"
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onPaste={handlePaste}
        onBlur={saveSelection}
        data-placeholder={placeholder || "Start typing…"}
        spellCheck="true"
      />
    );
  },
);

RichTextCanvas.displayName = "RichTextCanvas";

export default RichTextCanvas;
