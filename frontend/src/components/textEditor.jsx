import React from "react";
// import ReactQuill from "react-quill";
import ReactQuill from "react-quill-new";
// import "react-quill-new/dist/quill.snow.css";
import "react-quill-new/dist/quill.snow.css";

const RichTextEditorPanel = ({
  value,
  onChange,
  quillModules,
  compilationStatus,
  compilationMessage,
  pdfUrl,
}) => {
  return (
    <div className="flex flex-col bg-white h-[100vh]">
      {/* <div className="bg-gray-100 pt-2 pb-1 border-b-2 border-gray-200">
        <div className="font-inter text-center text-gray-700 font-medium text-xs">
          Full text view
        </div>
        {pdfUrl && (
          <div className="preview-controls">
            <button
              className="btn-view-pdf"
              onClick={() => window.open(pdfUrl, "_blank")}
            >
              📄 View PDF
            </button>
          </div>
        )}
      </div> */}

      {/* Compilation Status */}
      {compilationStatus && (
        <div className={`compilation-status ${compilationStatus}`}>
          {compilationMessage}
        </div>
      )}

      {/* Rich Text Content */}
      <div className="preview-content">
        <div className="preview-edit-mode">
          <ReactQuill
            theme="snow"
            value={value}
            onChange={onChange}
            modules={quillModules}
            placeholder="Edit your document content here. Math formulas like $E=mc^2$ and \[F=ma\] are preserved. Changes sync with LaTeX code automatically."
            style={{ height: "calc(100% - 42px)" }}
          />
        </div>
      </div>
    </div>
  );
};

export default RichTextEditorPanel;

// import React from "react";
// import ReactQuill from "react-quill-new";
// import "react-quill-new/dist/quill.snow.css";

// const RichTextEditorPanel = ({
//   value,
//   onChange,
//   quillModules,
//   compilationStatus,
//   compilationMessage,
//   pdfUrl,
// }) => {
//   return (
//     <div className="h-full w-full flex flex-col bg-white overflow-hidden">
//       {/* Rich Text Editor */}
//       <div className="flex-1 overflow-y-auto">
//         <ReactQuill
//           theme="snow"
//           value={value}
//           onChange={onChange}
//           modules={quillModules}
//           className="h-full"
//           style={{
//             height: "100%",
//             display: "flex",
//             flexDirection: "column",
//           }}
//         />
//       </div>

//       {/* Compilation Status Bar (if present) */}
//       {compilationStatus && compilationMessage && (
//         <div
//           className={`px-4 py-2 text-sm border-t border-gray-200 ${
//             compilationStatus === "success"
//               ? "bg-green-50 text-green-800"
//               : compilationStatus === "error"
//               ? "bg-red-50 text-red-800"
//               : "bg-gray-50 text-gray-800"
//           }`}
//         >
//           {compilationMessage}
//         </div>
//       )}

//       {/* PDF Preview (if available) */}
//       {pdfUrl && (
//         <div className="h-64 border-t border-gray-200">
//           <iframe src={pdfUrl} className="w-full h-full" title="PDF Preview" />
//         </div>
//       )}
//     </div>
//   );
// };

// export default RichTextEditorPanel;
