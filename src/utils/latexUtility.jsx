import React from "react";

// ============ CONSTANTS ============
// NOTE: table, wraptable, figure are NOT included - they stay within parent sections
const SPECIAL_ENVS_PATTERN =
  "abstract|IEEEkeywords|keywords|acknowledgements|acknowledgments|thebibliography|appendix";

// Matches the start of any Section OR Special Environment
const SECTION_REGEX = new RegExp(
  `(\\\\(?:section|subsection|subsubsection)\\*?\\{[^}]*\\}|\\\\begin\\{(?:${SPECIAL_ENVS_PATTERN})\\})`,
  "i",
);
const SPECIAL_ENVS_REGEX = new RegExp(SPECIAL_ENVS_PATTERN, "i");
// ============ LATEX SPECIAL CHARACTERS ============
const escapeLatexSpecialChars = (text) => {
  if (!text) return text;
  if (containsLatexCommands(text)) return text;
  const mathExpressions = [];
  let processed = text
    .replace(/\$\$([^\$]*?)\$\$/g, (match) => {
      mathExpressions.push(match);
      return `__MATH${mathExpressions.length - 1}__`;
    })
    .replace(/\$([^$]+)\$/g, (match) => {
      mathExpressions.push(match);
      return `__MATH${mathExpressions.length - 1}__`;
    });

  const escapeMap = {
    "&": "\\&",
    "%": "\\%",
    $: "\\$",
    "#": "\\#",
    _: "\\_",
    "{": "\\{",
    "}": "\\}",
    "~": "\\textasciitilde{}",
    "^": "\\textasciicircum{}",
    "\\": "\\textbackslash{}",
  };
  processed = processed.replace(
    /[&%$#_{}~^\\]/g,
    (char) => escapeMap[char] || char,
  );
  mathExpressions.forEach((expr, i) => {
    processed = processed.replace(`__MATH${i}__`, expr);
  });
  return processed;
};

const unescapeLatexSpecialChars = (text) => {
  if (!text) return text;
  return text
    .replace(/\\textbackslash\{\}/g, "\\")
    .replace(/\\textasciitilde\{\}/g, "~")
    .replace(/\\textasciicircum\{\}/g, "^")
    .replace(/\\\{/g, "{")
    .replace(/\\\}/g, "}")
    .replace(/\\_/g, "_")
    .replace(/\\#/g, "#")
    .replace(/\\\$/g, "$")
    .replace(/\\%/g, "%")
    .replace(/\\&/g, "&");
};

const stripLatexComments = (text) => {
  if (!text) return text;
  return text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !trimmed.startsWith("%") || trimmed.startsWith("\\%");
    })
    .join("\n");
};

