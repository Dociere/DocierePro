import ReactQuill from "react-quill-new";

const Quill = ReactQuill.Quill || ReactQuill;
const BlockEmbed = Quill.import("blots/block/embed");

class LatexBlockBlot extends BlockEmbed {
  static blotName = "latex-block";
  static tagName = "DIV";
  static className = "ql-latex-block";

  static create(value) {
    const node = super.create();
    node.setAttribute("data-latex", value.latex || "");
    node.setAttribute("data-type", value.type || "block");
    node.contentEditable = "false";

    // Decode LaTeX for preview
    let rawLatex = "";
    try {
      rawLatex = decodeURIComponent(escape(atob(value.latex)));
    } catch {
      rawLatex = value.latex || "";
    }

    // Container styling (Dociere gray theme)
    Object.assign(node.style, {
      margin: "8px 0",
      padding: "10px 12px",
      border: "1px solid #e2e2e2",
      borderLeft: "3px solid #9ca3af",
      borderRadius: "4px",
      background: "#f9fafb",
      cursor: "default",
      userSelect: "none",
    });

    // Label
    const label = document.createElement("span");
    Object.assign(label.style, {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "11px",
      fontWeight: "600",
      color: "#6b7280",
      display: "block",
      marginBottom: "6px",
    });
    const icons = { table: "Table", figure: "Figure", equation: "Equation" };
    let labelText = icons[value.type] || "📦 LaTeX Block";
    // Extract caption for tables
    if (value.type === "table") {
      const m = rawLatex.match(/\\caption\{([^}]+)\}/);
      if (m) labelText += ": " + m[1];
    }
    label.textContent = labelText;

    // LaTeX source preview
    const pre = document.createElement("pre");
    Object.assign(pre.style, {
      margin: "0",
      padding: "8px",
      background: "#f3f4f6",
      borderRadius: "3px",
      fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace",
      fontSize: "11px",
      color: "#4b5563",
      lineHeight: "1.5",
      whiteSpace: "pre-wrap",
      wordWrap: "break-word",
      maxHeight: "120px",
      overflowY: "auto",
      border: "1px solid #e5e7eb",
    });
    pre.textContent = rawLatex;

    // Hint
    const hint = document.createElement("span");
    Object.assign(hint.style, {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "10px",
      color: "#9ca3af",
      display: "block",
      marginTop: "4px",
      fontStyle: "italic",
    });
    hint.textContent = "Switch to Code View to edit";

    node.appendChild(label);
    node.appendChild(pre);
    node.appendChild(hint);

    return node;
  }

  static value(node) {
    return {
      latex: node.getAttribute("data-latex") || "",
      type: node.getAttribute("data-type") || "block",
    };
  }
}

Quill.register(LatexBlockBlot, true);

export default LatexBlockBlot;
