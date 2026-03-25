import React from "react";

/**
 * RichTextToolbar – Decoupled from Quill.
 * Works with any contentEditable editor via an `editorRef`.
 *
 * Props:
 *  - id        : toolbar element id
 *  - editorRef : React ref to the RichTextCanvas instance
 */
export const RichTextToolbar = ({ id, editorRef }) => {
  const exec = (command, value = null) => {
    editorRef?.current?.execFormat?.(command, value);
  };

  const handleFormat = (e) => {
    const value = e.target.value;
    if (!value) return;
    e.target.value = ""; // reset picker

    switch (value) {
      case "bold":
        exec("bold");
        break;
      case "italic":
        exec("italic");
        break;
      case "underline":
        exec("underline");
        break;
      case "strike":
        exec("strikeThrough");
        break;
      case "h1":
        exec("formatBlock", "h1");
        break;
      case "h2":
        exec("formatBlock", "h2");
        break;
      case "h3":
        exec("formatBlock", "h3");
        break;
      case "list-ordered":
        exec("insertOrderedList");
        break;
      case "list-bullet":
        exec("insertUnorderedList");
        break;
      case "indent":
        exec("indent");
        break;
      case "outdent":
        exec("outdent");
        break;
      case "quote":
        exec("formatBlock", "blockquote");
        break;
      case "sup":
        exec("superscript");
        break;
      case "sub":
        exec("subscript");
        break;
      case "code":
        exec("formatBlock", "pre");
        break;
      case "clean":
        exec("removeFormat");
        exec("formatBlock", "p");
        break;
      default:
        break;
    }
  };

  const handleInsert = (e) => {
    const value = e.target.value;
    if (!value) return;
    e.target.value = ""; // reset picker
    dispatchInsert(value);
  };

  const dispatchInsert = (type) => {
    if (type === "footnote") {
      const text = prompt("Enter footnote text:");
      if (text) {
        editorRef?.current?.insertHTML?.(
          `<span class="dc-latex-inline" data-latex-type="footnote" data-latex-value="${text.replace(/"/g, "&quot;")}" contenteditable="false">${text}</span>`,
        );
      }
    } else if (type === "citation") {
      document.dispatchEvent(
        new CustomEvent("trigger-open-sidebar", {
          detail: { panelClass: "citation", editorRef },
        }),
      );
    } else if (type === "ref") {
      const label = prompt("Enter reference label:");
      if (label) {
        editorRef?.current?.insertHTML?.(
          `<span class="dc-latex-inline" data-latex-type="ref" data-latex-value="${label.replace(/"/g, "&quot;")}" contenteditable="false">${label}</span>`,
        );
      }
    } else if (type === "pagebreak") {
      editorRef?.current?.insertHTML?.('<hr class="dc-pagebreak">');
    } else if (type === "table") {
      document.dispatchEvent(
        new CustomEvent("trigger-insert-table", { detail: { editorRef } }),
      );
    } else if (type === "image") {
      document.dispatchEvent(
        new CustomEvent("trigger-insert-image", { detail: { editorRef } }),
      );
    } else if (type === "formula") {
      document.dispatchEvent(
        new CustomEvent("trigger-insert-math", { detail: { editorRef } }),
      );
    }
  };

  return (
    <div id={id || "richtext-main-toolbar"} className="dc-toolbar">
      {/* Format Dropdown */}
      <span className="dc-toolbar-group">
        <select onChange={handleFormat} defaultValue="" title="Format Text">
          <option value="" disabled hidden>
            Format
          </option>
          <option value="bold">Bold</option>
          <option value="italic">Italic</option>
          <option value="underline">Underline</option>
          <option value="strike">Strikethrough</option>
          <option disabled>──────────</option>
          <option value="h1">Section (H1)</option>
          <option value="h2">Subsection (H2)</option>
          <option value="h3">Subsubsection (H3)</option>
          <option disabled>──────────</option>
          <option value="list-ordered">Numbered List</option>
          <option value="list-bullet">Bulleted List</option>
          <option value="indent">Indent</option>
          <option value="outdent">Outdent</option>
          <option value="quote">Quotation</option>
          <option disabled>──────────</option>
          <option value="sup">Superscript</option>
          <option value="sub">Subscript</option>
          <option value="code">Code Block</option>
          <option disabled>──────────</option>
          <option value="clean">Clear Formatting</option>
        </select>
      </span>

      {/* Insert Dropdown */}
      <span className="dc-toolbar-group">
        <select onChange={handleInsert} defaultValue="" title="Insert Elements">
          <option value="" disabled hidden>
            Insert
          </option>
          <option value="table">Table</option>
          <option value="image">Image</option>
          <option value="formula">Equation</option>
          <option disabled>──────────</option>
          <option value="citation">Citation</option>
          <option value="footnote">Footnote</option>
          <option value="ref">Cross-Reference</option>
          <option value="pagebreak">Page Break</option>
        </select>
      </span>

      {/* Quick format buttons */}
      <span className="dc-toolbar-group">
        <button onClick={() => exec("bold")} title="Bold">
          <b>B</b>
        </button>
        <button onClick={() => exec("italic")} title="Italic">
          <i>I</i>
        </button>
        <button onClick={() => exec("underline")} title="Underline">
          <u>U</u>
        </button>
        <button onClick={() => exec("strikeThrough")} title="Strikethrough">
          <s>S</s>
        </button>
      </span>

      <span className="dc-toolbar-group">
        <button
          onClick={() => exec("formatBlock", "h1")}
          title="Section (H1)"
          className="dc-text-btn"
        >
          H1
        </button>
        <button
          onClick={() => exec("formatBlock", "h2")}
          title="Subsection (H2)"
          className="dc-text-btn"
        >
          H2
        </button>
        <button
          onClick={() => exec("formatBlock", "h3")}
          title="Subsubsection (H3)"
          className="dc-text-btn"
        >
          H3
        </button>
      </span>

      <span className="dc-toolbar-group">
        <button
          onClick={() => exec("superscript")}
          title="Superscript"
          className="dc-text-btn"
        >
          x²
        </button>
        <button
          onClick={() => exec("subscript")}
          title="Subscript"
          className="dc-text-btn"
        >
          x₂
        </button>
      </span>

      <span className="dc-toolbar-group">
        <button
          onClick={() => exec("formatBlock", "blockquote")}
          title="Quotation"
          className="dc-text-btn"
        >
          ❝
        </button>
        <button
          onClick={() => exec("formatBlock", "pre")}
          title="Code Block"
          className="dc-text-btn"
        >
          {"</>"}
        </button>
      </span>

      <span className="dc-toolbar-group">
        <button
          onClick={() => exec("insertOrderedList")}
          title="Numbered List"
          className="dc-text-btn"
        >
          1.
        </button>
        <button
          onClick={() => exec("insertUnorderedList")}
          title="Bulleted List"
          className="dc-text-btn"
        >
          •
        </button>
      </span>

      <span className="dc-toolbar-group">
        <button
          onClick={() => dispatchInsert("table")}
          title="Insert Table"
          className="dc-text-btn"
        >
          Table
        </button>
        <button
          onClick={() => dispatchInsert("image")}
          title="Insert Image"
          className="dc-text-btn"
        >
          Image
        </button>
        <button
          onClick={() => dispatchInsert("formula")}
          title="Insert Equation"
          className="dc-text-btn"
        >
          Math
        </button>
      </span>

      <span className="dc-toolbar-group">
        <button
          onClick={() => dispatchInsert("citation")}
          title="Insert Citation"
          className="dc-text-btn"
        >
          Cite
        </button>
        <button
          onClick={() => dispatchInsert("footnote")}
          title="Insert Footnote"
          className="dc-text-btn"
        >
          Fn
        </button>
        <button
          onClick={() => dispatchInsert("ref")}
          title="Insert Cross-Reference"
          className="dc-text-btn"
        >
          Ref
        </button>
        <button
          onClick={() => dispatchInsert("pagebreak")}
          title="Insert Page Break"
          className="dc-text-btn"
        >
          Break
        </button>
      </span>

      <span className="dc-toolbar-group">
        <button
          onClick={() => {
            exec("removeFormat");
            exec("formatBlock", "p");
          }}
          title="Clear Formatting"
          className="dc-text-btn"
        >
          ✕
        </button>
      </span>
    </div>
  );
};

export default RichTextToolbar;