const containsLatexCommands = (text) => {
  if (!text) return false;
  const latexPatterns = [/\\[a-zA-Z]+/, /\\begin\{/, /\\end\{/, /\\\\/, /\$\$/];
  return latexPatterns.some((pattern) => pattern.test(text));
};

// ============ HELPER: EXTRACT BODY ============
// Restored to full functionality
export const extractLatexBody = (latex) => {
  if (!latex) return "";
  const beginDocIndex = latex.indexOf("\\begin{document}");
  if (beginDocIndex === -1) return latex;

  const afterBeginDoc = latex.substring(
    beginDocIndex + "\\begin{document}".length,
  );
  const endDocIndex = afterBeginDoc.lastIndexOf("\\end{document}");

  if (endDocIndex === -1) return afterBeginDoc;

  let content = afterBeginDoc.substring(0, endDocIndex);

  // Optional: remove maketitle if it exists at the start
  content = content.replace(/^\s*\\maketitle\s*/, "").trim();

  return content;
};

// Restored to full functionality
export const reconstructLatexDocument = (originalLatex, newBodyContent) => {
  if (!originalLatex) return newBodyContent;

  // 1. Find where the "Real Body" started in the ORIGINAL file.
  // We use the same SECTION_REGEX to find the first Section, Abstract, or Keyword block.
  // Everything BEFORE this match is considered "Extended Preamble" (includes \documentclass, \title, \maketitle, etc.)

  const match = originalLatex.match(SECTION_REGEX);
  let extendedPreamble = "";

  if (match) {
    // We found a section/abstract. Everything before it is preserved.
    extendedPreamble = originalLatex.substring(0, match.index);
  } else {
    // Fallback: If original had no sections, try splitting at \begin{document}
    const beginIndex = originalLatex.indexOf("\\begin{document}");
    if (beginIndex !== -1) {
      // Include \begin{document} in the preamble part
      extendedPreamble = originalLatex.substring(
        0,
        beginIndex + "\\begin{document}".length,
      );
    } else {
      // If the file is totally empty or weird, just use empty string
      extendedPreamble = "";
    }
  }

  // 2. Get Postamble (everything from \end{document} onwards)
  const endDocIndex = originalLatex.lastIndexOf("\\end{document}");
  let postamble = "";
  if (endDocIndex !== -1) {
    postamble = originalLatex.substring(endDocIndex);
  } else {
    postamble = "\n\\end{document}";
  }

  // 3. Merge: Original Preamble + New Edited Body + Original Postamble
  return `${extendedPreamble.trim()}\n\n${newBodyContent.trim()}\n\n${postamble}`;
};

// ============ NEW HELPER: SPLIT LATEX INTO PARTS ============
export const splitLatex = (latexDoc) => {
  if (!latexDoc) return { preamble: "", body: "", postamble: "" };

  const beginIndex = latexDoc.indexOf("\\begin{document}");
  if (beginIndex === -1) {
    return { preamble: "", body: latexDoc, postamble: "" };
  }

  // Default split point: right after \begin{document}
  let splitPoint = beginIndex + "\\begin{document}".length;

  // --- NEW LOGIC: AGGRESSIVE PREAMBLE CAPTURE ---
  // We look for \maketitle. If it exists, EVERYTHING up to it is considered Preamble.
  // This handles \title, \author, \markboth, \IEEEpubid, etc.

  const afterBegin = latexDoc.substring(splitPoint);
  const makeTitleRegex = /\\maketitle\s*/;
  const makeTitleMatch = afterBegin.match(makeTitleRegex);

  if (makeTitleMatch) {
    // Move the split point to AFTER \maketitle
    // splitPoint + index of match + length of match
    splitPoint += makeTitleMatch.index + makeTitleMatch[0].length;
  }

  let preamble = latexDoc.substring(0, splitPoint);
  let rest = latexDoc.substring(splitPoint);

  // Calculate where Body ends
  const endIndex = rest.lastIndexOf("\\end{document}");

  if (endIndex === -1) {
    return { preamble, body: rest, postamble: "" };
  }

  return {
    preamble: preamble,
    body: rest.substring(0, endIndex),
    postamble: rest.substring(endIndex),
  };
};

// ============ HELPER: Parse inline content into section blocks ============
// Shared logic used by both main doc parsing and file-reference parsing
const parseBodyIntoBlocks = (body) => {
  const BODY_SECTION_REGEX =
    /(\\(?:section|subsection|subsubsection)\*?\{[^}]*\}|\\begin\{(?:abstract|IEEEkeywords|keywords|acknowledgements|acknowledgments|thebibliography|appendix)\})/i;

  const parts = body.split(BODY_SECTION_REGEX);
  const blocks = [];
  const leadingContent = (parts[0] || "").trim();

  let currentSection = null;
  let currentSubsection = null;

  for (let i = 1; i < parts.length; i += 2) {
    const delimiter = parts[i];
    let content = (parts[i + 1] || "").trim();

    let type = "section";
    let name = "Untitled";
    let subtype = "standard";
    let envTag = null;

    if (delimiter.startsWith("\\begin")) {
      const match = delimiter.match(/\\begin\{([^}]+)\}/);
      if (match) {
        envTag = match[1];
        if (envTag === "table" || envTag === "wraptable") {
          type = "section";
          subtype = "table";
          name = "Table Block";
          content = delimiter + content;
        } else {
          name = envTag.charAt(0).toUpperCase() + envTag.slice(1);
          type = "section";
          subtype = "env";
        }
      }
    } else {
      const match = delimiter.match(
        /\\(section|subsection|subsubsection)(\*)?\{([^}]*)\}/,
      );
      if (match) {
        type = match[1];
        subtype = match[2] === "*" ? "starred" : "standard";
        name = match[3];
      }
    }

    const newBlock = {
      id: Date.now() + Math.random(),
      type: type,
      source: "inline",
      subtype: subtype,
      envTag: envTag,
      name: name,
      content: content,
      children: [],
    };

    if (type === "section") {
      currentSection = newBlock;
      currentSubsection = null;
      blocks.push(newBlock);
    } else if (type === "subsection") {
      if (currentSection) {
        currentSection.children.push(newBlock);
        currentSubsection = newBlock;
      } else {
        blocks.push(newBlock);
        currentSubsection = newBlock;
      }
    } else if (type === "subsubsection") {
      if (currentSubsection) {
        currentSubsection.children.push(newBlock);
      } else if (currentSection) {
        currentSection.children.push(newBlock);
      } else {
        blocks.push(newBlock);
      }
    }
  }

  return { blocks, leadingContent };
};

// ============ HELPER: Resolve a file name from the fileMap ============
const resolveFileContent = (inputName, fileMap) => {
  if (!fileMap || typeof fileMap !== "object") return null;

  // Try exact match first (e.g., "abstract.tex")
  if (fileMap[inputName]) {
    const entry = fileMap[inputName];
    return typeof entry === "string" ? entry : entry?.content || null;
  }

  // Try with .tex extension (e.g., "abstract" -> "abstract.tex")
  const withTex = inputName.endsWith(".tex") ? inputName : inputName + ".tex";
  if (fileMap[withTex]) {
    const entry = fileMap[withTex];
    return typeof entry === "string" ? entry : entry?.content || null;
  }

  return null;
};

// ============ HELPER: Get canonical file name (with .tex) ============
const canonicalFileName = (inputName) => {
  return inputName.endsWith(".tex") ? inputName : inputName + ".tex";
};

