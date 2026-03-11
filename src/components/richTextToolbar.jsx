import React from "react";

export const RichTextToolbar = ({ id }) => (
  <div id={id || "richtext-main-toolbar"} className="richtext-toolbar flex items-center gap-1 border-b pb-1 mb-2 bg-white sticky top-0 z-10 px-2 py-1 flex-wrap">
    <style>{`
      .ql-picker.ql-customFormat, .ql-picker.ql-customInsert { 
        width: 115px; 
      }
      .ql-picker.ql-customFormat .ql-picker-label::before { content: 'Format'; font-weight: 500; font-family: inherit; }
      .ql-picker.ql-customInsert .ql-picker-label::before { content: 'Insert'; font-weight: 500; font-family: inherit; }

      .ql-picker.ql-customFormat .ql-picker-item[data-value="bold"]::before { content: 'Bold'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="italic"]::before { content: 'Italic'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="underline"]::before { content: 'Underline'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="strike"]::before { content: 'Strikethrough'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="h1"]::before { content: 'Section (H1)'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="h2"]::before { content: 'Subsection (H2)'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="h3"]::before { content: 'Subsubsection (H3)'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="list-ordered"]::before { content: 'Numbered List'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="list-bullet"]::before { content: 'Bulleted List'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="indent"]::before { content: 'Indent'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="outdent"]::before { content: 'Outdent'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="quote"]::before { content: 'Quotation'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="sup"]::before { content: 'Superscript'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="sub"]::before { content: 'Subscript'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="code"]::before { content: 'Code Block'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="clean"]::before { content: 'Clear Formatting'; }

      .ql-picker.ql-customInsert .ql-picker-item[data-value="table"]::before { content: 'Table'; }
      .ql-picker.ql-customInsert .ql-picker-item[data-value="image"]::before { content: 'Image'; }
      .ql-picker.ql-customInsert .ql-picker-item[data-value="formula"]::before { content: 'Equation'; }
      .ql-picker.ql-customInsert .ql-picker-item[data-value="citation"]::before { content: 'Citation'; }
      .ql-picker.ql-customInsert .ql-picker-item[data-value="footnote"]::before { content: 'Footnote'; }
      .ql-picker.ql-customInsert .ql-picker-item[data-value="ref"]::before { content: 'Cross-Reference'; }
      .ql-picker.ql-customInsert .ql-picker-item[data-value="pagebreak"]::before { content: 'Page Break'; }
    `}</style>
    <span className="ql-formats flex items-center border-r pr-2 mr-2">
      <select className="ql-customFormat custom-select-richtext" defaultValue="" title="Format Text">
        <option value="" disabled hidden>Format</option>
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
    
    <span className="ql-formats flex items-center border-r pr-2 mr-2">
      <select className="ql-customInsert custom-select-richtext" defaultValue="" title="Insert Elements">
        <option value="" disabled hidden>Insert</option>
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

    <span className="ql-formats">
      <button className="ql-bold" title="Bold"></button>
      <button className="ql-italic" title="Italic"></button>
      <button className="ql-underline" title="Underline"></button>
      <button className="ql-strike" title="Strikethrough"></button>
    </span>
    
    <span className="ql-formats">
      <button className="ql-header" value="1" title="Section (H1)"></button>
      <button className="ql-header" value="2" title="Subsection (H2)"></button>
      <button className="ql-header" value="3" title="Subsubsection (H3)"></button>
    </span>

    <span className="ql-formats">
      <button className="ql-script" value="super" title="Superscript"></button>
      <button className="ql-script" value="sub" title="Subscript"></button>
    </span>

    <span className="ql-formats">
      <button className="ql-blockquote" title="Quotation"></button>
      <button className="ql-code-block" title="Code Block"></button>
    </span>

    <span className="ql-formats">
      <button className="ql-list" value="ordered" title="Numbered List"></button>
      <button className="ql-list" value="bullet" title="Bulleted List"></button>
    </span>

    <span className="ql-formats">
      <button className="ql-table" title="Insert Table"></button>
      <button className="ql-image" title="Insert Image"></button>
      <button className="ql-formula" title="Insert Equation"></button>
    </span>

    <span className="ql-formats">
      <button className="ql-citation" title="Insert Citation"></button>
      <button className="ql-footnote" title="Insert Footnote"></button>
      <button className="ql-ref" title="Insert Cross-Reference"></button>
      <button className="ql-pagebreak" title="Insert Page Break"></button>
    </span>

    <span className="ql-formats">
      <button className="ql-clean" title="Clear Formatting"></button>
    </span>
  </div>
);

