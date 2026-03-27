/**
 * latexAstEngine.jsx — AST-based LaTeX engine using unified-latex.
 *
 * This module replaces the regex-based conversion in latexUtility.jsx.
 * It provides:
 * parseLatexToAst  — String → AST
 * printAstToLatex  — AST → String
 * getAstSections   — AST → grouped section objects for Section Editor
 * getAstPreamble   — AST → preamble string (everything before \begin{document})
 * isMainFileAst    — Checks whether an AST represents a full document
 */

import { parse } from "@unified-latex/unified-latex-util-parse";
import { toString } from "@unified-latex/unified-latex-util-to-string";

// ============ CORE PARSERS ============

/**
 * Parse a LaTeX string into a unified-latex AST.
 * Returns null on failure so callers can show fallback UI.
 */
export const parseLatexToAst = (latexString) => {
  if (!latexString) return null;
  try {
    return parse(latexString);
  } catch (e) {
    console.error("AST Parsing Failed:", e);
    return null;
  }
};

/**
 * Print a unified-latex AST back to a LaTeX string.
 */
export const printAstToLatex = (astTree) => {
  if (!astTree) return "";
  try {
    return toString(astTree);
  } catch (e) {
    console.error("AST Print Failed:", e);
    return "";
  }
};

// ============ AST QUERIES ============

const SECTION_MACROS = new Set(["section", "subsection", "subsubsection"]);

/**
 * Check if an AST represents a full document (has \documentclass / \begin{document}).
 */
export const isMainFileAst = (ast) => {
  if (!ast || !ast.content) return false;
  return ast.content.some(
    (node) =>
      (node.type === "macro" && node.content === "documentclass") ||
      (node.type === "environment" && node.env === "document"),
  );
};

/**
 * Extract the document body from an AST (the content inside \begin{document}...\end{document}).
 * Returns the full AST content array if there is no document environment.
 */
export const getDocumentBody = (ast) => {
  if (!ast || !ast.content) return [];
  const docEnv = ast.content.find(
    (node) => node.type === "environment" && node.env === "document",
  );
  if (docEnv) return docEnv.content || [];
  return ast.content;
};

/**
 * Extract the preamble nodes (everything before \begin{document}) from an AST.
 */
export const getPreambleNodes = (ast) => {
  if (!ast || !ast.content) return [];
  const result = [];
  for (const node of ast.content) {
    if (node.type === "environment" && node.env === "document") break;
    result.push(node);
  }
  return result;
};

/**
 * Get a human-readable title from a section/subsection/subsubsection macro node.
 * The title is in the last non-empty argument (named "title" at index 3).
 */
export const getSectionTitle = (macroNode) => {
  if (!macroNode || !macroNode.args) return "Untitled";
  // unified-latex section args: [starred, (unused), tocTitle, title]
  // The title arg is the last one with content
  for (let i = macroNode.args.length - 1; i >= 0; i--) {
    const arg = macroNode.args[i];
    if (arg && arg.content && arg.content.length > 0) {
      return toString({ type: "root", content: arg.content });
    }
  }
  return "Untitled";
};

/**
 * Set the title of a section macro node.
 */
export const setSectionTitle = (macroNode, newTitle) => {
  if (!macroNode || !macroNode.args) return;
  // Title is in args[3] for \section
  const titleArg = macroNode.args[macroNode.args.length - 1];
  if (titleArg) {
    titleArg.content = [{ type: "string", content: newTitle }];
  }
};

// ============ SECTION SPLITTING ============

/**
 * Split AST body content into grouped sections for the Section Editor.
 */