// ============ 1. LATEX TO SECTIONS (Uses Split) ============
// fileMap: optional object mapping file names to their content
//   e.g. { "abstract.tex": { content: "..." }, "intro.tex": { content: "..." } }
//   or   { "abstract.tex": "...", "intro.tex": "..." }
export const latexToSections = (latexDoc, fileMap = {}) => {
  if (!latexDoc) return [];
  const root = [];

  const { preamble, body, postamble } = splitLatex(latexDoc);

  // ---- Phase 1: Split body on \input{} directives AND section commands ----
  // We process the body line-by-line to detect \input{} directives
  // and separate them from inline content
  const INPUT_REGEX = /^\s*\\input\{([^}]+)\}\s*$/;

  const bodyLines = body.split("\n");
  const segments = []; // Array of { type: "inline"|"input", content|fileName }
  let currentInlineLines = [];

  const flushInline = () => {
    if (currentInlineLines.length > 0) {
      const inlineContent = currentInlineLines.join("\n");
      if (inlineContent.trim()) {
        segments.push({ type: "inline", content: inlineContent });
      }
      currentInlineLines = [];
    }
  };

  for (const line of bodyLines) {
    const inputMatch = line.match(INPUT_REGEX);
    if (inputMatch) {
      flushInline();
      segments.push({ type: "input", fileName: inputMatch[1] });
    } else {
      currentInlineLines.push(line);
    }
  }
  flushInline();

  // ---- Phase 2: Build the section tree ----
  // The first inline segment (before any section/input) is the inner preamble
  let innerPreambleHandled = false;
  let currentSection = null;
  let currentSubsection = null;

  // Use index-based loop to enable peek-ahead for merging env blocks with \input{}
  for (let si = 0; si < segments.length; si++) {
    const segment = segments[si];
    if (segment.type === "input") {
      // ---- FILE-REFERENCE BLOCK ----
      const rawName = segment.fileName;
      const fileName = canonicalFileName(rawName);
      const fileContent = resolveFileContent(rawName, fileMap);

      if (fileContent !== null && fileContent.trim()) {
        // Parse the file content for sections/subsections
        const { blocks, leadingContent } = parseBodyIntoBlocks(fileContent);

        if (blocks.length > 0) {
          // File contains section structure — create file-reference blocks
          for (const block of blocks) {
            block.source = "file";
            block.fileName = fileName;
            // Mark children as belonging to this file too
            const markChildren = (node) => {
              node.source = "file";
              node.fileName = fileName;
              if (node.children) node.children.forEach(markChildren);
            };
            markChildren(block);

            if (block.type === "section") {
              currentSection = block;
              currentSubsection = null;
              root.push(block);
            } else if (block.type === "subsection") {
              if (currentSection) {
                currentSection.children.push(block);
                currentSubsection = block;
              } else {
                root.push(block);
                currentSubsection = block;
              }
            } else {
              root.push(block);
            }
          }

          // If there's leading content before sections in the file,
          // prepend it to the first block's content
          if (leadingContent && blocks.length > 0) {
            blocks[0].content = leadingContent + "\n" + blocks[0].content;
          }
        } else {
          // File has NO section structure — this is content injection
          // Inject into the current section if one exists
          if (currentSection) {
            // Append file content to the current section's content
            currentSection.content = (currentSection.content + "\n" + fileContent.trim()).trim();
            // Track that this content came from a file (for round-trip serialization)
            currentSection.contentFileName = fileName;
          } else {
            // No current section — create a standalone block as fallback
            // (e.g., \input{test} at the very top with no preceding section)
            const displayName = rawName
              .replace(/\.tex$/, "")
              .replace(/[_-]/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());

            const fileBlock = {
              id: Date.now() + Math.random(),
              type: "section",
              source: "file",
              fileName: fileName,
              subtype: "standard",
              envTag: null,
              name: displayName,
              content: fileContent.trim(),
              children: [],
            };

            currentSection = fileBlock;
            currentSubsection = null;
            root.push(fileBlock);
          }
        }
      } else {
        // File not found or empty — create block with empty content
        // If a preceding env block already adopted this file, skip creating a duplicate
        if (currentSection && currentSection.contentFileName === fileName) {
          // Already merged — skip
          continue;
        }

        const displayName = rawName
          .replace(/\.tex$/, "")
          .replace(/[_-]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        // If a preceding env block (like \begin{abstract}) is waiting for content,
        // merge this empty file into it rather than creating a duplicate block
        if (currentSection && currentSection._pendingEnvMerge) {
          currentSection.content = "";
          currentSection.contentFileName = fileName;
          currentSection.source = "file";
          currentSection.fileName = fileName;
          delete currentSection._pendingEnvMerge;
          continue;
        }

        const placeholderBlock = {
          id: Date.now() + Math.random(),
          type: "section",
          source: "file",
          fileName: fileName,
          subtype: "standard",
          envTag: null,
          name: displayName,
          content: "",
          children: [],
        };

        currentSection = placeholderBlock;
        currentSubsection = null;
        root.push(placeholderBlock);
      }
    } else {
      // ---- INLINE CONTENT ----
      // Strip \end{envTag} lines that belong to a preceding env block
      // (e.g. \end{abstract} after \begin{abstract}...\input{abstract})
      let cleanedContent = segment.content;
      if (currentSection && currentSection.envTag) {
        const endPattern = new RegExp(
          `\\\\end\\{${currentSection.envTag}\\}\\s*`, "i"
        );
        cleanedContent = cleanedContent.replace(endPattern, "").trim();
      }

      const { blocks, leadingContent: rawLeading } = parseBodyIntoBlocks(cleanedContent);
      const leadingContent = rawLeading;

      // Handle inner preamble (content before any section)
      if (!innerPreambleHandled) {
        const preambleText = leadingContent || "";
        const fullPreambleContent = (preamble + "\n" + preambleText).trim();

        root.push({
          id: "preamble-block",
          type: "preamble",
          name: "Document Configuration",
          content: fullPreambleContent,
          children: [],
        });
        innerPreambleHandled = true;
      } else if (leadingContent) {
        // Content between sections that doesn't belong to any section
        // Append to the last section if one exists
        if (currentSection) {
          currentSection.content = (currentSection.content + "\n" + leadingContent).trim();
        }
      }

      for (const block of blocks) {
        block.source = "inline";

        // Check if this block (section, env, etc.) has empty content and is
        // immediately followed by \input{} — if so, merge the file content
        // into this block to prevent duplicate cells.
        // Pattern: \section{Intro}\n\input{sections/intro} or \begin{abstract}\n\input{abstract}
        // Also handles \begin{thebibliography}{1}\n\input{references} where {1} is an env argument
        let effectivelyEmpty = !block.content || !block.content.trim();

        // For env blocks, check if "content" is just a LaTeX argument like {1} or {99}
        // These are part of the env header, not real content
        if (!effectivelyEmpty && block.subtype === "env" && block.content) {
          const argMatch = block.content.trim().match(/^\{[^}]*\}$/);
          if (argMatch) {
            block.envArg = block.content.trim(); // Store the argument separately
            block.content = ""; // Clear the content so it's treated as empty
            effectivelyEmpty = true;
          }
        }

        if (effectivelyEmpty) {
          const nextSeg = segments[si + 1];
          if (nextSeg && nextSeg.type === "input") {
            const nextFileName = canonicalFileName(nextSeg.fileName);
            let nextFileContent = resolveFileContent(nextSeg.fileName, fileMap);

            // For env blocks, strip any structural \begin{} / \end{} / args
            // that may have leaked into the file from previous saves
            if (nextFileContent && block.subtype === "env" && block.envTag) {
              const tag = block.envTag;
              nextFileContent = nextFileContent
                .replace(new RegExp(`\\\\begin\\{${tag}\\}(\\{[^}]*\\})?\\s*`, "gi"), "")
                .replace(new RegExp(`\\\\end\\{${tag}\\}\\s*`, "gi"), "")
                .trim();
            }

            // Check if the file has no section structure (raw content injection)
            if (nextFileContent === null || !nextFileContent.trim()) {
              // Empty or missing file — merge into this block
              block.content = nextFileContent || "";
              block.contentFileName = nextFileName;
              block.source = "file";
              block.fileName = nextFileName;
              si++; // Skip the \input{} segment
            } else {
              const { blocks: fileBlocks } = parseBodyIntoBlocks(nextFileContent);
              if (fileBlocks.length === 0) {
                // Raw content — merge into this block
                block.content = nextFileContent.trim();
                block.contentFileName = nextFileName;
                block.source = "file";
                block.fileName = nextFileName;
                si++; // Skip the \input{} segment
              }
            }
          }
        }

        if (block.type === "section") {
          currentSection = block;
          currentSubsection = null;
          root.push(block);
        } else if (block.type === "subsection") {
          if (currentSection) {
            currentSection.children.push(block);
            currentSubsection = block;
          } else {
            root.push(block);
            currentSubsection = block;
          }
        } else if (block.type === "subsubsection") {
          if (currentSubsection) {
            currentSubsection.children.push(block);
          } else if (currentSection) {
            currentSection.children.push(block);
          } else {
            root.push(block);
          }
        }
      }
    }
  }

  // If no segments produced a preamble block (e.g., body is all \input{} lines)
  if (!innerPreambleHandled) {
    root.unshift({
      id: "preamble-block",
      type: "preamble",
      name: "Document Configuration",
      content: preamble.trim(),
      children: [],
    });
  }

  if (postamble) {
    root.push({
      id: "postamble-block",
      type: "postamble",
      name: "End Document",
      content: postamble,
      children: [],
    });
  }

  return root;
};

