import React, { useEffect, useRef, useState, useCallback } from "react";
import MonacoEditor from "@monaco-editor/react";
import { useYjsMonaco } from "../hooks/useYjsMonaco";
import {
  registerLatexLanguage,
  defineLatexTheme,
} from "../utils/latexMonarchLanguage.jsx";
import { useSettings } from "../context/useSettings";
import { useAIReviewer } from "../hooks/useAIReviewer";
import AIReviewSidebar from "./AIReviewSidebar";

// ==========================================
// HELPER: Find table and figure ranges
// ==========================================
const findEnvironmentRanges = (model, envName) => {
  const ranges = [];
  const text = model.getValue();
  const lines = text.split("\n");

  let startLine = null;
  let depth = 0;
  const beginRegex = new RegExp(`\\\\begin\\{${envName}\\}`);
  const endRegex = new RegExp(`\\\\end\\{${envName}\\}`);

  lines.forEach((line, idx) => {
    const lineNumber = idx + 1;

    if (beginRegex.test(line)) {
      if (depth === 0) {
        startLine = lineNumber;
      }
      depth++;
    }

    if (endRegex.test(line)) {
      depth--;
      if (depth === 0 && startLine !== null) {
        ranges.push({
          startLineNumber: startLine,
          startColumn: 1,
          endLineNumber: lineNumber,
          endColumn: model.getLineMaxColumn(lineNumber),
        });
        startLine = null;
      }
    }
  });

  return ranges;
};

// Extract LaTeX block at cursor position
const getEnvironmentAtPosition = (model, position, envName) => {
  const ranges = findEnvironmentRanges(model, envName);

  for (const range of ranges) {
    if (
      position.lineNumber >= range.startLineNumber &&
      position.lineNumber <= range.endLineNumber
    ) {
      return {
        range,
        content: model.getValueInRange(range),
      };
    }
  }
  return null;
};

