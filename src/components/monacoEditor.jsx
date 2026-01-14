import React from "react";
import MonacoEditor from "@monaco-editor/react";

const MonacoEditorPanel = ({ value, handleLatexChange, monacoEditorRef }) => {
  return (
    <div className="h-[100vh] flex-1 flex flex-col border-r border-[#dee2e6]">
      {/* Header section - commented out but kept for reference */}
      {/*
      <div className="bg-gray-100 pt-2 pb-1 border-b-2 border-gray-200">
        <div className="font-inter text-center text-gray-700 font-medium text-xs">
          Full code view
        </div>
      </div>
      */}

      {/* Monaco Editor Container */}
      <div className="flex-1">
        <MonacoEditor
          height="100vh"
          defaultLanguage="latex"
          value={value}
          onChange={handleLatexChange}
          theme="customLight"
          onMount={(editor, monaco) => {
            monacoEditorRef.current = editor;

            monaco.editor.defineTheme("customLight", {
              base: "vs",
              inherit: true,
              rules: [],
              colors: {
                "editorLineNumber.foreground": "#888888", // your color
                // optional: active line number
                "editorLineNumber.activeForeground": "#000000",
              },
            });
            monaco.editor.setTheme("customLight");
          }}
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

// Optional: Add default props for better error handling
MonacoEditorPanel.defaultProps = {
  value: "",
  handleLatexChange: () => console.warn("handleLatexChange not provided"),
  monacoEditorRef: { current: null },
};

// Optional: Add prop types validation if using PropTypes
// MonacoEditorPanel.propTypes = {
//   value: PropTypes.string,
//   handleLatexChange: PropTypes.func,
//   monacoEditorRef: PropTypes.object,
// };

export default MonacoEditorPanel;
