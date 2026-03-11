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

class FileMarkerBlot extends BlockEmbed {
  static blotName = "file-marker";
  static tagName = "DIV";
  static className = "ql-file-marker";

  static create(value) {
    const node = super.create();
    node.setAttribute("data-file", value.file || "");
    node.setAttribute("data-type", value.type || "start");
    node.contentEditable = "false";
    
    if (value.type === "start") {
      Object.assign(node.style, {
        padding: "4px 8px",
        background: "#e0f2fe", // light blue
        color: "#0369a1",
        fontSize: "12px",
        fontWeight: "600",
        borderLeft: "3px solid #0ea5e9",
        marginTop: "16px",
        marginBottom: "8px",
        userSelect: "none",
        fontFamily: "Inter, sans-serif"
      });
      let decodedFile = value.file;
      try { decodedFile = decodeURIComponent(escape(atob(value.file))); } catch(e) {}
      node.textContent = `📄 File: ${decodedFile}`;
    } else {
      Object.assign(node.style, {
        height: "0px", margin: "0", padding: "0", border: "0", overflow: "hidden"
      });
    }
    return node;
  }

  static value(node) {
    return {
      file: node.getAttribute("data-file") || "",
      type: node.getAttribute("data-type") || "start",
    };
  }
}

class EnvMarkerBlot extends BlockEmbed {
  static blotName = "env-marker";
  static tagName = "DIV";
  static className = "ql-env-marker";

  static create(value) {
    const node = super.create();
    node.setAttribute("data-env", value.env || "");
    node.setAttribute("data-type", value.type || "start");
    node.contentEditable = "false";
    
    if (value.type === "start") {
      Object.assign(node.style, {
        padding: "2px 8px",
        background: "#f3f4f6", // gray-100
        color: "#4b5563", // gray-600
        fontSize: "11px",
        fontWeight: "bold",
        textTransform: "uppercase",
        borderRadius: "4px",
        display: "inline-block",
        marginBottom: "8px",
        marginTop: "12px",
        userSelect: "none",
        fontFamily: "Inter, sans-serif"
      });
      let decodedEnv = value.env;
      try { decodedEnv = decodeURIComponent(escape(atob(value.env))); } catch(e) {}
      node.textContent = `[ ${decodedEnv} ]`;
    } else {
      Object.assign(node.style, {
        height: "0px", margin: "0", padding: "0", border: "0", overflow: "hidden"
      });
    }
    return node;
  }

  static value(node) {
    return {
      env: node.getAttribute("data-env") || "",
      type: node.getAttribute("data-type") || "start",
    };
  }
}

Quill.register(LatexBlockBlot);
Quill.register(FileMarkerBlot);
Quill.register(EnvMarkerBlot);

// ==========================================
// INLINE BLOTS (Citations, Footnotes, Refs)
// ==========================================
const Inline = Quill.import("blots/inline");

class LatexInlineBlot extends Inline {
  static blotName = "latex-inline";
  static tagName = "SPAN";

  static create(value) {
    const node = super.create();
    node.setAttribute("data-latex-type", value.type || "citation");
    node.setAttribute("data-latex-value", value.value || "");
    node.contentEditable = "false";

    // Styling for the "pill" look
    Object.assign(node.style, {
      display: "inline-block",
      margin: "0 2px",
      padding: "2px 6px",
      borderRadius: "12px",
      fontSize: "0.85em",
      fontWeight: "500",
      cursor: "pointer",
      userSelect: "none",
      verticalAlign: "baseline",
    });

    let prefix = "";
    let bgColor = "";
    let color = "";

    if (value.type === "citation") {
      prefix = "Ref: ";
      bgColor = "#e0e7ff"; // Indigo 100
      color = "#3730a3"; // Indigo 800
      node.title = `Citation: ${value.value}`;
    } else if (value.type === "footnote") {
      prefix = "Note: ";
      bgColor = "#fef3c7"; // Amber 100
      color = "#92400e"; // Amber 800
      node.style.verticalAlign = "super";
      node.style.fontSize = "0.75em";
      node.title = `Footnote: ${value.value}`;
    } else if (value.type === "ref") {
      prefix = "Fig/Tab: ";
      bgColor = "#dcfce7"; // Green 100
      color = "#166534"; // Green 800
      node.title = `Cross-Reference: ${value.value}`;
    }

    node.style.backgroundColor = bgColor;
    node.style.color = color;
    node.textContent = `[${prefix}${value.value}]`;

    return node;
  }

  static value(node) {
    return {
      type: node.getAttribute("data-latex-type") || "citation",
      value: node.getAttribute("data-latex-value") || "",
    };
  }
}

Quill.register(LatexInlineBlot, true);

// ==========================================
// BLOCK BLOTS (Page Break, etc)
// ==========================================
class PageBreakBlot extends BlockEmbed {
  static blotName = "page-break";
  static tagName = "HR";
  static className = "ql-pagebreak";

  static create() {
    const node = super.create();
    node.setAttribute("title", "Page Break (\\newpage)");
    
    Object.assign(node.style, {
      margin: "24px 0",
      border: "none",
      borderTop: "2px dashed #d1d5db", // gray-300
      position: "relative",
      overflow: "visible",
    });

    return node;
  }
}

Quill.register(PageBreakBlot, true);

export { LatexBlockBlot, LatexInlineBlot, PageBreakBlot, FileMarkerBlot, EnvMarkerBlot };