// ==========================================
// MAIN COMPONENT
// ==========================================
const MonacoEditorPanel = ({
  value = "",
  handleLatexChange = () => console.warn("handleLatexChange not provided"),
  monacoEditorRef = { current: null },
  projectId = null,
  token = null,
  isOnline = null,
  user = null,
  activeEditor = "monaco",
  highlightLine = null,
  onHighlightClear = () => {},
  // NEW props for table/image insertion
  onOpenTableModal = null,
  onOpenImageModal = null,
  onEditTable = null,
  onEditImage = null,
  projectFiles = [],
  readOnly = false,
  aiConfig = null,
}) => {
  const editorInstanceRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const tableDecorationsRef = useRef([]);
  const figureDecorationsRef = useRef([]);
  const [editorReady, setEditorReady] = useState(false);
  const { settings } = useSettings();

  // Update table/figure highlighting
  const updateEnvironmentHighlighting = useCallback(() => {
    const editor = editorInstanceRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const model = editor.getModel();
    if (!model) return;

    // Find all table ranges
    const tableRanges = findEnvironmentRanges(model, "table");
    const tableDecorations = tableRanges.map((range) => ({
      range: new monaco.Range(
        range.startLineNumber,
        range.startColumn,
        range.endLineNumber,
        range.endColumn,
      ),
      options: {
        isWholeLine: true,
        className: "monaco-table-highlight",
        glyphMarginClassName: "monaco-table-glyph",
        stickiness:
          monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
      },
    }));

    // Find all figure ranges
    const figureRanges = findEnvironmentRanges(model, "figure");
    const figureDecorations = figureRanges.map((range) => ({
      range: new monaco.Range(
        range.startLineNumber,
        range.startColumn,
        range.endLineNumber,
        range.endColumn,
      ),
      options: {
        isWholeLine: true,
        className: "monaco-figure-highlight",
        glyphMarginClassName: "monaco-figure-glyph",
        stickiness:
          monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
      },
    }));

    // Apply decorations
    tableDecorationsRef.current = editor.deltaDecorations(
      tableDecorationsRef.current,
      tableDecorations,
    );
    figureDecorationsRef.current = editor.deltaDecorations(
      figureDecorationsRef.current,
      figureDecorations,
    );
  }, []);

  // --- AI Reviewer Integration ---
  const {
    suggestions,
    isReviewing,
    autoReview,
    setAutoReview,
    reviewOptions,
    setReviewOptions,
    triggerReview,
    dismissSuggestion,
    acceptSuggestion,
    error: reviewError,
  } = useAIReviewer({ latexContent: value, aiConfig });

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const aiDecorationsRef = useRef([]);
  const aiSuggestionRangesRef = useRef([]);
  const acceptActionRef = useRef(null);
  const dismissActionRef = useRef(null);
  const hoverProviderRef = useRef(null);

  useEffect(() => {
    dismissActionRef.current = dismissSuggestion;
  }, [dismissSuggestion]);

  // Type → CSS decoration class
  const TYPE_CLASS = {
    grammar:   "ai-sugg-grammar",
    syntax:    "ai-sugg-syntax",
    structure: "ai-sugg-structure",
    style:     "ai-sugg-style",
  };

  // Update Monaco decorations whenever suggestions change
  useEffect(() => {
    const editor = editorInstanceRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    if (!suggestions || suggestions.length === 0) {
      aiDecorationsRef.current = editor.deltaDecorations(aiDecorationsRef.current, []);
      aiSuggestionRangesRef.current = [];
      return;
    }

    const model = editor.getModel();
    if (!model) return;

    const newDecorations = [];
    const ranges = [];

    suggestions.forEach((sugg, idx) => {
      const matches = model.findMatches(sugg.original_text, false, false, false, null, true);
      const matchPos = matches[0];
      if (matchPos) {
        ranges.push({ index: idx, range: matchPos.range });
        const cssClass = TYPE_CLASS[sugg.type] || "ai-sugg-grammar";
        newDecorations.push({
          range: matchPos.range,
          options: {
            className: `monaco-ai-suggestion ${cssClass}`,
            glyphMarginClassName: `ai-glyph-${sugg.type || "grammar"}`,
            overviewRulerColor: "rgba(99,102,241,0.6)",
            overviewRulerLane: monaco.editor.OverviewRulerLane.Right,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        });
      }
    });

    aiSuggestionRangesRef.current = ranges;
    aiDecorationsRef.current = editor.deltaDecorations(aiDecorationsRef.current, newDecorations);
  }, [suggestions]);

  // Register a Hover Provider for rich tooltip on decorated ranges
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;

    // Dispose old provider before registering a new one
    if (hoverProviderRef.current) {
      hoverProviderRef.current.dispose();
    }

    hoverProviderRef.current = monaco.languages.registerHoverProvider("latex", {
      provideHover(model, position) {
        const hit = aiSuggestionRangesRef.current.find(
          (r) => r.range.containsPosition(position)
        );
        if (!hit) return null;
        const sugg = suggestions[hit.index];
        if (!sugg) return null;

        const typeLabel = (sugg.type || "grammar").charAt(0).toUpperCase() + (sugg.type || "grammar").slice(1);
        const md = [
          `**🤖 AI Suggestion — ${typeLabel}**`,
          ``,
          `~~${sugg.original_text}~~ → **${sugg.suggestion}**`,
          ``,
          `> ${sugg.reasoning}`,
          ``,
          `*Right-click the highlighted text → **Accept AI Suggestion** or **Dismiss AI Suggestion***`,
        ].join("\n");

        return {
          range: hit.range,
          contents: [{ value: md, isTrusted: true }],
        };
      },
    });

    return () => {
      if (hoverProviderRef.current) hoverProviderRef.current.dispose();
    };
  // Re-register when suggestions change so the closure captures the latest array
  }, [suggestions]);

  // Jump-to-line handler (called from AIReviewSidebar)
  const handleJumpToLine = useCallback((lineNum) => {
    const editor = editorInstanceRef.current;
    if (!editor) return;
    editor.revealLineInCenter(lineNum);
    editor.setPosition({ lineNumber: lineNum, column: 1 });
    editor.focus();
  }, []);

  // --- End AI Reviewer Integration ---

  // SyncTeX highlighting
  useEffect(() => {
    const editor = editorInstanceRef.current;
    const monaco = monacoRef.current;
    if (editor && monaco && highlightLine) {
      editor.revealLineInCenter(highlightLine);
      editor.setPosition({ lineNumber: highlightLine, column: 1 });
      editor.focus();

      const newDecorations = editor.deltaDecorations(decorationsRef.current, [
        {
          range: new monaco.Range(highlightLine, 1, highlightLine, 1),
          options: {
            isWholeLine: true,
            className: "synctex-highlight",
            linesDecorationsClassName: "synctex-gutter-highlight",
          },
        },
      ]);
      decorationsRef.current = newDecorations;
    }
  }, [highlightLine]);

  // Mark if the edit originated locally to prevent cursor jumps during state sync
  const isLocalEditRef = useRef(false);
  const localEditTimeoutRef = useRef(null);

  // Sync content and handle cursor jumps
  useEffect(() => {
    const editor = editorInstanceRef.current;
    if (!editor || value === undefined) return;

    const model = editor.getModel();
    if (!model) return;

    const currentValue = model.getValue();

    // Do nothing if content is already identical
    if (currentValue === value) return;

    // Skip if this change originated locally (typing)
    if (isLocalEditRef.current) return;

    console.log("📝 External update applied to Monaco model");

    const position = editor.getPosition();
    const selection = editor.getSelection();

    model.pushEditOperations(
      [],
      [
        {
          range: model.getFullModelRange(),
          text: value,
        },
      ],
      () => null,
    );

    // restore cursor
    Promise.resolve().then(() => {
      if (!editorInstanceRef.current) return;

      if (selection) editorInstanceRef.current.setSelection(selection);
      if (position) editorInstanceRef.current.setPosition(position);
    });
  }, [value]);

  // Update highlighting when content changes
  useEffect(() => {
    if (editorReady) {
      // Debounce the highlighting update
      const timeout = setTimeout(updateEnvironmentHighlighting, 300);
      return () => clearTimeout(timeout);
    }
  }, [value, editorReady, updateEnvironmentHighlighting]);

  const handleBeforeMount = (monaco) => {
    // Register LaTeX language with Monarch tokenizer BEFORE the editor/model is created
    registerLatexLanguage(monaco);
    defineLatexTheme(monaco);
  };

  const handleEditorMount = (editor, monaco) => {
    monacoEditorRef.current = editor;
    editorInstanceRef.current = editor;
    monacoRef.current = monaco;

    // monaco.editor.setTheme("latex-light");
    monaco.editor.setTheme(
      settings.appearance.customThemes[settings.appearance.theme].monacoEditor,
    );

    // Add context menu actions
    if (onOpenTableModal) {
      editor.addAction({
        id: "insert-table",
        label: "Insert Table",
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyT,
        ],
        contextMenuGroupId: "1_modification",
        contextMenuOrder: 1.5,
        run: () => {
          onOpenTableModal();
        },
      });
    }

    if (onOpenImageModal) {
      editor.addAction({
        id: "insert-image",
        label: "Insert Image",
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyI,
        ],
        contextMenuGroupId: "1_modification",
        contextMenuOrder: 1.6,
        run: () => {
          onOpenImageModal();
        },
      });
    }

    // AI suggestion context menu actions
    editor.addAction({
      id: "accept-ai-suggestion",
      label: "Accept AI Suggestion",
      contextMenuGroupId: "1_modification",
      contextMenuOrder: 1.7,
      run: (ed) => {
        const pos = ed.getPosition();
        const hit = aiSuggestionRangesRef.current.find(r => r.range.containsPosition(pos));
        if (hit && acceptActionRef.current) {
          acceptActionRef.current(hit.index);
        }
      }
    });

    editor.addAction({
      id: "dismiss-ai-suggestion",
      label: "Dismiss AI Suggestion",
      contextMenuGroupId: "1_modification",
      contextMenuOrder: 1.8,
      run: (ed) => {
        const pos = ed.getPosition();
        const hit = aiSuggestionRangesRef.current.find(r => r.range.containsPosition(pos));
        if (hit && dismissActionRef.current) {
          dismissActionRef.current(hit.index);
        }
      }
    });

    // Handle click on highlighted regions for editing
    editor.onMouseDown((e) => {
      // Clear SyncTeX highlight on any click
      if (decorationsRef.current.length > 0) {
        decorationsRef.current = editor.deltaDecorations(
          decorationsRef.current,
          [],
        );
        onHighlightClear();
      }

      // Check if clicked on a table or figure for editing
      if (e.target.position && (onEditTable || onEditImage)) {
        const model = editor.getModel();
        const position = e.target.position;

        // Check for table
        if (onEditTable) {
          const tableEnv = getEnvironmentAtPosition(model, position, "table");
          if (tableEnv && e.event.detail === 2) {
            // Double-click to edit
            onEditTable(tableEnv.content, tableEnv.range);
            return;
          }
        }

        // Check for figure
        if (onEditImage) {
          const figureEnv = getEnvironmentAtPosition(model, position, "figure");
          if (figureEnv && e.event.detail === 2) {
            // Double-click to edit
            onEditImage(figureEnv.content, figureEnv.range);
            return;
          }
        }
      }
    });

    editor.onKeyDown(() => {
      if (decorationsRef.current.length > 0) {
        decorationsRef.current = editor.deltaDecorations(
          decorationsRef.current,
          [],
        );
        onHighlightClear();
      }
    });

    // Listen for content changes to update highlighting
    editor.onDidChangeModelContent(() => {
      // Debounced in useEffect above
    });

    console.log("✅ Monaco editor mounted with context menu actions");
    setEditorReady(true);

    // Initial highlighting
    setTimeout(updateEnvironmentHighlighting, 100);
  };

  // Insert text at cursor position
  const insertAtCursor = useCallback(
    (text) => {
      const editor = editorInstanceRef.current;
      if (!editor) return;

      const selection = editor.getSelection();
      const position = selection
        ? selection.getStartPosition()
        : editor.getPosition();

      editor.executeEdits("insert-latex", [
        {
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          },
          text: "\n" + text + "\n",
          forceMoveMarkers: true,
        },
      ]);

      editor.focus();

      // Update highlighting after insert
      setTimeout(updateEnvironmentHighlighting, 100);
    },
    [updateEnvironmentHighlighting],
  );

  // Replace a range with new text (for editing)
  const replaceRange = useCallback(
    (range, newText) => {
      const editor = editorInstanceRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco) return;

      editor.executeEdits("replace-latex", [
        {
          range: new monaco.Range(
            range.startLineNumber,
            range.startColumn,
            range.endLineNumber,
            range.endColumn,
          ),
          text: newText,
          forceMoveMarkers: true,
        },
      ]);

      editor.focus();

      // Update highlighting after replace
      setTimeout(updateEnvironmentHighlighting, 100);
    },
    [updateEnvironmentHighlighting],
  );

  const handleAcceptSuggestion = useCallback((index) => {
    const sugg = suggestions[index];
    const editor = editorInstanceRef.current;
    if (!editor || !sugg) return;
    const model = editor.getModel();
    const matchPos = model.findMatches(sugg.original_text, false, false, false, null, true)[0];
    if (matchPos) {
      replaceRange(matchPos.range, sugg.suggestion);
    }
    acceptSuggestion(index);
  }, [suggestions, replaceRange, acceptSuggestion]);

  useEffect(() => {
    acceptActionRef.current = handleAcceptSuggestion;
  }, [handleAcceptSuggestion]);

  // Expose methods via ref
  useEffect(() => {
    if (monacoEditorRef.current) {
      monacoEditorRef.current.insertAtCursor = insertAtCursor;
      monacoEditorRef.current.replaceRange = replaceRange;
    }
  }, [insertAtCursor, replaceRange]);

  // Yjs collaboration
  const { users, syncStatus } = useYjsMonaco(
    projectId,
    token,
    isOnline,
    editorReady ? editorInstanceRef.current : null,
    user,
  );

  // Synchronous change handler to track local edits immediately
  const handleLatexChangeWithRef = useCallback(
    (newValue) => {
      // Mark as local edit and suppress external sync for 500ms
      isLocalEditRef.current = true;
      clearTimeout(localEditTimeoutRef.current);
      localEditTimeoutRef.current = setTimeout(() => {
        isLocalEditRef.current = false;
      }, 500);

      handleLatexChange(newValue);
    },
    [handleLatexChange],
  );

  return (
    <div className="h-full w-full flex-1 flex flex-col" style={{ position: "relative" }}>
      {/* Active Users Bar */}
      {users.length > 0 && (
        <div className="bg-gray-50 px-4 py-2 border-b flex items-center gap-3">
          <span className="text-xs text-gray-600">Active:</span>
          {users.map((user, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs"
              style={{ backgroundColor: user.user.color + "20" }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: user.user.color }}
              />
              <span>{user.user.name}</span>
              {user.user.isGuest && (
                <span className="text-gray-500">(Guest)</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI Reviewer Top Bar */}
      <div className="bg-white px-4 py-1.5 border-b flex justify-between items-center text-sm shadow-sm z-10 relative" style={{ minHeight: "38px" }}>
        <div className="flex items-center gap-2">
          <button
            id="ai-review-run-btn"
            onClick={triggerReview}
            disabled={isReviewing}
            className="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-1"
          >
            {isReviewing ? (
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ animation: "ai-spin 1s linear infinite", display: "inline-block" }}>⚙</span>
                Analyzing…
              </span>
            ) : (
              suggestions.length > 0 ? "Refresh Review" : "Run AI Review"
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {suggestions.length > 0 && (
            <button
              id="ai-review-open-sidebar-btn"
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition"
              style={{ background: "#ede9fe", color: "#4f46e5", border: "1px solid #c4b5fd" }}
            >
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4f46e5", display: "inline-block", boxShadow: "0 0 0 2px #c4b5fd" }} />
              {suggestions.length} Suggestion{suggestions.length !== 1 ? "s" : ""}
            </button>
          )}
          <button
            id="ai-review-sidebar-toggle-btn"
            title="Open Review Panel"
            onClick={() => setSidebarOpen(v => !v)}
            className="text-xs font-semibold px-2 py-1 rounded transition"
            style={{ color: sidebarOpen ? "#4f46e5" : "#64748b", background: sidebarOpen ? "#ede9fe" : "transparent", border: "1px solid transparent" }}
          >
            Review ▸
          </button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 h-full" style={{ marginRight: sidebarOpen ? "320px" : 0, transition: "margin-right 0.2s" }}>
        <MonacoEditor
          height="100%"
          defaultLanguage="latex"
          defaultValue={value}
          onChange={handleLatexChangeWithRef}
          beforeMount={handleBeforeMount}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: settings.editor.fontSize,
            wordWrap: "on",
            automaticLayout: true,
            stickyScroll: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            renderLineHighlight: "all",
            tabSize: 2,
            insertSpaces: true,
            autoIndent: "full",
            formatOnType: true,
            formatOnPaste: true,
            suggestOnTriggerCharacters: true,
            wordBasedSuggestions: true,
            folding: true,
            brackets: "always",
            glyphMargin: true,
            readOnly: readOnly,
          }}
        />
      </div>

      {/* AI Review Sidebar */}
      <AIReviewSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        suggestions={suggestions}
        isReviewing={isReviewing}
        autoReview={autoReview}
        setAutoReview={setAutoReview}
        reviewOptions={reviewOptions}
        setReviewOptions={setReviewOptions}
        triggerReview={triggerReview}
        onAccept={handleAcceptSuggestion}
        onDismiss={dismissSuggestion}
        onJumpToLine={handleJumpToLine}
        error={reviewError}
      />
    </div>
  );
};

export default MonacoEditorPanel;
export { findEnvironmentRanges, getEnvironmentAtPosition };
