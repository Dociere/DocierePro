import React, { useEffect, useContext, useRef, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import { useYjsMonaco } from "../hooks/useYjsMonaco";
import { registerLatexLanguage, defineLatexTheme } from "../utils/latexMonarchLanguage.jsx";

const MonacoEditorPanel = ({
  value = "",
  handleLatexChange = () => console.warn("handleLatexChange not provided"),
  monacoEditorRef = { current: null },
  projectId = null,
  token = null,
  isOnline = null,
  user = null,
  activeEditor = "monaco",
  highlightLine = null, // New Prop: line number to jump to
  onHighlightClear = () => {}, // New Prop: callback when user clicks
}) => {
  const editorInstanceRef = useRef(null);
  const decorationsRef = useRef([]);
  const [editorReady, setEditorReady] = useState(false);

  // const { users, syncStatus } = useYjsMonaco(
  //   projectId,
  //   token,
  //   isOnline,
  //   editorInstanceRef.current,
  // );

  useEffect(() => {
    if (editorInstanceRef.current && highlightLine) {
      const editor = editorInstanceRef.current;

      // 1. Reveal the line
      editor.revealLineInCenter(highlightLine);
      editor.setPosition({ lineNumber: highlightLine, column: 1 });
      editor.focus();

      // 2. Add Decoration (CSS class)
      // Note: You need to define '.synctex-highlight' in your global CSS
      const newDecorations = editor.deltaDecorations(decorationsRef.current, [
        {
          range: new monaco.Range(highlightLine, 1, highlightLine, 1),
          options: {
            isWholeLine: true,
            className: "synctex-highlight", // We will define this CSS below
            linesDecorationsClassName: "synctex-gutter-highlight",
          },
        },
      ]);
      decorationsRef.current = newDecorations;
    }
  }, [highlightLine]);

  useEffect(() => {
    // Only update editor content if NOT using Yjs sync (isOnline)
    // When Yjs is active, it manages the editor content directly
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

  const handleEditorMount = (editor, monaco) => {
    monacoEditorRef.current = editor;
    editorInstanceRef.current = editor;

    // Register LaTeX language with Monarch tokenizer for syntax highlighting
    registerLatexLanguage(monaco);
    
    // Define and apply the LaTeX theme with Overleaf-like colors
    defineLatexTheme(monaco);
    monaco.editor.setTheme("latex-light");

    // Mark editor as ready AFTER mount
    console.log("✅ Monaco editor mounted and ready");

    editor.onMouseDown(() => {
      if (decorationsRef.current.length > 0) {
        decorationsRef.current = editor.deltaDecorations(
          decorationsRef.current,
          [],
        );
        onHighlightClear();
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
    setEditorReady(true);
  };

  // Only initialize Yjs AFTER editor is ready
  const { users, syncStatus } = useYjsMonaco(
    projectId,
    token,
    isOnline,
    editorReady ? editorInstanceRef.current : null, // Pass null until ready
    user,
  );

  console.log("Monaco render:", {
    projectId,
    token: !!token,
    editorReady,
    isOnline,
  });

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

      {/* Sync Status Indicator */}
      <div className="bg-gray-100 px-4 py-1 border-b text-xs">
        Status:{" "}
        <span
          className={
            syncStatus === "synced" ? "text-green-600" : "text-orange-600"
          }
        >
          {syncStatus}
        </span>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 h-full">
        <MonacoEditor
          height="100%"
          defaultLanguage="latex"
          value={value}
          onChange={handleLatexChange}
          theme="customLight"
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            wordWrap: "on",
            automaticLayout: true,
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
          }}
        />
      </div>
    </div>
  );
};

// Do not uncomment this below code. This was removed since the new version of Monaco Editor does not support defaultProps

// MonacoEditorPanel.defaultProps = {
//   value: "",
//   handleLatexChange: () => console.warn("handleLatexChange not provided"),
//   monacoEditorRef: { current: null },
//   projectId: null,
//   token: null,
//   isOnline: true,
// };

export default MonacoEditorPanel;