export const getAstSections = (ast) => {
  if (!ast || !ast.content) return [];

  const isFullDoc = isMainFileAst(ast);
  const bodyNodes = isFullDoc ? getDocumentBody(ast) : ast.content;

  const sections = [];
  let currentSection = null;
  let currentSubsection = null;
  let leadingContent = [];
  let idCounter = 0;

  const makeId = () => `ast-sec-${idCounter++}`;

  for (const node of bodyNodes) {
    if (node.type === "macro" && SECTION_MACROS.has(node.content)) {
      const level = node.content;
      const title = getSectionTitle(node);
      const entry = {
        id: makeId(),
        type: level,
        name: title,
        macroNode: node,
        contentNodes: [],
        children: [],
      };

      if (level === "section") {
        sections.push(entry);
        currentSection = entry;
        currentSubsection = null;
      } else if (level === "subsection") {
        if (currentSection) {
          currentSection.children.push(entry);
          currentSubsection = entry;
        } else {
          sections.push(entry);
          currentSubsection = entry;
        }
      } else if (level === "subsubsection") {
        if (currentSubsection) {
          currentSubsection.children.push(entry);
        } else if (currentSection) {
          currentSection.children.push(entry);
        } else {
          sections.push(entry);
        }
      }
    } else {
      if (currentSubsection) {
        currentSubsection.contentNodes.push(node);
      } else if (currentSection) {
        currentSection.contentNodes.push(node);
      } else {
        leadingContent.push(node);
      }
    }
  }

  if (leadingContent.length > 0) {
    sections.unshift({
      id: makeId(),
      type: "content",
      name: "Leading Content",
      macroNode: null,
      contentNodes: leadingContent,
      children: [],
    });
  }

  return sections;
};

/**
 * Rebuild an AST's body from a sections array
 */
export const sectionsToAstBody = (sectionsArray) => {
  const nodes = [];

  const serializeSection = (sec) => {
    if (sec.macroNode) {
      nodes.push(sec.macroNode);
    }
    nodes.push(...sec.contentNodes);
    sec.children.forEach(serializeSection);
  };

  sectionsArray.forEach(serializeSection);
  return nodes;
};

export const applyBodyToAst = (ast, newBodyNodes) => {
  const cloned = structuredClone(ast);
  const docEnv = cloned.content.find(
    (n) => n.type === "environment" && n.env === "document",
  );
  if (docEnv) {
    docEnv.content = newBodyNodes;
  } else {
    cloned.content = newBodyNodes;
  }
  return cloned;
};

// ============ CONTENT HELPERS ============

export const contentNodesToText = (nodes) => {
  if (!nodes || nodes.length === 0) return "";
  return toString({ type: "root", content: nodes });
};

export const textToContentNodes = (latexFragment) => {
  if (!latexFragment) return [];
  const ast = parseLatexToAst(latexFragment);
  return ast ? ast.content : [];
};

// ============ LEGACY BRIDGE ============
export const isMainFile = (fileName) => {
  if (!fileName) return true;
  const normalized = fileName.replace(/\\/g, "/").toLowerCase();
  return normalized === "main.tex" || normalized.endsWith("/main.tex");
};

export const canonicalFileName = (inputName) => {
  if (!inputName) return "";
  return inputName.endsWith(".tex") ? inputName : inputName + ".tex";
};

// ============ SLATE.JS BRIDGE (PHASE 3) ============

const TEXT_ENVS = [
  "abstract",
  "keywords",
  "IEEEkeywords",
  "acknowledgements",
  "acknowledgment",
  "thebibliography",
];
const LIST_ENVS = ["itemize", "enumerate"];

/**
 * Converts a unified-latex AST array into a Slate.js JSON state.
 */
