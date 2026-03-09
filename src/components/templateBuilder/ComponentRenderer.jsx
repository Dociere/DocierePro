/**
 * ComponentRenderer — Renders visual previews of each LaTeX component on the canvas.
 * These are WYSIWYG representations, NOT raw LaTeX code.
 */
import React from "react";
import {
  TbAlignLeft, TbMinus, TbAlignJustified,
  TbMath, TbCode, TbQuote, TbPhoto, TbTable, TbColumns, TbArrowAutofitHeight,
  TbList, TbListNumbers, TbFileDescription, TbNotes, TbListTree,
  TbBook2, TbTerminal, TbGripVertical,
} from "react-icons/tb";

// ==========================================
// INDIVIDUAL COMPONENT RENDERERS
// ==========================================

const SectionPreview = ({ props }) => {
  const sizes = { 1: "text-2xl", 2: "text-xl", 3: "text-lg" };
  const level = props.level || 1;
  const prefix = props.numbered !== false
    ? `${level === 1 ? "1" : level === 2 ? "1.1" : "1.1.1"} `
    : "";

  return (
    <div className={`${sizes[level] || "text-xl"} font-bold text-gray-900 font-serif`}>
      {prefix}{props.title || "Section Title"}
    </div>
  );
};

const ParagraphPreview = ({ props }) => (
  <div className="text-sm font-bold text-gray-700 italic">
    {props.title ? `¶ ${props.title}` : "¶ Paragraph break"}
  </div>
);

const NewPagePreview = () => (
  <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
    <div className="flex-1 border-t-2 border-dashed border-gray-300" />
    <span className="font-mono uppercase tracking-wider">Page Break</span>
    <div className="flex-1 border-t-2 border-dashed border-gray-300" />
  </div>
);

const HRulePreview = ({ props }) => (
  <div className="py-1">
    <hr
      className="border-gray-400"
      style={{ width: `${props.width || 100}%` }}
    />
  </div>
);

const TextPreview = ({ props }) => {
  const fontSizeMap = {
    tiny: "text-[10px]", scriptsize: "text-[11px]", footnotesize: "text-xs",
    small: "text-sm", normalsize: "text-base", large: "text-lg",
    Large: "text-xl", LARGE: "text-2xl", huge: "text-3xl",
  };
  const alignMap = { left: "text-left", center: "text-center", right: "text-right", justify: "text-justify" };

  return (
    <p
      className={`${fontSizeMap[props.fontSize] || "text-base"} ${alignMap[props.alignment] || "text-left"} text-gray-800 leading-relaxed ${props.bold ? "font-bold" : ""} ${props.italic ? "italic" : ""}`}
    >
      {props.content || "Enter your text here..."}
    </p>
  );
};

const MathPreview = ({ props }) => (
  <div className={`${props.displayMode === "inline" ? "inline" : "text-center py-3"} font-serif`}>
    <div className="inline-block bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-blue-900 font-mono text-base italic">
      {props.equation || "E = mc²"}
    </div>
    {props.numbered && props.displayMode !== "inline" && (
      <span className="text-gray-400 text-sm ml-4">(1)</span>
    )}
  </div>
);

const CodePreview = ({ props }) => (
  <div className="rounded-lg overflow-hidden border border-gray-300">
    {props.caption && (
      <div className="bg-gray-100 px-3 py-1.5 text-xs text-gray-500 border-b border-gray-300 font-medium">
        {props.caption}
      </div>
    )}
    <pre className="bg-[#1e1e1e] text-gray-200 p-3 text-xs font-mono overflow-x-auto leading-relaxed">
      {props.showNumbers !== false && (
        <span className="text-gray-600 select-none mr-3">1 │ </span>
      )}
      {(props.code || "// code").split("\n")[0]}
      {(props.code || "").split("\n").length > 1 && (
        <>
          {"\n"}
          <span className="text-gray-600 select-none mr-3">2 │ </span>
          {(props.code || "").split("\n")[1]}
          {(props.code || "").split("\n").length > 2 && (
            <span className="text-gray-500">{"\n"}  ...</span>
          )}
        </>
      )}
    </pre>
  </div>
);

