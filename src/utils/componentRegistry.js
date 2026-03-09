/**
 * Component Registry — Defines all available LaTeX components.
 * Each entry includes metadata, default props, property definitions,
 * required packages, and a LaTeX generation function.
 */

// ==========================================
// COMPONENT CATEGORIES
// ==========================================
export const COMPONENT_CATEGORIES = [
  { key: "structure", label: "Structure", icon: "TbLayoutList" },
  { key: "content", label: "Content", icon: "TbFileText" },
  { key: "media", label: "Media", icon: "TbPhoto" },
  { key: "layout", label: "Layout", icon: "TbColumns" },
  { key: "lists", label: "Lists", icon: "TbList" },
  { key: "advanced", label: "Advanced", icon: "TbSettings" },
];

// ==========================================
// COMPONENT DEFINITIONS
// ==========================================
const COMPONENTS = [
  // ── Structure ──
  {
    type: "section",
    label: "Section",
    icon: "TbH1",
    category: "structure",
    description: "A major section heading",
    defaultProps: {
      title: "Section Title",
      numbered: true,
      level: 1,
      fontWeight: "bold",
    },
    propertyDefinitions: [
      { key: "title", label: "Title", type: "text", placeholder: "Section Title" },
      { key: "numbered", label: "Numbered", type: "toggle" },
      {
        key: "level",
        label: "Heading Level",
        type: "select",
        options: [
          { value: 1, label: "Section" },
          { value: 2, label: "Subsection" },
          { value: 3, label: "Subsubsection" },
        ],
      },
    ],
    requiredPackages: [],
    isContainer: false,
  },
  {
    type: "paragraph",
    label: "Paragraph",
    icon: "TbAlignLeft",
    category: "structure",
    description: "A paragraph break with optional title",
    defaultProps: { title: "" },
    propertyDefinitions: [
      { key: "title", label: "Paragraph Title", type: "text", placeholder: "Optional title" },
    ],
    requiredPackages: [],
    isContainer: false,
  },
  {
    type: "newpage",
    label: "Page Break",
    icon: "TbSection",
    category: "structure",
    description: "Inserts a page break",
    defaultProps: {},
    propertyDefinitions: [],
    requiredPackages: [],
    isContainer: false,
  },
  {
    type: "hrule",
    label: "Horizontal Rule",
    icon: "TbMinus",
    category: "structure",
    description: "A horizontal line separator",
    defaultProps: { width: "100", unit: "%" },
    propertyDefinitions: [
      { key: "width", label: "Width (%)", type: "number", min: 10, max: 100, step: 5 },
    ],
    requiredPackages: [],
    isContainer: false,
  },

  // ── Content ──
  {
    type: "text",
    label: "Text Block",
    icon: "TbAlignJustified",
    category: "content",
    description: "A block of text content",
    defaultProps: {
      content: "Enter your text here...",
      alignment: "left",
      fontSize: "normalsize",
      bold: false,
      italic: false,
    },
    propertyDefinitions: [
      { key: "content", label: "Content", type: "textarea", placeholder: "Enter text..." },
      {
        key: "alignment",
        label: "Alignment",
        type: "select",
        options: [
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
          { value: "right", label: "Right" },
          { value: "justify", label: "Justify" },
        ],
      },
      {
        key: "fontSize",
        label: "Font Size",
        type: "select",
        options: [
          { value: "tiny", label: "Tiny" },
          { value: "scriptsize", label: "Script" },
          { value: "footnotesize", label: "Footnote" },
          { value: "small", label: "Small" },
          { value: "normalsize", label: "Normal" },
          { value: "large", label: "Large" },
          { value: "Large", label: "Larger" },
          { value: "LARGE", label: "Largest" },
          { value: "huge", label: "Huge" },
        ],
      },
      { key: "bold", label: "Bold", type: "toggle" },
      { key: "italic", label: "Italic", type: "toggle" },
    ],
    requiredPackages: [],
    isContainer: false,
  },
  {
    type: "math",
    label: "Math Equation",
    icon: "TbMath",
    category: "content",
    description: "A mathematical equation",
    defaultProps: {
      equation: "E = mc^2",
      displayMode: "display",
      numbered: true,
    },
    propertyDefinitions: [
      { key: "equation", label: "Equation (LaTeX)", type: "textarea", placeholder: "E = mc^2" },
      {
        key: "displayMode",
        label: "Display Mode",
        type: "select",
        options: [
          { value: "display", label: "Display Math" },
          { value: "inline", label: "Inline Math" },
        ],
      },
      { key: "numbered", label: "Numbered", type: "toggle" },
    ],
    requiredPackages: ["amsmath", "amssymb"],
    isContainer: false,
  },
  {
    type: "code",
    label: "Code Block",
    icon: "TbCode",
    category: "content",
    description: "A formatted code listing",
    defaultProps: {
      code: "// Your code here",
      language: "python",
      showNumbers: true,
      caption: "",
    },
    propertyDefinitions: [
      { key: "code", label: "Code", type: "textarea", placeholder: "// Code..." },
      {
        key: "language",
        label: "Language",
        type: "select",
        options: [
          { value: "python", label: "Python" },
          { value: "java", label: "Java" },
          { value: "c", label: "C/C++" },
          { value: "javascript", label: "JavaScript" },
          { value: "html", label: "HTML" },
          { value: "sql", label: "SQL" },
          { value: "bash", label: "Bash" },
          { value: "text", label: "Plain Text" },
        ],
      },
      { key: "showNumbers", label: "Line Numbers", type: "toggle" },
      { key: "caption", label: "Caption", type: "text", placeholder: "Listing caption" },
    ],
    requiredPackages: ["listings", "xcolor"],
    isContainer: false,
  },
  {
    type: "blockquote",
    label: "Block Quote",
    icon: "TbQuote",
    category: "content",
    description: "An indented quotation",
    defaultProps: {
      content: "Enter quotation...",
      author: "",
    },
    propertyDefinitions: [
      { key: "content", label: "Quote Text", type: "textarea", placeholder: "Enter quotation..." },
      { key: "author", label: "Author / Source", type: "text", placeholder: "Author name" },
    ],
    requiredPackages: [],
    isContainer: false,
  },

  // ── Media ──
  {
    type: "image",
    label: "Image / Figure",
    icon: "TbPhoto",
    category: "media",
    description: "An image with optional caption",
    defaultProps: {
      path: "example-image",
      width: "0.8",
      widthUnit: "\\textwidth",
      caption: "",
      label: "",
      positioning: "h",
      centering: true,
    },
    propertyDefinitions: [
      { key: "path", label: "Image Path", type: "text", placeholder: "path/to/image.png" },
      { key: "width", label: "Width", type: "number", min: 0.1, max: 2, step: 0.1 },
      {
        key: "widthUnit",
        label: "Unit",
        type: "select",
        options: [
          { value: "\\textwidth", label: "\\textwidth" },
          { value: "\\columnwidth", label: "\\columnwidth" },
          { value: "cm", label: "cm" },
          { value: "in", label: "inches" },
        ],
      },
      { key: "caption", label: "Caption", type: "text", placeholder: "Figure caption..." },
      { key: "label", label: "Label", type: "text", placeholder: "fig:label" },
      {
        key: "positioning",
        label: "Position",
        type: "select",
        options: [
          { value: "h", label: "Here [h]" },
          { value: "t", label: "Top [t]" },
          { value: "b", label: "Bottom [b]" },
          { value: "H", label: "Exact [H]" },
        ],
      },
      { key: "centering", label: "Center", type: "toggle" },
    ],
    requiredPackages: ["graphicx"],
    isContainer: false,
  },
  {
    type: "table",
    label: "Table",
    icon: "TbTable",
    category: "media",
    description: "A data table",
    defaultProps: {
      rows: 3,
      cols: 3,
      data: [
        ["Header 1", "Header 2", "Header 3"],
        ["Cell 1", "Cell 2", "Cell 3"],
        ["Cell 4", "Cell 5", "Cell 6"],
      ],
      alignments: ["c", "c", "c"],
      borderStyle: "all",
      headerRow: true,
      caption: "",
      label: "",
      positioning: "h",
      centering: true,
    },
    propertyDefinitions: [
      { key: "rows", label: "Rows", type: "number", min: 1, max: 20, step: 1 },
      { key: "cols", label: "Columns", type: "number", min: 1, max: 10, step: 1 },
      {
        key: "borderStyle",
        label: "Borders",
        type: "select",
        options: [
          { value: "all", label: "All" },
          { value: "horizontal", label: "Horizontal" },
          { value: "vertical", label: "Vertical" },
          { value: "none", label: "None" },
        ],
      },
      { key: "headerRow", label: "Bold Header Row", type: "toggle" },
      { key: "caption", label: "Caption", type: "text", placeholder: "Table caption..." },
      { key: "label", label: "Label", type: "text", placeholder: "tab:label" },
      { key: "centering", label: "Center", type: "toggle" },
    ],
    requiredPackages: [],
    isContainer: false,
  },

  // ── Layout ──
  {
    type: "columns",
    label: "Columns",
    icon: "TbColumns",
    category: "layout",
    description: "Side-by-side column layout",
    defaultProps: {
      count: 2,
      gap: "1cm",
    },
    propertyDefinitions: [
      { key: "count", label: "Number of Columns", type: "number", min: 2, max: 4, step: 1 },
      { key: "gap", label: "Column Gap", type: "text", placeholder: "1cm" },
    ],
    requiredPackages: [],
    isContainer: true,
  },
  {
    type: "vspace",
    label: "Vertical Space",
    icon: "TbArrowAutofitHeight",
    category: "layout",
    description: "Adds vertical spacing",
    defaultProps: { amount: "1", unit: "cm" },
    propertyDefinitions: [
      { key: "amount", label: "Amount", type: "number", min: 0.1, max: 20, step: 0.1 },
      {
        key: "unit",
        label: "Unit",
        type: "select",
        options: [
          { value: "cm", label: "cm" },
          { value: "mm", label: "mm" },
          { value: "em", label: "em" },
          { value: "pt", label: "pt" },
          { value: "in", label: "inches" },
        ],
      },
    ],
    requiredPackages: [],
    isContainer: false,
  },

  // ── Lists ──
  {
    type: "itemize",
    label: "Bullet List",
    icon: "TbList",
    category: "lists",
    description: "An unordered bullet list",
    defaultProps: {
      items: ["First item", "Second item", "Third item"],
    },
    propertyDefinitions: [
      { key: "items", label: "List Items", type: "list" },
    ],
    requiredPackages: [],
    isContainer: false,
  },
  {
    type: "enumerate",
    label: "Numbered List",
    icon: "TbListNumbers",
    category: "lists",
    description: "An ordered numbered list",
    defaultProps: {
      items: ["First item", "Second item", "Third item"],
      style: "1.",
    },
    propertyDefinitions: [
      { key: "items", label: "List Items", type: "list" },
      {
        key: "style",
        label: "Numbering Style",
        type: "select",
        options: [
          { value: "1.", label: "1, 2, 3" },
          { value: "a)", label: "a, b, c" },
          { value: "i)", label: "i, ii, iii" },
          { value: "A.", label: "A, B, C" },
        ],
      },
    ],
    requiredPackages: ["enumitem"],
    isContainer: false,
  },

  // ── Advanced ──
  {
    type: "titleblock",
    label: "Title Block",
    icon: "TbFileDescription",
    category: "advanced",
    description: "Document title, author, and date",
    defaultProps: {
      title: "Document Title",
      author: "Author Name",
      date: "\\today",
      showDate: true,
    },
    propertyDefinitions: [
      { key: "title", label: "Title", type: "text", placeholder: "Document Title" },
      { key: "author", label: "Author", type: "text", placeholder: "Author Name" },
      { key: "date", label: "Date", type: "text", placeholder: "\\today" },
      { key: "showDate", label: "Show Date", type: "toggle" },
    ],
    requiredPackages: [],
    isContainer: false,
  },
  {
    type: "abstract",
    label: "Abstract",
    icon: "TbNotes",
    category: "advanced",
    description: "Document abstract section",
    defaultProps: {
      content: "Enter your abstract here...",
    },
    propertyDefinitions: [
      { key: "content", label: "Abstract Text", type: "textarea", placeholder: "Enter abstract..." },
    ],
    requiredPackages: [],
    isContainer: false,
  },
  {
    type: "tableofcontents",
    label: "Table of Contents",
    icon: "TbListTree",
    category: "advanced",
    description: "Auto-generated table of contents",
    defaultProps: {},
    propertyDefinitions: [],
    requiredPackages: [],
    isContainer: false,
  },
  {
    type: "bibliography",
    label: "Bibliography",
    icon: "TbBook2",
    category: "advanced",
    description: "Bibliography / References section",
    defaultProps: {
      style: "plain",
      bibFile: "references",
    },
    propertyDefinitions: [
      {
        key: "style",
        label: "Style",
        type: "select",
        options: [
          { value: "plain", label: "Plain" },
          { value: "unsrt", label: "Unsorted" },
          { value: "abbrv", label: "Abbreviated" },
          { value: "ieeetr", label: "IEEE" },
          { value: "acm", label: "ACM" },
        ],
      },
      { key: "bibFile", label: "BibTeX File", type: "text", placeholder: "references" },
    ],
    requiredPackages: [],
    isContainer: false,
  },
  {
    type: "customcommand",
    label: "Custom LaTeX",
    icon: "TbTerminal",
    category: "advanced",
    description: "Insert raw LaTeX commands",
    defaultProps: {
      latex: "% Your custom LaTeX here",
    },
    propertyDefinitions: [
      { key: "latex", label: "LaTeX Code", type: "textarea", placeholder: "\\newcommand{...}" },
    ],
    requiredPackages: [],
    isContainer: false,
  },
];

// ==========================================
// REGISTRY API
// ==========================================

/** Get all components grouped by category. */
export function getComponentsByCategory() {
  const grouped = {};
  for (const cat of COMPONENT_CATEGORIES) {
    grouped[cat.key] = {
      ...cat,
      components: COMPONENTS.filter((c) => c.category === cat.key),
    };
  }
  return grouped;
}

/** Get a single component definition by type. */
export function getComponentDef(type) {
  return COMPONENTS.find((c) => c.type === type) || null;
}

/** Get all component definitions as a flat array. */
export function getAllComponents() {
  return COMPONENTS;
}

/** Get required packages for a set of component types. */
export function getRequiredPackages(componentTypes) {
  const packages = new Set();
  for (const type of componentTypes) {
    const def = getComponentDef(type);
    if (def && def.requiredPackages) {
      def.requiredPackages.forEach((pkg) => packages.add(pkg));
    }
  }
  return [...packages];
}

export default COMPONENTS;
