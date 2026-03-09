/**
 * TemplateBuilderPage — The main three-panel drag-and-drop template builder.
 *
 * Left Sidebar:  Searchable component library (draggable items)
 * Center Canvas: Drop target showing WYSIWYG component previews
 * Right Sidebar: Context-aware property panel
 */
import React, { useState, useCallback, useMemo } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useSettings } from "../context/useSettings";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  TbArrowLeft, TbSearch, TbCode, TbDownload, TbDeviceFloppy,
  TbChevronDown, TbChevronRight, TbGripVertical, TbPlus,
  TbCopy, TbCheck, TbTrash, TbLayoutList, TbFileText,
  TbPhoto, TbColumns, TbList, TbSettings, TbH1, TbAlignLeft,
  TbMinus, TbAlignJustified, TbMath, TbQuote,
  TbTable, TbArrowAutofitHeight, TbListNumbers, TbFileDescription,
  TbNotes, TbListTree, TbBook2, TbTerminal, TbX,
} from "react-icons/tb";
import {
  createLayoutSchema,
  addComponent,
  removeComponent,
  updateComponentProps,
  reorderComponents,
  moveComponent,
  updateTemplateSettings,
  findComponent,
} from "../utils/layoutSchema";
import { getComponentsByCategory, getComponentDef } from "../utils/componentRegistry";
import { generateFullDocument } from "../utils/latexGenerator";
import ComponentRenderer from "../components/templateBuilder/ComponentRenderer";
import PropertyPanel from "../components/templateBuilder/PropertyPanel";

// ==========================================
// ICON MAP — map string icon names to components
// ==========================================
const ICON_MAP = {
  TbLayoutList, TbFileText, TbPhoto, TbColumns, TbList, TbSettings,
  TbH1, TbAlignLeft, TbMinus, TbAlignJustified, TbMath,
  TbCode, TbQuote, TbTable, TbArrowAutofitHeight, TbListNumbers,
  TbFileDescription, TbNotes, TbListTree, TbBook2, TbTerminal,
};


const getIcon = (iconName, size = 16) => {
  const Icon = ICON_MAP[iconName];
  return Icon ? <Icon size={size} /> : null;
};

