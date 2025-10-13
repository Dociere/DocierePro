import React, { useState, useRef, useEffect } from "react";

const SectionEditor = () => {
  const [sections, setSections] = useState([
    { id: Date.now(), type: "text", content: "" },
  ]);
  const [focusedSectionId, setFocusedSectionId] = useState(null);

  const addSectionAfter = (currentId, type) => {
    const currentIndex = sections.findIndex((s) => s.id === currentId);
    const newSection = {
      id: Date.now(),
      type: type,
      content: "",
    };

    const newSections = [...sections];
    newSections.splice(currentIndex + 1, 0, newSection);
    setSections(newSections);

    setTimeout(() => setFocusedSectionId(newSection.id), 50);
  };

  const deleteSection = (id) => {
    if (sections.length === 1) return;
    setSections(sections.filter((section) => section.id !== id));
    setFocusedSectionId(null);
  };

  const moveSectionUp = (index) => {
    if (index === 0) return;
    const newSections = [...sections];
    [newSections[index - 1], newSections[index]] = [
      newSections[index],
      newSections[index - 1],
    ];
    setSections(newSections);
  };

  const moveSectionDown = (index) => {
    if (index === sections.length - 1) return;
    const newSections = [...sections];
    [newSections[index], newSections[index + 1]] = [
      newSections[index + 1],
      newSections[index],
    ];
    setSections(newSections);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 py-5 bg-gray-100 min-h-full">
      {sections.map((section, index) => (
        <Section
          key={section.id}
          section={section}
          index={index}
          totalSections={sections.length}
          isFocused={focusedSectionId === section.id}
          onFocus={() => setFocusedSectionId(section.id)}
          onBlur={() => setFocusedSectionId(null)}
          onDelete={() => deleteSection(section.id)}
          onMoveUp={() => moveSectionUp(index)}
          onMoveDown={() => moveSectionDown(index)}
          onAddSection={(type) => addSectionAfter(section.id, type)}
        />
      ))}
    </div>
  );
};

const Section = ({
  section,
  index,
  totalSections,
  isFocused,
  onFocus,
  onBlur,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddSection,
}) => {
  const sectionRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isFocused) {
        textareaRef.current?.blur();
        onBlur();
      }
    };

    if (isFocused) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFocused, onBlur]);

  useEffect(() => {
    if (isFocused && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isFocused]);

  return (
    <div className="relative mb-4">
      {/* Top Toolbar - Half Outside (cutting out on top edge) */}
      {isFocused && (
        <div className="absolute -top-5 right-8 flex gap-0.5 bg-gray-50 rounded border border-gray-300 p-1 shadow-md z-10">
          {/* Move Up */}
          <button
            className={`w-8 h-8 flex items-center justify-center bg-transparent border-none rounded hover:bg-gray-200 transition-colors duration-150 outline-none ${
              index === 0 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={index === 0}
            title="Move Up"
          >
            <ArrowUpIcon />
          </button>

          {/* Move Down */}
          <button
            className={`w-8 h-8 flex items-center justify-center bg-transparent border-none rounded hover:bg-gray-200 transition-colors duration-150 outline-none ${
              index === totalSections - 1
                ? "opacity-30 cursor-not-allowed"
                : "cursor-pointer"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={index === totalSections - 1}
            title="Move Down"
          >
            <ArrowDownIcon />
          </button>

          {/* AI Button */}
          <button
            className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded hover:bg-gray-200 transition-colors duration-150 outline-none text-xs font-semibold text-gray-600"
            title="AI Assistant"
          >
            AI
          </button>

          {/* Copy Button */}
          <button
            className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded hover:bg-gray-200 transition-colors duration-150 outline-none"
            title="Duplicate"
          >
            <CopyIcon />
          </button>

          {/* Delete Button */}
          <button
            className={`w-8 h-8 flex items-center justify-center bg-transparent border-none rounded hover:bg-gray-200 transition-colors duration-150 outline-none ${
              totalSections === 1
                ? "opacity-30 cursor-not-allowed"
                : "cursor-pointer"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={totalSections === 1}
            title="Delete"
          >
            <DeleteIcon />
          </button>
        </div>
      )}

      {/* Main Section Container */}
      <div
        ref={sectionRef}
        className={`relative flex rounded border transition-all duration-150 bg-white cursor-text min-h-[120px] ${
          isFocused ? "border-gray-400" : "border-gray-200"
        }`}
        onClick={onFocus}
      >
        {/* Left Panel with Play Button */}
        <div className="w-8 bg-gray-50 border-r border-gray-200 flex items-start justify-center pt-2 flex-shrink-0">
          <button
            className="w-6 h-6 flex items-center justify-center bg-transparent border-none rounded hover:bg-gray-200 transition-colors duration-150 outline-none"
            title="Execute"
          >
            <PlayIcon />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-3 sm:p-4 relative">
          <textarea
            ref={textareaRef}
            placeholder=""
            className="w-full min-h-[80px] p-0 border-none outline-none text-sm font-mono resize-y bg-transparent leading-relaxed text-gray-900"
            onFocus={onFocus}
          />
        </div>
      </div>

      {/* Add Section Buttons */}
      <div
        className={`flex gap-2 pt-2 pb-2 justify-center transition-all duration-200 overflow-hidden ${
          isFocused ? "opacity-100 max-h-16" : "opacity-0 max-h-0"
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddSection("code");
          }}
          className="px-4 py-1.5 bg-transparent border border-gray-300 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all duration-150 outline-none"
        >
          + Code
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddSection("text");
          }}
          className="px-4 py-1.5 bg-transparent border border-gray-300 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all duration-150 outline-none"
        >
          + Text
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddSection("image");
          }}
          className="px-4 py-1.5 bg-transparent border border-gray-300 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all duration-150 outline-none"
        >
          + Image
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddSection("table");
          }}
          className="px-4 py-1.5 bg-transparent border border-gray-300 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all duration-150 outline-none"
        >
          + Table
        </button>
      </div>
    </div>
  );
};

// Icon Components
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

export default SectionEditor;
