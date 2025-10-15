import React from "react";

// ============ LATEX SPECIAL CHARACTERS ============
const escapeLatexSpecialChars = (text) => {
  if (!text) return text;
  if (containsLatexCommands(text)) {
    return text;
  }
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

  processed = processed.replace(/[&%$#_{}~^\\]/g, (char) => {
    return escapeMap[char] || char;
  });

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

// ============ EXISTING FUNCTIONS ============
export const extractLatexBody = (latex) => {
  const beginDocIndex = latex.indexOf("\\begin{document}");
  if (beginDocIndex === -1) return latex;

  const afterBeginDoc = latex.substring(
    beginDocIndex + "\\begin{document}".length
  );
  const endDocIndex = afterBeginDoc.indexOf("\\end{document}");
  if (endDocIndex === -1) return afterBeginDoc;

  let content = afterBeginDoc.substring(0, endDocIndex);
  content = content.replace(/^\s*\\maketitle\s*/, "").trim();
  return content;
};

export const reconstructLatexDocument = (originalLatex, newBodyContent) => {
  const beginDocIndex = originalLatex.indexOf("\\begin{document}");
  const endDocIndex = originalLatex.lastIndexOf("\\end{document}");

  if (beginDocIndex === -1 || endDocIndex === -1) {
    return originalLatex;
  }

  const preamble = originalLatex.substring(
    0,
    beginDocIndex + "\\begin{document}".length
  );
  const hasMaketitle = originalLatex.includes("\\maketitle");

  let reconstructed = preamble;
  if (hasMaketitle) {
    reconstructed += "\n\n\\maketitle\n\n";
  } else {
    reconstructed += "\n\n";
  }

  reconstructed += newBodyContent;
  reconstructed += "\n\n\\end{document}";
  return reconstructed;
};

// ============ SPECIAL ENVIRONMENTS ============
const SPECIAL_ENVIRONMENTS = [
  "abstract",
  "acknowledgements",
  "acknowledgment",
  "preface",
  "theorem",
  "lemma",
  "proof",
  "definition",
  "corollary",
  "proposition",
  "example",
  "remark",
  "note",
  "problem",
  "solution",
  "exercise",
  "quote",
  "quotation",
  "verse",
];

const shouldUseEnvironment = (headingText) => {
  if (!headingText) return false;
  const normalized = headingText.toLowerCase().trim();
  return SPECIAL_ENVIRONMENTS.some(
    (env) =>
      normalized === env ||
      normalized === env + "s" ||
      normalized.replace(/\s+/g, "") === env.replace(/\s+/g, "")
  );
};

// ============ LATEX TO SECTIONS - FIXED ============
export const latexToSections = (latexDoc) => {
  const body = extractLatexBody(latexDoc);
  if (!body) return [];

  const sections = [];
  let position = 0;

  // Regex patterns
  const sectionPattern = /\\(section|subsection|subsubsection)\{([^}]*)\}/g;
  const envPattern =
    /\\begin\{(abstract|acknowledgements?|preface|theorem|lemma|proof|definition|corollary|proposition|example|remark|note)\}/gi;

  // Collect all markers (sections and environments) with their positions
  const markers = [];

  // Find all section commands
  let match;
  while ((match = sectionPattern.exec(body)) !== null) {
    markers.push({
      type: "section",
      sectionType: match[1],
      name: match[2],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // Find all special environments
  envPattern.lastIndex = 0;
  while ((match = envPattern.exec(body)) !== null) {
    const envName = match[1].toLowerCase();
    const envStart = match.index;
    const beginTag = match[0];

    // Find the matching \end{envName}
    const envEndPattern = new RegExp(`\\\\end\\{${envName}\\}`, "gi");
    envEndPattern.lastIndex = match.index + beginTag.length;

    const endMatch = envEndPattern.exec(body);
    if (endMatch) {
      const contentStart = match.index + beginTag.length;
      const contentEnd = endMatch.index;
      const content = body.substring(contentStart, contentEnd).trim();

      markers.push({
        type: "environment",
        sectionType: "environment",
        name: envName.charAt(0).toUpperCase() + envName.slice(1),
        start: envStart,
        end: endMatch.index + endMatch[0].length,
        content: content,
        envName: envName, // Store original env name for reconstruction
      });
    }
  }

  // Sort markers by position
  markers.sort((a, b) => a.start - b.start);

  // Build sections from markers
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const nextMarker = markers[i + 1];

    if (marker.type === "environment") {
      // Environment with pre-extracted content
      sections.push({
        id: Date.now() + Math.random(),
        type: "environment",
        name: marker.name,
        content: marker.content || "",
        envName: marker.envName, // Keep env name for conversion back
      });
    } else if (marker.type === "section") {
      // Regular section - content is between this marker and the next
      const contentStart = marker.end;
      const contentEnd = nextMarker ? nextMarker.start : body.length;
      const content = body.substring(contentStart, contentEnd).trim();

      sections.push({
        id: Date.now() + Math.random(),
        type: marker.sectionType,
        name: marker.name,
        content: content,
      });
    }
  }

  // Handle content before first marker
  if (markers.length > 0 && markers[0].start > 0) {
    const initialContent = body.substring(0, markers[0].start).trim();
    if (initialContent) {
      sections.unshift({
        id: Date.now() + Math.random(),
        type: "text",
        name: "",
        content: initialContent,
      });
    }
  }

  // If no markers found, treat entire body as one section
  if (sections.length === 0 && body.trim()) {
    sections.push({
      id: Date.now(),
      type: "section",
      name: "",
      content: body.trim(),
    });
  }

  return sections;
};

// ============ SECTIONS TO LATEX - FIXED ============
export const sectionsToLatex = (sections, originalLatex) => {
  if (!sections || sections.length === 0) {
    return originalLatex;
  }

  let latexBody = "";

  sections.forEach((section, index) => {
    if (index > 0) {
      latexBody += "\n\n";
    }

    const hasName = section.name && section.name.trim();
    const hasContent = section.content && section.content.trim();

    if (hasName) {
      const trimmedName = section.name.trim();
      const lowerName = trimmedName.toLowerCase();

      // Check if it's a special environment
      if (section.type === "environment" || shouldUseEnvironment(trimmedName)) {
        // Use the stored envName if available, otherwise derive from name
        const envName = section.envName || lowerName;
        latexBody += `\\begin{${envName}}\n`;
        if (hasContent) {
          latexBody += section.content.trim() + "\n";
        }
        latexBody += `\\end{${envName}}`;
      }
      // Regular sections
      else if (
        ["section", "subsection", "subsubsection"].includes(section.type)
      ) {
        latexBody += `\\${section.type}{${trimmedName}}\n\n`;
        if (hasContent) {
          latexBody += section.content.trim();
        }
      }
      // Default to section
      else {
        latexBody += `\\section{${trimmedName}}\n\n`;
        if (hasContent) {
          latexBody += section.content.trim();
        }
      }
    } else {
      // No name - just content
      if (hasContent) {
        latexBody += section.content.trim();
      }
    }
  });

  return reconstructLatexDocument(originalLatex, latexBody);
};

// ============ LATEX TO RICH TEXT - FIXED ============
export const latexToRichText = (latexBody) => {
  if (!latexBody) return "";

  let processed = stripLatexComments(latexBody);

  // Preserve equations
  const equations = [];
  processed = processed
    .replace(/\$\$([^\$]*?)\$\$/g, (match) => {
      equations.push(match);
      return `__EQ${equations.length - 1}__`;
    })
    .replace(/\$([^$\n]+)\$/g, (match) => {
      equations.push(match);
      return `__EQ${equations.length - 1}__`;
    })
    .replace(
      /\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g,
      (match) => {
        equations.push(match);
        return `__EQ${equations.length - 1}__`;
      }
    )
    .replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, (match) => {
      equations.push(match);
      return `__EQ${equations.length - 1}__`;
    });

  // Convert special environments to headings with content
  processed = processed.replace(
    /\\begin\{(abstract|acknowledgements?|preface|theorem|lemma|proof|definition|corollary|proposition|example|remark|note)\}([\s\S]*?)\\end\{\1\}/gi,
    (match, envName, content) => {
      const heading = envName.charAt(0).toUpperCase() + envName.slice(1);
      return `\n\n<h3><strong>${heading}</strong></h3>\n<p>${content.trim()}</p>\n`;
    }
  );

  // Convert section commands to HTML headings with BOLD text
  processed = processed
    .replace(/\\section\{([^}]*)\}/g, "<h2><strong>$1</strong></h2>")
    .replace(/\\subsection\{([^}]*)\}/g, "<h3><strong>$1</strong></h3>")
    .replace(/\\subsubsection\{([^}]*)\}/g, "<h4><strong>$1</strong></h4>");

  // Convert lists
  processed = processed.replace(
    /\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g,
    (match, content) => {
      const items = content
        .split(/\\item\s+/)
        .filter((item) => item.trim())
        .map((item) => `<li>${item.trim()}</li>`)
        .join("");
      return `<ul>${items}</ul>`;
    }
  );

  processed = processed.replace(
    /\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g,
    (match, content) => {
      const items = content
        .split(/\\item\s+/)
        .filter((item) => item.trim())
        .map((item) => `<li>${item.trim()}</li>`)
        .join("");
      return `<ol>${items}</ol>`;
    }
  );

  // Text formatting
  processed = processed
    .replace(/\\textbf\{([^}]+)\}/g, "<strong>$1</strong>")
    .replace(/\\textit\{([^}]+)\}/g, "<em>$1</em>")
    .replace(/\\emph\{([^}]+)\}/g, "<em>$1</em>")
    .replace(/\\texttt\{([^}]+)\}/g, "<code>$1</code>")
    .replace(/\\underline\{([^}]+)\}/g, "<u>$1</u>");

  // Paragraphs
  const paragraphs = processed
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((p) => {
      const trimmed = p.trim();
      if (trimmed.startsWith("<")) {
        return trimmed;
      }
      return `<p>${trimmed}</p>`;
    })
    .join("\n\n");

  // Restore equations
  let result = paragraphs;
  equations.forEach((eq, i) => {
    result = result.replace(`__EQ${i}__`, eq);
  });

  return result;
};