export const getRichTextHandlers = () => ({
  customFormat: function (value) {
    if (!value) return;
    const quill = this.quill;
    const format = quill.getFormat();
    switch (value) {
      case "bold": quill.format("bold", !format.bold, "user"); break;
      case "italic": quill.format("italic", !format.italic, "user"); break;
      case "underline": quill.format("underline", !format.underline, "user"); break;
      case "strike": quill.format("strike", !format.strike, "user"); break;
      case "h1": quill.format("header", 1, "user"); break;
      case "h2": quill.format("header", 2, "user"); break;
      case "h3": quill.format("header", 3, "user"); break;
      case "list-ordered": quill.format("list", "ordered", "user"); break;
      case "list-bullet": quill.format("list", "bullet", "user"); break;
      case "indent": quill.format("indent", "+1", "user"); break;
      case "outdent": quill.format("indent", "-1", "user"); break;
      case "quote": quill.format("blockquote", !format.blockquote, "user"); break;
      case "sup": quill.format("script", "super", "user"); break;
      case "sub": quill.format("script", "sub", "user"); break;
      case "code": quill.format("code-block", !format["code-block"], "user"); break;
      case "clean": quill.removeFormat(quill.getSelection()?.index || 0, quill.getSelection()?.length || 0, "user"); break;
    }
    // reset picker
    try { if (document.activeElement) document.activeElement.blur(); } catch(e) {}
  },
  customInsert: function (value) {
    if (!value) return;
    const quill = this.quill;
    
    const dispatchInsert = (type) => {
       const cursorPosition = quill.savedCursorPosition ?? quill.getSelection()?.index ?? 0;
       
       if (type === 'footnote') {
         document.dispatchEvent(new CustomEvent("trigger-open-sidebar", { detail: { panelClass: 'footnote', quill } }));
       } else if (type === 'citation') {
         document.dispatchEvent(new CustomEvent("trigger-open-sidebar", { detail: { panelClass: 'citation', quill } }));
       } else if (type === 'ref') {
         document.dispatchEvent(new CustomEvent("trigger-open-sidebar", { detail: { panelClass: 'crossref', quill } }));
       } else if (type === 'pagebreak') {
         quill.insertEmbed(cursorPosition, "page-break", true, "user");
         quill.setSelection(cursorPosition + 1);
       } else if (type === 'table') {
         document.dispatchEvent(new CustomEvent("trigger-insert-table", { detail: { quill } }));
       } else if (type === 'image') {
         document.dispatchEvent(new CustomEvent("trigger-insert-image", { detail: { quill } }));
       } else if (type === 'formula') {
         document.dispatchEvent(new CustomEvent("trigger-insert-math", { detail: { quill } }));
       }
    };
    
    dispatchInsert(value);

    // reset picker
    try { if (document.activeElement) document.activeElement.blur(); } catch(e) {}
  },
  // the individual button handlers:
  table: function () {
    document.dispatchEvent(new CustomEvent("trigger-insert-table", { detail: { quill: this.quill } }));
  },
  image: function () {
    document.dispatchEvent(new CustomEvent("trigger-insert-image", { detail: { quill: this.quill } }));
  },
  formula: function () {
    document.dispatchEvent(new CustomEvent("trigger-insert-math", { detail: { quill: this.quill } }));
  },
  citation: function () {
    document.dispatchEvent(new CustomEvent("trigger-insert-citation", { detail: { quill: this.quill } }));
  },
  footnote: function () {
    const text = prompt("Enter footnote text:");
    if (text) {
      const cursorPosition = this.quill.savedCursorPosition ?? this.quill.getSelection()?.index ?? 0;
      this.quill.insertEmbed(cursorPosition, "latex-inline", { type: "footnote", value: text }, "user");
      this.quill.setSelection(cursorPosition + 1);
    }
  },
  ref: function () {
    const text = prompt("Enter reference label:");
    if (text) {
      const cursorPosition = this.quill.savedCursorPosition ?? this.quill.getSelection()?.index ?? 0;
      this.quill.insertEmbed(cursorPosition, "latex-inline", { type: "ref", value: text }, "user");
      this.quill.setSelection(cursorPosition + 1);
    }
  },
  pagebreak: function () {
    const cursorPosition = this.quill.savedCursorPosition ?? this.quill.getSelection()?.index ?? 0;
    this.quill.insertEmbed(cursorPosition, "page-break", true, "user");
    this.quill.setSelection(cursorPosition + 1);
  }
});
