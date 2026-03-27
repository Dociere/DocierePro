/**
 * latexAstEngine.jsx — AST-based LaTeX engine using unified-latex.
 */

import { parse } from "@unified-latex/unified-latex-util-parse";
import { toString } from "@unified-latex/unified-latex-util-to-string";

// ============ CORE PARSERS ============

export const parseLatexToAst = (latexString) => {
  if (!latexString) return null;
  try {
    return parse(latexString);
  } catch (e) {
    console.error("AST Parsing Failed:", e);
    return null;
  }
};

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

const SECTION_MACROS = new Set([
  "section",
  "subsection",
  "subsubsection",
  "paragraph",
  "subparagraph",
]);

export const isMainFileAst = (ast) => {
  if (!ast || !ast.content) return false;
  return ast.content.some(
    (node) =>
      (node.type === "macro" && node.content === "documentclass") ||
      (node.type === "environment" && node.env === "document"),
  );
};

export const getDocumentBody = (ast) => {
  if (!ast || !ast.content) return [];
  const docEnv = ast.content.find(
    (node) => node.type === "environment" && node.env === "document",
  );
  if (docEnv) return docEnv.content || [];
  return ast.content;
};

export const getPreambleNodes = (ast) => {
  if (!ast || !ast.content) return [];
  const result = [];
  for (const node of ast.content) {
    if (node.type === "environment" && node.env === "document") break;
    result.push(node);
  }
  return result;
};

export const getSectionTitle = (macroNode) => {
  if (!macroNode || !macroNode.args) return "Untitled";
  // FIX: Find the actual text argument (starts with '{'), ignoring '*' args
  const titleArg = macroNode.args.findLast((a) => a.openMark === "{");
  if (titleArg && titleArg.content && titleArg.content.length > 0) {
    return toString({ type: "root", content: titleArg.content });
  }
  return "Untitled";
};

export const setSectionTitle = (macroNode, newTitle) => {
  if (!macroNode || !macroNode.args) return;
  // FIX: Safely target the correct argument block
  const titleArg = macroNode.args.findLast((a) => a.openMark === "{");
  if (titleArg) titleArg.content = [{ type: "string", content: newTitle }];
};

