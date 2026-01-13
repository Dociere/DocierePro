import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "../assets/styles/pdfViewer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

const PdfViewer = ({ pdfUrl }) => {
  const [numPages, setNumPages] = useState(null);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  console.log("pdfUrl", pdfUrl);

  return (
    <div className="pdf-container">
      {pdfUrl ? (
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          className="pdf-document"
          loading={<div className="loading-text">Loading PDF...</div>}
          error={<div className="error-text">Failed to load PDF.</div>}
        >
          {/* Render every page */}
          {Array.from(new Array(numPages), (el, index) => (
            <div key={`page_${index + 1}`} className="page-wrapper">
              <Page
                pageNumber={index + 1}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                scale={1}
                // width={600}
              />
            </div>
          ))}
        </Document>
      ) : (
        <div className="empty-state">
          Compile the project to view the PDF File
        </div>
      )}
    </div>
  );
};

export default PdfViewer;
