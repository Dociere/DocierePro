/**
 * LaTeX Generator — Translates the Layout Schema JSON into a valid .tex string.
 * Includes the Hidden Preamble Manager that auto-injects packages.
 */
import { getComponentDef } from "./componentRegistry";

// ==========================================
// HIDDEN PREAMBLE MANAGER
// ==========================================

/** Collect all required packages from the component tree. */
function collectRequiredPackages(components) {
  const packages = new Set();

  const traverse = (list) => {
    for (const comp of list) {
      const def = getComponentDef(comp.type);
      if (def && def.requiredPackages) {
        def.requiredPackages.forEach((pkg) => packages.add(pkg));
      }
      if (comp.children && comp.children.length > 0) {
        traverse(comp.children);
      }
    }
  };

  traverse(components);
  return packages;
}

/** Base packages always included. */
const BASE_PACKAGES = [
  { name: "inputenc", options: "utf8" },
  { name: "geometry" }, // options set dynamically
  { name: "hyperref" },
];

// ==========================================
// PREAMBLE GENERATION
// ==========================================

function generatePreamble(schema) {
  const lines = [];

  // Document class
  const classOptions = [];
  if (schema.documentClass !== "beamer") {
    classOptions.push("12pt");
  }
  const optStr = classOptions.length > 0 ? `[${classOptions.join(",")}]` : "";
  lines.push(`\\documentclass${optStr}{${schema.documentClass}}`);
  lines.push("");

  // Base packages
  lines.push(`\\usepackage[utf8]{inputenc}`);

  // Geometry
  const m = schema.margins || {};
  const geoOpts = [];
  if (schema.pageSize) {
    // Parse width/height for geometry
    geoOpts.push(`paperwidth=${schema.pageSize.width}`);
    geoOpts.push(`paperheight=${schema.pageSize.height}`);
  }
  if (m.top) geoOpts.push(`top=${m.top}`);
  if (m.bottom) geoOpts.push(`bottom=${m.bottom}`);
  if (m.left) geoOpts.push(`left=${m.left}`);
  if (m.right) geoOpts.push(`right=${m.right}`);
  if (geoOpts.length > 0) {
    lines.push(`\\usepackage[${geoOpts.join(", ")}]{geometry}`);
  }

  // Auto-detected packages from components
  const requiredPkgs = collectRequiredPackages(schema.components);

  // Add textpos for absolute mode
  if (schema.layoutMode === "absolute") {
    requiredPkgs.add("textpos");
  }

  // Deduplicate with base packages
  const basePkgNames = new Set(BASE_PACKAGES.map((p) => p.name));
  for (const pkg of requiredPkgs) {
    if (!basePkgNames.has(pkg)) {
      lines.push(`\\usepackage{${pkg}}`);
    }
  }

  // Hyperref always last (best practice)
  lines.push(`\\usepackage{hyperref}`);

  // Listings setup if needed
  if (requiredPkgs.has("listings")) {
    lines.push("");
    lines.push("\\lstset{");
    lines.push("  basicstyle=\\ttfamily\\small,");
    lines.push("  breaklines=true,");
    lines.push("  frame=single,");
    lines.push("  numbers=left,");
    lines.push("  numberstyle=\\tiny\\color{gray},");
    lines.push("  keywordstyle=\\color{blue},");
    lines.push("  commentstyle=\\color{green!60!black},");
    lines.push("  stringstyle=\\color{red},");
    lines.push("}");
  }

  // Custom preamble
  if (schema.customPreamble && schema.customPreamble.trim()) {
    lines.push("");
    lines.push("% Custom preamble");
    lines.push(schema.customPreamble.trim());
  }

  // Title/Author if titleblock component exists
  const titleBlock = schema.components.find((c) => c.type === "titleblock");
  if (titleBlock) {
    lines.push("");
    lines.push(`\\title{${titleBlock.props.title || "Untitled"}}`);
    lines.push(`\\author{${titleBlock.props.author || ""}}`);
    if (titleBlock.props.showDate) {
      lines.push(`\\date{${titleBlock.props.date || "\\today"}}`);
    } else {
      lines.push(`\\date{}`);
    }
  }

  // Textpos setup for absolute mode
  if (schema.layoutMode === "absolute") {
    lines.push("");
    lines.push("\\setlength{\\TPHorizModule}{1mm}");
    lines.push("\\setlength{\\TPVertModule}{1mm}");
  }

  lines.push("");
  return lines.join("\n");
}

// ==========================================
// COMPONENT → LATEX TRANSLATORS
// ==========================================

