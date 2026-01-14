import React from "react";
import ReactQuill from "react-quill-new";
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
    <div className="h-full w-full flex flex-col bg-white">
      {/* Rich Text Editor with proper scrolling */}
      <div className="flex-1 overflow-hidden">
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={quillModules}
          style={{
            height: "calc(100% - 42px)", // Account for toolbar height
            display: "flex",
            flexDirection: "column",
            fontFamily: "Arial",
            fontSize: "20px",
          }}
          className="h-full"
        />
      </div>

      {/* Compilation Status Bar (if present) */}
      {/* {compilationStatus && compilationMessage && (
        <div
          className={`px-4 py-2 text-sm border-t border-gray-200 ${
            compilationStatus === "success"
              ? "bg-green-50 text-green-800"
              : compilationStatus === "error"
              ? "bg-red-50 text-red-800"
              : "bg-gray-50 text-gray-800"
          }`}
        >
          {compilationMessage}
        </div>
      )} */}

      {/* PDF Preview (if available) */}
      {/* {pdfUrl && (
        <div className="h-64 border-t border-gray-200">
          <iframe src={pdfUrl} className="w-full h-full" title="PDF Preview" />
        </div>
      )} */}
    </div>
  );
};

export default RichTextEditorPanel;
