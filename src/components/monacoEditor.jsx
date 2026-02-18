import React, { useEffect, useRef, useState, useCallback } from "react";
import MonacoEditor from "@monaco-editor/react";
import { useYjsMonaco } from "../hooks/useYjsMonaco";
import {
  registerLatexLanguage,
  defineLatexTheme,
} from "../utils/latexMonarchLanguage.jsx";
import { useSettings } from "../context/useSettings";

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

  // Sync content in offline mode
  useEffect(() => {
    if (!isOnline && editorInstanceRef.current && value !== undefined) {
      const currentValue = editorInstanceRef.current.getValue();
      if (currentValue !== value) {
        console.log(
          "📝 Updating Monaco editor with new content (offline mode)",
        );
        editorInstanceRef.current.setValue(value);
      }
    }
  }, [value, isOnline]);

  // Update highlighting when content changes
  useEffect(() => {
    if (editorReady) {
      // Debounce the highlighting update
      const timeout = setTimeout(updateEnvironmentHighlighting, 300);
      return () => clearTimeout(timeout);
    }
  }, [value, editorReady, updateEnvironmentHighlighting]);

  const handleEditorMount = (editor, monaco) => {
    monacoEditorRef.current = editor;
    editorInstanceRef.current = editor;
    monacoRef.current = monaco;

    // Register LaTeX language with Monarch tokenizer
    registerLatexLanguage(monaco);
    defineLatexTheme(monaco);
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

  return (
    <div className="h-full w-full flex-1 flex flex-col">
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

      {/* Monaco Editor Container */}
      <div className="flex-1 h-full">
        <MonacoEditor
          height="100%"
          defaultLanguage="latex"
          value={value}
          onChange={handleLatexChange}
          // theme="customLight"
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
    </div>
  );
};

export default MonacoEditorPanel;
export { findEnvironmentRanges, getEnvironmentAtPosition };
