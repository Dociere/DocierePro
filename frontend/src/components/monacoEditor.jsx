import React from "react";
import MonacoEditor from "@monaco-editor/react";

const MonacoEditorPanel = ({
  value,
  onChange,
  monacoEditorRef,
  handleLatexChange,
}) => {
  return (
    <div className="code-panel">
      <div className="code-panel-header">
        <div className="panel-title">📝 LaTeX Source</div>
      </div>
      <div className="monaco-editor-container">
        <MonacoEditor
          height="100%"
          defaultLanguage="latex"
          value={value} // Use local state, not project state
          onChange={handleLatexChange}
          theme="vs-light"
          onMount={(editor, monaco) => {
            monacoEditorRef.current = editor;
          }}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: "on",
            wordWrap: "on",
            automaticLayout: true,
            scrollBeyondLastLine: false,
            folding: true,
            selectOnLineNumbers: true,
            roundedSelection: false,
            readOnly: false,
            cursorStyle: "line",
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
};

export default MonacoEditorPanel;
