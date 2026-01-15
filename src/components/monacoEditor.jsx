import React, { useEffect, useRef } from "react";
import MonacoEditor from "@monaco-editor/react";
import { useYjsMonaco } from "../hooks/useYjsMonaco";

const MonacoEditorPanel = ({
  value = "",
  handleLatexChange = () => console.warn("handleLatexChange not provided"),
  monacoEditorRef = { current: null },
  projectId = null,
  token = null,
  isOnline = null,
}) => {
  const editorInstanceRef = useRef(null);

  const handleEditorMount = (editor, monaco) => {
    monacoEditorRef.current = editor;
    editorInstanceRef.current = editor;

    monaco.editor.defineTheme("customLight", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editorLineNumber.foreground": "#888888",
        "editorLineNumber.activeForeground": "#000000",
      },
    });
    monaco.editor.setTheme("customLight");
  };

  // Initialize Yjs collaboration only if projectId and token exist
  useYjsMonaco(projectId, token, isOnline, editorInstanceRef.current);

  return (
    <div className="h-[100vh] flex-1 flex flex-col border-r border-[#dee2e6]">
      {/* Monaco Editor Container */}
      <div className="flex-1">
        <MonacoEditor
          height="100vh"
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
