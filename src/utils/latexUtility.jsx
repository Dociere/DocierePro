import React from "react";

/**
 * latexUtility.jsx - Core conversion engine for LaTeX editor.
 */

// ============ CONSTANTS ============

const SPECIAL_ENVS = [
  "abstract",
  "IEEEkeywords",
  "keywords",
  "acknowledgements",
  "acknowledgments",
  "thebibliography",
  "appendix",
];

const SPECIAL_ENVS_PATTERN = SPECIAL_ENVS.join("|");

const BODY_START_REGEX = new RegExp(
  `(\\\\(?:section|subsection|subsubsection)\\*?\\{[^}]*\\}|\\\\begin\\{(?:${SPECIAL_ENVS_PATTERN})\\}(?:\\{[^}]*\\})?)`,
  "i",
);

// ============ SECTION 1: CORE HELPERS ============

export const isMainFile = (fileName) => {
  if (!fileName) return true;
  const normalized = fileName.replace(/\\/g, "/").toLowerCase();
  return normalized === "main.tex" || normalized.endsWith("/main.tex");
};

export const resolveFileContent = (inputName, fileMap) => {
  if (!fileMap || !inputName) return null;
  const variations = [
    inputName,
    inputName + ".tex",
    inputName.endsWith(".tex") ? inputName.slice(0, -4) : null,
  ].filter(Boolean);

  for (const v of variations) {
    const entry = fileMap[v];
    if (entry) {
      return typeof entry === "string" ? entry : entry.content || "";
    }
  }
  return null;
};

export const canonicalFileName = (inputName) => {
  if (!inputName) return "";
  return inputName.endsWith(".tex") ? inputName : inputName + ".tex";
};

export const stripLatexComments = (text) => {
  if (!text) return text;
  return text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !trimmed.startsWith("%") || trimmed.startsWith("\\%");
    })
    .join("\n");
};

