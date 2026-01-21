import React, { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "../assets/styles/pdfViewer.css";
import { useSettings } from "../context/useSettings";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

const PdfViewer = ({ pdfUrl }) => {
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const pageRefs = useRef([]);
  const { settings } = useSettings();
  const isDark = settings.appearance.mode === "dark";

  const zoomIn = () => setScale((s) => Math.min(3, s + 0.2));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.2));
  const nextPage = () => setPageNumber((p) => Math.min(numPages, p + 1));
  const prevPage = () => setPageNumber((p) => Math.max(1, p - 1));

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  useEffect(() => {
    const page = pageRefs.current[pageNumber - 1];
    page?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [pageNumber]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      {pdfUrl && (
        <div className={`flex items-center justify-between px-4 py-1 transition-colors duration-300 ${isDark ? "bg-[#1e1e1e] border-b border-[#333] text-gray-300" : "bg-gray-100 border-b border-gray-300 text-gray-700"
          }`}>
          <div className="flex items-center gap-2">
            <button
              onClick={prevPage}
              disabled={pageNumber <= 1}
              className={`px-3 pb-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? "hover:bg-[#2d2d2d]" : "hover:bg-gray-50"
                }`}
            >
              ←
            </button>
            <span className="text-xs font-mono font-thin">
              {pageNumber} / {numPages}
            </span>
            <button
              onClick={nextPage}
              disabled={pageNumber >= numPages}
              className={`px-3 pb-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? "hover:bg-[#2d2d2d]" : "hover:bg-gray-50"
                }`}
            >
              →
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              className={`px-3 py-1 rounded transition-colors ${isDark ? "hover:bg-[#2d2d2d]" : "hover:bg-gray-50"}`}
            >
              −
            </button>
            <span className="text-xs w-12 text-center font-mono">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className={`px-3 py-1 rounded transition-colors ${isDark ? "hover:bg-[#2d2d2d]" : "hover:bg-gray-50"}`}
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* PDF Viewer */}
      <div
        className={`flex-1 overflow-auto py-4 transition-colors duration-300 ${isDark ? "bg-[#121212]" : "bg-gray-200"}`}
        style={{ overflowX: "auto", overflowY: "auto" }}
      >
        {pdfUrl ? (
          <div className="flex flex-col items-center gap-4 min-w-min">
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div className="p-4">Loading PDF...</div>}
              error={
                <div className="p-4 text-red-600">Failed to load PDF.</div>
              }
            >
              {/* {Array.from(new Array(numPages), (el, index) => (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  scale={scale}
                  className="shadow-lg mb-4"
                />
              ))} */}
              {/* <Page
                pageNumber={index + 1}
                scale={scale}
                ref={(el) => (pageRefs.current[index] = el)}
                renderTextLayer
                renderAnnotationLayer
                className="shadow-lg mb-4"
              /> */}
              {Array.from(new Array(numPages), (_, index) => (
                <div key={index} ref={(el) => (pageRefs.current[index] = el)}>
                  <Page
                    pageNumber={index + 1}
                    scale={scale}
                    renderTextLayer
                    renderAnnotationLayer
                    className="shadow-lg mb-4"
                  />
                </div>
              ))}
            </Document>
          </div>
        ) : (
          <div className={`flex items-center justify-center h-full transition-colors duration-300 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            Compile the project to view the PDF file
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfViewer;