// ==========================================
// DRAGGABLE COMPONENT ITEM (from library)
// ==========================================
const DraggableLibraryItem = ({ compDef }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: `library-${compDef.type}`,
    data: { type: "library-item", compDef },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-grab active:cursor-grabbing transition-all ${
        isDragging
          ? "opacity-50 scale-95 bg-gray-200"
          : "hover:bg-gray-100 hover:shadow-sm bg-white border border-gray-100"
      }`}
      style={{
        transform: CSS.Transform.toString(transform),
      }}
    >
      <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 flex-shrink-0">
        {getIcon(compDef.icon, 14)}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-gray-800 truncate">{compDef.label}</div>
        <div className="text-[10px] text-gray-400 truncate">{compDef.description}</div>
      </div>
    </div>
  );
};

// ==========================================
// SORTABLE CANVAS ITEM
// ==========================================
const SortableCanvasItem = ({ component, isSelected, onSelect }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: component.id,
    data: { type: "canvas-item", component },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ComponentRenderer
        component={component}
        isSelected={isSelected}
        isDragging={isDragging}
        onSelect={onSelect}
      />
    </div>
  );
};

// ==========================================
// LATEX PREVIEW MODAL
// ==========================================
const LatexPreviewModal = ({ isOpen, onClose, latex }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <TbCode className="text-gray-600" /> Generated LaTeX
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors"
            >
              {copied ? <TbCheck size={14} /> : <TbCopy size={14} />}
              {copied ? "Copied!" : "Copy All"}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100"
            >
              <TbX size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <pre className="p-6 text-xs font-mono text-gray-800 leading-relaxed whitespace-pre-wrap bg-gray-50">
            {latex}
          </pre>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MAIN BUILDER PAGE
// ==========================================
const TemplateBuilderPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const isDark = settings.appearance?.mode === "dark";

  // Initialize schema from navigation state
  const [schema, setSchema] = useState(() => {
    const config = location.state;
    if (config) {
      return createLayoutSchema(config);
    }
    return createLayoutSchema({ templateName: "Untitled Template" });
  });

  const [selectedId, setSelectedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState(
    new Set(["structure", "content", "media", "layout", "lists", "advanced"])
  );
  const [showLatexPreview, setShowLatexPreview] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeDragId, setActiveDragId] = useState(null);

  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Component library data
  const componentLibrary = useMemo(() => getComponentsByCategory(), []);

  // Filter library by search
  const filteredLibrary = useMemo(() => {
    if (!searchTerm) return componentLibrary;
    const filtered = {};
    for (const [key, cat] of Object.entries(componentLibrary)) {
      const comps = cat.components.filter(
        (c) =>
          c.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (comps.length > 0) {
        filtered[key] = { ...cat, components: comps };
      }
    }
    return filtered;
  }, [componentLibrary, searchTerm]);

  // Selected component from schema
  const selectedComponent = selectedId ? findComponent(schema, selectedId) : null;

  // ── Handlers ──

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleAddComponent = useCallback(
    (compDef, index = -1) => {
      const { schema: newSchema, newComponentId } = addComponent(schema, compDef, index);
      setSchema(newSchema);
      setSelectedId(newComponentId);
    },
    [schema]
  );

  const handleDeleteComponent = useCallback(
    (nodeId) => {
      setSchema(removeComponent(schema, nodeId));
      if (selectedId === nodeId) setSelectedId(null);
    },
    [schema, selectedId]
  );

  const handleUpdateProps = useCallback(
    (nodeId, newProps) => {
      setSchema(updateComponentProps(schema, nodeId, newProps));
    },
    [schema]
  );

  const handleUpdateSettings = useCallback(
    (settings) => {
      setSchema(updateTemplateSettings(schema, settings));
    },
    [schema]
  );

  const handleExport = () => {
    const latex = generateFullDocument(schema);
    const blob = new Blob([latex], { type: "text/x-tex" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${schema.templateName.replace(/\s+/g, "_")}.tex`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Template exported!");
  };

  // ── Drag and Drop ──

  const handleDragStart = (event) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = (event) => {
    setActiveDragId(null);
    const { active, over } = event;

    if (!over) return;

    const activeData = active.data.current;

    // Case 1: Dragging from library to canvas
    if (activeData?.type === "library-item") {
      const compDef = activeData.compDef;

      // Find the index to insert at
      if (over.id === "canvas-drop-area") {
        // Dropped on empty canvas
        handleAddComponent(compDef);
      } else {
        // Dropped over an existing component — insert before it
        const overIndex = schema.components.findIndex((c) => c.id === over.id);
        if (overIndex >= 0) {
          handleAddComponent(compDef, overIndex);
        } else {
          handleAddComponent(compDef);
        }
      }
      return;
    }

    // Case 2: Reordering within canvas
    if (activeData?.type === "canvas-item" && active.id !== over.id) {
      const oldIndex = schema.components.findIndex((c) => c.id === active.id);
      const newIndex = schema.components.findIndex((c) => c.id === over.id);

      if (oldIndex >= 0 && newIndex >= 0) {
        setSchema((prev) => ({
          ...prev,
          components: arrayMove(prev.components, oldIndex, newIndex),
          metadata: { ...prev.metadata, updatedAt: new Date().toISOString() },
        }));
      }
    }
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
  };

  const toggleCategory = (key) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const latexPreview = useMemo(() => generateFullDocument(schema), [schema]);

  // Canvas aspect ratio based on page size
  const getCanvasStyle = () => {
    const w = parseFloat(schema.pageSize?.width) || 210;
    const h = parseFloat(schema.pageSize?.height) || 297;
    const ratio = h / w;
    return {
      width: "100%",
      maxWidth: "680px",
      aspectRatio: `${w} / ${h}`,
    };
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className={`h-screen flex flex-col ml-10 mt-5 ${isDark ? "bg-[#1a1a1a] text-white" : "bg-[#f5f5f4] text-gray-900"}`}>
        {/* ── TOP TOOLBAR ── */}
        <div className={`flex items-center justify-between px-5 py-3 border-b flex-shrink-0 ${isDark ? "bg-[#222] border-[#333]" : "bg-white border-gray-200 shadow-sm"}`}>
          <div className="flex items-center gap-4">
            <Link
              to="/template"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <TbArrowLeft size={16} />
              <span className="font-medium">Back</span>
            </Link>
            <div className="w-px h-5 bg-gray-200" />
            <div>
              <h1 className="text-sm font-bold">{schema.templateName}</h1>
              <p className="text-[10px] text-gray-400 capitalize">
                {schema.templateType} · {schema.layoutMode} mode · {schema.pageSize?.label || "Custom"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLatexPreview(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isDark ? "bg-[#333] text-gray-300 hover:bg-[#444]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              <TbCode size={14} /> Preview LaTeX
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-lg text-xs font-semibold hover:bg-gray-800 shadow-sm transition-all active:scale-[0.98]"
            >
              <TbDownload size={14} /> Export .tex
            </button>
          </div>
        </div>

        {/* ── MAIN THREE-PANEL LAYOUT ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── LEFT SIDEBAR: Component Library ── */}
          <div className={`w-[260px] flex-shrink-0 border-r flex flex-col ${isDark ? "bg-[#222] border-[#333]" : "bg-gray-50 border-gray-200"}`}>
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <TbSearch className="absolute left-3 top-2.5 text-gray-400" size={14} />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search components..."
                  className={`w-full pl-8 pr-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-black/10 ${isDark ? "bg-[#333] border-[#444] text-white" : "bg-white border-gray-200"}`}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {Object.entries(filteredLibrary).map(([key, cat]) => (
                <div key={key}>
                  <button
                    onClick={() => toggleCategory(key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${isDark ? "text-gray-400 hover:bg-[#333]" : "text-gray-500 hover:bg-gray-100"}`}
                  >
                    <span className="flex items-center gap-2">
                      {getIcon(cat.icon, 14)}
                      {cat.label}
                    </span>
                    {expandedCategories.has(key) ? (
                      <TbChevronDown size={12} />
                    ) : (
                      <TbChevronRight size={12} />
                    )}
                  </button>

                  {expandedCategories.has(key) && (
                    <div className="space-y-1 mt-1 mb-2">
                      {cat.components.map((compDef) => (
                        <div key={compDef.type} className="px-1">
                          {/* Click to add (simpler than drag) */}
                          <button
                            onClick={() => handleAddComponent(compDef)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${isDark ? "hover:bg-[#333] bg-[#2a2a2a] border border-[#333]" : "hover:bg-gray-100 hover:shadow-sm bg-white border border-gray-100"}`}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? "bg-[#333] text-gray-400" : "bg-gray-100 text-gray-600"}`}>
                              {getIcon(compDef.icon, 14)}
                            </div>
                            <div className="min-w-0">
                              <div className={`text-xs font-semibold truncate ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                                {compDef.label}
                              </div>
                              <div className="text-[10px] text-gray-400 truncate">
                                {compDef.description}
                              </div>
                            </div>
                            <TbPlus size={14} className="text-gray-400 flex-shrink-0 ml-auto" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── CENTER CANVAS ── */}
          <div className="flex-1 overflow-auto flex justify-center py-8 px-6" onClick={() => setSelectedId(null)}>
            <div
              style={getCanvasStyle()}
              className={`relative rounded-lg shadow-xl flex-shrink-0 ${isDark ? "bg-[#2a2a2a] border border-[#444]" : "bg-white border border-gray-200"}`}
            >
              {/* Page header */}
              <div className={`px-4 py-2 text-[10px] text-center border-b ${isDark ? "text-gray-500 border-[#333]" : "text-gray-300 border-gray-100"}`}>
                {schema.pageSize?.label || "Custom"} · {schema.pageSize?.width} × {schema.pageSize?.height}
              </div>

              {/* Canvas content area with margin simulation */}
              <div
                className="p-8 min-h-[200px]"
                id="canvas-drop-area"
                style={{
                  paddingTop: `${Math.max(24, parseFloat(schema.margins?.top) * 1.5)}px`,
                  paddingBottom: `${Math.max(24, parseFloat(schema.margins?.bottom) * 1.5)}px`,
                  paddingLeft: `${Math.max(24, parseFloat(schema.margins?.left) * 1.5)}px`,
                  paddingRight: `${Math.max(24, parseFloat(schema.margins?.right) * 1.5)}px`,
                }}
              >
                {schema.components.length === 0 ? (
                  /* Empty state */
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? "bg-[#333]" : "bg-gray-100"}`}>
                      <TbPlus size={24} className="text-gray-400" />
                    </div>
                    <p className={`text-sm font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                      Start building your template
                    </p>
                    <p className="text-xs text-gray-400 max-w-[280px]">
                      Click components in the left sidebar to add them to your document canvas.
                    </p>
                  </div>
                ) : (
                  /* Component list */
                  <SortableContext
                    items={schema.components.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {schema.components.map((comp) => (
                        <SortableCanvasItem
                          key={comp.id}
                          component={comp}
                          isSelected={selectedId === comp.id}
                          onSelect={setSelectedId}
                        />
                      ))}
                    </div>
                  </SortableContext>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT SIDEBAR: Property Panel ── */}
          <div className={`w-[280px] flex-shrink-0 border-l ${isDark ? "bg-[#222] border-[#333]" : "bg-white border-gray-200"}`}>
            <PropertyPanel
              selectedComponent={selectedComponent}
              schema={schema}
              onUpdateProps={handleUpdateProps}
              onDeleteComponent={handleDeleteComponent}
              onUpdateSettings={handleUpdateSettings}
            />
          </div>
        </div>

        {/* ── TOAST ── */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-[fadeIn_0.2s_ease-out]">
            <TbCheck size={16} className="text-green-400" />
            <span className="text-sm">{toast}</span>
          </div>
        )}
      </div>

      {/* LaTeX Preview Modal */}
      <LatexPreviewModal
        isOpen={showLatexPreview}
        onClose={() => setShowLatexPreview(false)}
        latex={latexPreview}
      />
    </DndContext>
  );
};

export default TemplateBuilderPage;
