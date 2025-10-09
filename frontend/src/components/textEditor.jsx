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
    <div className="preview-panel">
      <div className="preview-panel-header">
        <div className="panel-title">📖 Rich Text Editor</div>
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
      </div>

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
