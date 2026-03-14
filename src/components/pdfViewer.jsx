import React, { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import SyncIcon from "../assets/icons/syncIcon.svg?react";
import IncIcon from "../assets/icons/inc.svg?react";
import DecIcon from "../assets/icons/dec.svg?react";
import DownloadIcon from "../assets/icons/download.svg?react";
import axios from "axios";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "../assets/styles/pdfViewer.css";
import { useSettings } from "../context/useSettings";

// pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
pdfjs.GlobalWorkerOptions.workerSrc = "./pdf.worker.min.js";

const PdfViewer = ({
  pdfUrl,
  pdfFileName,
  onLineJump,
  onCompile,
  fileTitle,
  onShowLogs,
  projectDetails,
  loading,
}) => {
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1);
  const [pageNumber, setPageNumber] = useState(1);
  const pageRefs = useRef([]);
  const { settings } = useSettings();
  console.log("From PDFViewer", projectDetails);

  const getPdfFileName = () => {
    // Use the pdfFileName prop if available (from server compile response)
    // This is the correct filename like "{projectId}.pdf"
    if (pdfFileName) return pdfFileName;
    if (!pdfUrl) return null;
    return pdfUrl.split("/").pop();
  };

  const zoomIn = () => setScale((s) => Math.min(3, s + 0.2));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.2));
  const nextPage = () => setPageNumber((p) => Math.min(numPages, p + 1));
  const prevPage = () => setPageNumber((p) => Math.max(1, p - 1));

  const handlePageClick = async (event, pageIndex) => {
    if (!pdfUrl || !onLineJump) return;

    // Use pdfFileName prop (from server compile response) which contains the correct
    // project ID-based filename. Fallback to extracting from pdfUrl for backwards compatibility.
    const fileName = pdfFileName || pdfUrl.split("/").pop();

    if (!fileName) {
      console.error("SyncTeX: No filename available");
      return;
    }

    const pageNum = pageIndex + 1;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / scale;
    const y = (event.clientY - bounds.top) / scale;

    try {
      console.log(`🔎 SyncTeX lookup for: ${fileName}`);
      const response = await axios.post("http://localhost:5000/api/synctex", {
        pdfFile: fileName,
        page: pageNum,
        x: x,
        y: y,
      });

      if (response.data.success) {
        console.log("📍 SyncTeX Jump to Line:", response.data.line);
        onLineJump(response.data.line);
      }
    } catch (error) {
      console.error("SyncTeX failed:", error);
    }
  };

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  const handleExportPDF = () => {
    if (!pdfUrl) {
      alert("Please compile your document first to generate a PDF");
      return;
    }

    // Trigger PDF download
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `${fileTitle || "document"}.pdf`;
    link.click();
  };

  useEffect(() => {
    const page = pageRefs.current[pageNumber - 1];
    page?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [pageNumber]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar - Compile button always visible, rest only when PDF exists */}
      <div
        className="flex items-center justify-between px-4 py-1 border-b font-poppins h-8"
        style={{
          background:
            settings.appearance.customThemes[settings.appearance.theme].primary,
          borderColor:
            settings.appearance.customThemes[settings.appearance.theme].border,
        }}
      >
        <div className="flex items-center">
          <button
            id="tour-compile"
            onClick={onCompile}
            className="flex border-2 px-2 rounded-sm py-[2px] cursor-pointer hover:bg-gray-50"
            style={{
              borderColor:
                settings.appearance.customThemes[settings.appearance.theme]
                  .border,
            }}
          >
            {loading ? (
              <SyncIcon
                style={{
                  fill: settings.appearance.customThemes[
                    settings.appearance.theme
                  ].icon1,
                }}
                className="mt-[1px] w-4 h-4 animate-spin"
              />
            ) : (
              <SyncIcon
                style={{
                  fill: settings.appearance.customThemes[
                    settings.appearance.theme
                  ].icon1,
                }}
                className="mt-[1px] w-4 h-4"
              />
            )}
            <p
              className="px-2 font-poppins text-sm font-light"
              style={{
                color:
                  settings.appearance.customThemes[settings.appearance.theme]
                    .text1,
              }}
            >
              Compile
            </p>
          </button>
          {projectDetails.compilationStatus === "error" ? (
            <p
              onClick={onShowLogs}
              className="font-poppins font-medium text-sm ml-3 cursor-pointer hover:underline text-red-600"
            >
              Logs
            </p>
          ) : (
            <p
              onClick={onShowLogs}
              className="font-poppins font-light text-sm ml-3 cursor-pointer"
              style={{
                color:
                  settings.appearance.customThemes[settings.appearance.theme]
                    .text1,
              }}
            >
              Logs
            </p>
          )}
        </div>

        {/* Page navigation - only visible when PDF exists */}
        {pdfUrl && (
          <div
            className="flex items-center gap-2"
            style={{
              color:
                settings.appearance.customThemes[settings.appearance.theme]
                  .text1,
            }}
          >
            <button
              onClick={prevPage}
              disabled={pageNumber <= 1}
              className="px-1 mt-1 text-xl rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &lt;
            </button>
            <span className="text-xs font-poppins font-light">
              <span className="underline pr-2">{pageNumber}</span>{" "}
              <span className="italic">of</span> {numPages}
            </span>
            <button
              onClick={nextPage}
              disabled={pageNumber >= numPages}
              className="px-1 mt-1 text-xl rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &gt;
            </button>
          </div>
        )}

        {/* Zoom and download controls - only visible when PDF exists */}
        {pdfUrl && (
          <div
            className="flex items-center gap-2"
            style={{
              color:
                settings.appearance.customThemes[settings.appearance.theme]
                  .text1,
            }}
          >
            <button onClick={zoomOut} className="rounded hover:bg-gray-50">
              <DecIcon
                style={{
                  fill: settings.appearance.customThemes[
                    settings.appearance.theme
                  ].text1,
                }}
                className="mt-[1px] w-4 h-4"
              />
            </button>
            <span className="text-xs w-12 text-center font-poppins">
              {Math.round(scale * 100)}%
            </span>
            <button onClick={zoomIn} className="rounded hover:bg-gray-50">
              <IncIcon
                style={{
                  fill: settings.appearance.customThemes[
                    settings.appearance.theme
                  ].text1,
                }}
                className="mt-[1px] w-4 h-4"
              />
            </button>
            <button onClick={handleExportPDF}>
              <DownloadIcon
                style={{
                  fill: settings.appearance.customThemes[
                    settings.appearance.theme
                  ].text2,
                }}
                className="mt-[1px] w-5 h-5 ml-5"
              />
            </button>
          </div>
        )}
      </div>
      {/* PDF Viewer */}
      <div
        className="flex-1 overflow-auto pb-4"
        style={{
          overflowX: "auto",
          overflowY: "auto",
          background:
            settings.appearance.customThemes[settings.appearance.theme]
              .background,
        }}
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
              {Array.from(new Array(numPages), (_, index) => (
                <div
                  key={index}
                  ref={(el) => (pageRefs.current[index] = el)}
                  onClick={(e) => handlePageClick(e, index)}
                  className="cursor-text"
                >
                  <Page
                    pageNumber={index + 1}
                    scale={scale}
                    renderTextLayer
                    renderAnnotationLayer
                    className="shadow-lg mb-4 border-2 border-gray-200 rounded-xl overflow-hidden"
                  />
                </div>
              ))}
            </Document>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Compile the project to view the PDF file
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfViewer;
