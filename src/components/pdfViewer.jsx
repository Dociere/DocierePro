import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import SyncIcon from "../assets/icons/syncIcon.svg?react";
import DownloadIcon from "../assets/icons/download.svg?react";
import axios from "axios";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "../assets/styles/pdfViewer.css";
import { useSettings } from "../context/useSettings";
import ConfirmModal from "./confirmModal";

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
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);
  const [zoomDropdownOpen, setZoomDropdownOpen] = useState(false);
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [pageInputValue, setPageInputValue] = useState("");
  const [isFitMode, setIsFitMode] = useState(false);
  const [pdfPageWidth, setPdfPageWidth] = useState(595);
  const viewportRef = useRef(null);
  const pageRefs = useRef([]);
  const zoomDropdownRef = useRef(null);
  const isZoomingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const pageInputRef = useRef(null);
  const savedPageRef = useRef(1);
  const isProgrammaticScrollRef = useRef(false);
  const itemHeightRef = useRef(842 * 1 + 16);
  const scaleRef = useRef(scale);
  const scrollToPageAfterZoomRef = useRef(null);
  const { settings } = useSettings();
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });

  const ESTIMATED_PAGE_HEIGHT = 842;
  const GAP = 16;

  // Keep refs in sync
  useEffect(() => {
    itemHeightRef.current = ESTIMATED_PAGE_HEIGHT * scale + GAP;
  }, [scale]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    savedPageRef.current = pageNumber;
  }, [pageNumber]);

  const itemHeight = itemHeightRef.current;

  const zoomIn = () => {
    setIsFitMode(false);
    setScale((s) => Math.min(4, s + 0.2));
  };
  const zoomOut = () => {
    setIsFitMode(false);
    setScale((s) => Math.max(0.5, s - 0.2));
  };
  const setZoomPreset = (pct) => {
    setIsFitMode(false);
    setScale(pct / 100);
    setZoomDropdownOpen(false);
  };
  const nextPage = () => setPageNumber((p) => Math.min(numPages, p + 1));
  const prevPage = () => setPageNumber((p) => Math.max(1, p - 1));

  const computeFitScale = useCallback(() => {
    if (!viewportRef.current) return null;
    const containerWidth = viewportRef.current.clientWidth - 32;
    const fitScale = Math.round((containerWidth / pdfPageWidth) * 100) / 100;
    return Math.max(0.5, Math.min(4, fitScale));
  }, [pdfPageWidth]);

  // Update scale when in fit mode and container size changes (window resize only)
  const updateFitScale = useCallback(() => {
    if (!isFitMode) return;
    const clamped = computeFitScale();
    if (clamped !== null && Math.abs(clamped - scaleRef.current) > 0.01) {
      requestAnimationFrame(() => setScale(clamped));
    }
  }, [isFitMode, computeFitScale]);

  // Only re-fit on window resize, NOT on isFitMode/pdfPageWidth state changes
  useEffect(() => {
    window.addEventListener("resize", updateFitScale);
    return () => window.removeEventListener("resize", updateFitScale);
  }, [updateFitScale]);

  const zoomToFit = useCallback(() => {
    const clamped = computeFitScale();
    if (clamped === null) return;

    // LOCK everything before changing scale
    isZoomingRef.current = true;
    isProgrammaticScrollRef.current = true;

    const targetPage = pageNumber;
    setIsFitMode(true);
    setScale(clamped);
    scrollToPageAfterZoomRef.current = targetPage;
  }, [computeFitScale, pageNumber]);

  // After scale has been applied, scroll to the saved page
  useLayoutEffect(() => {
    if (scrollToPageAfterZoomRef.current !== null && viewportRef.current) {
      const targetPage = scrollToPageAfterZoomRef.current;
      const newItemHeight = ESTIMATED_PAGE_HEIGHT * scale + GAP;
      const targetScrollTop = (targetPage - 1) * newItemHeight;

      viewportRef.current.scrollTo({ top: targetScrollTop, behavior: "auto" });

      // Clear the pending scroll request
      scrollToPageAfterZoomRef.current = null;

      // Release locks after a short delay to let the 'scroll' event fire and be ignored
      setTimeout(() => {
        isZoomingRef.current = false;
        isProgrammaticScrollRef.current = false;
      }, 150);
    }
  }, [scale]);

  const zoomLabel = isFitMode ? "Zoom to fit" : `${Math.round(scale * 100)}%`;
  const ZOOM_PRESETS = [50, 75, 100, 150, 200, 300, 400];

  const handlePageClick = async (event, pageIndex) => {
    if (!pdfUrl || !onLineJump) return;
    const fileName = pdfFileName || pdfUrl.split("/").pop();
    if (!fileName) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / scale;
    const y = (event.clientY - bounds.top) / scale;
    try {
      const response = await axios.post("http://localhost:5000/api/synctex", {
        pdfFile: fileName,
        page: pageIndex + 1,
        x,
        y,
      });
      if (response.data.success) onLineJump(response.data.line);
    } catch (error) {
      console.error("SyncTeX failed:", error);
    }
  };

  function onDocumentLoadSuccess({ numPages: loadedNumPages }) {
    setNumPages(loadedNumPages);
    const targetPage = Math.min(savedPageRef.current, loadedNumPages);
    if (targetPage > 1) setTimeout(() => setPageNumber(targetPage), 100);
  }

  const handlePageLoadSuccess = (page) => {
    if (page.width && page.width !== pdfPageWidth) setPdfPageWidth(page.width);
  };

  const startEditingPage = () => {
    setIsEditingPage(true);
    setPageInputValue(String(pageNumber));
    setTimeout(() => pageInputRef.current?.select(), 0);
  };

  const commitPageInput = () => {
    const val = parseInt(pageInputValue, 10);
    if (isNaN(val) || val < 1) setPageNumber(1);
    else if (val > numPages) setPageNumber(numPages);
    else setPageNumber(val);
    setIsEditingPage(false);
  };

  const handlePageInputKeyDown = (e) => {
    if (e.key === "Enter") commitPageInput();
    else if (e.key === "Escape") setIsEditingPage(false);
  };

  const handleExportPDF = async () => {
    if (!pdfUrl) {
      setAlertModal({
        isOpen: true,
        title: "PDF Not Found",
        message: "Please compile your document first to generate a PDF",
      });
      return;
    }
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const defaultName = `${fileTitle || "document"}.pdf`;
      const isElectron =
        window.electronAPI && typeof window.electronAPI.savePDF === "function";
      if (isElectron) {
        const arrayBuffer = await blob.arrayBuffer();
        const result = await window.electronAPI.savePDF(
          arrayBuffer,
          defaultName,
        );
        if (!result.success && !result.canceled)
          throw new Error(result.error || "Unknown Electron save error");
      } else {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = defaultName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: "Export Error",
        message: `An error occurred during PDF export: ${error.message}`,
      });
    }
  };

  // Update viewport height on resize (without touching scale)
  useEffect(() => {
    let rafId = null;
    const updateHeight = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (viewportRef.current) {
          setViewportHeight(viewportRef.current.clientHeight);
        }
      });
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => {
      window.removeEventListener("resize", updateHeight);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        zoomDropdownRef.current &&
        !zoomDropdownRef.current.contains(e.target)
      )
        setZoomDropdownOpen(false);
    };
    if (zoomDropdownOpen)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [zoomDropdownOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        zoomToFit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomToFit]);

  const handleScroll = (e) => {
    if (isZoomingRef.current) return; // ignore during zoom
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      if (isProgrammaticScrollRef.current || isZoomingRef.current) return;
      const newScrollTop = e.target.scrollTop;
      setScrollTop(newScrollTop);
      const currentPage = Math.round(newScrollTop / itemHeightRef.current) + 1;
      if (
        currentPage !== pageNumber &&
        currentPage >= 1 &&
        currentPage <= numPages
      ) {
        setPageNumber(currentPage);
      }
    }, 50);
  };

  // Scroll to page when pageNumber changes, but not during zoom
  useEffect(() => {
    if (!numPages || !viewportRef.current) return;
    if (isZoomingRef.current) return;
    const targetScrollTop = (pageNumber - 1) * itemHeightRef.current;
    if (Math.abs(viewportRef.current.scrollTop - targetScrollTop) <= 10) return;
    isProgrammaticScrollRef.current = true;
    viewportRef.current.scrollTo({ top: targetScrollTop, behavior: "auto" });
    const timer = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, [pageNumber, numPages]);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 10);
  const endIndex = Math.min(
    (numPages || 0) - 1,
    Math.floor((scrollTop + viewportHeight) / itemHeight) + 10,
  );
  const visiblePages = numPages
    ? Array.from(
        { length: endIndex - startIndex + 1 },
        (_, i) => startIndex + i,
      )
    : [];

  return (
    <div className="flex flex-col h-full">
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
          {projectDetails?.compilationStatus === "error" ? (
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
              {isEditingPage ? (
                <input
                  ref={pageInputRef}
                  type="text"
                  value={pageInputValue}
                  onChange={(e) =>
                    setPageInputValue(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  onKeyDown={handlePageInputKeyDown}
                  onBlur={commitPageInput}
                  className="w-8 text-center text-xs font-poppins font-light underline outline-none bg-transparent border-b"
                  style={{
                    color:
                      settings.appearance.customThemes[
                        settings.appearance.theme
                      ].text1,
                    borderColor:
                      settings.appearance.customThemes[
                        settings.appearance.theme
                      ].text1,
                  }}
                />
              ) : (
                <span
                  className="underline pr-2 cursor-pointer hover:opacity-70"
                  onClick={startEditingPage}
                  title="Click to jump to a page"
                >
                  {String(pageNumber).padStart(2, "0")}
                </span>
              )}{" "}
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

        {pdfUrl && (
          <div
            className="flex items-center gap-2"
            style={{
              color:
                settings.appearance.customThemes[settings.appearance.theme]
                  .text1,
            }}
          >
            <div className="relative" ref={zoomDropdownRef}>
              <button
                onClick={() => setZoomDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1 px-2 py-[2px] rounded hover:bg-gray-50 text-xs font-poppins font-light"
                style={{
                  color:
                    settings.appearance.customThemes[settings.appearance.theme]
                      .text1,
                }}
              >
                {zoomLabel}
                <svg
                  className={`w-3 h-3 transition-transform ${zoomDropdownOpen ? "rotate-180" : ""}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {zoomDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-52 rounded-lg shadow-lg border z-50 py-1 font-poppins text-sm"
                  style={{
                    background:
                      settings.appearance.customThemes[
                        settings.appearance.theme
                      ].primary,
                    borderColor:
                      settings.appearance.customThemes[
                        settings.appearance.theme
                      ].border,
                    color:
                      settings.appearance.customThemes[
                        settings.appearance.theme
                      ].text1,
                  }}
                >
                  <button
                    onClick={zoomToFit}
                    className={`w-full flex items-center justify-between px-4 py-2 hover:bg-gray-100 text-left ${isFitMode ? "font-medium" : "font-light"}`}
                  >
                    <span>Zoom to fit</span>
                    <span className="text-xs opacity-50">Ctrl+0</span>
                  </button>
                  <button
                    onClick={() => {
                      zoomIn();
                    }}
                    className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-100 text-left font-light"
                  >
                    <span>Zoom in</span>
                    <span className="text-xs opacity-50">Ctrl+</span>
                  </button>
                  <button
                    onClick={() => {
                      zoomOut();
                    }}
                    className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-100 text-left font-light"
                  >
                    <span>Zoom out</span>
                    <span className="text-xs opacity-50">Ctrl−</span>
                  </button>
                  <div
                    className="my-1 border-t"
                    style={{
                      borderColor:
                        settings.appearance.customThemes[
                          settings.appearance.theme
                        ].border,
                    }}
                  />
                  {ZOOM_PRESETS.map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setZoomPreset(pct)}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${!isFitMode && Math.round(scale * 100) === pct ? "font-medium" : "font-light"}`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleExportPDF}>
              <DownloadIcon
                style={{
                  fill: settings.appearance.customThemes[
                    settings.appearance.theme
                  ].text2,
                }}
                className="mt-[1px] w-5 h-5 ml-3"
              />
            </button>
          </div>
        )}
      </div>

      <div
        ref={viewportRef}
        onScroll={handleScroll}
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
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div
                className="relative mx-auto"
                style={{
                  height: `${(numPages || 0) * itemHeightRef.current}px`,
                  width: "100%",
                  maxWidth: "min-content",
                }}
              />
            } // <--- CHANGE THIS: Stop the "Loading..." text flash while preserving height so scroll doesn't collapse to 0
            error={<div className="p-4 text-red-600">Failed to load PDF.</div>}
          >
            <div
              className="relative mx-auto"
              style={{
                // Use the ref value to ensure the height is stable during the render cycle
                height: `${(numPages || 0) * itemHeightRef.current}px`,
                width: "100%",
                maxWidth: "min-content",
              }}
            >
              {visiblePages.map((index) => (
                <div
                  key={index}
                  ref={(el) => (pageRefs.current[index] = el)}
                  onClick={(e) => handlePageClick(e, index)}
                  className="cursor-text absolute left-1/2 -translate-x-1/2 shadow-lg border-2 border-gray-200 rounded-xl overflow-hidden bg-white"
                  style={{
                    top: `${index * itemHeightRef.current}px`,
                    // Match the height exactly to the scale to prevent flickering gaps
                    height: `${ESTIMATED_PAGE_HEIGHT * scale}px`,
                    width: `${pdfPageWidth * scale}px`,
                  }}
                >
                  <Page
                    pageNumber={index + 1}
                    scale={scale}
                    renderTextLayer
                    renderAnnotationLayer
                    loading={null} // <--- CHANGE THIS: Keep the old canvas visible until new one is ready
                    onLoadSuccess={
                      index === 0 ? handlePageLoadSuccess : undefined
                    }
                    // Add this to prevent the text layer from flashing in before the canvas
                    onRenderSuccess={(page) => {
                      // Optional: trigger a small fade-in here if you want it extra smooth
                    }}
                  />
                </div>
              ))}
            </div>
          </Document>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Compile the project to view the PDF file
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
        cancelText=""
        onConfirm={() => setAlertModal({ ...alertModal, isOpen: false })}
        onCancel={() => setAlertModal({ ...alertModal, isOpen: false })}
      />
    </div>
  );
};

export default PdfViewer;