const BlockquotePreview = ({ props }) => (
  <div className="border-l-4 border-gray-400 bg-gray-50 px-4 py-3 italic text-gray-700 text-sm rounded-r-lg">
    <p>{props.content || "Enter quotation..."}</p>
    {props.author && (
      <p className="text-gray-400 text-xs mt-2 not-italic">— {props.author}</p>
    )}
  </div>
);

const ImagePreview = ({ props }) => (
  <div className={`${props.centering ? "text-center" : ""}`}>
    <div className="inline-block border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50/50">
      <TbPhoto size={32} className="mx-auto text-gray-400 mb-2" />
      <p className="text-xs text-gray-500 font-mono">{props.path || "image.png"}</p>
      <p className="text-xs text-gray-400 mt-1">
        {props.width}{props.widthUnit || "\\textwidth"}
      </p>
    </div>
    {props.caption && (
      <p className="text-xs text-gray-500 mt-2 italic">Figure: {props.caption}</p>
    )}
  </div>
);

const TablePreview = ({ props }) => {
  const data = props.data || [];
  const numCols = props.cols || 3;
  const numRows = Math.min(props.rows || 3, 5); // show max 5 rows in preview
  const hasBorder = props.borderStyle !== "none";

  return (
    <div className={`${props.centering ? "flex justify-center" : ""}`}>
      <table className={`text-xs ${hasBorder ? "border-collapse border border-gray-400" : ""}`}>
        <tbody>
          {Array.from({ length: numRows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: numCols }).map((_, c) => (
                <td
                  key={c}
                  className={`px-3 py-1.5 ${hasBorder ? "border border-gray-300" : ""} ${
                    props.headerRow && r === 0 ? "font-bold bg-gray-100" : ""
                  }`}
                >
                  {data[r]?.[c] || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {props.caption && (
        <p className="text-xs text-gray-400 mt-1 text-center italic">Table: {props.caption}</p>
      )}
    </div>
  );
};

const ColumnsPreview = ({ props, children }) => {
  const count = props.count || 2;

  return (
    <div className="flex gap-2 w-full">
      {Array.from({ length: count }).map((_, i) => {
        const colChildren = (children || []).filter((_, idx) => idx % count === i);
        return (
          <div
            key={i}
            className="flex-1 border-2 border-dashed border-blue-200 rounded-lg p-3 bg-blue-50/30 min-h-[60px]"
          >
            {colChildren.length === 0 ? (
              <div className="text-xs text-blue-300 text-center pt-3">
                Column {i + 1}
                <br />
                <span className="text-[10px]">Drop here</span>
              </div>
            ) : (
              colChildren.map((child) => (
                <div key={child.id} className="mb-2">
                  <ComponentRenderer component={child} />
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
};

const VSpacePreview = ({ props }) => (
  <div className="flex items-center gap-2 text-xs text-gray-400">
    <div className="flex-1 border-t border-dotted border-gray-300" />
    <span className="font-mono">↕ {props.amount || "1"}{props.unit || "cm"}</span>
    <div className="flex-1 border-t border-dotted border-gray-300" />
  </div>
);

const ListPreview = ({ type, props }) => {
  const items = props.items || ["Item"];
  const isOrdered = type === "enumerate";

  return (
    <div className="text-sm text-gray-800 pl-2">
      {items.slice(0, 5).map((item, i) => (
        <div key={i} className="flex gap-2 mb-0.5">
          <span className="text-gray-400 font-mono text-xs mt-0.5 min-w-[16px]">
            {isOrdered ? `${i + 1}.` : "•"}
          </span>
          <span>{item}</span>
        </div>
      ))}
      {items.length > 5 && (
        <div className="text-xs text-gray-400 ml-5">...and {items.length - 5} more</div>
      )}
    </div>
  );
};

const TitleBlockPreview = ({ props }) => (
  <div className="text-center py-4 space-y-2">
    <h1 className="text-2xl font-bold text-gray-900 font-serif">
      {props.title || "Document Title"}
    </h1>
    <p className="text-sm text-gray-600">{props.author || "Author"}</p>
    {props.showDate && (
      <p className="text-xs text-gray-400">{props.date || "\\today"}</p>
    )}
  </div>
);

const AbstractPreview = ({ props }) => (
  <div className="space-y-1.5">
    <h3 className="text-sm font-bold text-gray-900 text-center tracking-wide">Abstract</h3>
    <p className="text-xs text-gray-600 leading-relaxed text-justify px-4">
      {(props.content || "Enter your abstract here...").substring(0, 200)}
      {(props.content || "").length > 200 ? "..." : ""}
    </p>
  </div>
);

const TOCPreview = () => (
  <div className="space-y-1.5 text-sm text-gray-600">
    <h3 className="font-bold text-gray-900 text-lg font-serif mb-2">Contents</h3>
    {["1  Introduction", "2  Methods", "3  Results", "4  Conclusion"].map((item, i) => (
      <div key={i} className="flex justify-between items-center">
        <span className={i > 0 ? "text-gray-500" : ""}>{item}</span>
        <span className="text-gray-400 text-xs ml-2 font-mono">{i + 1}</span>
      </div>
    ))}
  </div>
);

const BibliographyPreview = ({ props }) => (
  <div className="space-y-1">
    <h3 className="font-bold text-gray-900 font-serif">References</h3>
    <p className="text-xs text-gray-400">
      Style: {props.style || "plain"} · File: {props.bibFile || "references"}.bib
    </p>
    <div className="text-xs text-gray-500 space-y-1 mt-2">
      <p>[1] Author, A. "Title of Paper." <em>Journal</em>, 2024.</p>
      <p>[2] Author, B. "Another Paper." <em>Conference</em>, 2024.</p>
    </div>
  </div>
);

const CustomPreview = ({ props }) => (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
    <div className="text-[10px] font-bold text-yellow-600 uppercase mb-1 tracking-wider">Custom LaTeX</div>
    <pre className="text-xs text-yellow-900 font-mono overflow-x-auto">
      {(props.latex || "% code").substring(0, 120)}
      {(props.latex || "").length > 120 ? "..." : ""}
    </pre>
  </div>
);

// ==========================================
// MAIN RENDERER
// ==========================================

const ComponentRenderer = ({ component, isSelected, isDragging, onSelect }) => {
  const { type, props, children } = component;

  let content;
  switch (type) {
    case "section":         content = <SectionPreview props={props} />; break;
    case "paragraph":       content = <ParagraphPreview props={props} />; break;
    case "newpage":         content = <NewPagePreview />; break;
    case "hrule":           content = <HRulePreview props={props} />; break;
    case "text":            content = <TextPreview props={props} />; break;
    case "math":            content = <MathPreview props={props} />; break;
    case "code":            content = <CodePreview props={props} />; break;
    case "blockquote":      content = <BlockquotePreview props={props} />; break;
    case "image":           content = <ImagePreview props={props} />; break;
    case "table":           content = <TablePreview props={props} />; break;
    case "columns":         content = <ColumnsPreview props={props} children={children} />; break;
    case "vspace":          content = <VSpacePreview props={props} />; break;
    case "itemize":         content = <ListPreview type="itemize" props={props} />; break;
    case "enumerate":       content = <ListPreview type="enumerate" props={props} />; break;
    case "titleblock":      content = <TitleBlockPreview props={props} />; break;
    case "abstract":        content = <AbstractPreview props={props} />; break;
    case "tableofcontents": content = <TOCPreview />; break;
    case "bibliography":    content = <BibliographyPreview props={props} />; break;
    case "customcommand":   content = <CustomPreview props={props} />; break;
    default:
      content = <div className="text-xs text-gray-400 italic">Unknown: {type}</div>;
  }

  return (
    <div
      className={`group relative rounded-lg transition-all duration-150 ${
        isDragging
          ? "opacity-50 scale-[0.98]"
          : isSelected
            ? "ring-2 ring-black shadow-lg bg-white"
            : "hover:ring-1 hover:ring-gray-300 hover:shadow-sm bg-white"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(component.id);
      }}
    >
      {/* Drag handle */}
      <div className={`absolute -left-6 top-1/2 -translate-y-1/2 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing`}>
        <TbGripVertical size={16} />
      </div>

      {/* Component type badge */}
      <div className={`absolute -top-2 left-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full transition-opacity ${
        isSelected
          ? "bg-black text-white opacity-100"
          : "bg-gray-200 text-gray-500 opacity-0 group-hover:opacity-100"
      }`}>
        {type}
      </div>

      {/* Content */}
      <div className="px-4 py-3 mt-1">
        {content}
      </div>
    </div>
  );
};

export default ComponentRenderer;
