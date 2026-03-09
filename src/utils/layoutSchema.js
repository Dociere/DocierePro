/**
 * Layout Schema — The central JSON data model for the template builder.
 * Every canvas change writes to this schema; the LaTeX parser reads from it.
 */
import { v4 as uuidv4 } from "uuid";

// ==========================================
// TEMPLATE TYPE → DOCUMENT CLASS MAPPING
// ==========================================
const DOCUMENT_CLASS_MAP = {
  article: "article",
  report: "report",
  thesis: "report",
  presentation: "beamer",
  resume: "article",
  letter: "letter",
  custom: "article",
};

// ==========================================
// PAGE SIZE PRESETS (width × height in mm)
// ==========================================
export const PAGE_SIZE_PRESETS = {
  a4: { width: "210mm", height: "297mm", label: "A4" },
  letter: { width: "216mm", height: "279mm", label: "US Letter" },
  a5: { width: "148mm", height: "210mm", label: "A5" },
  a3: { width: "297mm", height: "420mm", label: "A3" },
  legal: { width: "216mm", height: "356mm", label: "US Legal" },
};

// ==========================================
// CREATE INITIAL SCHEMA
// ==========================================
export function createLayoutSchema({
  templateName = "Untitled Template",
  templateType = "article",
  pageSize = PAGE_SIZE_PRESETS.a4,
  layoutMode = "flow",
  margins = { top: "25mm", bottom: "25mm", left: "20mm", right: "20mm" },
} = {}) {
  return {
    id: uuidv4(),
    templateName,
    templateType,
    documentClass: DOCUMENT_CLASS_MAP[templateType] || "article",
    pageSize: { ...pageSize },
    margins: { ...margins },
    layoutMode, // "flow" | "absolute"
    preamblePackages: new Set(), // Auto-managed by the system
    customPreamble: "", // User-defined extra preamble lines
    components: [],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

// ==========================================
// COMPONENT CRUD OPERATIONS
// ==========================================

/** Add a component at a given index (flow) or position (absolute). */
export function addComponent(schema, componentDef, index = -1) {
  const newComponent = {
    id: uuidv4(),
    type: componentDef.type,
    props: { ...componentDef.defaultProps },
    children: [],
    position: { x: 0, y: 0 }, // Used in absolute mode
  };

  const updated = { ...schema, components: [...schema.components] };

  if (index >= 0 && index < updated.components.length) {
    updated.components.splice(index, 0, newComponent);
  } else {
    updated.components.push(newComponent);
  }

  updated.metadata = { ...updated.metadata, updatedAt: new Date().toISOString() };
  return { schema: updated, newComponentId: newComponent.id };
}

/** Remove a component by ID (searches recursively in children). */
export function removeComponent(schema, nodeId) {
  const removeFromList = (list) =>
    list
      .filter((c) => c.id !== nodeId)
      .map((c) => ({ ...c, children: removeFromList(c.children || []) }));

  return {
    ...schema,
    components: removeFromList(schema.components),
    metadata: { ...schema.metadata, updatedAt: new Date().toISOString() },
  };
}

/** Update properties of a component by ID. */
export function updateComponentProps(schema, nodeId, newProps) {
  const updateInList = (list) =>
    list.map((c) => {
      if (c.id === nodeId) {
        return { ...c, props: { ...c.props, ...newProps } };
      }
      if (c.children && c.children.length > 0) {
        return { ...c, children: updateInList(c.children) };
      }
      return c;
    });

  return {
    ...schema,
    components: updateInList(schema.components),
    metadata: { ...schema.metadata, updatedAt: new Date().toISOString() },
  };
}

/** Re-order a component in flow mode. */
export function reorderComponents(schema, fromIndex, toIndex) {
  const components = [...schema.components];
  const [moved] = components.splice(fromIndex, 1);
  components.splice(toIndex, 0, moved);

  return {
    ...schema,
    components,
    metadata: { ...schema.metadata, updatedAt: new Date().toISOString() },
  };
}

/** Move a component to absolute position. */
export function moveComponent(schema, nodeId, x, y) {
  const updateInList = (list) =>
    list.map((c) => {
      if (c.id === nodeId) {
        return { ...c, position: { x, y } };
      }
      if (c.children && c.children.length > 0) {
        return { ...c, children: updateInList(c.children) };
      }
      return c;
    });

  return {
    ...schema,
    components: updateInList(schema.components),
    metadata: { ...schema.metadata, updatedAt: new Date().toISOString() },
  };
}

/** Add a child component into a container component (e.g., adding text inside a column). */
export function addChildComponent(schema, parentId, componentDef, index = -1) {
  const newChild = {
    id: uuidv4(),
    type: componentDef.type,
    props: { ...componentDef.defaultProps },
    children: [],
    position: { x: 0, y: 0 },
  };

  const addToParent = (list) =>
    list.map((c) => {
      if (c.id === parentId) {
        const children = [...(c.children || [])];
        if (index >= 0 && index < children.length) {
          children.splice(index, 0, newChild);
        } else {
          children.push(newChild);
        }
        return { ...c, children };
      }
      if (c.children && c.children.length > 0) {
        return { ...c, children: addToParent(c.children) };
      }
      return c;
    });

  return {
    schema: {
      ...schema,
      components: addToParent(schema.components),
      metadata: { ...schema.metadata, updatedAt: new Date().toISOString() },
    },
    newComponentId: newChild.id,
  };
}

/** Find a component by ID in the tree. */
export function findComponent(schema, nodeId) {
  const searchList = (list) => {
    for (const c of list) {
      if (c.id === nodeId) return c;
      if (c.children && c.children.length > 0) {
        const found = searchList(c.children);
        if (found) return found;
      }
    }
    return null;
  };
  return searchList(schema.components);
}

/** Update global template settings (page size, margins, etc.). */
export function updateTemplateSettings(schema, settings) {
  return {
    ...schema,
    ...settings,
    metadata: { ...schema.metadata, updatedAt: new Date().toISOString() },
  };
}