// ============ SECTION SPLITTING ============

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
      } else if (
        level === "subsubsection" ||
        level === "paragraph" ||
        level === "subparagraph"
      ) {
        if (currentSubsection) currentSubsection.children.push(entry);
        else if (currentSection) currentSection.children.push(entry);
        else sections.push(entry);
      }
    } else {
      if (currentSubsection) currentSubsection.contentNodes.push(node);
      else if (currentSection) currentSection.contentNodes.push(node);
      else leadingContent.push(node);
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

export const sectionsToAstBody = (sectionsArray) => {
  const nodes = [];
  const serializeSection = (sec) => {
    if (sec.macroNode) nodes.push(sec.macroNode);
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
  if (docEnv) docEnv.content = newBodyNodes;
  else cloned.content = newBodyNodes;
  return cloned;
};

export const contentNodesToText = (nodes) => {
  if (!nodes || nodes.length === 0) return "";
  return toString({ type: "root", content: nodes });
};

export const textToContentNodes = (latexFragment) => {
  if (!latexFragment) return [];
  const ast = parseLatexToAst(latexFragment);
  return ast ? ast.content : [];
};

export const isMainFile = (fileName) => {
  if (!fileName) return true;
  const normalized = fileName.replace(/\\/g, "/").toLowerCase();
  return normalized === "main.tex" || normalized.endsWith("/main.tex");
};

export const canonicalFileName = (inputName) => {
  if (!inputName) return "";
  return inputName.endsWith(".tex") ? inputName : inputName + ".tex";
};

// ============ SLATE.JS BRIDGE ============

// FIX: Radically expanded to prevent custom text formatting environments from becoming read-only blocks
const TEXT_ENVS = [
  "abstract",
  "keywords",
  "IEEEkeywords",
  "acknowledgements",
  "acknowledgment",
  "acks",
  "thebibliography",
  "workscited",
  "flushleft",
  "flushright",
  "center",
  "appendices",
  "multicols",
  "justify",
  "RaggedRight",
  "raggedright",
  "quote",
  "quotation",
  "minipage",
  "tiny",
  "small",
  "large",
  "summary",
  "Summary",
  "profile",
  "objective",
];

const LIST_ENVS = [
  "itemize",
  "enumerate",
  "resumelist",
  "description",
  "enumerate*",
];

const EDITABLE_MACROS = [
  "title",
  "subtitle",
  "author",
  "date",
  "email",
  "orcid",
  "institution",
  "city",
  "state",
  "country",
  "affiliation",
  "authornote",
  "keywords",
  "caption",
  "Description",
  "hypertarget",
  "resumeSummary",
];

const VOID_MACROS = [
  "maketitle",
  "tableofcontents",
  "newpage",
  "clearpage",
  "IEEEpeerreviewmaketitle",
  "input",
  "include",
  "bibliographystyle",
  "bibliography",
  "markboth",
  "setlength",
  "renewcommand",
  "hyphenation",
  "vspace",
  "hspace",
  "resumeItemListStart",
  "resumeItemListEnd",
  "resumeSubHeadingListStart",
  "resumeSubHeadingListEnd",
  "printbibliography",
  "addcontentsline",
  "pagenumbering",
  "thispagestyle",
  "setcopyright",
  "AtBeginDocument",
  "providecommand",
  "shortauthors",
  "copyrightyear",
  "acmYear",
  "acmDOI",
  "acmConference",
  "acmBooktitle",
  "acmISBN",
  "acmSubmissionID",
  "citestyle",
  "appendix",
  "ccsdesc",
  "received",
  "url",
  "authornotemark",
  "noindent",
  "PassOptionsToPackage",
  "documentclass",
  "usepackage",
  "ifPDFTeX",
  "else",
  "fi",
  "IfFileExists",
  "makeatletter",
  "makeatother",
  "KOMAoptions",
  "def",
  "let",
  "setcounter",
  "raggedright",
  "arraybackslash",
  "leavevmode",
  "protect",
  "label",
  "hypersetup",
  "titleformat",
  "titlespacing*",
  "setlist",
  "newenvironment",
  "definecolor",
  "newcommand",
  "pdfgentounicode",
  "addtolength",
  "urlstyle",
  "raggedbottom",
  "hfill",
  "hrulefill",
  "titlerule",
  "vspace*",
  "hspace*",
];

export const astToSlate = (astInput) => {
  const astNodes = astInput?.type === "root" ? astInput.content : astInput;
  if (!Array.isArray(astNodes) || astNodes.length === 0)
    return [{ type: "paragraph", children: [{ text: "" }] }];

  const parseNodes = (nodes) => {
    const slateBlocks = [];
    let currentParagraph = { type: "paragraph", children: [] };

    const pushCurrentParagraph = () => {
      if (currentParagraph.children.length > 0) {
        slateBlocks.push(currentParagraph);
        currentParagraph = { type: "paragraph", children: [] };
      }
    };

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      if (node.type === "string") {
        currentParagraph.children.push({ text: node.content });
      } else if (node.type === "whitespace") {
        currentParagraph.children.push({ text: " " });
      } else if (node.type === "parbreak") {
        pushCurrentParagraph();
      } else if (node.type === "comment") {
        pushCurrentParagraph();
        slateBlocks.push({
          type: "latex-block",
          env: "% Comment",
          rawLatex: "%" + node.content,
          children: [{ text: "" }],
        });
      } else if (node.type === "group") {
        currentParagraph.children.push({ text: "{", code: true });
        const innerBlocks = parseNodes(node.content);
        const leaves = innerBlocks.flatMap((b) => b.children || [{ text: "" }]);
        currentParagraph.children.push(...leaves);
        currentParagraph.children.push({ text: "}", code: true });
      } else if (node.type === "macro") {
        if (["textbf", "textit", "underline", "emph"].includes(node.content)) {
          let argContent = [];
          if (node.args && node.args.length > 0) {
            argContent = node.args[node.args.length - 1].content;
          } else if (i + 1 < nodes.length && nodes[i + 1].type === "group") {
            argContent = nodes[i + 1].content;
            i++;
          } else if (
            i + 1 < nodes.length &&
            nodes[i + 1].type === "whitespace" &&
            i + 2 < nodes.length &&
            nodes[i + 2].type === "group"
          ) {
            argContent = nodes[i + 2].content;
            i += 2;
          }

          const innerBlocks = parseNodes(argContent);
          const leaves = innerBlocks.flatMap(
            (b) => b.children || [{ text: "" }],
          );
          const mark =
            node.content === "textbf"
              ? "bold"
              : node.content === "textit" || node.content === "emph"
              ? "italic"
              : "underline";
          leaves.forEach((l) => (l[mark] = true));
          currentParagraph.children.push(...leaves);
        } else if (
          [
            "section",
            "subsection",
            "subsubsection",
            "paragraph",
            "subparagraph",
          ].includes(node.content)
        ) {
          pushCurrentParagraph();
          const level =
            node.content === "section"
              ? 1
              : node.content === "subsection"
              ? 2
              : node.content === "subsubsection"
              ? 3
              : node.content === "paragraph"
              ? 4
              : 5;
          let argContent = [];
          if (node.args && node.args.length > 0) {
            argContent = node.args[node.args.length - 1].content;
          } else if (i + 1 < nodes.length && nodes[i + 1].type === "group") {
            argContent = nodes[i + 1].content;
            i++;
          } else if (
            i + 1 < nodes.length &&
            nodes[i + 1].type === "whitespace" &&
            i + 2 < nodes.length &&
            nodes[i + 2].type === "group"
          ) {
            argContent = nodes[i + 2].content;
            i += 2;
          }

          const innerBlocks = parseNodes(argContent);
          const leaves = innerBlocks.flatMap(
            (b) => b.children || [{ text: "Untitled" }],
          );
          slateBlocks.push({ type: "heading", level: level, children: leaves });
        } else if (EDITABLE_MACROS.includes(node.content)) {
          pushCurrentParagraph();
          let argContent = [];
          if (node.args && node.args.length > 0) {
            argContent = node.args[node.args.length - 1].content;
          } else if (i + 1 < nodes.length && nodes[i + 1].type === "group") {
            argContent = nodes[i + 1].content;
            i++;
          } else if (
            i + 1 < nodes.length &&
            nodes[i + 1].type === "whitespace" &&
            i + 2 < nodes.length &&
            nodes[i + 2].type === "group"
          ) {
            argContent = nodes[i + 2].content;
            i += 2;
          }

          const innerBlocks = parseNodes(argContent);
          slateBlocks.push({
            type: "editable-macro",
            macro: node.content,
            children:
              innerBlocks.length > 0
                ? innerBlocks
                : [{ type: "paragraph", children: [{ text: "" }] }],
          });
        } else if (VOID_MACROS.includes(node.content)) {
          pushCurrentParagraph();
          let capturedNodes = [node];
          if (i + 1 < nodes.length && nodes[i + 1].type === "group") {
            capturedNodes.push(nodes[i + 1]);
            i++;
          } else if (
            i + 1 < nodes.length &&
            nodes[i + 1].type === "whitespace" &&
            i + 2 < nodes.length &&
            nodes[i + 2].type === "group"
          ) {
            capturedNodes.push(nodes[i + 1], nodes[i + 2]);
            i += 2;
          }

          slateBlocks.push({
            type: "latex-block",
            env: "\\" + node.content,
            rawLatex: printAstToLatex({ type: "root", content: capturedNodes }),
            children: [{ text: "" }],
          });
        } else {
          currentParagraph.children.push({
            text: `\\${node.content}`,
            code: true,
          });
          if (node.args) {
            node.args.forEach((arg) => {
              if (arg.openMark)
                currentParagraph.children.push({
                  text: arg.openMark,
                  code: true,
                });
              if (arg.content && arg.content.length > 0) {
                const innerBlocks = parseNodes(arg.content);
                const leaves = innerBlocks.flatMap(
                  (b) => b.children || [{ text: "" }],
                );
                currentParagraph.children.push(...leaves);
              }
              if (arg.closeMark)
                currentParagraph.children.push({
                  text: arg.closeMark,
                  code: true,
                });
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
            args: node.args,
            children:
              innerBlocks.length > 0
                ? innerBlocks
                : [{ type: "paragraph", children: [{ text: "" }] }],
          });
        } else if (LIST_ENVS.includes(envName)) {
          const listType =
            envName === "itemize" || envName === "resumelist"
              ? "bulleted-list"
              : "numbered-list";
          const listItems = [];
          let currentItemBlocks = [];

          const flushItem = () => {
            if (currentItemBlocks.length === 0)
              listItems.push({ type: "list-item", children: [{ text: "" }] });
            else {
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
          let hasSeenFirstItem = false;

          node.content.forEach((child) => {
            if (child.type === "macro" && child.content === "item") {
              const hasActualContent = itemNodes.some(
                (n) =>
                  n.type !== "whitespace" &&
                  n.type !== "parbreak" &&
                  n.type !== "comment",
              );
              if (hasActualContent) {
                currentItemBlocks = parseNodes(itemNodes);
                flushItem();
              }

              hasSeenFirstItem = true;
              itemNodes = [];
              if (child.args) {
                child.args.forEach((arg) => {
                  if (
                    arg.openMark === "[" &&
                    arg.content &&
                    arg.content.length > 0
                  ) {
                    itemNodes.push({ type: "string", content: "[" });
                    itemNodes.push(...arg.content);
                    itemNodes.push({ type: "string", content: "] " });
                  } else if (
                    arg.openMark !== "[" &&
                    arg.content &&
                    arg.content.length > 0
                  ) {
                    itemNodes.push(...arg.content);
                  }
                });
              }
            } else {
              const isSkippable =
                itemNodes.length === 0 &&
                (child.type === "whitespace" ||
                  child.type === "parbreak" ||
                  child.type === "comment");
              if (!isSkippable) itemNodes.push(child);
            }
          });

          // Final flush for the trailing bullet if it has content
          const hasActualContentEnd = itemNodes.some(
            (n) =>
              n.type !== "whitespace" &&
              n.type !== "parbreak" &&
              n.type !== "comment",
          );
          if (hasActualContentEnd) {
            currentItemBlocks = parseNodes(itemNodes);
            flushItem();
          }

          if (listItems.length > 0)
            slateBlocks.push({
              type: listType,
              env: envName,
              args: node.args,
              children: listItems,
            });
        } else {
          slateBlocks.push({
            type: "latex-block",
            env: envName,
            rawLatex: printAstToLatex(node),
            children: [{ text: "" }],
          });
        }
      }
    }
    pushCurrentParagraph();
    return slateBlocks;
  };

  const finalBlocks = parseNodes(astNodes);
  return finalBlocks.length > 0
    ? finalBlocks
    : [{ type: "paragraph", children: [{ text: "" }] }];
};

const leavesToLatexString = (leaves) => {
  let str = "";
  leaves.forEach((leaf) => {
    let text = leaf.text;
    if (!leaf.code) {
      if (leaf.bold) text = `\\textbf{${text}}`;
      if (leaf.italic) text = `\\textit{${text}}`;
      if (leaf.underline) text = `\\underline{${text}}`;
    }
    str += text;
  });
  return str;
};

export const slateToAst = (slateNodes) => {
  const astNodes = [];

  const parseBlock = (block, index, arrayLength) => {
    if (block.type === "paragraph") {
      const latexStr = leavesToLatexString(block.children);
      const tempAst = parseLatexToAst(latexStr);
      if (tempAst && tempAst.content) astNodes.push(...tempAst.content);
      if (index < arrayLength - 1) astNodes.push({ type: "parbreak" });
    } else if (block.type === "heading") {
      const macroName =
        block.level === 1
          ? "section"
          : block.level === 2
          ? "subsection"
          : block.level === 3
          ? "subsubsection"
          : block.level === 4
          ? "paragraph"
          : "subparagraph";
      const latexStr = leavesToLatexString(block.children);
      const tempAst = parseLatexToAst(latexStr);
      astNodes.push({
        type: "macro",
        content: macroName,
        args: [
          {
            type: "argument",
            content: tempAst?.content || [],
            openMark: "{",
            closeMark: "}",
          },
        ],
      });
    } else if (block.type === "editable-macro") {
      const innerAst = slateToAst(block.children);
      astNodes.push({
        type: "macro",
        content: block.macro,
        args: [
          {
            type: "argument",
            content: innerAst,
            openMark: "{",
            closeMark: "}",
          },
        ],
      });
      astNodes.push({ type: "parbreak" });
    } else if (block.type === "editable-env") {
      const innerAst = slateToAst(block.children);
      let finalArgs = block.args;
      if (!finalArgs && block.env === "thebibliography") {
        finalArgs = [
          {
            type: "argument",
            content: [{ type: "string", content: "1" }],
            openMark: "{",
            closeMark: "}",
          },
        ];
      }

      astNodes.push({
        type: "environment",
        env: block.env,
        args: finalArgs,
        content: innerAst,
      });
      astNodes.push({ type: "parbreak" });
    } else if (
      block.type === "bulleted-list" ||
      block.type === "numbered-list"
    ) {
      const envName =
        block.env || (block.type === "bulleted-list" ? "itemize" : "enumerate");
      const listContent = [];

      block.children.forEach((listItem) => {
        listContent.push({ type: "macro", content: "item" });
        listContent.push({ type: "whitespace", content: " " });
        const latexStr = leavesToLatexString(listItem.children);
        const tempAst = parseLatexToAst(latexStr);
        if (tempAst && tempAst.content) listContent.push(...tempAst.content);
        listContent.push({ type: "whitespace", content: "\n" });
      });

      astNodes.push({
        type: "environment",
        env: envName,
        args: block.args,
        content: listContent,
      });
      astNodes.push({ type: "parbreak" });
    } else if (block.type === "latex-block") {
      const tempAst = parseLatexToAst(block.rawLatex);
      if (tempAst && tempAst.content) astNodes.push(...tempAst.content);
    }
  };

  slateNodes.forEach((block, i) => parseBlock(block, i, slateNodes.length));
  return astNodes.filter((node, index, arr) => {
    if (node.type === "parbreak" && arr[index - 1]?.type === "parbreak")
      return false;
    if (node.type === "parbreak" && index === arr.length - 1) return false;
    return true;
  });
};