// ============ RICH TEXT TO LATEX - FIXED ============
export const richTextToLatex = (richText) => {
  if (!richText) return "";

  let latex = richText;

  // Preserve equations first
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

  // Convert special environment headings to \begin{} \end{}
  latex = latex.replace(
    /<h3[^>]*>\s*<strong>(Abstract|Acknowledgements?|Preface|Theorem|Lemma|Proof|Definition|Corollary|Proposition|Example|Remark|Note)<\/strong>\s*<\/h3>\s*<p>([^<]*)<\/p>/gi,
    (match, envName, content) => {
      const envLower = envName.toLowerCase();
      return `\n\n\\begin{${envLower}}\n${content.trim()}\n\\end{${envLower}}\n`;
    }
  );

  // Convert HTML headings to LaTeX sections
  latex = latex
    .replace(
      /<h2[^>]*>\s*<strong>([^<]+)<\/strong>\s*<\/h2>/gi,
      "\n\n\\section{$1}\n\n"
    )
    .replace(/<h2[^>]*>([^<]+)<\/h2>/gi, "\n\n\\section{$1}\n\n")
    .replace(
      /<h3[^>]*>\s*<strong>([^<]+)<\/strong>\s*<\/h3>/gi,
      "\n\n\\subsection{$1}\n\n"
    )
    .replace(/<h3[^>]*>([^<]+)<\/h3>/gi, "\n\n\\subsection{$1}\n\n")
    .replace(
      /<h4[^>]*>\s*<strong>([^<]+)<\/strong>\s*<\/h4>/gi,
      "\n\n\\subsubsection{$1}\n\n"
    )
    .replace(/<h4[^>]*>([^<]+)<\/h4>/gi, "\n\n\\subsubsection{$1}\n\n");

  // Convert lists
  latex = latex.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
    const items = content
      .split(/<li[^>]*>/)
      .slice(1)
      .map((item) => item.replace(/<\/li>/gi, "").trim())
      .filter((item) => item)
      .map((item) => `\\item ${item}`)
      .join("\n");
    return `\n\\begin{itemize}\n${items}\n\\end{itemize}\n`;
  });

  latex = latex.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
    const items = content
      .split(/<li[^>]*>/)
      .slice(1)
      .map((item) => item.replace(/<\/li>/gi, "").trim())
      .filter((item) => item)
      .map((item) => `\\item ${item}`)
      .join("\n");
    return `\n\\begin{enumerate}\n${items}\n\\end{enumerate}\n`;
  });

  // Text formatting
  latex = latex
    .replace(/<strong[^>]*>([^<]+)<\/strong>/gi, "\\textbf{$1}")
    .replace(/<b[^>]*>([^<]+)<\/b>/gi, "\\textbf{$1}")
    .replace(/<em[^>]*>([^<]+)<\/em>/gi, "\\textit{$1}")
    .replace(/<i[^>]*>([^<]+)<\/i>/gi, "\\textit{$1}")
    .replace(/<code[^>]*>([^<]+)<\/code>/gi, "\\texttt{$1}")
    .replace(/<u[^>]*>([^<]+)<\/u>/gi, "\\underline{$1}");

  // Remove paragraph tags
  latex = latex.replace(/<p[^>]*>/gi, "").replace(/<\/p>/gi, "\n\n");

  // Clean up
  latex = latex.replace(/\n{3,}/g, "\n\n").trim();

  // Restore equations
  equations.forEach((eq, i) => {
    latex = latex.replace(`__EQ${i}__`, eq);
  });

  return latex;
};

export default {
  extractLatexBody,
  reconstructLatexDocument,
  latexToRichText,
  richTextToLatex,
  latexToSections,
  sectionsToLatex,
  escapeLatexSpecialChars,
  unescapeLatexSpecialChars,
};