export const escapeLatexSpecialChars = (text) => {
  if (!text) return text;
  if (/\\[a-zA-Z]+|\\begin\{|\\end\{|\$|%/.test(text)) return text;

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
  return text.replace(/[&%$#_{}~^\\]/g, (char) => escapeMap[char] || char);
};

export const unescapeLatexSpecialChars = (text) => {
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

// ============ SECTION 2: SPLITTING LOGIC ============

export const splitLatex = (latexDoc) => {
  if (!latexDoc) return { preamble: "", body: "", postamble: "" };

  const beginTag = "\\begin{document}";
  const endTag = "\\end{document}";

  let beginIdx = latexDoc.indexOf(beginTag);
  let docStartIdx = 0;
  let hasDocEnv = beginIdx !== -1;

  if (hasDocEnv) {
    docStartIdx = beginIdx + beginTag.length;
  }

  let remaining = latexDoc.substring(docStartIdx);
  let endIdx = remaining.lastIndexOf(endTag);
  let postamble = "";
  let bodyRaw = remaining;

  if (hasDocEnv && endIdx !== -1) {
    bodyRaw = remaining.substring(0, endIdx);
    postamble = remaining.substring(endIdx);
  }

  // Intelligent frontmatter parsing to cleanly separate preamble from main text content
  const findContentStartIndex = (text) => {
    let i = 0;
    const frontmatterCommands = new Set([
      "title",
      "author",
      "date",
      "maketitle",
      "thanks",
      "IEEEoverridecommandlockouts",
      "IEEEpeerreviewmaketitle",
      "markboth",
      "pubid",
      "pagenumbering",
      "thispagestyle",
    ]);

    while (i < text.length) {
      if (/\s/.test(text[i])) {
        i++;
        continue;
      }
      if (text[i] === "%") {
        while (i < text.length && text[i] !== "\n") i++;
        continue;
      }

      if (text[i] === "\\") {
        let cmdMatch = text.substring(i).match(/^\\([a-zA-Z]+|\*)/);
        if (cmdMatch) {
          let cmdName = cmdMatch[1];
          if (frontmatterCommands.has(cmdName)) {
            i += cmdMatch[0].length;

            // skip optional args [...]
            while (i < text.length && /\s/.test(text[i])) i++;
            if (i < text.length && text[i] === "[") {
              let depth = 1;
              i++;
              while (i < text.length && depth > 0) {
                if (text[i] === "\\") {
                  i += 2;
                  continue;
                }
                if (text[i] === "[") depth++;
                if (text[i] === "]") depth--;
                i++;
              }
            }

            // skip required args {...}
            while (i < text.length && /\s/.test(text[i])) i++;
            while (i < text.length && text[i] === "{") {
              let depth = 1;
              i++;
              while (i < text.length && depth > 0) {
                if (text[i] === "\\") {
                  i += 2;
                  continue;
                }
                if (text[i] === "{") depth++;
                if (text[i] === "}") depth--;
                i++;
              }
              while (i < text.length && /\s/.test(text[i])) i++;
            }
            continue; // Loop again to find next frontmatter command
          }
        }
      }

      // If we reach here, it's not whitespace, a comment, or a frontmatter command. It's real content!
      return i;
    }
    return i;
  };

  const contentStartOffset = findContentStartIndex(bodyRaw);

  const preamble = latexDoc.substring(0, docStartIdx + contentStartOffset);
  const body = bodyRaw.substring(contentStartOffset);

  return { preamble, body, postamble };
};

// ============ SECTION 3: SECTION VIEW CONVERSION ============

const parseBodyIntoBlocks = (content) => {
  const parts = content.split(BODY_START_REGEX);
  const leadingContent = parts[0] || "";
  const blocks = [];

  for (let i = 1; i < parts.length; i += 2) {
    const delimiter = parts[i];
    let blockContent = parts[i + 1] || "";

    let type = "section";
    let subtype = "standard";
    let name = "Untitled";
    let envTag = null;
    let envArg = null;

    if (delimiter.startsWith("\\begin")) {
      const match = delimiter.match(/\\begin\{([^}]+)\}(\{[^}]*\})?/i);
      if (match) {
        envTag = match[1];
        envArg = match[2] || null;
        subtype = "env";
        name = envTag.charAt(0).toUpperCase() + envTag.slice(1);

        const endTag = `\\end{${envTag}}`;
        const endIdx = blockContent.lastIndexOf(endTag);
        let trailingText = "";
        if (endIdx !== -1) {
          trailingText = blockContent.substring(endIdx + endTag.length).trim();
          blockContent = blockContent.substring(0, endIdx);
        }

        blocks.push({
          id: Math.random().toString(36).substr(2, 9),
          type,
          subtype,
          name,
          content: blockContent.trim(),
          envTag,
          envArg,
          source: "inline",
          fileName: null,
          contentFileName: null,
          children: [],
        });

        if (trailingText) {
          blocks.push({
            id: Math.random().toString(36).substr(2, 9),
            type: "regular",
            subtype: "standard",
            name: "",
            content: trailingText,
            source: "inline",
            fileName: null,
            contentFileName: null,
            children: [],
          });
        }
      }
    } else {
      const match = delimiter.match(
        /\\(section|subsection|subsubsection)(\*)?\{([^}]*)\}/i,
      );
      if (match) {
        type = match[1];
        subtype = match[2] === "*" ? "starred" : "standard";
        name = match[3];
      }
    }

    if (!delimiter.startsWith("\\begin")) {
      blocks.push({
        id: Math.random().toString(36).substr(2, 9),
        type,
        subtype,
        name,
        content: blockContent.trim(),
        envTag,
        envArg,
        source: "inline",
        fileName: null,
        contentFileName: null,
        children: [],
      });
    }
  }

  return { blocks, leadingContent };
};

export const latexToSections = (latexDoc, fileMap = {}) => {
  const { preamble, body, postamble } = splitLatex(latexDoc);
  const sections = [];

  if (preamble) {
    sections.push({
      id: "preamble-block",
      type: "preamble",
      subtype: "standard",
      name: "Document Configuration",
      content: preamble,
      children: [],
    });
  }

  const lines = body.split("\n");
  const segments = [];
  let buffer = [];
  let inSpecialEnv = false;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (
      new RegExp(`\\\\begin\\{(?:${SPECIAL_ENVS_PATTERN})\\}`, "i").test(
        trimmed,
      )
    ) {
      inSpecialEnv = true;
    }
    if (
      new RegExp(`\\\\end\\{(?:${SPECIAL_ENVS_PATTERN})\\}`, "i").test(trimmed)
    ) {
      inSpecialEnv = false;
    }

    const inputMatch = trimmed.match(/^\\input\{([^}]+)\}$/i);
    if (!inSpecialEnv && inputMatch) {
      if (buffer.length > 0) {
        segments.push({ type: "inline", content: buffer.join("\n") });
        buffer = [];
      }
      segments.push({
        type: "input",
        rawName: inputMatch[1],
        fileName: canonicalFileName(inputMatch[1]),
      });
    } else {
      buffer.push(line);
    }
  });
  if (buffer.length > 0)
    segments.push({ type: "inline", content: buffer.join("\n") });

  let currentSection = null;
  let currentSubsection = null;

  segments.forEach((seg) => {
    if (seg.type === "inline") {
      const { blocks, leadingContent } = parseBodyIntoBlocks(seg.content);

      if (leadingContent.trim()) {
        const regBlock = {
          id: Math.random().toString(36).substr(2, 9),
          type: "regular",
          subtype: "standard",
          name: "",
          content: leadingContent.trim(),
          source: "inline",
          fileName: null,
          contentFileName: null,
          children: [],
        };

        if (!currentSection) {
          sections.push(regBlock);
        } else if (!currentSubsection) {
          currentSection.children.push(regBlock);
        } else {
          currentSubsection.children.push(regBlock);
        }
      }

      blocks.forEach((block) => {
        if (block.type === "section") {
          sections.push(block);
          currentSection = block;
          currentSubsection = null;
        } else if (block.type === "subsection") {
          if (currentSection) {
            currentSection.children.push(block);
            currentSubsection = block;
          } else {
            sections.push(block);
            currentSection = block;
          }
        } else if (block.type === "subsubsection") {
          if (currentSubsection) {
            currentSubsection.children.push(block);
          } else if (currentSection) {
            currentSection.children.push(block);
          } else {
            sections.push(block);
          }
        }

        if (
          block.subtype === "env" &&
          block.content.trim().match(/^\\input\{([^}]+)\}$/i)
        ) {
          const inputMatch = block.content
            .trim()
            .match(/^\\input\{([^}]+)\}$/i);
          const fName = canonicalFileName(inputMatch[1]);
          const fContent = resolveFileContent(fName, fileMap);
          if (fContent !== null) {
            block.content = fContent;
            block.contentFileName = fName;
            block.source = "file";
            block.fileName = fName;
          }
        }
      });
    } else {
      const fileContent = resolveFileContent(seg.rawName, fileMap);
      if (fileContent === null) {
        const placeholder = {
          id: Math.random().toString(36).substr(2, 9),
          type: "section",
          subtype: "standard",
          name: seg.rawName,
          content: "",
          source: "file",
          fileName: seg.fileName,
          children: [],
        };
        sections.push(placeholder);
        currentSection = placeholder;
        currentSubsection = null;
      } else {
        const { blocks, leadingContent } = parseBodyIntoBlocks(fileContent);

        if (
          currentSection &&
          !currentSection.fileName &&
          currentSection.content.trim() === ""
        ) {
          currentSection.content = leadingContent.trim();
          currentSection.source = "file";
          currentSection.fileName = seg.fileName;
        } else if (leadingContent.trim() && currentSection) {
          currentSection.content += "\n" + leadingContent;
        }

        blocks.forEach((block) => {
          block.source = "file";
          block.fileName = seg.fileName;

          if (block.type === "section") {
            sections.push(block);
            currentSection = block;
            currentSubsection = null;
          } else if (block.type === "subsection") {
            if (currentSection) {
              currentSection.children.push(block);
              currentSubsection = block;
            } else {
              sections.push(block);
              currentSection = block;
            }
          } else if (block.type === "subsubsection") {
            if (currentSubsection) {
              currentSubsection.children.push(block);
            } else if (currentSection) {
              currentSection.children.push(block);
            } else {
              sections.push(block);
            }
          }
        });
      }
    }
  });

  if (postamble) {
    sections.push({
      id: "postamble-block",
      type: "postamble",
      subtype: "standard",
      name: "Document Configuration",
      content: postamble,
      children: [],
    });
  }

  return sections;
};

