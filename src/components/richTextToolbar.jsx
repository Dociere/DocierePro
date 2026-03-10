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
      .ql-picker.ql-customFormat .ql-picker-item[data-value="h1"]::before { content: 'Header 1'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="h2"]::before { content: 'Header 2'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="h3"]::before { content: 'Header 3'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="list-ordered"]::before { content: 'Numbered List'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="list-bullet"]::before { content: 'Bulleted List'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="indent"]::before { content: 'Indent'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="outdent"]::before { content: 'Outdent'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="quote"]::before { content: 'Quotation'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="sup"]::before { content: 'Superscript'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="sub"]::before { content: 'Subscript'; }
      .ql-picker.ql-customFormat .ql-picker-item[data-value="code"]::before { content: 'Code'; }

      .ql-picker.ql-customInsert .ql-picker-item[data-value="table"]::before { content: 'Table'; }
      .ql-picker.ql-customInsert .ql-picker-item[data-value="image"]::before { content: 'Image'; }
      .ql-picker.ql-customInsert .ql-picker-item[data-value="formula"]::before { content: 'Equation'; }
      .ql-picker.ql-customInsert .ql-picker-item[data-value="citation"]::before { content: 'Citation'; }
      .ql-picker.ql-customInsert .ql-picker-item[data-value="footnote"]::before { content: 'Footnote'; }
      .ql-picker.ql-customInsert .ql-picker-item[data-value="ref"]::before { content: 'Cross-Reference'; }
      .ql-picker.ql-customInsert .ql-picker-item[data-value="pagebreak"]::before { content: 'Page Break'; }
    `}</style>
    <span className="ql-formats flex items-center border-r pr-2 mr-2">
      <select className="ql-customFormat custom-select-richtext" defaultValue="">
        <option value="" disabled hidden>Format</option>
        <option value="bold">Bold</option>
        <option value="italic">Italic</option>
        <option disabled>──────────</option>
        <option value="h1">Header 1</option>
        <option value="h2">Header 2</option>
        <option value="h3">Header 3</option>
        <option disabled>──────────</option>
        <option value="list-ordered">Numbered List</option>
        <option value="list-bullet">Bulleted List</option>
        <option value="indent">Indent</option>
        <option value="outdent">Outdent</option>
        <option value="quote">Quotation</option>
        <option disabled>──────────</option>
        <option value="sup">Superscript</option>
        <option value="sub">Subscript</option>
        <option value="code">Code</option>
      </select>
    </span>
    
    <span className="ql-formats flex items-center border-r pr-2 mr-2">
      <select className="ql-customInsert custom-select-richtext" defaultValue="">
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
      <button className="ql-bold"></button>
      <button className="ql-italic"></button>
    </span>
    
    <span className="ql-formats">
      <button className="ql-header" value="1"></button>
      <button className="ql-header" value="2"></button>
      <button className="ql-header" value="3"></button>
    </span>

    <span className="ql-formats">
      <button className="ql-script" value="super"></button>
      <button className="ql-script" value="sub"></button>
    </span>

    <span className="ql-formats">
      <button className="ql-blockquote"></button>
      <button className="ql-code-block"></button>
    </span>

    <span className="ql-formats">
      <button className="ql-list" value="ordered"></button>
      <button className="ql-list" value="bullet"></button>
    </span>

    <span className="ql-formats">
      <button className="ql-table"></button>
      <button className="ql-image"></button>
      <button className="ql-formula"></button>
    </span>

    <span className="ql-formats">
      <button className="ql-clean"></button>
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
    }
    // reset select by closing the picker programmatically if possible
    try {
      if (document.activeElement) document.activeElement.blur();
    } catch(e) {}
  },
  customInsert: function (value) {
    if (!value) return;
    const quill = this.quill;
    
    const dispatchInsert = (type) => {
       const cursorPosition = quill.getSelection()?.index || 0;
       
       if (type === 'footnote') {
         const text = prompt("Enter footnote text:");
         if (text) {
           quill.insertEmbed(cursorPosition, "latex-inline", { type: "footnote", value: text }, "user");
           quill.setSelection(cursorPosition + 1);
         }
       } else if (type === 'citation') {
         const text = prompt("Enter citation key (e.g. Smith2024):");
         if (text) {
           quill.insertEmbed(cursorPosition, "latex-inline", { type: "citation", value: text }, "user");
           quill.setSelection(cursorPosition + 1);
         }
       } else if (type === 'ref') {
         const text = prompt("Enter reference label:");
         if (text) {
           quill.insertEmbed(cursorPosition, "latex-inline", { type: "ref", value: text }, "user");
           quill.setSelection(cursorPosition + 1);
         }
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

    dispatchInsert(value);

    // reset select by closing the picker programmatically if possible
    try {
      if (document.activeElement) document.activeElement.blur();
    } catch(e) {}
  },
  // the individual button handlers:
  footnote: function () {
    const text = prompt("Enter footnote text:");
    if (text) {
      const cursorPosition = this.quill.getSelection()?.index || 0;
      this.quill.insertEmbed(cursorPosition, "latex-inline", { type: "footnote", value: text }, "user");
      this.quill.setSelection(cursorPosition + 1);
    }
  },
  citation: function () {
    const text = prompt("Enter citation key (e.g. Smith2024):");
    if (text) {
      const cursorPosition = this.quill.getSelection()?.index || 0;
      this.quill.insertEmbed(cursorPosition, "latex-inline", { type: "citation", value: text }, "user");
      this.quill.setSelection(cursorPosition + 1);
    }
  },
  ref: function () {
    const text = prompt("Enter reference label (e.g. fig:1):");
    if (text) {
      const cursorPosition = this.quill.getSelection()?.index || 0;
      this.quill.insertEmbed(cursorPosition, "latex-inline", { type: "ref", value: text }, "user");
      this.quill.setSelection(cursorPosition + 1);
    }
  },
  pagebreak: function () {
    const cursorPosition = this.quill.getSelection()?.index || 0;
    this.quill.insertEmbed(cursorPosition, "page-break", true, "user");
    this.quill.setSelection(cursorPosition + 1);
  },
  table: function () {
    document.dispatchEvent(new CustomEvent("trigger-insert-table", { detail: { quill: this.quill } }));
  },
  image: function () {
    document.dispatchEvent(new CustomEvent("trigger-insert-image", { detail: { quill: this.quill } }));
  },
  formula: function () {
    document.dispatchEvent(new CustomEvent("trigger-insert-math", { detail: { quill: this.quill } }));
  }
});
