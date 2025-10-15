import React from "react";
import MonacoEditor from "@monaco-editor/react";

const MonacoEditorPanel = ({ value, handleLatexChange, monacoEditorRef }) => {
  return (
    <div className="h[100vh] flex-1 flex flex-col border-r border-[#dee2e6]">
      {/* <div className="bg-gray-100 pt-2 pb-1 border-b-2 border-gray-200">
        <div className="font-inter text-center text-gray-700 font-medium text-xs">
          Full code view
        </div>
      </div> */}
      <div className="monaco-editor-container">
        <MonacoEditor
          height="100vh"
          defaultLanguage="latex"
          value={value}
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
          }}
        />
      </div>
    </div>
  );
};

export default MonacoEditorPanel;

// import React from "react";
// import MonacoEditor from "@monaco-editor/react";

// const MonacoEditorPanel = ({
//   value,
//   onChange,
//   monacoEditorRef,
//   handleLatexChange,
// }) => {
//   return (
//     <MonacoEditor
//       height="100%"
//       width="100%"
//       language="latex"
//       theme="vs-light"
//       value={value}
//       onChange={handleLatexChange}
//       onMount={(editor) => {
//         monacoEditorRef.current = editor;
//       }}
//       options={{
//         minimap: { enabled: true },
//         fontSize: 14,
//         wordWrap: "on",
//         automaticLayout: true,
//       }}
//     />
//   );
// };

// export default MonacoEditorPanel;