export const astToSlate = (astInput) => {
  const astNodes = astInput?.type === "root" ? astInput.content : astInput;

  if (!Array.isArray(astNodes) || astNodes.length === 0) {
    return [{ type: "paragraph", children: [{ text: "" }] }];
  }

  const parseNodes = (nodes) => {
    const slateBlocks = [];
    let currentParagraph = { type: "paragraph", children: [] };

    const pushCurrentParagraph = () => {
      if (currentParagraph.children.length > 0) {
        slateBlocks.push(currentParagraph);
        currentParagraph = { type: "paragraph", children: [] };
      }
    };

    const processNode = (node, currentMarks = {}) => {
      if (node.type === "string") {
        currentParagraph.children.push({ text: node.content, ...currentMarks });
      } else if (node.type === "whitespace") {
        currentParagraph.children.push({ text: " ", ...currentMarks });
      } else if (node.type === "parbreak") {
        pushCurrentParagraph();
      } else if (node.type === "macro") {
        if (["textbf", "textit", "underline"].includes(node.content)) {
          const mark =
            node.content === "textbf"
              ? "bold"
              : node.content === "textit"
              ? "italic"
              : "underline";
          const argContent = node.args?.[node.args.length - 1]?.content || [];
          argContent.forEach((child) =>
            processNode(child, { ...currentMarks, [mark]: true }),
          );
        } else if (
          ["section", "subsection", "subsubsection"].includes(node.content)
        ) {
          pushCurrentParagraph();
          const level =
            node.content === "section"
              ? 1
              : node.content === "subsection"
              ? 2
              : 3;
          const titleContent = node.args?.[node.args.length - 1]?.content || [];
          titleContent.forEach((child) => processNode(child, currentMarks));
          slateBlocks.push({
            type: "heading",
            level: level,
            children:
              currentParagraph.children.length > 0
                ? currentParagraph.children
                : [{ text: "Untitled" }],
          });
          currentParagraph = { type: "paragraph", children: [] };
        } else {
          // Unknown macro - print the macro name
          currentParagraph.children.push({
            text: `\\${node.content}`,
            code: true,
            ...currentMarks,
          });

          // CRITICAL FIX: Recover any text absorbed into macro arguments (prevents data loss on \bibitem)
          if (node.args) {
            node.args.forEach((arg) => {
              if (arg.content && arg.content.length > 0) {
                if (arg.openMark) {
                  currentParagraph.children.push({
                    text: arg.openMark,
                    ...currentMarks,
                  });
                }
                arg.content.forEach((c) => processNode(c, currentMarks));
                if (arg.closeMark) {
                  currentParagraph.children.push({
                    text: arg.closeMark,
                    ...currentMarks,
                  });
                }
              }
            });
          }
        }
      } else if (node.type === "environment") {
        pushCurrentParagraph();
        const envName = (node.env || "").trim();

        if (TEXT_ENVS.includes(envName)) {
          const innerBlocks = parseNodes(node.content);
          slateBlocks.push({
            type: "editable-env",
            env: envName,
            children:
              innerBlocks.length > 0
                ? innerBlocks
                : [{ type: "paragraph", children: [{ text: "" }] }],
          });
        } else if (LIST_ENVS.includes(envName)) {
          const listType =
            envName === "itemize" ? "bulleted-list" : "numbered-list";
          const listItems = [];
          let currentItemBlocks = [];

          const flushItem = () => {
            if (currentItemBlocks.length === 0) {
              listItems.push({ type: "list-item", children: [{ text: "" }] });
            } else {
              // Flatten paragraphs into text leaves for Slate's list-item
              const leaves = currentItemBlocks.flatMap(
                (b) => b.children || [{ text: "" }],
              );
              listItems.push({
                type: "list-item",
                children: leaves.length > 0 ? leaves : [{ text: "" }],
              });
            }
            currentItemBlocks = [];
          };

          let itemNodes = [];
          node.content.forEach((child) => {
            if (child.type === "macro" && child.content === "item") {
              if (itemNodes.length > 0 || listItems.length > 0) {
                currentItemBlocks = parseNodes(itemNodes);
                flushItem();
              }
              itemNodes = [];

              // CRITICAL FIX: Recover absorbed body from \item arguments
              if (child.args) {
                child.args.forEach((arg) => {
                  if (
                    arg.openMark !== "[" &&
                    arg.content &&
                    arg.content.length > 0
                  ) {
                    itemNodes.push(...arg.content);
                  }
                });
              }
            } else {
              if (!(itemNodes.length === 0 && child.type === "whitespace")) {
                itemNodes.push(child);
              }
            }
          });

          if (itemNodes.length > 0) {
            currentItemBlocks = parseNodes(itemNodes);
            flushItem();
          } else if (listItems.length > 0 && currentItemBlocks.length === 0) {
            flushItem(); // capture trailing empty item
          }

          if (listItems.length > 0) {
            slateBlocks.push({ type: listType, children: listItems });
          }
        } else {
          slateBlocks.push({
            type: "latex-block",
            env: envName,
            rawLatex: printAstToLatex(node),
            children: [{ text: "" }],
          });
        }
      }
    };

    nodes.forEach((node) => processNode(node));
    pushCurrentParagraph();

    return slateBlocks;
  };

  const finalBlocks = parseNodes(astNodes);
  return finalBlocks.length > 0
    ? finalBlocks
    : [{ type: "paragraph", children: [{ text: "" }] }];
};

