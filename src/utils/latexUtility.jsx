import React from "react";

/**
 * latexUtility.jsx - Core conversion engine for LaTeX editor.
 * Rewritten from scratch for predictability, systematic parsing, and robust round-trips.
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

// Matches start of section or special env — used for detecting body start

// Notes
// What this does is that it converts:
// This: \maketitle\begin{abstract}This is the intro.\section{First}Hello\section{Second}World
// Into this:
// [
//   "\\maketitle",
//   "\\begin{abstract}This is the intro.",
//   "\\section{First}Hello",
//   "\\section{Second}World"
// ]

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

  const beginIdx = latexDoc.indexOf(beginTag);
  if (beginIdx === -1) {
    return { preamble: "", body: latexDoc, postamble: "" };
  }

  let preambleLineEnd = beginIdx + beginTag.length;
  const remaining = latexDoc.substring(preambleLineEnd);

  const firstBodyMatch = remaining.match(BODY_START_REGEX);
  if (firstBodyMatch) {
    preambleLineEnd += firstBodyMatch.index;
  } else {
    const makeTitleMatch = remaining.match(/^(\s*\\maketitle)/i);
    if (makeTitleMatch) {
      preambleLineEnd += makeTitleMatch[1].length;
    }
  }

  const endIdx = latexDoc.lastIndexOf(endTag);
  if (endIdx === -1) {
    return {
      preamble: latexDoc.substring(0, preambleLineEnd),
      body: latexDoc.substring(preambleLineEnd),
      postamble: "",
    };
  }

  return {
    preamble: latexDoc.substring(0, preambleLineEnd),
    body: latexDoc.substring(preambleLineEnd, endIdx),
    postamble: latexDoc.substring(endIdx),
  };
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
        if (endIdx !== -1) {
          blockContent = blockContent.substring(0, endIdx);
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

  return { blocks, leadingContent };
};

export const latexToSections = (latexDoc, fileMap = {}) => {
  const { preamble, body, postamble } = splitLatex(latexDoc);
  const sections = [];

  sections.push({
    id: "preamble-block",
    type: "preamble",
    subtype: "standard",
    name: "Document Configuration",
    content: preamble,
    children: [],
  });

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

    buffer.push(line);
  });
  if (buffer.length > 0)
    segments.push({ type: "inline", content: buffer.join("\n") });

  let currentSection = null;
  let currentSubsection = null;

  segments.forEach((seg) => {
    // Since input resolution is removed, all segments are "inline"
    const { blocks, leadingContent } = parseBodyIntoBlocks(seg.content);

    if (leadingContent.trim()) {
      if (!currentSection) {
        sections[0].content += "\n" + leadingContent;
      } else {
        currentSection.content += "\n" + leadingContent;
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
    });
  });

  sections.push({
    id: "postamble-block",
    type: "postamble",
    subtype: "standard",
    name: "End Document",
    content: postamble,
    children: [],
  });

  return sections;
};

export const sectionsToLatex = (sections) => {
  let latex = "";
  let fileUpdates = {};
  const emittedFiles = new Set();

  const serializeNodeInline = (node) => {
    let res = "";
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
    html = `<div class="ql-latex-preamble" data-preamble="${encodedPreamble}" style="display:none"></div>\n`;

    const firstMatch = body.match(BODY_START_REGEX);
    if (firstMatch) {
      const innerPreamble = body.substring(0, firstMatch.index);
      if (innerPreamble.trim()) {
        const combinedPreamble = preamble + "\n" + innerPreamble;
        const reEncoded = btoa(unescape(encodeURIComponent(combinedPreamble)));
        html = `<div class="ql-latex-preamble" data-preamble="${reEncoded}" style="display:none"></div>\n`;
        body = body.substring(firstMatch.index);
      }
    }
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

  // 1. Protect multi-line blocks
  protect(
    /\\begin\{(?:table|wraptable|figure|equation|equation\*|align|align\*)\}[\s\S]*?\\end\{(?:table|wraptable|figure|equation|equation\*|align|align\*)\}/gi,
    "BLOCK",
  );
  protect(/\$\$[\s\S]*?\$\$/g, "BLOCK");
  protect(/\$[^$]+\$/g, "BLOCK");

  // 3. Convert academic elements
  processed = processed.replace(
    /\\cite\{([^}]*)\}/g,
    '<span class="ql-latex-inline" data-latex-type="citation" data-latex-value="$1"></span>',
  );
  processed = processed.replace(
    /\\footnote\{([^}]*)\}/g,
    '<span class="ql-latex-inline" data-latex-type="footnote" data-latex-value="$1"></span>',
  );
  processed = processed.replace(
    /\\ref\{([^}]*)\}/g,
    '<span class="ql-latex-inline" data-latex-type="ref" data-latex-value="$1"></span>',
  );
  processed = processed.replace(/\\newpage/g, '<hr class="ql-pagebreak">');

  // 4. Special environments (abstract, etc.)
  SPECIAL_ENVS.forEach((env) => {
    const regex = new RegExp(
      `\\\\begin\\{${env}\\}(\\{[^}]*\\})?([\\s\\S]*?)\\\\end\\{${env}\\}`,
      "gi",
    );
    processed = processed.replace(regex, (match, arg, inner) => {
      let content = inner.trim();
      if (env.toLowerCase() === "thebibliography") {
        content = content.replace(
          /\\bibitem\{([^}]*)\}\s*([\s\S]*?)(?=\\bibitem|$)/g,
          '<p class="ql-bibitem"><strong>[$1]</strong> $2</p>',
        );
      }

      const envString = arg ? `${env}:${arg}` : env;
      const encData = btoa(unescape(encodeURIComponent(envString)));

      return `<span class="ql-env-marker" data-env="${encData}" data-type="start">&#8203;</span>\n${content}\n<span class="ql-env-marker" data-env="${encData}" data-type="end">&#8203;</span>\n`;
    });
  });

  // 5. Formatting
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

  // 6. Headings
  processed = processed.replace(
    /\\(section|subsection|subsubsection)(\*)?\{([^}]*)\}/gi,
    (m, type, star, title) => {
      const typeLower = type.toLowerCase();
      const lvl =
        typeLower === "section" ? 1 : typeLower === "subsection" ? 2 : 3;
      return `<h${lvl}>${title}</h${lvl}>\n`;
    },
  );

  // 7. Restore placeholders
  placeholders.forEach((p) => {
    const encoded = btoa(unescape(encodeURIComponent(p.content)));
    const type = p.content.includes("table")
      ? "table"
      : p.content.includes("figure")
        ? "figure"
        : "equation";
    const blot = `<div class="ql-latex-block" data-latex="${encoded}" data-type="${type}"></div>`;
    processed = processed.replace(p.token, blot);
  });

  // 8. Stripping remaining commands
  processed = processed.replace(
    /\\(?:vspace|hspace|noindent|centering|raggedright|raggedleft|label|maketitle)\{[^}]*\}?/g,
    "",
  );
  processed = processed.replace(/\\today/g, "[Date: Today]");
  processed = stripLatexComments(processed);

  // 9. Paragraph wraps
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
    const postambleHtml = `\n<div class="ql-postamble-block" data-postamble="${encodedPostamble}"></div>`;
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
      /<div[^>]*class="ql-latex-preamble"[^>]*data-preamble="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi,
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
      /<div[^>]*class="ql-postamble-block"[^>]*data-postamble="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi,
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
    /<div[^>]*class="ql-latex-block"[^>]*data-latex="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi,
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
    /<span[^>]*class="ql-latex-inline"[^>]*data-latex-type="([^"]*)"[^>]*data-latex-value="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi,
    (m, type, val) => {
      const token = `__INLINEBLOT_${inlineBlots.length}__`;
      inlineBlots.push({ type, val });
      return token;
    },
  );

  content = content.replace(
    /<[^>]+class="[^"]*ql-env-marker[^"]*"[^>]*data-env="([^"]*)"[^>]*data-type="start"[^>]*>/gi,
    (m, data) => {
      try {
        const decoded = decodeURIComponent(escape(atob(data)));
        let env = decoded;
        let arg = "";

        if (decoded.includes(":")) {
          const parts = decoded.split(":");
          env = parts[0];
          arg = parts.slice(1).join(":"); // Capture {99}
        }

        return `\\begin{${env}}${arg}\n`;
      } catch (e) {
        return "";
      }
    },
  );
  content = content.replace(
    /<[^>]+class="[^"]*ql-env-marker[^"]*"[^>]*data-env="([^"]*)"[^>]*data-type="end"[^>]*>/gi,
    (m, data) => {
      try {
        const decoded = decodeURIComponent(escape(atob(data)));
        let env = decoded;
        if (decoded.includes(":")) {
          env = decoded.split(":")[0];
        }
        return `\n\\end{${env}}\n`;
      } catch (e) {
        return "";
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
    /<ul>(.*?)<\/ul>/gs,
    (m, inner) =>
      `\\begin{itemize}\n${inner.replace(/<li>(.*?)<\/li>/g, "\\item $1\n")}\\end{itemize}\n`,
  );
  content = content.replace(
    /<ol>(.*?)<\/ol>/gs,
    (m, inner) =>
      `\\begin{enumerate}\n${inner.replace(/<li>(.*?)<\/li>/g, "\\item $1\n")}\\end{enumerate}\n`,
  );

  content = content.replace(/<p>(.*?)<\/p>/g, "$1\n\n");
  content = content.replace(/<br\s*\/?>/g, "\n");
  content = content.replace(/<hr class="ql-pagebreak">/g, "\\newpage\n\n");
  content = content.replace(/<[^>]+>/g, ""); // Final strip

  content = content.replace(/__LATEXBLOCK_(\d+)__/g, (_, i) => latexBlocks[i]);
  content = content.replace(/__INLINEBLOT_(\d+)__/g, (_, i) => {
    const b = inlineBlots[i];
    if (b.type === "citation") return `\\cite{${b.val}}`;
    if (b.type === "footnote") return `\\footnote{${b.val}}`;
    if (b.type === "ref") return `\\ref{${b.val}}`;
    return "";
  });

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
  if (sectionNode.subtype === "env" && sectionNode.envTag) {
    const arg = sectionNode.envArg || "";
    content = `\\begin{${sectionNode.envTag}}${arg}\n${content}\n\\end{${sectionNode.envTag}}`;
  }
  if (
    sectionNode.envTag === "keywords" ||
    sectionNode.envTag === "IEEEkeywords"
  ) {
    content = content.replace(/^Keywords:|^Index Terms:/i, "").trim();
  }
  // Added isFragment: true to prevent \end{document} injection
  return latexToRichText(content, {}, { isFragment: true });
};

export const richTextToSection = (richTextHtml) => {
  // Added isFragment: true to prevent \end{document} injection
  const { latex } = richTextToLatex(richTextHtml, { isFragment: true });
  const { body } = splitLatex(latex);
  return body
    .replace(/\\begin\{[^}]*\}(\{[^}]*\})?|\\end\{[^}]*\}/g, "")
    .trim();
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