export const sectionsToLatex = (sections) => {
  let latex = "";
  let fileUpdates = {};
  const emittedFiles = new Set();

  const serializeNodeInline = (node) => {
    let res = "";
    if (node.type === "regular") {
      if (node.content) res += node.content + "\n";
      node.children.forEach((c) => {
        res += serializeNodeInline(c);
      });
      return res;
    }

    if (node.subtype === "env") {
      res += `\\begin{${node.envTag}}${node.envArg || ""}\n`;
    } else {
      const star = node.subtype === "starred" ? "*" : "";
      res += `\\${node.type}${star}{${node.name}}\n`;
    }
    res += node.content + "\n";
    node.children.forEach((c) => {
      res += serializeNodeInline(c);
    });
    if (node.subtype === "env") res += `\\end{${node.envTag}}\n`;
    return res;
  };

  const processNode = (node, isTopLevel = false) => {
    if (node.type === "preamble") {
      latex += node.content + "\n";
      return;
    }
    if (node.type === "postamble") {
      latex += "\n" + node.content;
      return;
    }
    if (node.type === "regular") {
      if (node.content) latex += node.content + "\n\n";
      node.children.forEach((c) => processNode(c, false));
      return;
    }

    let header = "";
    if (node.subtype === "env") {
      header = `\\begin{${node.envTag}}${node.envArg || ""}\n`;
    } else {
      const star = node.subtype === "starred" ? "*" : "";
      header = `\\${node.type}${star}{${node.name}}\n`;
    }

    if (node.source === "file" && node.fileName && isTopLevel) {
      if (!emittedFiles.has(node.fileName)) {
        if (node.contentFileName) {
          latex +=
            header +
            `\\input{${node.fileName.replace(".tex", "")}}\n\\end{${node.envTag}}\n\n`;
          fileUpdates[node.fileName] = node.content;
        } else {
          latex += header + `\\input{${node.fileName.replace(".tex", "")}}\n\n`;
          let content = node.content + "\n";
          node.children.forEach((c) => {
            content += serializeNodeInline(c);
          });
          fileUpdates[node.fileName] = content.trim();
        }
        emittedFiles.add(node.fileName);
      }
    } else {
      latex += header + node.content + "\n\n";
      node.children.forEach((c) => processNode(c, false));
      if (node.subtype === "env") latex += `\\end{${node.envTag}}\n\n`;
    }
  };

  sections.forEach((n) => processNode(n, true));
  latex = latex.replace(/\n{3,}/g, "\n\n");

  return { latex: latex.trim() + "\n", fileUpdates };
};

