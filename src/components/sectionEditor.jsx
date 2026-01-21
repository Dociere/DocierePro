import { useSettings } from "../context/useSettings";

// ==========================================
// 1. ICONS
// ==========================================
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M10 8l6 4-6 4V8z" fill="currentColor" />
  </svg>
);
const ArrowUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M7 14l5-5 5 5H7z" fill="currentColor" />
  </svg>
);
const ArrowDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
  </svg>
);
const GearIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
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
    stroke="currentColor"
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
    stroke="currentColor"
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

// ==========================================
// 2. MAIN PARENT COMPONENT
// ==========================================
const SectionEditor = ({
  sections,
  onSectionsChange,
  projectId,
  token,
  isOnline,
}) => {
  const { settings } = useSettings();
  const isDark = settings.appearance.mode === "dark";
  const [focusedSectionId, setFocusedSectionId] = useState(null);

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

  // --- ROOT HANDLERS ---
  const handleRootUpdate = (updatedSection) => {
    const newSections = sections.map((s) =>
      s.id === updatedSection.id ? updatedSection : s
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

  const handleRootAddAfter = (index) => {
    const newSection = {
      id: Date.now() + Math.random(),
      type: "section",
      name: "",
      content: "",
      children: [],
    };
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
      className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 py-5 min-h-full cursor-default transition-colors duration-300 ${isDark ? "bg-[#121212]" : "bg-gray-100"
        }`}
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
                onAddAfter={() => handleRootAddAfter(index)}
                // Props
                projectId={projectId}
                token={token}
                isOnline={isOnline}
              />
            );
          })}

        <button
          onClick={addRootSectionEnd}
          className={`w-full py-4 border-2 border-dashed rounded-lg transition-all flex items-center justify-center gap-2 font-semibold ${isDark
              ? "border-[#333] text-gray-500 hover:border-blue-500 hover:text-blue-400 hover:bg-[#1a1a1a]"
              : "border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-white"
            }`}
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
}) => {
  const { settings } = useSettings();
  const isDark = settings.appearance.mode === "dark";
  const isFocused = focusedSectionId === section.id;
  const [isEditingName, setIsEditingName] = useState(false);
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [richTextContent, setRichTextContent] = useState("");

  // STORE HIDDEN PARTS (Preamble/Postamble) HERE
  const hiddenParts = React.useRef({ preamble: "", postamble: "" });

  useEffect(() => {
    if (!isCodeMode) {
      // 1. SPLIT CONTENT
      const { preamble, body, postamble } = latexUtility.splitLatex(
        section.content
      );

      // 2. SAVE HIDDEN PARTS TO REF
      hiddenParts.current = { preamble, postamble };

      // 3. CONVERT ONLY BODY TO HTML
      const html = latexUtility.latexToRichText(body);
      setRichTextContent(html);
    }
  }, [section.content, isCodeMode]);

  const handleRichTextChange = (html) => {
    setRichTextContent(html);

    // 1. CONVERT HTML TO BODY LATEX
    const bodyLatex = latexUtility.richTextToLatex(html);

    // 2. RECOMBINE WITH HIDDEN PARTS
    const fullLatex =
      hiddenParts.current.preamble + bodyLatex + hiddenParts.current.postamble;

    onUpdate({ ...section, content: fullLatex });
  };

  // ... (Rest of your component handlers: handleChildUpdate, addChild, rendering, etc. remain EXACTLY THE SAME)
  // Just copy the rest of RecursiveSection from the previous working version.

  const handleChildUpdate = (childId, updatedChild) => {
    const newChildren = section.children.map((c) =>
      c.id === childId ? updatedChild : c
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

  const handleChildAddAfter = (childIndex, siblingType) => {
    const newSibling = {
      id: Date.now() + Math.random(),
      type: siblingType,
      name: "",
      content: "",
      children: [],
    };
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

  const cardBorder = isFocused
    ? (isDark ? "border-[#444]" : "border-gray-400")
    : (isDark ? "border-[#2d2d2d]" : "border-gray-200");

  return (
    <div className={`relative mb-4 transition-all duration-200`}>
      {isFocused && (
        <div className={`absolute -top-5 right-8 flex gap-0.5 rounded border p-1 shadow-md z-20 transition-all duration-300 ${isDark ? "bg-[#2d2d2d] border-[#444] text-gray-400" : "bg-gray-50 border-gray-300 text-gray-600"
          }`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={isFirst}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${isDark ? "hover:bg-[#3d3d3d]" : "hover:bg-gray-200"
              } ${isFirst ? "opacity-30" : ""}`}
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
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${isDark ? "hover:bg-[#3d3d3d]" : "hover:bg-gray-200"
              } ${isLast ? "opacity-30" : ""}`}
            title="Move Down"
          >
            <ArrowDownIcon />
          </button>
          <button
            className={`w-8 h-8 flex items-center justify-center rounded text-xs font-semibold transition-colors ${isDark ? "hover:bg-[#3d3d3d] text-gray-400" : "hover:bg-gray-200 text-gray-600"
              }`}
            title="AI Assistant"
          >
            AI
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingName(!isEditingName);
            }}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${isDark ? "hover:bg-[#3d3d3d]" : "hover:bg-gray-200"
              }`}
            title="Edit Name"
          >
            <GearIcon />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${isDark ? "hover:bg-[#3d3d3d]" : "hover:bg-gray-200"
              }`}
            title="Duplicate"
          >
            <CopyIcon />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={totalSections <= 1 && level === 0}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${isDark ? "hover:bg-[#3d3d3d] hover:text-red-400" : "hover:bg-gray-200 hover:text-red-600"
              } ${totalSections <= 1 && level === 0 ? "opacity-30" : ""}`}
            title="Delete"
          >
            <DeleteIcon />
          </button>
        </div>
      )}

      <div
        className={`relative flex rounded border transition-all duration-300 min-h-[120px] ${cardBorder} ${isDark ? "bg-[#1a1a1a]" : "bg-white"
          }`}
        onClick={(e) => {
          e.stopPropagation();
          setFocusedSectionId(section.id);
        }}
      >
        <div className={`w-8 border-r flex flex-col items-center pt-2 flex-shrink-0 gap-2 transition-colors duration-300 ${isDark ? "bg-[#121212] border-[#333] text-gray-500" : "bg-gray-50 border-gray-200 text-gray-400"
          }`}>
          <button
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${isDark ? "hover:bg-[#2d2d2d] hover:text-blue-400" : "hover:bg-gray-200 hover:text-gray-600"
              }`}
            title="Run"
          >
            <PlayIcon />
          </button>
          <span className="text-[10px] uppercase font-bold [writing-mode:vertical-rl] rotate-180 mt-2 tracking-widest">
            {section.type}
          </span>
        </div>

        <div className="flex-1 p-3 sm:p-4 relative">
          {(isEditingName || (!section.name && isFocused)) && (
            <div className={`mb-3 p-2 rounded border transition-colors duration-300 ${isDark ? "bg-[#121212] border-[#333]" : "bg-gray-50 border-gray-300"
              }`}>
              <label className={`block text-xs font-semibold mb-1 transition-colors ${isDark ? "text-gray-500" : "text-gray-600"
                }`}>
                Section Name
              </label>
              <input
                value={section.name}
                onChange={(e) => onUpdate({ ...section, name: e.target.value })}
                placeholder="Unnamed Section"
                className={`w-full px-2 py-1 text-sm border rounded outline-none transition-all ${isDark
                    ? "bg-[#1a1a1a] border-[#333] text-white focus:border-blue-500"
                    : "bg-white border-gray-300 focus:border-gray-400"
                  }`}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {section.name && !isEditingName && (
            <div className={`mb-2 text-sm font-semibold flex justify-between items-center transition-colors duration-300 ${isDark ? "text-gray-300" : "text-gray-700"
              }`}>
              <span>{section.name}</span>
              {isFocused && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCodeMode(!isCodeMode);
                  }}
                  className={`text-[10px] hover:underline cursor-pointer transition-colors ${isDark ? "text-blue-400" : "text-blue-500"
                    }`}
                >
                  {isCodeMode ? "Switch to Visual" : "Switch to LaTeX Code"}
                </button>
              )}
            </div>
          )}

          <div className="min-h-[80px]">
            {isCodeMode ? (
              <div
                className={`h-64 border rounded transition-colors duration-300 ${isDark ? "border-[#333]" : "border-gray-200"
                  }`}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <MonacoEditorPanel
                  value={section.content}
                  handleLatexChange={(val) =>
                    onUpdate({ ...section, content: val })
                  }
                  projectId={projectId}
                  token={token}
                  isOnline={isOnline}
                />
              </div>
            ) : (
              <div onKeyDown={(e) => e.stopPropagation()}>
                <RichTextEditorPanel
                  value={richTextContent}
                  onChange={handleRichTextChange}
                  quillModules={{
                    toolbar: [
                      ["bold", "italic", "underline"],
                      [{ list: "ordered" }, { list: "bullet" }],
                      ["code-block"],
                    ],
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={`flex gap-2 pt-2 pb-2 justify-center transition-all duration-200 overflow-hidden ${isFocused ? "opacity-100 max-h-16" : "opacity-0 max-h-0"
          }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddAfter();
          }}
          className={`px-4 py-1.5 bg-transparent border rounded-full text-sm font-medium transition-all duration-150 outline-none flex items-center gap-1 ${isDark
              ? "border-[#333] text-gray-400 hover:bg-[#2d2d2d] hover:text-white"
              : "border-gray-300 text-gray-600 hover:bg-gray-100"
            }`}
        >
          <PlusIcon /> {getSiblingLabel()}
        </button>

        {level < 2 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              addChild();
            }}
            className={`px-4 py-1.5 bg-transparent border rounded-full text-sm font-medium transition-all duration-150 outline-none flex items-center gap-1 ${isDark
                ? "border-[#333] text-gray-400 hover:bg-[#2d2d2d] hover:text-white"
                : "border-gray-300 text-gray-600 hover:bg-gray-100"
              }`}
          >
            <CornerDownRightIcon style={{ transform: "scaleX(-1)" }} />{" "}
            {getChildLabel()}
          </button>
        )}
      </div>

      {section.children && section.children.length > 0 && (
        <div className={`mt-2 ml-4 pl-4 border-l-2 transition-colors duration-300 ${isDark ? "border-[#333]" : "border-gray-200"}`}>
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
              onAddAfter={() => handleChildAddAfter(i, child.type)}
              projectId={projectId}
              token={token}
              isOnline={isOnline}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SectionEditor;