// ============ HELPER: Serialize a node and its children to inline LaTeX ============
const serializeNodeInline = (node) => {
  let result = "";
  let header = "";

  if (node.subtype === "table") {
    header = "";
  } else if (node.subtype === "env") {
    const tag = node.envTag || node.name.toLowerCase();
    const envArgStr = node.envArg || "";
    header = `\\begin{${tag}}${envArgStr}`;
  } else if (node.subtype === "starred") {
    header = `\\${node.type}*{${node.name}}`;
  } else {
    header = `\\${node.type}{${node.name}}`;
  }

  if (header) result += header + "\n";
  if (node.content) result += node.content;

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      const childResult = serializeNodeInline(child);
      // Add spacing before child content
      if (result.length > 0 && !result.endsWith("\n\n")) {
        if (result.endsWith("\n")) result += "\n";
        else result += "\n\n";
      }
      result += childResult;
    }
  }

  return result;
};

// ============ 2. SECTIONS TO LATEX ============
// Returns { latex: string, fileUpdates: { "filename.tex": "content" } }
export const sectionsToLatex = (sections) => {
  let latex = "";
  let postambleContent = "";
  const fileUpdates = {};

  // Track which files we've already emitted an \input for
  // (multiple sections can belong to the same file)
  const emittedFiles = new Set();

  const processNode = (node, isTopLevel = false) => {
    if (node.type === "postamble") {
      postambleContent = "\n" + node.content;
      return;
    }

    if (node.type === "preamble") {
      latex += node.content + "\n\n";
      return;
    }

    // ---- FILE-REFERENCE BLOCK ----
    if (node.source === "file" && node.fileName && isTopLevel) {
      const fileName = node.fileName;

      // For env blocks (abstract, thebibliography, etc.), emit the wrapper
      // in main.tex and only save raw content to the file
      if (node.subtype === "env") {
        const tag = node.envTag || node.name.toLowerCase();
        // Save only raw content to the external file
        const rawContent = node.content || "";
        if (fileUpdates[fileName]) {
          fileUpdates[fileName] += "\n\n" + rawContent;
        } else {
          fileUpdates[fileName] = rawContent;
        }

        // Emit \begin{env} + \input{} + \end{env} in main.tex
        if (!emittedFiles.has(fileName)) {
          if (latex.length > 0 && !latex.endsWith("\n\n")) {
            if (latex.endsWith("\n")) latex += "\n";
            else latex += "\n\n";
          }
          const inputName = fileName.replace(/\.tex$/, "");
          const envArgStr = node.envArg || "";
          latex += `\\begin{${tag}}${envArgStr}\n\\input{${inputName}}\n\\end{${tag}}\n`;
          emittedFiles.add(fileName);
        }
      } else {
        // For regular section blocks, emit \section{} + \input{} in main.tex
        // and only save raw content to the file
        let header = "";
        if (node.subtype === "starred") {
          header = `\\${node.type}*{${node.name}}`;
        } else {
          header = `\\${node.type}{${node.name}}`;
        }

        // Save only raw content (without header) to the external file
        const rawContent = node.content || "";
        // Also serialize children content for the file
        let childContent = "";
        if (node.children && node.children.length > 0) {
          for (const child of node.children) {
            childContent += "\n\n" + serializeNodeInline(child);
          }
        }
        const fullFileContent = (rawContent + childContent).trim();

        if (fileUpdates[fileName]) {
          fileUpdates[fileName] += "\n\n" + fullFileContent;
        } else {
          fileUpdates[fileName] = fullFileContent;
        }

        // Emit header + \input{} in main.tex only once per file
        if (!emittedFiles.has(fileName)) {
          if (latex.length > 0 && !latex.endsWith("\n\n")) {
            if (latex.endsWith("\n")) latex += "\n";
            else latex += "\n\n";
          }
          const inputName = fileName.replace(/\.tex$/, "");
          latex += `${header}\n\\input{${inputName}}\n`;
          emittedFiles.add(fileName);
        }
      }
      return;
    }

    // ---- INLINE BLOCK with possible contentFileName ----
    let header = "";
    if (node.subtype === "table") {
      header = "";
    } else if (node.subtype === "env") {
      const tag = node.envTag || node.name.toLowerCase();
      const envArgStr = node.envArg || "";
      header = `\\begin{${tag}}${envArgStr}`;
    } else if (node.subtype === "starred") {
      header = `\\${node.type}*{${node.name}}`;
    } else {
      header = `\\${node.type}{${node.name}}`;
    }

    // Add double newline before section headers (if not at very start)
    if (latex.length > 0 && !latex.endsWith("\n\n")) {
      if (latex.endsWith("\n")) latex += "\n";
      else latex += "\n\n";
    }

    latex += header;
    if (header) latex += "\n";

    // If this section's content came from an \input{} file, emit \input{}
    // and save the content to fileUpdates instead of inlining it
    if (node.contentFileName) {
      const fileName = node.contentFileName;
      const inputName = fileName.replace(/\.tex$/, "");
      latex += `\\input{${inputName}}`;
      // If this is an env block, emit \\end{tag} in main.tex
      if (node.subtype === "env") {
        const tag = node.envTag || node.name.toLowerCase();
        latex += `\n\\end{${tag}}`;
      }
      // Save the section content to the file
      fileUpdates[fileName] = node.content || "";
    } else if (node.content && node.type !== "preamble") {
      latex += node.content;
    }

    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => processNode(child, false));
    }
  };

  sections.forEach((node) => processNode(node, true));

  latex +=
    postambleContent ||
    (latex.includes("\\documentclass") && !latex.includes("\\end{document}")
      ? "\n\\end{document}"
      : "");

  return { latex, fileUpdates };
};