// ============ SECTION 4: RICH TEXT CONVERSION ============

export const latexToRichText = (latexBody, fileMap = {}, options = {}) => {
  const { isFragment = false } = options;

  let preamble = "";
  let body = latexBody;
  let postamble = "";

  if (!isFragment) {
    const split = splitLatex(latexBody);
    preamble = split.preamble;
    body = split.body;
    postamble = split.postamble;
  }

  let html = "";
  if (!isFragment) {
    const encodedPreamble = btoa(unescape(encodeURIComponent(preamble)));
    html = `<div class="dc-latex-preamble" data-preamble="${encodedPreamble}" style="display:none"></div>\n`;
  }

  let processed = body;
  const placeholders = [];

  const protect = (regex, type) => {
    processed = processed.replace(regex, (match) => {
      const token = `__${type}_${placeholders.length}__`;
      placeholders.push({ token, content: match, type });
      return token;
    });
  };

  protect(
    /\\begin\{(?:table|wraptable|figure|equation|equation\*|align|align\*)\}[\s\S]*?\\end\{(?:table|wraptable|figure|equation|equation\*|align|align\*)\}/gi,
    "BLOCK",
  );
  protect(/\$\$[\s\S]*?\$\$/g, "BLOCK");
  protect(/\$[^$]+\$/g, "BLOCK");

  processed = processed.replace(
    /^\\input\{([^}]+)\}$/gm,
    (match, inputName) => {
      const fName = canonicalFileName(inputName);
      const content = resolveFileContent(fName, fileMap);
      if (content === null) return match;
      const encodedFile = btoa(unescape(encodeURIComponent(fName)));
      return `<span class="dc-file-marker" data-file="${encodedFile}" data-type="start">&#8203;</span>\n${content}\n<span class="dc-file-marker" data-type="end">&#8203;</span>\n`;
    },
  );

  processed = processed.replace(
    /\\cite\{([^}]*)\}/g,
    '<span class="dc-latex-inline" data-latex-type="citation" data-latex-value="$1"></span>',
  );
  processed = processed.replace(
    /\\footnote\{([^}]*)\}/g,
    '<span class="dc-latex-inline" data-latex-type="footnote" data-latex-value="$1"></span>',
  );
  processed = processed.replace(
    /\\ref\{([^}]*)\}/g,
    '<span class="dc-latex-inline" data-latex-type="ref" data-latex-value="$1"></span>',
  );
  processed = processed.replace(/\\newpage/g, '<hr class="dc-pagebreak">');

  SPECIAL_ENVS.forEach((env) => {
    const regex = new RegExp(
      `\\\\begin\\{${env}\\}(\\{[^}]*\\})?([\\s\\S]*?)\\\\end\\{${env}\\}`,
      "gi",
    );
    processed = processed.replace(regex, (match, arg, content) => {
      const data = { env: env, arg: arg || "" };
      const encData = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
      const envName = env.charAt(0).toUpperCase() + env.slice(1);
      return `<div class="dc-env-block dc-non-breaking" data-env="${encData}" contenteditable="false"><h4 class="dc-env-heading" contenteditable="false">${envName}</h4>\n<div class="dc-env-content" contenteditable="true">${content}</div>\n</div>\n`;
    });
  });

  ["itemize", "enumerate"].forEach((env) => {
    const listTag = env === "itemize" ? "ul" : "ol";
    const regex = new RegExp(
      `\\\\begin\\{${env}\\}([\\s\\S]*?)\\\\end\\{${env}\\}`,
      "gi",
    );
    processed = processed.replace(regex, (match, inner) => {
      const items = inner.split(/\\item/).filter((i) => i.trim());
      const listItemsHtml = items
        .map((item) => `<li>${item.trim()}</li>`)
        .join("\n");
      return `<${listTag}>\n${listItemsHtml}\n</${listTag}>\n`;
    });
  });

  const formats = {
    textbf: "strong",
    textit: "em",
    emph: "em",
    texttt: "code",
    underline: "u",
    sout: "s",
    textsuperscript: "sup",
    textsubscript: "sub",
  };
  Object.entries(formats).forEach(([cmd, tag]) => {
    processed = processed.replace(
      new RegExp(`\\\\${cmd}\\{([^}]*)\\}`, "g"),
      `<${tag}>$1</${tag}>`,
    );
  });

  processed = processed.replace(
    /\\href\{([^}]*)\}\{([^}]*)\}/g,
    '<a href="$1">$2</a>',
  );
  processed = processed.replace(/\\url\{([^}]*)\}/g, '<a href="$1">$1</a>');

  processed = processed.replace(
    /\\(section|subsection|subsubsection)(\*)?\{([^}]*)\}/gi,
    (m, type, star, title) => {
      const typeLower = type.toLowerCase();
      const lvl =
        typeLower === "section" ? 1 : typeLower === "subsection" ? 2 : 3;
      return `<h${lvl}>${title}</h${lvl}>\n`;
    },
  );

  placeholders.forEach((p) => {
    const encoded = btoa(unescape(encodeURIComponent(p.content)));
    const type = p.content.includes("table")
      ? "table"
      : p.content.includes("figure")
        ? "figure"
        : "equation";

    let blockContentHtml = "";
    if (type === "table") {
      const captionMatch = p.content.match(/\\caption\{([^]*?)\}/);
      blockContentHtml = `<span class="dc-block-label">Table</span><span class="dc-block-caption">${captionMatch ? captionMatch[1] : "Table content"}</span><span class="dc-block-badge">EDIT</span>`;
    } else if (type === "figure") {
      const captionMatch = p.content.match(/\\caption\{([^]*?)\}/);
      blockContentHtml = `<span class="dc-block-label">Figure</span><span class="dc-block-caption">${captionMatch ? captionMatch[1] : "Figure content"}</span><span class="dc-block-badge">EDIT</span>`;
    } else if (type === "equation") {
      let eqText = p.content
        .replace(/\\begin\{equation\}|\\end\{equation\}/g, "")
        .trim();
      const shortEq =
        eqText.length > 30 ? eqText.substring(0, 30) + "..." : eqText;
      blockContentHtml = `<span class="dc-block-label">Equation</span><span class="dc-block-caption">${shortEq}</span><span class="dc-block-badge">EQ</span>`;
    }

    const blot = `<div class="dc-latex-block" data-latex="${encoded}" data-type="${type}" contenteditable="false">${blockContentHtml}</div>`;
    processed = processed.replace(p.token, blot);
  });

  processed = processed.replace(
    /\\(?:vspace|hspace|noindent|centering|raggedright|raggedleft|label|maketitle)\{[^}]*\}?/g,
    "",
  );
  processed = processed.replace(/\\today/g, "[Date: Today]");
  processed = stripLatexComments(processed);

  const parts = processed.split(/\n\n+/);
  const bodyHtml = parts
    .map((p) => {
      const t = p.trim();
      if (!t) return "";
      if (/^(<h|<div|<ul|<ol|<hr)/.test(t) || t.startsWith("__")) return t;
      return `<p>${t.replace(/\n/g, " ")}</p>`;
    })
    .join("\n");

  if (!isFragment) {
    const effectivePostamble = postamble.trim() || "\\end{document}";
    const encodedPostamble = btoa(
      unescape(encodeURIComponent(effectivePostamble)),
    );
    const postambleHtml = `\n<div class="dc-postamble-block" data-postamble="${encodedPostamble}" style="display:none"></div>`;
    return html + bodyHtml + postambleHtml;
  }

  return html + bodyHtml;
};

