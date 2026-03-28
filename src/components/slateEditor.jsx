import React, { useMemo, useCallback, useEffect, useRef } from "react";
import {
  createEditor,
  Transforms,
  Editor,
  Element as SlateElement,
} from "slate";
import { Slate, Editable, withReact, useSlate } from "slate-react";
import { withHistory } from "slate-history";
import { astToSlate, slateToAst } from "../utils/latexAstEngine";

// ==========================================
// 1. SLATE PLUGINS
// ==========================================

const withLatexBlocks = (editor) => {
  const { isVoid } = editor;
  editor.isVoid = (element) => {
    return element.type === "latex-block" ? true : isVoid(element);
  };
  return editor;
};

// ==========================================
// 2. PREMIUM UI RENDERERS
// ==========================================

const Element = ({ attributes, children, element }) => {
  switch (element.type) {
    case "heading":
      const Tag = `h${element.level || 1}`;
      const sizeClass =
        element.level === 1
          ? "text-2xl border-b pb-2"
          : element.level === 2
          ? "text-xl"
          : element.level === 3
          ? "text-lg"
          : element.level === 4
          ? "text-base font-bold"
          : "text-sm font-bold uppercase tracking-wider text-gray-500";
      return (
        <Tag
          {...attributes}
          className={`font-semibold text-gray-900 mt-8 mb-3 ${sizeClass}`}
        >
          {children}
        </Tag>
      );

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

    case "editable-macro":
      const macroColors = {
        title: "text-blue-800 border-blue-200 bg-blue-50/50",
        subtitle: "text-blue-700 border-blue-200 bg-blue-50/30",
        author: "text-emerald-800 border-emerald-200 bg-emerald-50/50",
        affiliation: "text-teal-800 border-teal-200 bg-teal-50/50",
        institution: "text-teal-700 border-teal-200 bg-teal-50/30",
        city: "text-teal-600 border-teal-100 bg-teal-50/20",
        state: "text-teal-600 border-teal-100 bg-teal-50/20",
        country: "text-teal-600 border-teal-100 bg-teal-50/20",
        email: "text-amber-700 border-amber-200 bg-amber-50/50",
        keywords: "text-purple-700 border-purple-200 bg-purple-50/50",
        caption: "text-slate-700 border-slate-200 bg-slate-50/50",
        Description: "text-slate-600 border-slate-200 bg-slate-50/30",
        default: "text-indigo-700 border-indigo-200 bg-indigo-50/50",
      };
      const mTheme = macroColors[element.macro] || macroColors.default;

      return (
        <div
          {...attributes}
          className={`my-5 p-4 border rounded-xl shadow-sm relative transition-all ${mTheme}`}
        >
          <span
            contentEditable={false}
            className="absolute -top-3 left-4 bg-white px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest border rounded-full shadow-sm"
          >
            ✏️ \{element.macro}
          </span>
          <div className="font-medium">{children}</div>
        </div>
      );

    case "editable-env":
      return (
        <div
          {...attributes}
          className="my-6 p-5 border border-purple-200 bg-purple-50/30 shadow-sm rounded-xl relative transition-all"
        >
          <span
            contentEditable={false}
            className="absolute -top-3 left-4 bg-white px-3 py-0.5 text-[10px] font-bold text-purple-600 uppercase tracking-widest border border-purple-100 rounded-full shadow-sm"
          >
            📄 {element.env}
          </span>
          <div className="text-gray-700">{children}</div>
        </div>
      );

    case "latex-block":
      const isInput = element.env === "\\input" || element.env === "\\include";
      const isStructure =
        element.env === "\\maketitle" ||
        element.env === "\\newpage" ||
        element.env === "\\tableofcontents" ||
        element.env === "\\clearpage";

      return (
        <div
          {...attributes}
          contentEditable={false}
          className="my-3 p-3 bg-gray-50 border border-gray-200 rounded-xl shadow-sm select-none flex flex-col gap-2 transition-all hover:border-gray-300 hover:shadow-md cursor-default"
        >
          <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            {isInput ? "🔗" : isStructure ? "📐" : "⚙️"}{" "}
            {element.env || "LaTeX Block"}
            <span className="font-normal text-[10px] text-gray-400 normal-case ml-auto bg-white px-2 py-0.5 rounded border border-gray-200">
              Read-Only Structure
            </span>
          </div>
          {!isStructure && (
            <pre className="text-[11px] font-mono text-gray-600 overflow-x-auto whitespace-pre-wrap bg-white p-2.5 rounded-lg border border-gray-100">
              {typeof element.rawLatex === "string"
                ? element.rawLatex
                : JSON.stringify(element.rawLatex)}
            </pre>
          )}
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
      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-red-500 font-mono text-sm border border-gray-200">
        {children}
      </code>
    );
  return <span {...attributes}>{children}</span>;
};

// ==========================================
// 3. TOOLBAR LOGIC
// ==========================================

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
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        isActive
          ? "bg-gray-200 text-blue-700"
          : "text-gray-600 hover:bg-gray-100"
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
  if (isActive) Editor.removeMark(editor, format);
  else Editor.addMark(editor, format, true);
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
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        isActive
          ? "bg-gray-200 text-blue-700"
          : "text-gray-600 hover:bg-gray-100"
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
  const isInitialRender = useRef(true);

  useEffect(() => {
    const t = setTimeout(() => {
      isInitialRender.current = false;
    }, 150);
    return () => clearTimeout(t);
  }, []);

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

  const initialValue = useMemo(() => {
    console.log("🔍 [SlateEditor] 1. Raw bodyNodes from AST:", bodyNodes);
    const slateNodes = astToSlate(bodyNodes);

    // Deep log the exact array Slate is about to render
    console.log(
      "🚨 [SlateEditor] 2. Final slateNodes given to React/Slate:",
      slateNodes,
    );

    // Let's also do a manual sweep and log the exact bad object if we find it
    const findBadNode = (nodes) => {
      nodes.forEach((n) => {
        if (n.type && n.content && n.position) {
          console.error("❌ FOUND THE ROGUE NODE:", n);
        }
        if (n.children) findBadNode(n.children);
      });
    };
    findBadNode(slateNodes);

    return slateNodes;
  }, [bodyNodes]);

  useEffect(() => {
    // 1. If the change came from INSIDE this Slate editor, ignore the incoming sync
    // to prevent cursor jumps and history crashes.
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    const newSlateValue = astToSlate(bodyNodes);

    // 2. CRITICAL: Only perform a hard reset if the content is actually different.
    // This prevents the "Infinite Typing" bug where Slate resets on every keystroke.
    if (JSON.stringify(editor.children) === JSON.stringify(newSlateValue)) {
      return;
    }

    // 3. Perform a safe reset for external changes (like switching files)
    Editor.withoutNormalizing(editor, () => {
      editor.children = newSlateValue;
      editor.selection = null;

      // Reset history to clear out the corrupted state
      if (editor.history) {
        editor.history = { undo: [], redo: [] };
      }
    });

    editor.onChange();
  }, [bodyNodes, editor]);

  const handleChange = (newValue) => {
    if (isInitialRender.current) return;
    const isAstChange = editor.operations.some(
      (op) => op.type !== "set_selection",
    );

    if (isAstChange) {
      isInternalChange.current = true;
      const updatedBodyNodes = slateToAst(newValue);

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
        // 🔥 FIX: Ensure subfiles always remain valid root AST objects
        if (clonedAst.type === "root") {
          clonedAst.content = updatedBodyNodes;
        } else {
          clonedAst = { type: "root", content: updatedBodyNodes };
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
        <div className="flex gap-1 p-3 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex-wrap items-center shadow-sm">
          <MarkButton
            format="bold"
            icon={<span className="font-bold">B</span>}
          />
          <MarkButton
            format="italic"
            icon={<span className="italic">I</span>}
          />
          <MarkButton
            format="underline"
            icon={<span className="underline">U</span>}
          />
          <div className="w-px h-6 bg-gray-300 mx-2" />

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              toggleBlock(editor, "heading");
              Transforms.setNodes(editor, { level: 1 });
            }}
            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
              isBlockActive(editor, "heading")
                ? "bg-gray-200 text-blue-700"
                : "text-gray-600 hover:bg-gray-100"
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
            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors text-gray-600 hover:bg-gray-100`}
          >
            H2
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              toggleBlock(editor, "heading");
              Transforms.setNodes(editor, { level: 3 });
            }}
            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors text-gray-600 hover:bg-gray-100`}
          >
            H3
          </button>

          <div className="w-px h-6 bg-gray-300 mx-2" />
          <BlockButton format="bulleted-list" icon="• List" />
          <BlockButton format="numbered-list" icon="1. List" />
        </div>

        <div className="flex-1 overflow-y-auto p-10 lg:px-32">
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
            placeholder="Start writing your document..."
            spellCheck
            className="min-h-full outline-none pb-32"
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
