/**
 * latexAstEngine.jsx — AST-based LaTeX engine using unified-latex.
 *
 * This module replaces the regex-based conversion in latexUtility.jsx.
 * It provides:
 *   parseLatexToAst  — String → AST
 *   printAstToLatex  — AST → String
 *   getAstSections   — AST → grouped section objects for Section Editor
 *   getAstPreamble   — AST → preamble string (everything before \begin{document})
 *   isMainFileAst    — Checks whether an AST represents a full document
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
 *
 * Returns an array of objects:
 * {
 *   id: string,
 *   type: 'preamble' | 'section' | 'subsection' | 'subsubsection' | 'content' | 'postamble',
 *   name: string,                  // Human-readable title
 *   macroNode: ASTNode | null,     // The \section{...} macro node itself (for mutation)
 *   contentNodes: ASTNode[],       // Body content after the heading
 *   children: SectionObject[],     // Nested subsections
 * }
 */
export const getAstSections = (ast) => {
  if (!ast || !ast.content) return [];

  const isFullDoc = isMainFileAst(ast);
  const bodyNodes = isFullDoc ? getDocumentBody(ast) : ast.content;

  const sections = [];
  let currentSection = null;
  let currentSubsection = null;
  let leadingContent = []; // content before any section heading
  let idCounter = 0;

  const makeId = () => `ast-sec-${idCounter++}`;

  for (const node of bodyNodes) {
    if (node.type === "macro" && SECTION_MACROS.has(node.content)) {
      const level = node.content; // 'section' | 'subsection' | 'subsubsection'
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
      // Non-section content — attach to the current deepest section
      if (currentSubsection) {
        currentSubsection.contentNodes.push(node);
      } else if (currentSection) {
        currentSection.contentNodes.push(node);
      } else {
        leadingContent.push(node);
      }
    }
  }

  // If there's leading content before the first section, prepend it
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
 * Rebuild an AST's body from a sections array (reverse of getAstSections).
 * This takes the original AST, replaces the document body with the serialized sections.
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

/**
 * Apply updated section body nodes back into a full-document AST.
 * Returns a new AST (does not mutate the original).
 */
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

/**
 * Get a plain-text representation of AST content nodes (for section previews).
 */
export const contentNodesToText = (nodes) => {
  if (!nodes || nodes.length === 0) return "";
  return toString({ type: "root", content: nodes });
};

/**
 * Parse a plain LaTeX string fragment into AST content nodes.
 */
export const textToContentNodes = (latexFragment) => {
  if (!latexFragment) return [];
  const ast = parseLatexToAst(latexFragment);
  return ast ? ast.content : [];
};

// ============ LEGACY BRIDGE ============
// These helpers are kept for backward compatibility during the migration.

export const isMainFile = (fileName) => {
  if (!fileName) return true;
  const normalized = fileName.replace(/\\/g, "/").toLowerCase();
  return normalized === "main.tex" || normalized.endsWith("/main.tex");
};

export const canonicalFileName = (inputName) => {
  if (!inputName) return "";
  return inputName.endsWith(".tex") ? inputName : inputName + ".tex";
};