// ============ 3. LATEX TO RICH TEXT (PURE BODY CONVERSION) ============
export const latexToRichText = (latexBody) => {
  if (!latexBody) return "";

  // 1. SPLIT PREAMBLE, BODY, POSTAMBLE
  let { preamble, body, postamble } = splitLatex(latexBody);

  // 2. EXTRACT "INNER PREAMBLE" (The Fix)
  // Find where the first real section or abstract starts
  const match = body.match(SECTION_REGEX);
  let innerPreamble = "";

  if (match) {
    innerPreamble = body.substring(0, match.index);
    body = body.substring(match.index); // Body is now clean content only
  }

  // Hide the inner preamble (Title, Author, etc.) inside the main preamble
  if (innerPreamble.trim()) {
    preamble = (preamble + "\n" + innerPreamble).trim();
  }

  // 3. PROCESS REMAINING BODY
  let processed = stripLatexComments(body);

  // Convert tables and figures to protected Quill blot blocks
  processed = processed.replace(
    /\\begin\{table\}(?:\[.*?\])?([\s\S]*?)\\end\{table\}/g,
    (match) => {
      const encoded = btoa(unescape(encodeURIComponent(match)));
      return `<div class="ql-latex-block" data-latex="${encoded}" data-type="table"></div>`;
    },
  );

  processed = processed.replace(
    /\\begin\{figure\}(?:\[.*?\])?([\s\S]*?)\\end\{figure\}/g,
    (match) => {
      const encoded = btoa(unescape(encodeURIComponent(match)));
      return `<div class="ql-latex-block" data-latex="${encoded}" data-type="figure"></div>`;
    },
  );

  // Convert equations to protected Quill blot blocks
  const equations = [];
  processed = processed
    .replace(/\$\$([^\$]*?)\$\$/g, (match) => {
      const encoded = btoa(unescape(encodeURIComponent(match)));
      return `<div class="ql-latex-block" data-latex="${encoded}" data-type="equation"></div>`;
    })
    .replace(/\$([^$\n]+)\$/g, (match) => {
      const encoded = btoa(unescape(encodeURIComponent(match)));
      return `<div class="ql-latex-block" data-latex="${encoded}" data-type="equation"></div>`;
    })
    .replace(
      /\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g,
      (match) => {
        const encoded = btoa(unescape(encodeURIComponent(match)));
        return `<div class="ql-latex-block" data-latex="${encoded}" data-type="equation"></div>`;
      },
    )
    .replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, (match) => {
      const encoded = btoa(unescape(encodeURIComponent(match)));
      return `<div class="ql-latex-block" data-latex="${encoded}" data-type="equation"></div>`;
    });

  processed = processed.replace(
    /\\begin\{(flushleft|center|flushright)\}([\s\S]*?)\\end\{\1\}/gi,
    "$2",
  );
  processed = processed.replace(/\\vspace\{[^}]+\}/g, "");

  // Handle Special Environments
  const envRegex = new RegExp(
    `\\\\begin\\{(${SPECIAL_ENVS_PATTERN})\\}([\\s\\S]*?)\\\\end\\{\\1\\}`,
    "gi",
  );
  processed = processed.replace(
    envRegex,
    (match, envName, content) =>
      `\n\n<h3><strong>${envName}</strong></h3>\n<p>${content.trim()}</p>\n`,
  );

  // Handle Sections
  processed = processed
    .replace(/\\section\{([^}]*)\}/g, "<h2><strong>$1</strong></h2>")
    .replace(/\\subsection\{([^}]*)\}/g, "<h3><strong>$1</strong></h3>")
    .replace(/\\subsubsection\{([^}]*)\}/g, "<h4><strong>$1</strong></h4>")
    .replace(/\\section\*\{([^}]*)\}/g, "<h2><strong>$1</strong></h2>")
    .replace(/\\subsection\*\{([^}]*)\}/g, "<h3><strong>$1</strong></h3>")
    .replace(/\\subsubsection\*\{([^}]*)\}/g, "<h4><strong>$1</strong></h4>");

  // Handle Lists
  processed = processed
    .replace(
      /\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g,
      (match, content) =>
        `<ul>${content
          .split(/\\item\s+/)
          .filter((i) => i.trim())
          .map((i) => `<li>${i.trim()}</li>`)
          .join("")}</ul>`,
    )
    .replace(
      /\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g,
      (match, content) =>
        `<ol>${content
          .split(/\\item\s+/)
          .filter((i) => i.trim())
          .map((i) => `<li>${i.trim()}</li>`)
          .join("")}</ol>`,
    );

  // Formatting
  processed = processed
    .replace(/\\textbf\{([^}]+)\}/g, "<strong>$1</strong>")
    .replace(/\\textit\{([^}]+)\}/g, "<em>$1</em>")
    .replace(/\\emph\{([^}]+)\}/g, "<em>$1</em>")
    .replace(/\\texttt\{([^}]+)\}/g, "<code>$1</code>")
    .replace(/\\underline\{([^}]+)\}/g, "<u>$1</u>")
    .replace(/\\sout\{([^}]+)\}/g, "<s>$1</s>")
    .replace(/\\textsuperscript\{([^}]+)\}/g, "<sup>$1</sup>")
    .replace(/\\textsubscript\{([^}]+)\}/g, "<sub>$1</sub>")
    .replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, '<a href="$1">$2</a>')
    .replace(/\\url\{([^}]+)\}/g, '<a href="$1">$1</a>')
    .replace(/\\today/g, "[Date: Today]");

  const paragraphs = processed
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((p) => (p.trim().startsWith("<") ? p : `<p>${p}</p>`))
    .join("\n\n");

  let result = paragraphs;
  equations.forEach((eq, i) => {
    result = result.replace(`__EQ${i}__`, eq);
  });

  // 4. PACK HIDDEN DATA
  let prefix = "";
  let suffix = "";

  if (preamble) {
    const encoded = btoa(unescape(encodeURIComponent(preamble)));
    prefix = ``;
  }

  if (postamble) {
    const encoded = btoa(unescape(encodeURIComponent(postamble)));
    suffix = ``;
  }

  return prefix + result + suffix;
};