export const richTextToLatex = (richTextHtml, options = {}) => {
  const { isFragment = false } = options;
  const fileUpdates = {};
  let content = richTextHtml;

  content = content.replace(/📄\s*File:[^\n<]+/g, "");
  content = content.replace(/\[\s*\{\s*"env"\s*:[^\]]*\}\s*\]/gi, "");
  content = content.replace(
    /\[\s*(abstract|IEEEkeywords|keywords|acknowledgements|acknowledgments|thebibliography|appendix)(?::\{[^}]*\})?\s*\]/gi,
    "",
  );

  let preamble = "";
  if (!isFragment) {
    content = content.replace(
      /<div[^>]*class="dc-latex-preamble"[^>]*data-preamble="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi,
      (m, data) => {
        try {
          preamble = decodeURIComponent(escape(atob(data)));
        } catch (e) {}
        return "";
      },
    );
  }

  let postamble = "";
  if (!isFragment) {
    content = content.replace(
      /<div[^>]*class="dc-postamble-block"[^>]*data-postamble="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi,
      (m, data) => {
        try {
          postamble = decodeURIComponent(escape(atob(data)));
        } catch (e) {}
        return "";
      },
    );
  }

  const latexBlocks = [];
  content = content.replace(
    /<div[^>]*class="dc-latex-block"[^>]*data-latex="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi,
    (m, data) => {
      try {
        const decoded = decodeURIComponent(escape(atob(data)));
        const token = `__LATEXBLOCK_${latexBlocks.length}__`;
        latexBlocks.push(decoded);
        return token;
      } catch (e) {
        return "";
      }
    },
  );

  const inlineBlots = [];
  content = content.replace(
    /<span[^>]*class="dc-latex-inline"[^>]*data-latex-type="([^"]*)"[^>]*data-latex-value="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi,
    (m, type, val) => {
      const token = `__INLINEBLOT_${inlineBlots.length}__`;
      inlineBlots.push({ type, val });
      return token;
    },
  );

  const fileTokens = [];
  content = content.replace(
    /<[^>]+class="[^"]*dc-file-marker[^"]*"[^>]*data-file="([^"]*)"[^>]*data-type="start"[^>]*>/gi,
    (m, file) => {
      try {
        const fName = decodeURIComponent(escape(atob(file)));
        const token = `__FILESTART_${fileTokens.length}__`;
        fileTokens.push({ fileName: fName });
        return token;
      } catch (e) {
        return m;
      }
    },
  );

  let endIdx = 0;
  content = content.replace(
    /<[^>]+class="[^"]*dc-file-marker[^"]*"[^>]*data-type="end"[^>]*>/gi,
    () => `__FILEEND_${endIdx++}__`,
  );

  content = content.replace(
    /<div[^>]*class="[^"]*dc-env-block[^"]*"[^>]*data-env="([^"]*)"[^>]*>[\s\S]*?<div[^>]*class="[^"]*dc-env-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi,
    (m, encData, innerContent) => {
      try {
        const decoded = decodeURIComponent(escape(atob(encData)));
        const data = JSON.parse(decoded);
        return `\n\\begin{${data.env}}${data.arg}\n${innerContent}\n\\end{${data.env}}\n`;
      } catch (err) {
        return innerContent;
      }
    },
  );

  content = content.replace(
    /<p[^>]*>\s*<strong>\s*\[([^\]]+)\]\s*<\/strong>\s*(.*?)<\/p>/gi,
    "\\bibitem{$1} $2\n",
  );

  content = content.replace(/<h([1-3])[^>]*>(.*?)<\/h\1>/gi, (m, lvl, txt) => {
    const cleanTxt = txt.replace(/<[^>]+>/g, "").trim();
    const cmd =
      lvl === "1" ? "section" : lvl === "2" ? "subsection" : "subsubsection";
    return `\n\\${cmd}{${cleanTxt}}\n\n`;
  });

  content = content.replace(/<strong>(.*?)<\/strong>/g, "\\textbf{$1}");
  content = content.replace(/<em>(.*?)<\/em>/g, "\\textit{$1}");
  content = content.replace(/<u>(.*?)<\/u>/g, "\\underline{$1}");
  content = content.replace(/<s>(.*?)<\/s>/g, "\\sout{$1}");
  content = content.replace(/<sup>(.*?)<\/sup>/g, "\\textsuperscript{$1}");
  content = content.replace(/<sub>(.*?)<\/sub>/g, "\\textsubscript{$1}");
  content = content.replace(/<code>(.*?)<\/code>/g, "\\texttt{$1}");
  content = content.replace(/<a href="([^"]*)">(.*?)<\/a>/g, (m, url, txt) =>
    url === txt ? `\\url{${url}}` : `\\href{${url}}{${txt}}`,
  );

  content = content.replace(
    /<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi,
    (m, tag, inner) => {
      const env = tag.toLowerCase() === "ul" ? "itemize" : "enumerate";
      let items = "";
      inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (liM, liInner) => {
        let clean = liInner
          .replace(/<p[^>]*>/gi, "")
          .replace(/<\/p>/gi, "\n")
          .trim();
        items += `\\item ${clean}\n`;
        return "";
      });
      return `\n\\begin{${env}}\n${items}\\end{${env}}\n\n`;
    },
  );

  content = content.replace(/<p>(.*?)<\/p>/g, "$1\n\n");
  content = content.replace(/<br\s*\/?>/g, "\n");
  content = content.replace(/<hr class="dc-pagebreak">/g, "\\newpage\n\n");
  content = content.replace(/<[^>]+>/g, "");

  content = content.replace(/__LATEXBLOCK_(\d+)__/g, (_, i) => latexBlocks[i]);
  content = content.replace(/__INLINEBLOT_(\d+)__/g, (_, i) => {
    const b = inlineBlots[i];
    if (b.type === "citation") return `\\cite{${b.val}}`;
    if (b.type === "footnote") return `\\footnote{${b.val}}`;
    if (b.type === "ref") return `\\ref{${b.val}}`;
    return "";
  });

  content = content.replace(
    /__FILESTART_(\d+)__([\s\S]*?)__FILEEND_\1__/g,
    (_, idx, fileBody) => {
      const { fileName } = fileTokens[parseInt(idx)];
      let cleanBody = fileBody.trim();
      cleanBody = cleanBody.replace(/^\\begin\{[^}]+\}(\{[^}]*\})?\s*/i, "");
      cleanBody = cleanBody.replace(/\s*\\end\{[^}]+\}\s*$/i, "");
      fileUpdates[fileName] = cleanBody.trim();
      const inputName = fileName.replace(/\.tex$/, "");
      return `\\input{${inputName}}\n\n`;
    },
  );

  content = content.replace(
    /\\begin\{thebibliography\}(\{[^}]*\})?(.*?)\\end\{thebibliography\}/gs,
    (m, arg, inner) => {
      const argStr = arg || "{1}";
      let bib = inner.replace(/\\textbf\{\[([^\]]+)\]\}\s*/g, "\\bibitem{$1} ");
      bib = bib
        .replace(/\\begin\{(?:itemize|enumerate)\}/g, "")
        .replace(/\\end\{(?:itemize|enumerate)\}/g, "")
        .replace(/\\item\s*/g, "");
      return `\\begin{thebibliography}${argStr}\n${bib.trim()}\n\\end{thebibliography}\n`;
    },
  );

  let finalLatex = isFragment
    ? content.trim()
    : (preamble ? preamble.trim() + "\n\n" : "") +
      content.trim() +
      (postamble ? "\n\n" + postamble.trim() : "");

  finalLatex = finalLatex.replace(/\n{3,}/g, "\n\n");

  return { latex: finalLatex, body: content.trim(), fileUpdates };
};