function sectionToLatex(props) {
  const commands = ["\\section", "\\subsection", "\\subsubsection"];
  const level = (props.level || 1) - 1;
  const cmd = commands[Math.min(level, 2)];
  const star = props.numbered === false ? "*" : "";
  return `${cmd}${star}{${props.title || "Section"}}`;
}

function paragraphToLatex(props) {
  if (props.title && props.title.trim()) {
    return `\\paragraph{${props.title}}`;
  }
  return "";
}

function newpageToLatex() {
  return "\\newpage";
}

function hruleToLatex(props) {
  const width = (props.width || 100) / 100;
  return `\\noindent\\rule{${width}\\textwidth}{0.4pt}`;
}

function textToLatex(props) {
  let text = props.content || "";

  if (props.bold) text = `\\textbf{${text}}`;
  if (props.italic) text = `\\textit{${text}}`;

  const sizeCmd = props.fontSize && props.fontSize !== "normalsize" 
    ? `\\${props.fontSize} ` 
    : "";

  // Alignment
  const alignEnvMap = {
    left: "flushleft",
    center: "center",
    right: "flushright",
  };

  if (props.alignment && props.alignment !== "justify" && props.alignment !== "left") {
    const env = alignEnvMap[props.alignment] || "flushleft";
    return `\\begin{${env}}\n${sizeCmd}${text}\n\\end{${env}}`;
  }

  return `${sizeCmd}${text}`;
}

function mathToLatex(props) {
  const eq = props.equation || "x = 0";

  if (props.displayMode === "inline") {
    return `$${eq}$`;
  }

  if (props.numbered) {
    return `\\begin{equation}\n${eq}\n\\end{equation}`;
  }
  return `\\[\n${eq}\n\\]`;
}

function codeToLatex(props) {
  const opts = [];
  if (props.language && props.language !== "text") {
    opts.push(`language=${props.language}`);
  }
  if (props.showNumbers === false) {
    opts.push("numbers=none");
  }
  if (props.caption) {
    opts.push(`caption={${props.caption}}`);
  }

  const optStr = opts.length > 0 ? `[${opts.join(", ")}]` : "";
  return `\\begin{lstlisting}${optStr}\n${props.code || "// code"}\n\\end{lstlisting}`;
}

function blockquoteToLatex(props) {
  let result = `\\begin{quote}\n${props.content || ""}`;
  if (props.author && props.author.trim()) {
    result += `\n\\hfill --- ${props.author}`;
  }
  result += `\n\\end{quote}`;
  return result;
}

function imageToLatex(props) {
  const opts = [];
  if (props.width) {
    opts.push(`width=${props.width}${props.widthUnit || "\\textwidth"}`);
  }
  const optStr = opts.length > 0 ? `[${opts.join(", ")}]` : "";

  let result = `\\begin{figure}[${props.positioning || "h"}]\n`;
  if (props.centering) result += "\\centering\n";
  result += `\\includegraphics${optStr}{${props.path || "image"}}\n`;
  if (props.caption) result += `\\caption{${props.caption}}\n`;
  if (props.label) result += `\\label{${props.label}}\n`;
  result += "\\end{figure}";
  return result;
}

function tableToLatex(props) {
  const { rows, cols, data, alignments, borderStyle, headerRow, caption, label, positioning, centering } = props;
  const numCols = cols || 3;
  const numRows = rows || 3;

  // Column definition
  const hasVBorder = borderStyle === "all" || borderStyle === "vertical";
  const hasHBorder = borderStyle === "all" || borderStyle === "horizontal";

  let colDef = "";
  for (let i = 0; i < numCols; i++) {
    if (hasVBorder) colDef += "|";
    colDef += (alignments && alignments[i]) || "c";
  }
  if (hasVBorder) colDef += "|";

  // Build table body
  let body = "";
  if (hasHBorder) body += "\\hline\n";

  const tableData = data || [];
  for (let r = 0; r < numRows; r++) {
    const row = tableData[r] || [];
    const cells = [];
    for (let c = 0; c < numCols; c++) {
      let cell = row[c] || "";
      if (headerRow && r === 0) cell = `\\textbf{${cell}}`;
      cells.push(cell);
    }
    body += cells.join(" & ") + " \\\\";
    if (hasHBorder) body += " \\hline";
    body += "\n";
  }

  let result = `\\begin{table}[${positioning || "h"}]\n`;
  if (centering) result += "\\centering\n";
  if (caption) result += `\\caption{${caption}}\n`;
  result += `\\begin{tabular}{${colDef}}\n${body}\\end{tabular}\n`;
  if (label) result += `\\label{${label}}\n`;
  result += "\\end{table}";
  return result;
}

