import React, { useState, useRef, useEffect } from "react";

const SectionEditor = ({ sections, onSectionsChange }) => {
  const [focusedSectionId, setFocusedSectionId] = useState(null);
  const [editingNameId, setEditingNameId] = useState(null);

  useEffect(() => {
    if (!sections || sections.length === 0) {
      onSectionsChange([
        { id: Date.now(), type: "section", name: "", content: "" }, // Changed from "text" to "section"
      ]);
    }
  }, []);

  const addSectionAfter = (currentId, type) => {
    const currentIndex = sections.findIndex((s) => s.id === currentId);

    // Map button types to LaTeX section types
    let sectionType = type;
    if (type === "code" || type === "text") {
      sectionType = "section"; // Convert UI button types to LaTeX section type
    }

    const newSection = {
      id: Date.now() + Math.random(),
      type: sectionType,
      name: "",
      content: "",
    };

    const newSections = [...sections];
    newSections.splice(currentIndex + 1, 0, newSection);
    onSectionsChange(newSections);

    setTimeout(() => setFocusedSectionId(newSection.id), 50);
  };

  const deleteSection = (id) => {
    if (sections.length <= 1) return;
    const newSections = sections.filter((section) => section.id !== id);
    setFocusedSectionId(null);
    onSectionsChange(newSections); // Parent now persists to LaTeX + saves
  };

  const moveSectionUp = (index) => {
    if (index === 0 || !sections || sections.length < 2) return;

    const newSections = [...sections];
    [newSections[index - 1], newSections[index]] = [
      newSections[index],
      newSections[index - 1],
    ];

    onSectionsChange(newSections);
  };

  const moveSectionDown = (index) => {
    if (index >= sections.length - 1 || !sections || sections.length < 2)
      return;

    const newSections = [...sections];
    [newSections[index], newSections[index + 1]] = [
      newSections[index + 1],
      newSections[index],
    ];

    onSectionsChange(newSections);
  };

  const updateSectionContent = (id, content) => {
    const newSections = sections.map((section) =>
      section.id === id ? { ...section, content } : section
    );
    onSectionsChange(newSections);
  };

  const updateSectionName = (id, name) => {
    const newSections = sections.map((section) =>
      section.id === id ? { ...section, name } : section
    );
    onSectionsChange(newSections);
  };

  const duplicateSection = (index) => {
    const sectionToDuplicate = sections[index];
    const duplicatedSection = {
      ...sectionToDuplicate,
      id: Date.now() + Math.random(),
    };
    const newSections = [...sections];
    newSections.splice(index + 1, 0, duplicatedSection);
    onSectionsChange(newSections);

    setTimeout(() => setFocusedSectionId(duplicatedSection.id), 50);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 py-5 bg-gray-100 min-h-full">
      {sections &&
        sections.length > 0 &&
        sections.map((section, index) => (
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
            onDuplicate={() => duplicateSection(index)}
            onAddSection={(type) => addSectionAfter(section.id, type)}
            onContentChange={(content) =>
              updateSectionContent(section.id, content)
            }
            onNameChange={(name) => updateSectionName(section.id, name)}
            isEditingName={editingNameId === section.id}
            setEditingName={(editing) =>
              setEditingNameId(editing ? section.id : null)
            }
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
  onDuplicate,
  onAddSection,
  onContentChange,
  onNameChange,
  isEditingName,
  setEditingName,
}) => {
  const sectionRef = useRef(null);
  const textareaRef = useRef(null);
  const nameInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isFocused) {
        textareaRef.current?.blur();
        onBlur();
        if (isEditingName) {
          setEditingName(false);
        }
      }
    };

    if (isFocused) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFocused, onBlur, isEditingName, setEditingName]);

  useEffect(() => {
    if (isFocused && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isFocused]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleMoveUp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onMoveUp();
  };

  const handleMoveDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onMoveDown();
  };

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (totalSections > 1) {
      onDelete();
    }
  };

  const handleDuplicate = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDuplicate();
  };

  return (
    <div className="relative mb-4">
      {isFocused && (
        <div className="absolute -top-5 right-8 flex gap-0.5 bg-gray-50 rounded border border-gray-300 p-1 shadow-md z-10">
          <button
            type="button"
            className={`w-8 h-8 flex items-center justify-center bg-transparent border-none rounded hover:bg-gray-200 transition-colors duration-150 outline-none ${
              index === 0 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
            }`}
            onClick={handleMoveUp}
            disabled={index === 0}
            title="Move Up"
          >
            <ArrowUpIcon />
          </button>

          <button
            type="button"
            className={`w-8 h-8 flex items-center justify-center bg-transparent border-none rounded hover:bg-gray-200 transition-colors duration-150 outline-none ${
              index === totalSections - 1
                ? "opacity-30 cursor-not-allowed"
                : "cursor-pointer"
            }`}
            onClick={handleMoveDown}
            disabled={index === totalSections - 1}
            title="Move Down"
          >
            <ArrowDownIcon />
          </button>

          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded hover:bg-gray-200 transition-colors duration-150 outline-none text-xs font-semibold text-gray-600"
            title="AI Assistant"
          >
            AI
          </button>

          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded hover:bg-gray-200 transition-colors duration-150 outline-none"
            onClick={(e) => {
              e.stopPropagation();
              setEditingName(!isEditingName);
            }}
            title="Edit Section Name"
          >
            <GearIcon />
          </button>

          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center bg-transparent border-none rounded hover:bg-gray-200 transition-colors duration-150 outline-none cursor-pointer"
            onClick={handleDuplicate}
            title="Duplicate"
          >
            <CopyIcon />
          </button>

          <button
            type="button"
            className={`w-8 h-8 flex items-center justify-center bg-transparent border-none rounded hover:bg-gray-200 transition-colors duration-150 outline-none ${
              totalSections === 1
                ? "opacity-30 cursor-not-allowed"
                : "cursor-pointer"
            }`}
            onClick={handleDelete}
            disabled={totalSections === 1}
            title="Delete"
          >
            <DeleteIcon />
          </button>
        </div>
      )}

      <div
        ref={sectionRef}
        className={`relative flex rounded border transition-all duration-150 bg-white cursor-text min-h-[120px] ${
          isFocused ? "border-gray-400" : "border-gray-200"
        }`}
        onClick={onFocus}
      >
        <div className="w-8 bg-gray-50 border-r border-gray-200 flex items-start justify-center pt-2 flex-shrink-0">
          <button
            type="button"
            className="w-6 h-6 flex items-center justify-center bg-transparent border-none rounded hover:bg-gray-200 transition-colors duration-150 outline-none"
            title="Execute"
          >
            <PlayIcon />
          </button>
        </div>

        <div className="flex-1 p-3 sm:p-4 relative">
          {isEditingName && (
            <div className="mb-2 p-2 bg-gray-50 rounded border border-gray-300">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Section Name:
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={section.name}
                onChange={(e) => onNameChange(e.target.value)}
                onBlur={() => setEditingName(false)}
                placeholder="Unnamed Section"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded outline-none focus:border-gray-400"
              />
            </div>
          )}

          {section.name && !isEditingName && (
            <div className="mb-2 text-sm font-semibold text-gray-700">
              {section.name}
            </div>
          )}

          <textarea
            ref={textareaRef}
            placeholder={
              section.name
                ? `Write content for "${section.name}"...`
                : "Enter content here..."
            }
            value={section.content}
            onChange={(e) => onContentChange(e.target.value)}
            className="w-full min-h-[80px] p-0 border-none outline-none text-sm font-mono resize-y bg-transparent leading-relaxed text-gray-900"
            onFocus={onFocus}
          />
        </div>
      </div>

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
      </div>
    </div>
  );
};

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

export default SectionEditor;
