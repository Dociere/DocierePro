import React from "react";

// ============ CONSTANTS ============
const SPECIAL_ENVS_PATTERN =
  "abstract|IEEEkeywords|keywords|acknowledgements|acknowledgments|thebibliography|appendix|wraptable|table|figure";

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

// ============ 1. LATEX TO SECTIONS (Uses Split) ============
export const latexToSections = (latexDoc) => {
  if (!latexDoc) return [];
  const root = [];

  const { preamble, body, postamble } = splitLatex(latexDoc);

  // Updated REGEX to include specific environments + starred sections
  const SECTION_REGEX =
    /(\\(?:section|subsection|subsubsection)\*?\{[^}]*\}|\\begin\{(?:abstract|IEEEkeywords|keywords|acknowledgements|acknowledgments|thebibliography|appendix|wraptable|table|figure)\})/i;

  const parts = body.split(SECTION_REGEX);

  const innerPreamble = parts[0] || "";
  const fullPreambleContent = (preamble + "\n" + innerPreamble).trim();

  root.push({
    id: "preamble-block",
    type: "preamble",
    name: "Document Configuration",
    content: fullPreambleContent,
    children: [],
  });

  let currentSection = null;
  let currentSubsection = null;

  for (let i = 1; i < parts.length; i += 2) {
    const delimiter = parts[i];
    let content = parts[i + 1] || "";

    let type = "section";
    let name = "Untitled";
    let subtype = "standard";
    let envTag = null; // New variable to store raw tag

    if (delimiter.startsWith("\\begin")) {
      const match = delimiter.match(/\\begin\{([^}]+)\}/);
      if (match) {
        envTag = match[1]; // Store "IEEEkeywords" exactly as is
        // Make the Display Name pretty (Capitalized) for the UI
        if (envTag === "table" || envTag === "wraptable") {
          type = "section"; // Treat it as a main block
          subtype = "table"; // Mark specifically as table
          name = "Table Block";
          content = delimiter + content;
        } else {
          // Your existing logic for Abstract/Keywords
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
      subtype: subtype,
      envTag: envTag, // <--- ADDED THIS PROPERTY
      name: name,
      content: content,
      children: [],
    };

    if (type === "section") {
      currentSection = newBlock;
      currentSubsection = null;
      root.push(newBlock);
    } else if (type === "subsection") {
      if (currentSection) {
        currentSection.children.push(newBlock);
        currentSubsection = newBlock;
      } else {
        root.push(newBlock);
        currentSubsection = newBlock;
      }
    } else if (type === "subsubsection") {
      if (currentSubsection) {
        currentSubsection.children.push(newBlock);
      } else if (currentSection) {
        currentSection.children.push(newBlock);
      } else {
        root.push(newBlock);
      }
    }
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

// ============ 2. SECTIONS TO LATEX ============
export const sectionsToLatex = (sections) => {
  let latex = "";
  let postambleContent = "";

  const processNode = (node) => {
    if (node.type === "postamble") {
      postambleContent = "\n" + node.content;
      return;
    }

    if (node.type === "preamble") {
      latex += node.content + "\n\n";
    } else {
      let header = "";
      if (node.subtype === "table") {
        // Tables are self-contained; do not wrap them in \section{}
        header = "";
      } else if (node.subtype === "env") {
        // USE THE STORED TAG (e.g. "IEEEkeywords"), or fallback to lowercase name
        const tag = node.envTag || node.name.toLowerCase();
        header = `\n\\begin{${tag}}`;
      } else if (node.subtype === "starred") {
        header = `\n\\${node.type}*{${node.name}}`;
      } else {
        header = `\n\\${node.type}{${node.name}}`;
      }

      latex += header + "\n";
    }

    if (node.content && node.type !== "preamble") {
      latex += node.content;
    }

    if (node.children && node.children.length > 0) {
      node.children.forEach(processNode);
    }
  };

  sections.forEach(processNode);

  latex +=
    postambleContent ||
    (latex.includes("\\documentclass") && !latex.includes("\\end{document}")
      ? "\n\\end{document}"
      : "");

  return latex;
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

  processed = processed.replace(
    /\\begin\{table\}(?:\[.*?\])?([\s\S]*?)\\end\{table\}/g,
    (match, tableContent) => {
      // 1. Extract Caption
      const captionMatch = tableContent.match(/\\caption\{([^}]+)\}/);
      const captionText = captionMatch ? captionMatch[1] : "";

      // 2. Extract Tabular
      const tabularMatch = tableContent.match(
        /\\begin\{tabular\}\{([^}]+)\}([\s\S]*?)\\end\{tabular\}/,
      );

      if (!tabularMatch) {
        return `<div class="latex-table" data-latex="${match.replace(/"/g, "&quot;")}">${match}</div>`;
      }

      const colDef = tabularMatch[1];
      const rawRows = tabularMatch[2];

      // Count columns from column definition
      const colCount = (colDef.match(/\|/g) || []).length - 1 || 1;

      // Split rows properly - handle \\ with optional \\hline
      const rows = rawRows
        .replace(/\\hline/g, "")
        .split(/\\\\/)
        .map((row) => row.trim())
        .filter(Boolean);

      if (rows.length === 0) {
        return `<table class="latex-table" data-caption="${captionText}"><caption>${captionText}</caption><tbody><tr><td>Empty table</td></tr></tbody></table>`;
      }

      // Build HTML table
      const encodedLatex = btoa(unescape(encodeURIComponent(match)));

      let html = `<table
  class="latex-table"
  data-caption="${captionText.replace(/"/g, "&quot;")}"
  data-latex="${encodedLatex}"
>`;

      if (captionText) {
        html += `<caption style="font-weight: bold; padding: 5px;">${captionText}</caption>`;
      }

      html += "<tbody>";

      rows.forEach((row, rowIndex) => {
        const cells = row
          .split("&")
          .map((cell) =>
            escapeLatexSpecialChars(cell.replace(/\\hline/g, "").trim()),
          );

        // Ensure we have the right number of cells
        while (cells.length < colCount) {
          cells.push("");
        }

        html += "<tr>";
        cells.forEach((cell, cellIndex) => {
          html += `<td style="border: 1px solid #ccc; padding: 8px;">${cell || ""}</td>`;
        });
        html += "</tr>";
      });

      html += "</tbody></table>";

      return html;
    },
  );

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
      },
    )
    .replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, (match) => {
      equations.push(match);
      return `__EQ${equations.length - 1}__`;
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

// ============ 4. RICH TEXT TO LATEX ============
// export const richTextToLatex = (richText) => {
//   if (!richText) return "";

//   let latex = richText;
//   let restoredPreamble = "";
//   let restoredPostamble = "";

//   // 1. EXTRACT HIDDEN PREAMBLE
//   // Use new RegExp string syntax to avoid editor comment issues
//   const preambleRegex = new RegExp("");
//   const preambleMatch = latex.match(preambleRegex);

//   if (preambleMatch) {
//     try {
//       restoredPreamble = decodeURIComponent(escape(atob(preambleMatch[1])));
//       latex = latex.replace(preambleMatch[0], "");
//     } catch (e) {
//       console.error(e);
//     }
//   }

//   // 2. EXTRACT HIDDEN POSTAMBLE
//   const postambleRegex = new RegExp("");
//   const postambleMatch = latex.match(postambleRegex);

//   if (postambleMatch) {
//     try {
//       restoredPostamble = decodeURIComponent(escape(atob(postambleMatch[1])));
//       latex = latex.replace(postambleMatch[0], "");
//     } catch (e) {
//       console.error(e);
//     }
//   }

//   latex = latex.replace(
//     /<table[^>]*>([\s\S]*?)<\/table>/gi,
//     (match, innerContent) => {
//       // 1. Extract caption
//       let captionText = "";
//       const captionMatch = innerContent.match(
//         /<caption[^>]*>([\s\S]*?)<\/caption>/i,
//       );
//       if (captionMatch) {
//         captionText = captionMatch[1].trim();
//       } else {
//         // Fallback: data attribute
//         const dataMatch = match.match(/data-latex-caption="([^"]*)"/);
//         if (dataMatch) captionText = dataMatch[1];
//       }

//       // 2. Extract rows
//       const rows = innerContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
//       if (rows.length === 0) return match; // Return original if no rows

//       // 3. Determine column count from first row
//       const firstRowCells = rows[0].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
//       const colCount = firstRowCells.length || 1;
//       const colDef = "|" + Array(colCount).fill("c").join("|") + "|";

//       // 4. Process each row
//       const latexRows = rows
//         .map((row, rowIndex) => {
//           const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];

//           // Process cell content
//           const cellContents = cells
//             .map((cell) => {
//               let txt = cell.replace(/<\/?td[^>]*>/g, "").trim();
//               txt = txt.replace(/&nbsp;/g, " ");
//               txt = txt.replace(/\\/g, "\\\\"); // Escape backslashes
//               return txt;
//             })
//             .join(" & ");

//           // Add \\hline after each row EXCEPT the last one (LaTeX handles last hline differently)
//           const rowEnd = rowIndex < rows.length - 1 ? " \\\\ \\hline" : " \\\\";
//           return cellContents + rowEnd;
//         })
//         .join("\n");

//       // 5. Build final LaTeX table
//       const captionLatex = captionText ? `\\caption{${captionText}}\n` : "";

//       return `\n\\begin{table}[htbp]
// \\centering
// ${captionLatex}\\begin{tabular}{${colDef}}
// \\hline
// ${latexRows}
// \\hline
// \\end{tabular}
// \\end{table}\n`;
//     },
//   );

//   // // Clean up the wrapper div if it exists
//   // latex = latex
//   //   .replace(/<div class="latex-table-wrapper">/g, "")
//   //   .replace(/<\/div>/g, "");

//   const equations = [];
//   latex = latex
//     .replace(/\$\$([^\$]*?)\$\$/g, (match) => {
//       equations.push(match);
//       return `__EQ${equations.length - 1}__`;
//     })
//     .replace(/\$([^$\n]+)\$/g, (match) => {
//       equations.push(match);
//       return `__EQ${equations.length - 1}__`;
//     });

//   latex = latex
//     .replace(/<br\s*\/?>/gi, "\n")
//     .replace(/<\/p><p>/gi, "\n\n")
//     .replace(/<p>/gi, "")
//     .replace(/<\/p>/gi, "\n")
//     .replace(/\[Date: Today\]/g, "\\today");

//   // Restore Special Environment Headers -> \begin{...}
//   // We use the SPECIAL_ENVS_PATTERN constant you added at the top of the file
//   latex = latex.replace(
//     new RegExp(
//       `<h3[^>]*>\\s*(?:<strong>|<b>)?\\s*(${SPECIAL_ENVS_PATTERN})\\s*(?:<\\/strong>|<\\/b>)?\\s*<\\/h3>`,
//       "gi",
//     ),
//     (match, envName) => `\n\n\\begin{${envName}}\n`,
//   );

//   // Restore Sections
//   latex = latex
//     .replace(
//       /<h2[^>]*>(?:<strong>)?([^<]+)(?:<\/strong>)?<\/h2>/gi,
//       "\n\n\\section{$1}\n\n",
//     )
//     .replace(
//       /<h3[^>]*>(?:<strong>)?([^<]+)(?:<\/strong>)?<\/h3>/gi,
//       "\n\n\\subsection{$1}\n\n",
//     )
//     .replace(
//       /<h4[^>]*>(?:<strong>)?([^<]+)(?:<\/strong>)?<\/h4>/gi,
//       "\n\n\\subsubsection{$1}\n\n",
//     );

//   // AUTO-CLOSE ENVIRONMENTS
//   const closeEnvRegex = new RegExp(
//     `(\\\\begin\\{(${SPECIAL_ENVS_PATTERN})\\}[\\s\\S]*?)(?=\n\\s*\\\\(?:section|subsection|subsubsection|begin)|$)`,
//     "gi",
//   );
//   latex = latex.replace(closeEnvRegex, (match, content, envName) => {
//     if (content.includes(`\\end{${envName}}`)) return match;
//     return `${content.trim()}\n\\end{${envName}}\n`;
//   });

//   // Lists and formatting
//   latex = latex
//     .replace(
//       /<ul[^>]*>([\s\S]*?)<\/ul>/gi,
//       (match, content) =>
//         `\n\\begin{itemize}\n${content
//           .split(/<li[^>]*>/)
//           .slice(1)
//           .map((i) => `\\item ${i.replace(/<\/li>/gi, "").trim()}`)
//           .join("\n")}\n\\end{itemize}\n`,
//     )
//     .replace(
//       /<ol[^>]*>([\s\S]*?)<\/ol>/gi,
//       (match, content) =>
//         `\n\\begin{enumerate}\n${content
//           .split(/<li[^>]*>/)
//           .slice(1)
//           .map((i) => `\\item ${i.replace(/<\/li>/gi, "").trim()}`)
//           .join("\n")}\n\\end{enumerate}\n`,
//     );

//   latex = latex
//     .replace(/<strong[^>]*>([^<]+)<\/strong>/gi, "\\textbf{$1}")
//     .replace(/<b[^>]*>([^<]+)<\/b>/gi, "\\textbf{$1}")
//     .replace(/<em[^>]*>([^<]+)<\/em>/gi, "\\textit{$1}")
//     .replace(/<i[^>]*>([^<]+)<\/i>/gi, "\\textit{$1}")
//     .replace(/<code[^>]*>([^<]+)<\/code>/gi, "\\texttt{$1}")
//     .replace(/<u[^>]*>([^<]+)<\/u>/gi, "\\underline{$1}");

//   latex = latex.replace(/\n{3,}/g, "\n\n").trim();
//   equations.forEach((eq, i) => {
//     latex = latex.replace(`__EQ${i}__`, eq);
//   });

//   // Combine
//   let finalLatex = "";
//   if (restoredPreamble) finalLatex += restoredPreamble + "\n";
//   finalLatex += latex;
//   if (restoredPostamble) finalLatex += "\n" + restoredPostamble;

//   return finalLatex;
// };

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

  // ====== FIXED TABLE CONVERSION ======
  llatex = latex.replace(
    /<table[^>]*class="latex-table"[^>]*data-latex="([^"]+)"[^>]*>[\s\S]*?<\/table>/gi,
    (_, encoded) => {
      try {
        return decodeURIComponent(escape(atob(encoded)));
      } catch {
        return "";
      }
    },
  );

  // Fallback for tables without data-latex-caption attribute
  // latex = latex.replace(
  //   /<table[^>]*>([\s\S]*?)<\/table>/gi,
  //   (match, innerContent) => {
  //     // Just return empty table to avoid broken LaTeX
  //     return `\n\\begin{table}[htbp]\n\\centering\n\\begin{tabular}{|c|}\n\\hline\n \\\\ \\hline\n\\end{tabular}\n\\end{table}\n`;
  //   },
  // );

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
    .replace(/<u[^>]*>([^<]+)<\/u>/gi, "\\underline{$1}");

  latex = latex.replace(/\n{3,}/g, "\n\n").trim();

  // RESTORE EQUATIONS AT THE END
  equations.forEach((eq, i) => {
    latex = latex.replace(new RegExp(`__EQ${i}__`, "g"), eq);
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
