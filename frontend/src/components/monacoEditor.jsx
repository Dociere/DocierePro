import React from "react";
import MonacoEditor from "@monaco-editor/react";

const MonacoEditorPanel = ({
  value,
  onChange,
  monacoEditorRef,
  handleLatexChange,
}) => {
  return (
    <MonacoEditor
      height="100%"
      width="100%"
      language="latex"
      theme="vs-light"
      value={value}
      onChange={handleLatexChange}
      onMount={(editor) => {
        monacoEditorRef.current = editor;
      }}
      options={{
        minimap: { enabled: true },
        fontSize: 14,
        wordWrap: "on",
        automaticLayout: true,
      }}
    />
  );
};

export default MonacoEditorPanel;