/**
 * Converts a Slate.js JSON state back into a unified-latex AST array.
 */
export const slateToAst = (slateNodes) => {
  const astNodes = [];

  const processLeaf = (leaf) => {
    let node = { type: "string", content: leaf.text };
    if (leaf.bold)
      node = {
        type: "macro",
        content: "textbf",
        args: [
          { type: "argument", content: [node], openMark: "{", closeMark: "}" },
        ],
      };
    if (leaf.italic)
      node = {
        type: "macro",
        content: "textit",
        args: [
          { type: "argument", content: [node], openMark: "{", closeMark: "}" },
        ],
      };
    if (leaf.underline)
      node = {
        type: "macro",
        content: "underline",
        args: [
          { type: "argument", content: [node], openMark: "{", closeMark: "}" },
        ],
      };
    return node;
  };

  const parseBlock = (block, index, arrayLength) => {
    if (block.type === "paragraph") {
      block.children.forEach((leaf) => astNodes.push(processLeaf(leaf)));
      if (index < arrayLength - 1) astNodes.push({ type: "parbreak" });
    } else if (block.type === "heading") {
      const macroName =
        block.level === 1
          ? "section"
          : block.level === 2
          ? "subsection"
          : "subsubsection";
      const contentNodes = block.children.map((leaf) => processLeaf(leaf));
      astNodes.push({
        type: "macro",
        content: macroName,
        args: [
          {
            type: "argument",
            content: contentNodes,
            openMark: "{",
            closeMark: "}",
          },
        ],
      });
    } else if (block.type === "editable-env") {
      const innerAst = slateToAst(block.children);
      const envArgs =
        block.env === "thebibliography"
          ? [
              {
                type: "argument",
                content: [{ type: "string", content: "1" }],
                openMark: "{",
                closeMark: "}",
              },
            ]
          : undefined;

      astNodes.push({
        type: "environment",
        env: block.env,
        args: envArgs,
        content: innerAst,
      });
      astNodes.push({ type: "parbreak" });
    } else if (
      block.type === "bulleted-list" ||
      block.type === "numbered-list"
    ) {
      const envName = block.type === "bulleted-list" ? "itemize" : "enumerate";
      const listContent = [];

      block.children.forEach((listItem) => {
        listContent.push({ type: "macro", content: "item" });
        listContent.push({ type: "whitespace", content: " " });

        listItem.children.forEach((leaf) =>
          listContent.push(processLeaf(leaf)),
        );
        listContent.push({ type: "whitespace", content: "\n" });
      });

      astNodes.push({
        type: "environment",
        env: envName,
        content: listContent,
      });
      astNodes.push({ type: "parbreak" });
    } else if (block.type === "latex-block") {
      const tempAst = parseLatexToAst(block.rawLatex);
      if (tempAst && tempAst.content) astNodes.push(...tempAst.content);
    }
  };

  slateNodes.forEach((block, i) => parseBlock(block, i, slateNodes.length));
  return astNodes;
};
