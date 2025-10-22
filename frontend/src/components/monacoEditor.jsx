// import React from "react";
// import MonacoEditor from "@monaco-editor/react";

// const MonacoEditorPanel = ({ value, handleLatexChange, monacoEditorRef }) => {
//   return (
//     <div className="code-panel ml-14">
//       {/* <div className="bg-gray-100 pt-2 pb-1 border-b-2 border-gray-200">
//         <div className="font-inter text-center text-gray-700 font-medium text-xs">
//           Full code view
//         </div>
//       </div> */}
//       <div className="monaco-editor-container">
//         <MonacoEditor
//           height="100"
//           defaultLanguage="latex"
//           value={value}
//           onChange={handleLatexChange}
//           theme="vs-light"
//           onMount={(editor, monaco) => {
//             monacoEditorRef.current = editor;
//           }}
//           options={{
//             minimap: { enabled: true },
//             fontSize: 14,
//             lineNumbers: "on",
//             wordWrap: "on",
//             automaticLayout: true,
//             scrollBeyondLastLine: false,
//             folding: true,
//             selectOnLineNumbers: true,
//             roundedSelection: false,
//             readOnly: false,
//             cursorStyle: "line",
//           }}
//         />
//       </div>
//     </div>
//   );
// };

// export default MonacoEditorPanel;

// // import React from "react";
// // import MonacoEditor from "@monaco-editor/react";

// // const MonacoEditorPanel = ({
// //   value,
// //   onChange,
// //   monacoEditorRef,
// //   handleLatexChange,
// // }) => {
// //   return (
// //     <MonacoEditor
// //       height="100%"
// //       width="100%"
// //       language="latex"
// //       theme="vs-light"
// //       value={value}
// //       onChange={handleLatexChange}
// //       onMount={(editor) => {
// //         monacoEditorRef.current = editor;
// //       }}
// //       options={{
// //         minimap: { enabled: true },
// //         fontSize: 14,
// //         wordWrap: "on",
// //         automaticLayout: true,
// //       }}
// //     />
// //   );
// // };

// // export default MonacoEditorPanel;
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
      <div className="monaco-editor-container flex-1">
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