function columnsToLatex(props, children, layoutMode) {
  const count = props.count || 2;
  const gap = props.gap || "1cm";
  const colWidth = `(\\textwidth - ${count - 1} * ${gap}) / ${count}`;

  let result = "";
  for (let i = 0; i < count; i++) {
    const colChildren = (children || []).filter(
      (_, idx) => idx % count === i
    );
    result += `\\begin{minipage}[t]{${(1 / count).toFixed(2)}\\textwidth}\n`;
    for (const child of colChildren) {
      result += componentToLatex(child, layoutMode) + "\n";
    }
    if (colChildren.length === 0) {
      result += "% Column content here\n";
    }
    result += "\\end{minipage}";
    if (i < count - 1) {
      result += `\\hspace{${gap}}`;
    }
    result += "\n";
  }

  return result;
}

function vspaceToLatex(props) {
  return `\\vspace{${props.amount || "1"}${props.unit || "cm"}}`;
}

function listToLatex(type, props) {
  const env = type === "enumerate" ? "enumerate" : "itemize";
  const items = props.items || ["Item"];

  let result = `\\begin{${env}}\n`;
  for (const item of items) {
    result += `  \\item ${item}\n`;
  }
  result += `\\end{${env}}`;
  return result;
}

function titleblockToLatex() {
  // Title/author/date are set in the preamble; here we just output \maketitle
  return "\\maketitle";
}

function abstractToLatex(props) {
  return `\\begin{abstract}\n${props.content || ""}\n\\end{abstract}`;
}

function tableofcontentsToLatex() {
  return "\\tableofcontents\n\\newpage";
}

function bibliographyToLatex(props) {
  return `\\bibliographystyle{${props.style || "plain"}}\n\\bibliography{${props.bibFile || "references"}}`;
}

function customToLatex(props) {
  return props.latex || "";
}

// ==========================================
// MAIN DISPATCHER
// ==========================================

function componentToLatex(component, layoutMode = "flow") {
  const { type, props, children, position } = component;

  let latex = "";

  switch (type) {
    case "section":       latex = sectionToLatex(props); break;
    case "paragraph":     latex = paragraphToLatex(props); break;
    case "newpage":       latex = newpageToLatex(); break;
    case "hrule":         latex = hruleToLatex(props); break;
    case "text":          latex = textToLatex(props); break;
    case "math":          latex = mathToLatex(props); break;
    case "code":          latex = codeToLatex(props); break;
    case "blockquote":    latex = blockquoteToLatex(props); break;
    case "image":         latex = imageToLatex(props); break;
    case "table":         latex = tableToLatex(props); break;
    case "columns":       latex = columnsToLatex(props, children, layoutMode); break;
    case "vspace":        latex = vspaceToLatex(props); break;
    case "itemize":       latex = listToLatex("itemize", props); break;
    case "enumerate":     latex = listToLatex("enumerate", props); break;
    case "titleblock":    latex = titleblockToLatex(props); break;
    case "abstract":      latex = abstractToLatex(props); break;
    case "tableofcontents": latex = tableofcontentsToLatex(); break;
    case "bibliography":  latex = bibliographyToLatex(props); break;
    case "customcommand": latex = customToLatex(props); break;
    default:              latex = `% Unknown component: ${type}`;
  }

  // Wrap in absolute position if needed
  if (layoutMode === "absolute" && position && (position.x || position.y)) {
    return `\\begin{textblock*}{\\textwidth}(${position.x}mm, ${position.y}mm)\n${latex}\n\\end{textblock*}`;
  }

  return latex;
}

// ==========================================
// BODY GENERATION
// ==========================================

function generateBody(components, layoutMode) {
  const lines = [];

  for (const comp of components) {
    const latex = componentToLatex(comp, layoutMode);
    if (latex.trim()) {
      lines.push(latex);
      lines.push(""); // blank line between components
    }
  }

  return lines.join("\n");
}

// ==========================================
// FULL DOCUMENT GENERATION
// ==========================================

export function generateFullDocument(schema) {
  const parts = [];

  // 1. Preamble
  parts.push(generatePreamble(schema));

  // 2. Begin document
  parts.push("\\begin{document}");
  parts.push("");

  // 3. Body
  parts.push(generateBody(schema.components, schema.layoutMode));

  // 4. End document
  parts.push("\\end{document}");
  parts.push("");

  return parts.join("\n");
}

/** Generate just the preamble (for preview). */
export { generatePreamble };

/** Generate LaTeX for a single component (for component preview). */
export { componentToLatex };

export default generateFullDocument;
