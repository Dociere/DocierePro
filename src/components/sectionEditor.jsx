import React, { useState, useEffect, useRef, useMemo } from "react";
import MonacoEditorPanel from "./monacoEditor";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import "../utils/latexBlots.jsx";
import latexUtility from "../utils/latexUtility";
import TableDesignerModal from "./TableDesignerModal";
import ImageInsertModal from "./ImageInsertModal";
import "../assets/styles/synctex.css";
import axios from "axios";
import ReactDOM from "react-dom";
import { RichTextToolbar, getRichTextHandlers } from "./richTextToolbar.jsx";

// Quill modules matching the main text editor (LaTeX-compatible only)
const SECTION_QUILL_MODULES = {
  toolbar: {
    container: [
      [{ header: [2, 3, 4, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ script: "super" }, { script: "sub" }],
      ["blockquote", "code-block"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["footnote", "citation", "ref"],
      ["table", "image", "formula"],
      ["pagebreak"],
      ["clean"],
    ],
    handlers: {
      footnote: function () {
        const text = prompt("Enter footnote text:");
        if (text) {
          const cursorPosition = this.quill.getSelection()?.index || 0;
          this.quill.insertEmbed(
            cursorPosition,
            "latex-inline",
            { type: "footnote", value: text },
            "user",
          );
          this.quill.setSelection(cursorPosition + 1);
        }
      },
      citation: function () {
        const text = prompt("Enter citation key (e.g. Smith2024):");
        if (text) {
          const cursorPosition = this.quill.getSelection()?.index || 0;
          this.quill.insertEmbed(
            cursorPosition,
            "latex-inline",
            { type: "citation", value: text },
            "user",
          );
          this.quill.setSelection(cursorPosition + 1);
        }
      },
      ref: function () {
        const text = prompt("Enter reference label (e.g. fig:1):");
        if (text) {
          const cursorPosition = this.quill.getSelection()?.index || 0;
          this.quill.insertEmbed(
            cursorPosition,
            "latex-inline",
            { type: "ref", value: text },
            "user",
          );
          this.quill.setSelection(cursorPosition + 1);
        }
      },
      pagebreak: function () {
        const cursorPosition = this.quill.getSelection()?.index || 0;
        this.quill.insertEmbed(cursorPosition, "page-break", true, "user");
        this.quill.setSelection(cursorPosition + 1);
      },
      table: function () {
        // Dispatches to React component
        document.dispatchEvent(new CustomEvent("trigger-insert-table"));
      },
      image: function () {
        document.dispatchEvent(new CustomEvent("trigger-insert-image"));
      },
      formula: function () {
        document.dispatchEvent(
          new CustomEvent("trigger-insert-math", {
            detail: { quill: this.quill },
          }),
        );
      },
    },
  },
  clipboard: {
    matchVisual: false,
  },
};

const SERVER_URL = "http://localhost:5000";

// ==========================================
// 4. DELETE CONFIRMATION MODAL (MATCHING STYLE)
// ==========================================
const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  sectionName,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] backdrop-blur-sm"
      onClick={(e) => {
        e.stopPropagation();
        onClose(e);
      }}
    >
      <div
        className="bg-white rounded-xl p-6 w-96 shadow-2xl border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 mb-3">Delete Section</h3>

        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to delete
          <span className="font-semibold">
            {" "}
            "{sectionName || "Untitled Section"}"
          </span>
          ? This action cannot be undone.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 1. ICONS
// ==========================================
const LoaderIcon = () => (
  <svg
    className="animate-spin"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="#5f6368"
      strokeWidth="4"
      className="opacity-25"
    />
    <path
      fill="#5f6368"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="#5f6368" strokeWidth="2" />
    <path d="M10 8l6 4-6 4V8z" fill="#5f6368" />
  </svg>
);
const ArrowUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M7 14l5-5 5 5H7z" fill="#5f6368" />
  </svg>
);
const ArrowDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M7 10l5 5 5-5H7z" fill="#5f6368" />
  </svg>
);
const GearIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#5f6368"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v6m0 6v6M1 12h6m6 0h6m-2.636-7.364l-4.243 4.243m0 6.364l-4.243 4.243m12.728 0l-4.243-4.243m0-6.364l-4.243-4.243" />
  </svg>
);
const CopyIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#5f6368"
    strokeWidth="2"
  >
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);
const DeleteIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#5f6368"
    strokeWidth="2"
  >
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
  </svg>
);
const PlusIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const CornerDownRightIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 10 4 15 9 20"></polyline>
    <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
  </svg>
);

