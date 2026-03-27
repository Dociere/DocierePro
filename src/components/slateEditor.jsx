import React, { useMemo, useCallback, useEffect, useRef } from "react";
import {
  createEditor,
  Transforms,
  Editor,
  Element as SlateElement,
} from "slate";
import { Slate, Editable, withReact, useSlate } from "slate-react";
import { withHistory } from "slate-history";

// Import your translators from the AST Engine
import { astToSlate, slateToAst } from "../utils/latexAstEngine";

// ==========================================
// 1. SLATE PLUGINS & CONFIGURATION
// ==========================================

const withLatexBlocks = (editor) => {
  const { isVoid } = editor;
  editor.isVoid = (element) => {
    return element.type === "latex-block" ? true : isVoid(element);
  };
  return editor;
};

// ==========================================
// 2. CUSTOM RENDERERS
// ==========================================

const Element = ({ attributes, children, element }) => {
  switch (element.type) {
    case "heading":
      const Tag = `h${element.level || 1}`;
      return (
        <Tag
          {...attributes}
          className={`font-semibold text-gray-900 mt-6 mb-2 ${
            element.level === 1
              ? "text-2xl border-b pb-2"
              : element.level === 2
              ? "text-xl"
              : "text-lg"
          }`}
        >
          {children}
        </Tag>
      );
    // NEW: Render Bulleted and Numbered Lists
    case "bulleted-list":
      return (
        <ul
          {...attributes}
          className="list-disc ml-8 mb-4 text-gray-700 space-y-1"
        >
          {children}
        </ul>
      );
    case "numbered-list":
      return (
        <ol
          {...attributes}
          className="list-decimal ml-8 mb-4 text-gray-700 space-y-1"
        >
          {children}
        </ol>
      );
    case "list-item":
      return <li {...attributes}>{children}</li>;

    // NEW: Render Editable Environments (Abstracts, Keywords)
    case "editable-env":
      return (
        <div
          {...attributes}
          className="my-6 p-5 border border-gray-200 bg-white shadow-sm rounded relative"
        >
          <span
            contentEditable={false}
            className="absolute -top-3 left-4 bg-white px-2 text-xs font-bold text-blue-600 uppercase tracking-widest"
          >
            {element.env}
          </span>
          {children}
        </div>
      );

    case "latex-block":
      return (
        <div
          {...attributes}
          contentEditable={false}
          className="my-4 p-3 bg-gray-50 border-l-4 border-blue-500 rounded shadow-sm select-none"
        >
          <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
            📦 {element.env || "LaTeX Block"} (Read-Only in Visual Mode)
          </div>
          <pre className="text-xs font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap">
            {element.rawLatex}
          </pre>
          <div className="hidden">{children}</div>
        </div>
      );
    default:
      return (
        <p {...attributes} className="mb-3 text-gray-700 leading-relaxed">
          {children}
        </p>
      );
  }
};

const Leaf = ({ attributes, children, leaf }) => {
  if (leaf.bold) children = <strong>{children}</strong>;
  if (leaf.italic) children = <em>{children}</em>;
  if (leaf.underline) children = <u>{children}</u>;
  if (leaf.code)
    children = (
      <code className="bg-gray-100 px-1 rounded text-red-500 font-mono text-sm">
        {children}
      </code>
    );
  return <span {...attributes}>{children}</span>;
};

const MarkButton = ({ format, icon }) => {
  const editor = useSlate();
  const isActive = isMarkActive(editor, format);
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        toggleMark(editor, format);
      }}
      className={`px-3 py-1 text-sm font-semibold rounded hover:bg-gray-200 transition-colors ${
        isActive ? "bg-gray-200 text-blue-600" : "text-gray-600"
      }`}
    >
      {icon}
    </button>
  );
};

const isMarkActive = (editor, format) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
};

const toggleMark = (editor, format) => {
  const isActive = isMarkActive(editor, format);
  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

const isBlockActive = (editor, format) => {
  const [match] = Editor.nodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === format,
  });
  return !!match;
};

const toggleBlock = (editor, format) => {
  const isActive = isBlockActive(editor, format);
  const isList = ["bulleted-list", "numbered-list"].includes(format);

  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      ["bulleted-list", "numbered-list"].includes(n.type),
    split: true,
  });

  const newProperties = {
    type: isActive ? "paragraph" : isList ? "list-item" : format,
  };
  Transforms.setNodes(editor, newProperties);

  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor, block);
  }
};