// ============ SECTION 5: FRAGMENT HELPERS ============

export const fileToSections = (
  fileContent,
  fileName,
  sectionNameHint,
  fileMap = {},
) => {
  const { blocks, leadingContent } = parseBodyIntoBlocks(fileContent || "");

  const deriveDisplayName = (name) => {
    return (name || "")
      .replace(/.*\//, "")
      .replace(/\.tex$/i, "")
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const displayName = sectionNameHint || deriveDisplayName(fileName);

  const rootNode = {
    id: "file-root-section",
    type: "section",
    subtype: "standard",
    name: displayName,
    content: leadingContent.trim(),
    source: "file",
    fileName: fileName,
    children: [],
  };

  let currentSubsection = null;

  blocks.forEach((block) => {
    block.source = "file";
    block.fileName = fileName;

    if (block.type === "section") {
      rootNode.children.push(block);
      currentSubsection = null;
    } else if (block.type === "subsection") {
      rootNode.children.push(block);
      currentSubsection = block;
    } else if (block.type === "subsubsection") {
      if (currentSubsection) {
        currentSubsection.children.push(block);
      } else {
        rootNode.children.push(block);
      }
    }
  });

  return [rootNode];
};

export const sectionsToFile = (sections, activeFileName) => {
  let content = "";
  const fileUpdates = {};

  const serializeNode = (node) => {
    if (node.id === "file-root-section") {
      if (node.content) content += node.content.trim() + "\n\n";
      node.children.forEach(serializeNode);
      return;
    }

    // FIX: Never emit \regular{...}
    if (node.type === "regular") {
      if (node.content) content += node.content.trim() + "\n\n";
      node.children.forEach(serializeNode);
      return;
    }

    if (node.subtype === "env") {
      content += `\\begin{${node.envTag}}${node.envArg || ""}\n`;
      if (node.content) content += node.content.trim() + "\n\n";
      node.children.forEach(serializeNode);
      content += `\\end{${node.envTag}}\n\n`;
      return;
    }

    const star = node.subtype === "starred" ? "*" : "";
    content += `\\${node.type}${star}{${node.name}}\n`;
    if (node.content) content += node.content.trim() + "\n\n";
    node.children.forEach(serializeNode);
  };

  sections.forEach(serializeNode);

  content = content.replace(/\n{3,}/g, "\n\n");
  fileUpdates[activeFileName] = content.trim();

  return { latex: content.trim(), fileUpdates };
};

// ============ SECTION 6: BRIDGE FUNCTIONS ============

export const sectionToRichText = (sectionNode) => {
  let content = sectionNode.content || "";
  // Do not wrap it in \begin{abstract} here to prevent duplicate headings inside the editor!
  if (
    sectionNode.envTag === "keywords" ||
    sectionNode.envTag === "IEEEkeywords"
  ) {
    content = content.replace(/^Keywords:|^Index Terms:/i, "").trim();
  }
  return latexToRichText(content, {}, { isFragment: true });
};

export const richTextToSection = (richTextHtml) => {
  const { latex } = richTextToLatex(richTextHtml, { isFragment: true });
  // Instead of replacing all begins/ends, just return the exact body without destroying \begin{itemize}
  const { body } = splitLatex(latex);
  return body.trim();
};

// ============ SECTION 6: LEGACY HELPERS ============

export const extractLatexBody = (latex) => {
  const { body } = splitLatex(latex);
  return body;
};

export const reconstructLatexDocument = (originalLatex, newBodyContent) => {
  const { preamble, postamble } = splitLatex(originalLatex);
  return `${preamble.trim()}\n\n${newBodyContent.trim()}\n\n${postamble.trim()}`.replace(
    /\n{3,}/g,
    "\n\n",
  );
};

// ============ EXPORTS ============

const latexUtility = {
  isMainFile,
  splitLatex,
  latexToSections,
  sectionsToLatex,
  fileToSections,
  sectionsToFile,
  latexToRichText,
  richTextToLatex,
  sectionToRichText,
  richTextToSection,
  extractLatexBody,
  reconstructLatexDocument,
  escapeLatexSpecialChars,
  unescapeLatexSpecialChars,
  stripLatexComments,
  resolveFileContent,
  canonicalFileName,
};

export default latexUtility;