export const richTextToLatex = (richText) => {
  if (!richText) return "";

  let latex = richText;
  let restoredPreamble = "";
  let restoredPostamble = "";

  // 1. EXTRACT HIDDEN PREAMBLE
  const preambleRegex = new RegExp("");
  const preambleMatch = latex.match(preambleRegex);

  if (preambleMatch) {
    try {
      restoredPreamble = decodeURIComponent(escape(atob(preambleMatch[1])));
      latex = latex.replace(preambleMatch[0], "");
    } catch (e) {
      console.error(e);
    }
  }

  // 2. EXTRACT HIDDEN POSTAMBLE
  const postambleRegex = new RegExp("");
  const postambleMatch = latex.match(postambleRegex);

  if (postambleMatch) {
    try {
      restoredPostamble = decodeURIComponent(escape(atob(postambleMatch[1])));
      latex = latex.replace(postambleMatch[0], "");
    } catch (e) {
      console.error(e);
    }
  }

  // ====== KEY FIX: PRESERVE EQUATIONS FIRST ======
  const equations = [];
  latex = latex
    .replace(/\$\$([^\$]*?)\$\$/g, (match) => {
      equations.push(match);
      return `__EQ${equations.length - 1}__`;
    })
    .replace(/\$([^$\n]+)\$/g, (match) => {
      equations.push(match);
      return `__EQ${equations.length - 1}__`;
    });

  // ====== EXTRACT LATEX BLOCK BLOTS (tables, figures) ======
  const latexBlocks = [];

  // Extract ql-latex-block blots (from Quill BlockEmbed)
  latex = latex.replace(
    /<div[^>]*class="ql-latex-block"[^>]*data-latex="([^"]*)"[^>]*>[\s\S]*?<\/div>(?:\s*<\/div>)*/gi,
    (_, encoded) => {
      try {
        latexBlocks.push(decodeURIComponent(escape(atob(encoded))));
      } catch {
        latexBlocks.push("");
      }
      return `__LATEXBLOCK${latexBlocks.length - 1}__`;
    },
  );

  // Backward compat: also catch old-style <table data-latex="..."> format
  latex = latex.replace(
    /<table[^>]*data-latex="([^"]+)"[^>]*>[\s\S]*?<\/table>/gi,
    (_, encoded) => {
      try {
        latexBlocks.push(decodeURIComponent(escape(atob(encoded))));
      } catch {
        latexBlocks.push("");
      }
      return `__LATEXBLOCK${latexBlocks.length - 1}__`;
    },
  );

  // Basic HTML to LaTeX conversions
  latex = latex
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p><p>/gi, "\n\n")
    .replace(/<p>/gi, "")
    .replace(/<\/p>/gi, "\n")
    .replace(/\[Date: Today\]/g, "\\today");

  // Restore Special Environment Headers -> \begin{...}
  latex = latex.replace(
    new RegExp(
      `<h3[^>]*>\\s*(?:<strong>|<b>)?\\s*(${SPECIAL_ENVS_PATTERN})\\s*(?:<\\/strong>|<\\/b>)?\\s*<\\/h3>`,
      "gi",
    ),
    (match, envName) => `\n\n\\begin{${envName}}\n`,
  );

  // Restore Sections
  latex = latex
    .replace(
      /<h2[^>]*>(?:<strong>)?([^<]+)(?:<\/strong>)?<\/h2>/gi,
      "\n\n\\section{$1}\n\n",
    )
    .replace(
      /<h3[^>]*>(?:<strong>)?([^<]+)(?:<\/strong>)?<\/h3>/gi,
      "\n\n\\subsection{$1}\n\n",
    )
    .replace(
      /<h4[^>]*>(?:<strong>)?([^<]+)(?:<\/strong>)?<\/h4>/gi,
      "\n\n\\subsubsection{$1}\n\n",
    );

  // AUTO-CLOSE ENVIRONMENTS
  const closeEnvRegex = new RegExp(
    `(\\\\begin\\{(${SPECIAL_ENVS_PATTERN})\\}[\\s\\S]*?)(?=\n\\s*\\\\(?:section|subsection|subsubsection|begin)|$)`,
    "gi",
  );
  latex = latex.replace(closeEnvRegex, (match, content, envName) => {
    if (content.includes(`\\end{${envName}}`)) return match;
    return `${content.trim()}\n\\end{${envName}}\n`;
  });

  // Lists and formatting
  latex = latex
    .replace(
      /<ul[^>]*>([\s\S]*?)<\/ul>/gi,
      (match, content) =>
        `\n\\begin{itemize}\n${content
          .split(/<li[^>]*>/)
          .slice(1)
          .map((i) => `\\item ${i.replace(/<\/li>/gi, "").trim()}`)
          .join("\n")}\n\\end{itemize}\n`,
    )
    .replace(
      /<ol[^>]*>([\s\S]*?)<\/ol>/gi,
      (match, content) =>
        `\n\\begin{enumerate}\n${content
          .split(/<li[^>]*>/)
          .slice(1)
          .map((i) => `\\item ${i.replace(/<\/li>/gi, "").trim()}`)
          .join("\n")}\n\\end{enumerate}\n`,
    );

  latex = latex
    .replace(/<strong[^>]*>([^<]+)<\/strong>/gi, "\\textbf{$1}")
    .replace(/<b[^>]*>([^<]+)<\/b>/gi, "\\textbf{$1}")
    .replace(/<em[^>]*>([^<]+)<\/em>/gi, "\\textit{$1}")
    .replace(/<i[^>]*>([^<]+)<\/i>/gi, "\\textit{$1}")
    .replace(/<code[^>]*>([^<]+)<\/code>/gi, "\\texttt{$1}")
    .replace(/<u[^>]*>([^<]+)<\/u>/gi, "\\underline{$1}")
    .replace(/<s[^>]*>([^<]+)<\/s>/gi, "\\sout{$1}")
    .replace(/<del[^>]*>([^<]+)<\/del>/gi, "\\sout{$1}")
    .replace(/<strike[^>]*>([^<]+)<\/strike>/gi, "\\sout{$1}")
    .replace(/<sup[^>]*>([^<]+)<\/sup>/gi, "\\textsuperscript{$1}")
    .replace(/<sub[^>]*>([^<]+)<\/sub>/gi, "\\textsubscript{$1}")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "\\href{$1}{$2}");

  // Strip any remaining HTML tags that slipped through converters
  latex = latex
    .replace(/<blockquote[^>]*>/gi, "")
    .replace(/<\/blockquote>/gi, "\n")
    .replace(/<pre[^>]*>([^<]*)<\/pre>/gi, "$1")
    .replace(/<span[^>]*>([^<]*)<\/span>/gi, "$1")
    .replace(/<div[^>]*>([^<]*)<\/div>/gi, "$1\n")
    .replace(/<[^>]+>/g, "");

  latex = latex.replace(/\n{3,}/g, "\n\n").trim();

  // RESTORE EQUATIONS AT THE END
  equations.forEach((eq, i) => {
    latex = latex.replace(new RegExp(`__EQ${i}__`, "g"), eq);
  });

  // RESTORE LATEX BLOCKS (tables, figures) AT THE END
  latexBlocks.forEach((block, i) => {
    latex = latex.replace(new RegExp(`__LATEXBLOCK${i}__`, "g"), block);
  });

  // Combine
  let finalLatex = "";
  if (restoredPreamble) finalLatex += restoredPreamble + "\n";
  finalLatex += latex;
  if (restoredPostamble) finalLatex += "\n" + restoredPostamble;

  return finalLatex;
};

// ============ 5. SECTION <-> RICH TEXT WRAPPERS ============

// Converts a specific Section Node (from latexToSections) into Rich Text for the editor
export const sectionToRichText = (sectionNode) => {
  if (!sectionNode) return "";

  // If the node IS the environment (e.g. type="section", subtype="env", name="IEEEkeywords"),
  // the content usually doesn't include the \begin{...} \end{...} tags if extracted correctly,
  // OR it does include them depending on how `latexToSections` parsed it.

  // Assuming `latexToSections` content INCLUDES the raw body but maybe NOT the wrapper commands for that specific section:
  // We treat the content as pure body.

  return latexToRichText(sectionNode.content);
};

// Converts Rich Text back into the Content string for a Section Node
export const richTextToSection = (richText) => {
  return richTextToLatex(richText);
};

export default {
  extractLatexBody,
  reconstructLatexDocument,
  latexToRichText,
  richTextToLatex,
  latexToSections,
  sectionsToLatex,
  sectionToRichText,
  richTextToSection,
  splitLatex,
  escapeLatexSpecialChars,
  unescapeLatexSpecialChars,
};