const BlockButton = ({ format, icon }) => {
  const editor = useSlate();
  const isActive = isBlockActive(editor, format);
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        toggleBlock(editor, format);
      }}
      className={`px-3 py-1 text-sm font-semibold rounded hover:bg-gray-200 transition-colors ${
        isActive ? "bg-gray-200 text-blue-600" : "text-gray-600"
      }`}
    >
      {icon}
    </button>
  );
};
// ==========================================
// 4. MAIN EDITOR COMPONENT
// ==========================================

const SlateEditorPanel = ({ globalAst, onAstChange }) => {
  const editor = useMemo(
    () => withLatexBlocks(withHistory(withReact(createEditor()))),
    [],
  );
  const isInternalChange = useRef(false);

  // FIX 1: Extract ONLY the body contents for Slate
  const bodyNodes = useMemo(() => {
    if (!globalAst) return [];
    const contentArray =
      globalAst.type === "root" ? globalAst.content : globalAst;
    if (!Array.isArray(contentArray)) return [];

    const docEnv = contentArray.find(
      (n) => n.type === "environment" && n.env === "document",
    );
    return docEnv ? docEnv.content : contentArray;
  }, [globalAst]);

  const initialValue = useMemo(() => astToSlate(bodyNodes), []);

  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    const newSlateValue = astToSlate(bodyNodes);

    // FIX 2: Clear selection before swapping to prevent Ghost Cursor crash
    Transforms.deselect(editor);
    editor.children = newSlateValue;
    editor.onChange();
  }, [bodyNodes, editor]);

  const handleChange = (newValue) => {
    const isAstChange = editor.operations.some(
      (op) => op.type !== "set_selection",
    );

    if (isAstChange) {
      isInternalChange.current = true;

      const updatedBodyNodes = slateToAst(newValue);

      // Merge the updated body back into the global AST (preserving preamble)
      let clonedAst = globalAst
        ? structuredClone(globalAst)
        : { type: "root", content: [] };
      const contentArray =
        clonedAst.type === "root" ? clonedAst.content : clonedAst;
      const docEnv = contentArray.find(
        (n) => n.type === "environment" && n.env === "document",
      );

      if (docEnv) {
        docEnv.content = updatedBodyNodes;
      } else {
        if (clonedAst.type === "root") {
          clonedAst.content = updatedBodyNodes;
        } else {
          clonedAst = updatedBodyNodes;
        }
      }

      onAstChange(clonedAst);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <Slate
        editor={editor}
        initialValue={initialValue}
        onChange={handleChange}
      >
        {/* Simple Toolbar */}
        <div className="flex gap-1 p-2 border-b border-gray-200 bg-gray-50 sticky top-0 z-10 flex-wrap items-center">
          <MarkButton format="bold" icon="B" />
          <MarkButton format="italic" icon="I" />
          <MarkButton format="underline" icon="U" />
          <div className="w-px h-5 bg-gray-300 mx-2" />

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              toggleBlock(editor, "heading");
              Transforms.setNodes(editor, { level: 1 });
            }}
            className={`px-3 py-1 text-sm font-semibold rounded hover:bg-gray-200 text-gray-600 ${
              isBlockActive(editor, "heading") ? "bg-gray-200" : ""
            }`}
          >
            H1
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              toggleBlock(editor, "heading");
              Transforms.setNodes(editor, { level: 2 });
            }}
            className={`px-3 py-1 text-sm font-semibold rounded hover:bg-gray-200 text-gray-600`}
          >
            H2
          </button>

          <div className="w-px h-5 bg-gray-300 mx-2" />
          <BlockButton format="bulleted-list" icon="• List" />
          <BlockButton format="numbered-list" icon="1. List" />
        </div>

        {/* Editable Canvas */}
        <div className="flex-1 overflow-y-auto p-8 lg:px-24">
          <Editable
            renderElement={useCallback(
              (props) => (
                <Element {...props} />
              ),
              [],
            )}
            renderLeaf={useCallback(
              (props) => (
                <Leaf {...props} />
              ),
              [],
            )}
            placeholder="Start typing your document..."
            spellCheck
            className="min-h-full outline-none"
            onKeyDown={(event) => {
              if (!event.ctrlKey && !event.metaKey) return;
              switch (event.key) {
                case "b":
                  event.preventDefault();
                  toggleMark(editor, "bold");
                  break;
                case "i":
                  event.preventDefault();
                  toggleMark(editor, "italic");
                  break;
                case "u":
                  event.preventDefault();
                  toggleMark(editor, "underline");
                  break;
                default:
                  break;
              }
            }}
          />
        </div>
      </Slate>
    </div>
  );
};

export default SlateEditorPanel;