// Table icon for toolbar
const TableIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#5f6368"
    strokeWidth="2"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </svg>
);

// Image icon for toolbar
const ImageIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#5f6368"
    strokeWidth="2"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

// ==========================================
// 2. MAIN PARENT COMPONENT
// ==========================================
const SectionEditor = ({
  sections,
  onSectionsChange,
  projectId,
  token,
  isOnline,
  sectionToRichText,
  richTextToSection,
  preamble,
  globalHighlightLine,
  onHighlightClear,
  projectFiles = [],
}) => {
  const [focusedSectionId, setFocusedSectionId] = useState(null);
  const [syncHighlight, setSyncHighlight] = useState({
    sectionId: null,
    line: null,
  });

  useEffect(() => {
    if (!sections || sections.length === 0) {
      onSectionsChange([
        {
          id: Date.now(),
          type: "section",
          name: "Introduction",
          content: "",
          children: [],
        },
      ]);
    }
  }, []);

  const handlePdfLineJump = (globalLineNumber) => {
    // Safety guard - if no sections, don't try to process
    if (!sections || sections.length === 0) {
      console.warn("⚠️ SyncTeX: No sections available");
      return;
    }

    // Build a flat list of all sections with their line ranges
    // This is more accurate than cumulative counting during recursion

    const preambleLines = (preamble || "").split("\n").length;
    let currentLine = preambleLines;

    // Flatten all sections and calculate their line ranges
    const flattenSections = (sectionList, result = []) => {
      for (const sec of sectionList) {
        // Skip preamble/postamble
        if (sec.type === "preamble" || sec.type === "postamble") continue;

        // Calculate header/wrapper lines based on section type
        // - Environments (abstract, IEEEkeywords, etc.) have \begin{...} AND \end{...} = 2 lines
        // - Regular sections (\section{...}) = 1 line
        // - Also account for blank line before each section
        let wrapperLines = 1; // Default for \section{...}
        let blankLinesBefore = 1; // Usually 1 blank line before sections

        if (sec.subtype === "env") {
          // \begin{env} + \end{env} = 2 lines
          wrapperLines = 2;
        } else if (sec.subtype === "table") {
          // Tables have more complex structure
          wrapperLines = 2;
        }

        const contentLines = (sec.content || "").split("\n").length;

        const startLine = currentLine + blankLinesBefore;
        const endLine =
          currentLine + blankLinesBefore + wrapperLines + contentLines;

        result.push({
          id: sec.id,
          name: sec.name,
          type: sec.type,
          subtype: sec.subtype,
          startLine,
          endLine,
        });

        currentLine = endLine;

        // Process children BEFORE moving to next sibling
        // (children appear in the LaTeX right after their parent content)
        if (sec.children && sec.children.length > 0) {
          flattenSections(sec.children, result);
        }
      }
      return result;
    };

    const allSections = flattenSections(sections);

    console.log(`🔎 SyncTeX: Looking for line ${globalLineNumber}`);
    console.log(
      `📊 Section line ranges:`,
      allSections.map(
        (s) => `${s.name || s.type}: ${s.startLine}-${s.endLine}`,
      ),
    );

    // Find the section that contains this line
    const matchedSection = allSections.find(
      (sec) =>
        globalLineNumber >= sec.startLine && globalLineNumber <= sec.endLine,
    );

    if (matchedSection) {
      console.log(
        `📍 SyncTeX: Found section "${matchedSection.name}" (lines ${matchedSection.startLine}-${matchedSection.endLine})`,
      );
      setSyncHighlight({
        sectionId: matchedSection.id,
        line: globalLineNumber,
      });
      setFocusedSectionId(matchedSection.id);
    } else {
      // If no exact match, find the closest section before the line
      const closestSection = allSections
        .filter((sec) => sec.startLine <= globalLineNumber)
        .pop();

      if (closestSection) {
        console.log(
          `📍 SyncTeX: Closest section "${closestSection.name}" (line ${globalLineNumber} is after line ${closestSection.endLine})`,
        );
        setSyncHighlight({
          sectionId: closestSection.id,
          line: globalLineNumber,
        });
        setFocusedSectionId(closestSection.id);
      } else {
        console.warn("⚠️ SyncTeX: Could not map line to a specific section");
      }
    }
  };

  useEffect(() => {
    if (globalHighlightLine && sections && sections.length > 0) {
      handlePdfLineJump(globalHighlightLine); // Internal logic to map line -> section

      // Clear the global highlight line so it doesn't re-trigger when sections update
      // creating a "sticky" highlight effect
      if (onHighlightClear) {
        onHighlightClear();
      }
    }
  }, [globalHighlightLine, sections]);

  // --- ROOT HANDLERS ---
  const handleRootUpdate = (updatedSection) => {
    const newSections = sections.map((s) =>
      s.id === updatedSection.id ? updatedSection : s,
    );
    onSectionsChange(newSections);
  };

  const handleRootDelete = (idToDelete) => {
    if (sections.length <= 1) return;
    const newSections = sections.filter((s) => s.id !== idToDelete);
    onSectionsChange(newSections);
  };

  const handleRootMove = (index, direction) => {
    const newSections = [...sections];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    [newSections[index], newSections[targetIndex]] = [
      newSections[targetIndex],
      newSections[index],
    ];
    onSectionsChange(newSections);
  };

  const handleRootDuplicate = (sectionToDuplicate, index) => {
    const duplicated = {
      ...sectionToDuplicate,
      id: Date.now() + Math.random(),
      name: sectionToDuplicate.name + " (Copy)",
    };
    const newSections = [...sections];
    newSections.splice(index + 1, 0, duplicated);
    onSectionsChange(newSections);
  };

  const handleRootAddAfter = (index, type = "section") => {
    let newSection;

    if (type === "table") {
      newSection = {
        id: Date.now() + Math.random(),
        type: "section",
        subtype: "table",
        name: "New Table",
        content: `\\begin{table}[h]\n\\centering\n\\begin{tabular}{|c|c|}\n\\hline\n 1 & 2 \\\\ \\hline\n 3 & 4 \\\\ \\hline\n\\end{tabular}\n\\end{table}`,
        children: [],
      };
    } else {
      // Standard Section
      newSection = {
        id: Date.now() + Math.random(),
        type: "section",
        name: "",
        content: "",
        children: [],
      };
    }

    const newSections = [...sections];
    newSections.splice(index + 1, 0, newSection);
    onSectionsChange(newSections);
  };

  const addRootSectionEnd = (e) => {
    e.stopPropagation();
    const newSection = {
      id: Date.now() + Math.random(),
      type: "section",
      name: "",
      content: "",
      children: [],
    };
    onSectionsChange([...sections, newSection]);
    setFocusedSectionId(newSection.id);
  };

  return (
    <div
      className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-4 py-5 bg-gray-100 min-h-full cursor-default"
      onClick={() => setFocusedSectionId(null)}
    >
      <div className="space-y-6">
        {sections &&
          sections.map((section, index) => {
            // HIDE PREAMBLE AND POSTAMBLE FROM UI
            if (section.type === "preamble" || section.type === "postamble")
              return null;

            return (
              <RecursiveSection
                key={section.id}
                section={section}
                index={index}
                level={0}
                isLast={index === sections.length - 1}
                isFirst={index === 0}
                totalSections={sections.length}
                // Focus Props
                focusedSectionId={focusedSectionId}
                setFocusedSectionId={setFocusedSectionId}
                // Handlers
                onUpdate={handleRootUpdate}
                onDelete={() => handleRootDelete(section.id)}
                onMoveUp={() => handleRootMove(index, -1)}
                onMoveDown={() => handleRootMove(index, 1)}
                onDuplicate={() => handleRootDuplicate(section, index)}
                onAddAfter={(type) => handleRootAddAfter(index, type)}
                // Props
                projectId={projectId}
                token={token}
                isOnline={isOnline}
                preamble={preamble}
                sectionToRichText={sectionToRichText}
                richTextToSection={richTextToSection}
                syncHighlight={syncHighlight}
                projectFiles={projectFiles}
                onHighlightClear={() =>
                  setSyncHighlight({ sectionId: null, line: null })
                }
              />
            );
          })}

        <button
          onClick={addRootSectionEnd}
          className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-white transition-all flex items-center justify-center gap-2 font-semibold"
        >
          <PlusIcon /> Add New Main Section
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 3. RECURSIVE CHILD COMPONENT
// ==========================================
const RecursiveSection = ({
  section,
  index,
  level,
  isFirst,
  isLast,
  totalSections,
  focusedSectionId,
  setFocusedSectionId,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onAddAfter,
  projectId,
  token,
  isOnline,
  preamble,
  sectionToRichText,
  richTextToSection,
  syncHighlight,
  onHighlightClear,
  projectFiles = [],
}) => {
  const isFocused = focusedSectionId === section.id;
  const [isEditingName, setIsEditingName] = useState(false);
  const [isVisualMode, setIsVisualMode] = useState(false);
  const [richTextValue, setRichTextValue] = useState("");
  const updateTimeoutRef = useRef(null);

  const [previewUrl, setPreviewUrl] = useState(null);

  // Custom editor styles for section editor (matching main editor)
  const sectionEditorStyles = `
    .section-quill .ql-editor {
      padding: 20px 30px !important;
      font-family: 'Inter', system-ui, sans-serif !important;
      line-height: 1.6 !important;
    }
    .section-quill .ql-editor p {
      margin-bottom: 1.2em !important;
      color: #374151;
    }
    .section-quill .ql-editor h1, .section-quill .ql-editor h2, .section-quill .ql-editor h3 {
      margin-top: 1.2em !important;
      margin-bottom: 0.6em !important;
      padding-bottom: 0.2em !important;
      border-bottom: 1px solid #e5e7eb !important;
      color: #111827;
      font-weight: 600 !important;
    }
    .section-quill .ql-editor h3 { border-bottom: none !important; }
  `;
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Modal states for table and image insertion
  const [activeTab, setActiveTab] = useState("content");
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTableData, setEditingTableData] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [editingImageData, setEditingImageData] = useState(null);

  const sanitizedId = useMemo(
    () => String(section.id).replace(/\./g, "-"),
    [section.id],
  );

  const sectionQuillModules = useMemo(
    () => ({
      toolbar: {
        container: `#richtext-toolbar-${sanitizedId}`,
        handlers: getRichTextHandlers(),
      },
      clipboard: {
        matchVisual: false,
      },
    }),
    [sanitizedId],
  );

  // Ref for Monaco editor to insert at cursor
  const monacoRef = useRef(null);

  const isHighlightedSection = syncHighlight?.sectionId === section.id;
  const lineToHighlight = isHighlightedSection ? syncHighlight.line : null;

  // Ref for scrolling section into view
  const sectionRef = useRef(null);

  useEffect(() => {
    if (isHighlightedSection) {
      // Scroll section into view when highlighted by SyncTeX
      if (sectionRef.current) {
        sectionRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        console.log(
          `📍 SyncTeX: Scrolling to section "${section.name || "Untitled"}"`,
        );
      }
    }
  }, [isHighlightedSection]);

  const handleDeleteConfirm = (e) => {
    e.stopPropagation();
    onDelete();
    setShowDeleteModal(false);
  };

  // STORE HIDDEN PARTS (Preamble/Postamble) HERE
  const hiddenParts = React.useRef({ preamble: "", postamble: "" });

  useEffect(() => {
    if (isFocused && !section.name) {
      setIsEditingName(true);
    }
  }, [isFocused, section.name]);

  // Removed RichText conversion logic - Monaco only now

  // handleAddTable removed - tables are now inserted via toolbar modal

  const handleRunSection = async (e) => {
    e.stopPropagation();

    if (!section.content || section.content.trim() === "") return;

    setIsLoadingPreview(true);
    setPreviewError(null);
    setPreviewUrl(null);

    try {
      // 1. RECONSTRUCT THE WRAPPER
      // We take the clean content and wrap it back in its LaTeX command
      // so the compiler knows how to render it (Bold title, italic keywords, etc.)

      let contentToCompile = section.content;

      if (section.subtype === "env") {
        // === ENVIRONMENT CASE (Abstract, Keywords) ===
        const tag = section.envTag || section.name.toLowerCase(); // e.g., "IEEEkeywords"

        // Add the \begin{tag}
        // We prepend it to the content
        contentToCompile = `\\begin{${tag}}\n${contentToCompile}`;

        // Check if \end{tag} is missing (it usually is in the visual editor)
        // Only append if it's not already there to avoid double ending
        if (!contentToCompile.includes(`\\end{${tag}}`)) {
          contentToCompile = `${contentToCompile}\n\\end{${tag}}`;
        }
      } else {
        // === STANDARD SECTION CASE (\section, \subsection) ===
        // If we just compile the text, it looks like a paragraph.
        // We want to see the Heading Style too.

        if (section.subtype === "starred") {
          contentToCompile = `\\${section.type}*{${section.name}}\n${contentToCompile}`;
        } else {
          contentToCompile = `\\${section.type}{${section.name}}\n${contentToCompile}`;
        }
      }

      // 2. SEND TO SERVER
      const response = await axios.post(`${SERVER_URL}/api/latex/compile`, {
        latex: contentToCompile, // <--- Send the wrapped content
        preamble: preamble,
        format: "image",
        type: "section",
        fileName: `preview_${section.id}`,
        isTemp: true,
      });

      if (response.data.success) {
        setPreviewUrl(`${SERVER_URL}${response.data.pdfUrl}?t=${Date.now()}`);
      } else {
        console.error("Server Compilation Failed:", response.data);
        const serverMsg = response.data.error || "Compilation failed";
        setPreviewError(serverMsg);
      }
    } catch (error) {
      console.error("Preview error:", error);
      const errMsg = error.response?.data?.error || "Error generating preview";
      setPreviewError(errMsg);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleClosePreview = (e) => {
    e.stopPropagation();
    setPreviewUrl(null);
    setPreviewError(null);
  };

  // ... (Rest of your component handlers: handleChildUpdate, addChild, rendering, etc. remain EXACTLY THE SAME)
  // Just copy the rest of RecursiveSection from the previous working version.

  const handleChildUpdate = (childId, updatedChild) => {
    const newChildren = section.children.map((c) =>
      c.id === childId ? updatedChild : c,
    );
    onUpdate({ ...section, children: newChildren });
  };

  const handleChildDelete = (childId) => {
    const newChildren = section.children.filter((c) => c.id !== childId);
    onUpdate({ ...section, children: newChildren });
  };

  const handleChildMove = (childIndex, direction) => {
    const newChildren = [...section.children];
    const targetIndex = childIndex + direction;
    if (targetIndex < 0 || targetIndex >= newChildren.length) return;
    [newChildren[childIndex], newChildren[targetIndex]] = [
      newChildren[targetIndex],
      newChildren[childIndex],
    ];
    onUpdate({ ...section, children: newChildren });
  };

  const handleChildDuplicate = (childToDuplicate, childIndex) => {
    const duplicated = {
      ...childToDuplicate,
      id: Date.now() + Math.random(),
      name: childToDuplicate.name + " (Copy)",
    };
    const newChildren = [...section.children];
    newChildren.splice(childIndex + 1, 0, duplicated);
    onUpdate({ ...section, children: newChildren });
  };

  const handleChildAddAfter = (
    childIndex,
    siblingType,
    specificType = null,
  ) => {
    let newSibling;

    if (specificType === "table") {
      newSibling = {
        id: Date.now() + Math.random(),
        type: "section", // Tables sit at the same hierarchy as sections usually
        subtype: "table",
        name: "New Table",
        content: `\\begin{table}[h]\n\\centering\n\\begin{tabular}{|c|c|}\n\\hline\n 1 & 2 \\\\ \\hline\n 3 & 4 \\\\ \\hline\n\\end{tabular}\n\\end{table}`,
        children: [],
      };
    } else {
      newSibling = {
        id: Date.now() + Math.random(),
        type: siblingType,
        name: "",
        content: "",
        children: [],
      };
    }

    const newChildren = [...section.children];
    newChildren.splice(childIndex + 1, 0, newSibling);
    onUpdate({ ...section, children: newChildren });
    setFocusedSectionId(newSibling.id);
  };

  const addChild = () => {
    let nextType = "subsection";
    if (level === 1) nextType = "subsubsection";
    if (level >= 2) return;

    const newChild = {
      id: Date.now() + Math.random(),
      type: nextType,
      name: "",
      content: "",
      children: [],
    };
    const currentChildren = section.children || [];
    onUpdate({ ...section, children: [...currentChildren, newChild] });
    setFocusedSectionId(newChild.id);
  };

  const getSiblingLabel = () => {
    if (level === 0) return "Section Below";
    if (level === 1) return "Subsection Below";
    return "Sub-subsection Below";
  };

  const getChildLabel = () => {
    if (level === 0) return "Subsection";
    return "Sub-subsection";
  };

  const cardBorder = isFocused ? "border-gray-400" : "border-gray-200";

  // Visual feedback for SyncTeX highlight
  const highlightBorder = isHighlightedSection
    ? "ring-2 ring-yellow-400 ring-offset-2"
    : "";

  return (
    <div
      ref={sectionRef}
      id={`section-${section.id}`}
      className={`relative mb-4 transition-all duration-200 ${highlightBorder}`}
    >
      {isFocused && (
        <div className="absolute -top-5 right-8 flex gap-0.5 bg-gray-50 rounded border border-gray-300 p-1 shadow-md z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={isFirst}
            className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 ${
              isFirst ? "opacity-30" : ""
            }`}
            title="Move Up"
          >
            <ArrowUpIcon />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={isLast}
            className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 ${
              isLast ? "opacity-30" : ""
            }`}
            title="Move Down"
          >
            <ArrowDownIcon />
          </button>
          {/* <button
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 text-xs font-semibold text-gray-600"
            title="AI Assistant"
          >
            AI
          </button> */}
          {/* Table Insert Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingTableData(null);
              setShowTableModal(true);
            }}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-blue-100 hover:text-blue-600"
            title="Insert Table"
          >
            <TableIcon />
          </button>
          {/* Image Insert Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingImageData(null);
              setShowImageModal(true);
            }}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-green-100 hover:text-green-600"
            title="Insert Image"
          >
            <ImageIcon />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200"
            title="Duplicate"
          >
            <CopyIcon />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteModal(true);
            }}
            disabled={totalSections <= 1 && level === 0}
            className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 ${
              totalSections <= 1 && level === 0 ? "opacity-30" : ""
            }`}
            title="Delete"
          >
            <DeleteIcon />
          </button>
        </div>
      )}

      <div
        className={`relative flex rounded border transition-all duration-150 bg-white min-h-[120px] ${cardBorder}`}
        onClick={(e) => {
          e.stopPropagation();
          setFocusedSectionId(section.id);
        }}
      >
        <div className="w-8 bg-gray-50 border-r border-gray-200 flex flex-col items-center pt-2 flex-shrink-0 gap-2">
          <button
            className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded transition-colors"
            title="Compile Section Preview"
            onClick={handleRunSection}
            disabled={isLoadingPreview}
          >
            {isLoadingPreview ? <LoaderIcon /> : <PlayIcon />}
          </button>
          <span className="text-[10px] uppercase font-bold text-gray-400 [writing-mode:vertical-rl] rotate-180 mt-2 tracking-widest">
            {section.type}
          </span>
        </div>

        <div className="flex-1 p-3 sm:p-4 relative">
          {(isEditingName || (!section.name && isFocused)) && (
            <div className="mb-3 p-3 bg-gray-50 rounded border border-gray-300">
              <div className="flex flex-col gap-3">
                {/* Section Name Input */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Section Name
                  </label>
                  <input
                    value={section.name}
                    onChange={(e) =>
                      onUpdate({ ...section, name: e.target.value })
                    }
                    placeholder="Unnamed Section"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded outline-none focus:border-gray-400"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") {
                        setIsEditingName(false);
                      }
                    }}
                  />
                </div>

                {/* Numbered/Unnumbered Toggle - Only for section/subsection/subsubsection */}
                {["section", "subsection", "subsubsection"].includes(
                  section.type,
                ) && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-600">
                      Numbering:
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate({ ...section, subtype: "standard" });
                        }}
                        className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                          section.subtype !== "starred"
                            ? "bg-black text-white"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                      >
                        Numbered
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate({ ...section, subtype: "starred" });
                        }}
                        className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                          section.subtype === "starred"
                            ? "bg-black text-white"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                      >
                        Unnumbered
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Done button */}
              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingName(false);
                  }}
                  className="px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-black"
                >
                  Done
                </button>
              </div>
            </div>
          )}
          {section.name && !isEditingName && (
            <div className="mb-2 text-sm font-semibold text-gray-700 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span>{section.name}</span>
                {section.subtype === "starred" && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 rounded text-gray-500">
                    unnumbered
                  </span>
                )}
                {((section.source === "file" && section.fileName) ||
                  section.contentFileName) && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-blue-600 flex items-center gap-1"
                    title={`Sourced from ${section.fileName || section.contentFileName}`}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    {section.fileName || section.contentFileName}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingName(true);
                  }}
                  className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Edit section name"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>

              {/* Visual/Code Toggle Switch */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isVisualMode) {
                    // Switching TO visual: convert LaTeX → Rich Text
                    const html = sectionToRichText
                      ? sectionToRichText(section)
                      : latexUtility.latexToRichText(section.content || "");
                    setRichTextValue(html);
                  } else {
                    // Switching TO code: convert Rich Text → LaTeX
                    const latex = richTextToSection
                      ? richTextToSection(richTextValue)
                      : latexUtility.richTextToLatex(richTextValue);
                    onUpdate({ ...section, content: latex });
                  }
                  setIsVisualMode(!isVisualMode);
                }}
                className="flex items-center bg-gray-100 rounded-full p-0.5 border border-gray-200 cursor-pointer w-24 relative h-6 transition-all"
                title={
                  isVisualMode ? "Switch to Code View" : "Switch to Visual View"
                }
              >
                <div
                  className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-white rounded-full shadow-sm transition-all duration-200 ${
                    isVisualMode ? "left-[calc(50%)]" : "left-0.5"
                  }`}
                />
                <span
                  className={`flex-1 text-[10px] font-semibold text-center z-10 transition-colors ${
                    !isVisualMode ? "text-gray-800" : "text-gray-400"
                  }`}
                >
                  Code
                </span>
                <span
                  className={`flex-1 text-[10px] font-semibold text-center z-10 transition-colors ${
                    isVisualMode ? "text-gray-800" : "text-gray-400"
                  }`}
                >
                  Visual
                </span>
              </button>
            </div>
          )}

          {/* Removed Visual / Code mode toggle from here - moved up */}

          <div className="relative group/resize">
            <style>{sectionEditorStyles}</style>

            {/* Resizable Container */}
            <div
              className="resize-y overflow-hidden border border-gray-200 rounded w-full bg-white relative flex flex-col h-[300px] min-h-[300px]"
              onClick={(e) => e.stopPropagation()}
            >
              {isVisualMode ? (
                /* Visual / Rich Text View */
                <div className="section-quill flex-1 flex flex-col h-full overflow-hidden">
                  <RichTextToolbar id={`richtext-toolbar-${sanitizedId}`} />
                  <ReactQuill
                    theme="snow"
                    value={richTextValue}
                    onChange={(content, delta, source) => {
                      if (source === "user") {
                        setRichTextValue(content);
                        // Live-sync back to LaTeX (Debounced)
                        if (updateTimeoutRef.current)
                          clearTimeout(updateTimeoutRef.current);
                        updateTimeoutRef.current = setTimeout(() => {
                          const latex = richTextToSection
                            ? richTextToSection(content)
                            : latexUtility.richTextToLatex(content);
                          onUpdate({ ...section, content: latex });
                        }, 500);
                      }
                    }}
                    modules={sectionQuillModules}
                    className="h-full flex flex-col flex-1 min-h-0"
                  />
                </div>
              ) : (
                /* Code View (Monaco) */
                <div className="flex-1 h-full w-full overflow-hidden relative">
                  <MonacoEditorPanel
                    monacoEditorRef={monacoRef}
                    value={section.content || ""}
                    handleLatexChange={(val) => {
                      // Use a debounced update for the parent state
                      // to avoid fighting with the undo buffer or causing rapid re-renders
                      if (updateTimeoutRef.current)
                        clearTimeout(updateTimeoutRef.current);
                      updateTimeoutRef.current = setTimeout(() => {
                        onUpdate({ ...section, content: val });
                      }, 400);
                    }}
                    highlightLine={lineToHighlight}
                    onHighlightClear={onHighlightClear}
                    projectId={projectId}
                    token={token}
                    isOnline={isOnline}
                    onOpenTableModal={() => {
                      setEditingTableData(null);
                      setShowTableModal(true);
                    }}
                    onOpenImageModal={() => {
                      setEditingImageData(null);
                      setShowImageModal(true);
                    }}
                    onEditTable={(content) => {
                      setEditingTableData(content);
                      setShowTableModal(true);
                    }}
                    onEditImage={(content) => {
                      setEditingImageData(content);
                      setShowImageModal(true);
                    }}
                  />
                </div>
              )}

              {/* Resize Handle Overlay */}
              <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 pointer-events-none group-hover/resize:pointer-events-auto z-10">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="opacity-40 group-hover/resize:opacity-100 transition-opacity"
                >
                  <path
                    d="M8 2L2 8"
                    stroke="#718096"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8 6L6 8"
                    stroke="#718096"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>
          {(previewUrl || previewError) && (
            <div className="mt-4 p-4 border border-dashed border-gray-300 rounded bg-gray-50 relative group">
              <div className="flex justify-between items-center mb-2 border-b border-gray-200 pb-1">
                <span className="text-xs font-bold text-gray-500 uppercase">
                  Compiled Preview
                </span>
                <button
                  onClick={handleClosePreview}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <CloseIcon />
                </button>
              </div>

              {previewUrl && (
                <div className="flex justify-center bg-white p-2 border border-gray-100 shadow-sm">
                  <img
                    src={previewUrl}
                    alt="Section Preview"
                    className="max-w-full h-auto object-contain"
                    style={{ maxHeight: "400px" }}
                  />
                </div>
              )}

              {previewError && (
                <div className="text-xs text-red-500 font-mono bg-red-50 p-2 rounded">
                  {previewError}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className={`flex gap-2 pt-2 pb-2 justify-center transition-all duration-200 overflow-hidden ${
          isFocused
            ? "opacity-100 max-h-16 pointer-events-auto" // <--- ADD pointer-events-auto
            : "opacity-0 max-h-0 pointer-events-none" // <--- ADD pointer-events-none
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddAfter();
          }}
          className="px-4 py-1.5 bg-transparent border border-gray-300 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all duration-150 outline-none flex items-center gap-1"
        >
          <PlusIcon /> {getSiblingLabel()}
        </button>
        {/* Removed Add Table pill button - Table is now in toolbar */}

        {level < 2 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              addChild();
            }}
            className="px-4 py-1.5 bg-transparent border border-gray-300 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all duration-150 outline-none flex items-center gap-1"
          >
            <CornerDownRightIcon style={{ transform: "scaleX(-1)" }} />{" "}
            {getChildLabel()}
          </button>
        )}
      </div>
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        sectionName={section.name}
        onClose={(e) => {
          e && e.stopPropagation();
          setShowDeleteModal(false);
        }}
        onConfirm={handleDeleteConfirm}
      />

      {/* Table Designer Modal */}
      <TableDesignerModal
        isOpen={showTableModal}
        onClose={() => {
          setShowTableModal(false);
          setEditingTableData(null);
        }}
        initialData={editingTableData}
        onInsert={(latex) => {
          // Insert at cursor position in Monaco editor or append to content
          if (monacoRef.current && monacoRef.current.insertAtCursor) {
            monacoRef.current.insertAtCursor(latex);
          } else {
            // Fallback: append to section content
            const newContent = section.content + "\n\n" + latex;
            onUpdate({ ...section, content: newContent });
          }
        }}
      />

      {/* Image Insert Modal */}
      <ImageInsertModal
        isOpen={showImageModal}
        onClose={() => {
          setShowImageModal(false);
          setEditingImageData(null);
        }}
        initialData={editingImageData}
        projectFiles={projectFiles}
        onInsert={(latex) => {
          // Insert at cursor position in Monaco editor or append to content
          if (monacoRef.current && monacoRef.current.insertAtCursor) {
            monacoRef.current.insertAtCursor(latex);
          } else {
            // Fallback: append to section content
            const newContent = section.content + "\n\n" + latex;
            onUpdate({ ...section, content: newContent });
          }
        }}
      />

      {section.children && section.children.length > 0 && (
        <div className="mt-2 ml-4 pl-4 border-l-2 border-gray-200">
          {section.children.map((child, i) => (
            <RecursiveSection
              key={child.id}
              section={child}
              index={i}
              level={level + 1}
              isFirst={i === 0}
              isLast={i === section.children.length - 1}
              totalSections={section.children.length}
              focusedSectionId={focusedSectionId}
              setFocusedSectionId={setFocusedSectionId}
              onUpdate={(updated) => handleChildUpdate(child.id, updated)}
              onDelete={() => handleChildDelete(child.id)}
              onMoveUp={() => handleChildMove(i, -1)}
              onMoveDown={() => handleChildMove(i, 1)}
              onDuplicate={() => handleChildDuplicate(child, i)}
              onAddAfter={(specificType) =>
                handleChildAddAfter(i, child.type, specificType)
              }
              projectId={projectId}
              token={token}
              isOnline={isOnline}
              sectionToRichText={sectionToRichText}
              richTextToSection={richTextToSection}
              preamble={preamble}
              projectFiles={projectFiles}
              syncHighlight={syncHighlight}
              onHighlightClear={onHighlightClear}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SectionEditor;
