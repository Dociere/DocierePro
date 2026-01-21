// import React from "react";

// // ============ LATEX SPECIAL CHARACTERS ============
// const escapeLatexSpecialChars = (text) => {
//   if (!text) return text;
//   if (containsLatexCommands(text)) return text;
//   const mathExpressions = [];
//   let processed = text
//     .replace(/\$\$([^\$]*?)\$\$/g, (match) => {
//       mathExpressions.push(match);
//       return `__MATH${mathExpressions.length - 1}__`;
//     })
//     .replace(/\$([^$]+)\$/g, (match) => {
//       mathExpressions.push(match);
//       return `__MATH${mathExpressions.length - 1}__`;
//     });

//   const escapeMap = {
//     "&": "\\&",
//     "%": "\\%",
//     $: "\\$",
//     "#": "\\#",
//     _: "\\_",
//     "{": "\\{",
//     "}": "\\}",
//     "~": "\\textasciitilde{}",
//     "^": "\\textasciicircum{}",
//     "\\": "\\textbackslash{}",
//   };

//   processed = processed.replace(
//     /[&%$#_{}~^\\]/g,
//     (char) => escapeMap[char] || char
//   );
//   mathExpressions.forEach((expr, i) => {
//     processed = processed.replace(`__MATH${i}__`, expr);
//   });
//   return processed;
// };

// const unescapeLatexSpecialChars = (text) => {
//   if (!text) return text;
//   return text
//     .replace(/\\textbackslash\{\}/g, "\\")
//     .replace(/\\textasciitilde\{\}/g, "~")
//     .replace(/\\textasciicircum\{\}/g, "^")
//     .replace(/\\\{/g, "{")
//     .replace(/\\\}/g, "}")
//     .replace(/\\_/g, "_")
//     .replace(/\\#/g, "#")
//     .replace(/\\\$/g, "$")
//     .replace(/\\%/g, "%")
//     .replace(/\\&/g, "&");
// };

// const stripLatexComments = (text) => {
//   if (!text) return text;
//   return text
//     .split("\n")
//     .filter((line) => {
//       const trimmed = line.trim();
//       return !trimmed.startsWith("%") || trimmed.startsWith("\\%");
//     })
//     .join("\n");
// };

// const containsLatexCommands = (text) => {
//   if (!text) return false;
//   const latexPatterns = [/\\[a-zA-Z]+/, /\\begin\{/, /\\end\{/, /\\\\/, /\$\$/];
//   return latexPatterns.some((pattern) => pattern.test(text));
// };

// // ============ HELPER: EXTRACT BODY ============
// export const extractLatexBody = (latex) => {
//   const beginDocIndex = latex.indexOf("\\begin{document}");
//   if (beginDocIndex === -1) return latex;
//   const afterBeginDoc = latex.substring(
//     beginDocIndex + "\\begin{document}".length
//   );
//   const endDocIndex = afterBeginDoc.indexOf("\\end{document}");
//   if (endDocIndex === -1) return afterBeginDoc;
//   let content = afterBeginDoc.substring(0, endDocIndex);
//   content = content.replace(/^\s*\\maketitle\s*/, "").trim();
//   return content;
// };

// export const reconstructLatexDocument = (originalLatex, newBodyContent) => {
//   // If the new body content already has full document structure, return it as-is
//   if (
//     newBodyContent?.includes("\\begin{document}") &&
//     newBodyContent?.includes("\\end{document}")
//   ) {
//     return newBodyContent;
//   }

//   // Otherwise, there's a problem - but return it anyway to avoid breaking
//   console.error(
//     "❌ reconstructLatexDocument: New content missing document structure!"
//   );
//   return newBodyContent;
// };

// // ============ 1. LATEX TO SECTIONS ============
// export const latexToSections = (latexDoc) => {
//   if (!latexDoc) return [];

//   const root = [];
//   let bodyStr = latexDoc;

//   // --- A. Handle Preamble ---
//   const beginRegex = /\\begin\{document\}/;
//   const matchBegin = latexDoc.match(beginRegex);

//   if (matchBegin) {
//     const beginIndex = matchBegin.index;
//     const beginLen = matchBegin[0].length;

//     const afterBegin = latexDoc.substring(beginIndex + beginLen);
//     const maketitleRegex = /^\s*\\maketitle/;
//     const maketitleMatch = afterBegin.match(maketitleRegex);

//     let splitIndex = beginIndex + beginLen;
//     if (maketitleMatch) {
//       splitIndex += maketitleMatch[0].length;
//     }

//     const preambleContent = latexDoc.substring(0, splitIndex).trim();

//     root.push({
//       id: "preamble-block",
//       type: "preamble",
//       name: "Document Configuration",
//       content: preambleContent,
//       children: [],
//     });

//     bodyStr = latexDoc.substring(splitIndex);
//   }

//   // --- B. Handle Postamble ---
//   const endRegex = /(\\end\{document\}\s*)$/;
//   const matchEnd = bodyStr.match(endRegex);
//   let postambleBlock = null;

//   if (matchEnd) {
//     postambleBlock = {
//       id: "postamble-block",
//       type: "postamble",
//       name: "End Document",
//       content: matchEnd[1] || "\\end{document}",
//       children: [],
//     };
//     bodyStr = bodyStr.substring(0, matchEnd.index);
//   }

//   // --- C. Parse Body Sections ---
//   let currentSection = null;
//   let currentSubsection = null;

//   const parts = bodyStr.split(
//     /(\\(?:section|subsection|subsubsection)\{[^}]*\})/g
//   );

//   parts.forEach((part) => {
//     if (!part.trim()) return;

//     const match = part.match(/\\(section|subsection|subsubsection)\{([^}]*)\}/);

//     if (match) {
//       const type = match[1];
//       const name = match[2];

//       const newBlock = {
//         id: Date.now() + Math.random(),
//         type: type,
//         name: name,
//         content: "",
//         children: [],
//       };

//       if (type === "section") {
//         currentSection = newBlock;
//         currentSubsection = null;
//         root.push(newBlock);
//       } else if (type === "subsection") {
//         if (currentSection) {
//           currentSection.children.push(newBlock);
//           currentSubsection = newBlock;
//         } else {
//           root.push(newBlock);
//           currentSubsection = newBlock;
//         }
//       } else if (type === "subsubsection") {
//         if (currentSubsection) {
//           currentSubsection.children.push(newBlock);
//         } else if (currentSection) {
//           currentSection.children.push(newBlock);
//         } else {
//           root.push(newBlock);
//         }
//       }
//     } else {
//       if (currentSubsection && currentSubsection.children.length > 0) {
//         const lastSubSub =
//           currentSubsection.children[currentSubsection.children.length - 1];
//         lastSubSub.content += part;
//       } else if (currentSubsection) {
//         currentSubsection.content += part;
//       } else if (currentSection) {
//         if (currentSection.children.length > 0) {
//           const lastSub =
//             currentSection.children[currentSection.children.length - 1];
//           lastSub.content += part;
//         } else {
//           currentSection.content += part;
//         }
//       } else {
//         const lastRoot = root[root.length - 1];
//         if (
//           lastRoot &&
//           (lastRoot.type === "section" || lastRoot.type === "preamble")
//         ) {
//           if (lastRoot.type === "preamble") {
//             root.push({
//               id: Date.now() + Math.random(),
//               type: "section",
//               name: "Introduction",
//               content: part,
//               children: [],
//             });
//           } else {
//             lastRoot.content += part;
//           }
//         } else {
//           root.push({
//             id: Date.now() + Math.random(),
//             type: "section",
//             name: "Introduction",
//             content: part,
//             children: [],
//           });
//         }
//       }
//     }
//   });

//   if (postambleBlock) {
//     root.push(postambleBlock);
//   }

//   return root;
// };

// // ============ 2. SECTIONS TO LATEX ============
// export const sectionsToLatex = (sections) => {
//   let latex = "";
//   let postambleContent = "";

//   const processNode = (node) => {
//     if (node.type === "postamble") {
//       postambleContent = "\n" + node.content;
//       return;
//     }

//     if (node.type === "preamble") {
//       latex += node.content + "\n\n";
//     } else if (["section", "subsection", "subsubsection"].includes(node.type)) {
//       latex += `\n\\${node.type}{${node.name}}\n`;
//     }

//     if (node.content && node.type !== "preamble") {
//       latex += node.content + "\n";
//     }

//     if (node.children && node.children.length > 0) {
//       node.children.forEach(processNode);
//     }
//   };

//   sections.forEach(processNode);

//   if (postambleContent) {
//     latex += postambleContent;
//   } else {
//     if (
//       latex.includes("\\documentclass") &&
//       !latex.includes("\\end{document}")
//     ) {
//       latex += "\n\\end{document}";
//     }
//   }

//   return latex;
// };

// // ============ 3. LATEX TO RICH TEXT (For Visual Editor) - ULTRA ROBUST ============
// export const latexToRichText = (latexBody) => {
//   if (!latexBody) return "";

//   console.log("=== LATEX TO RICH TEXT ===");
//   console.log("Input length:", latexBody.length);

//   let preamble = "";
//   let postamble = "";
//   let bodyContent = latexBody;

//   // --- Step A: Extract and Preserve Preamble ---
//   const beginDocIdx = latexBody.indexOf("\\begin{document}");
//   if (beginDocIdx !== -1) {
//     let preambleEnd = beginDocIdx + "\\begin{document}".length;

//     // Check for \maketitle immediately after
//     const afterBegin = latexBody.substring(preambleEnd);
//     const maketitleMatch = afterBegin.match(/^\s*\\maketitle\s*/);

//     if (maketitleMatch) {
//       preambleEnd += maketitleMatch[0].length;
//     }

//     preamble = latexBody.substring(0, preambleEnd);
//     bodyContent = latexBody.substring(preambleEnd);

//     console.log("✅ Preamble extracted:", preamble.length, "chars");
//   } else {
//     console.log("⚠️ No \\begin{document} found");
//   }

//   // --- Step B: Extract and Preserve Postamble ---
//   const endDocIdx = bodyContent.lastIndexOf("\\end{document}");
//   if (endDocIdx !== -1) {
//     postamble = bodyContent.substring(endDocIdx);
//     bodyContent = bodyContent.substring(0, endDocIdx);

//     console.log("✅ Postamble extracted:", postamble.length, "chars");
//   } else {
//     console.log("⚠️ No \\end{document} found");
//   }

//   // --- Step C: Process Body Content ---
//   let processed = stripLatexComments(bodyContent);

//   // Preserve all math expressions
//   const equations = [];
//   processed = processed
//     .replace(/\$\$([^\$]*?)\$\$/g, (match) => {
//       equations.push(match);
//       return `__EQ${equations.length - 1}__`;
//     })
//     .replace(/\$([^$\n]+)\$/g, (match) => {
//       equations.push(match);
//       return `__EQ${equations.length - 1}__`;
//     })
//     .replace(
//       /\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g,
//       (match) => {
//         equations.push(match);
//         return `__EQ${equations.length - 1}__`;
//       }
//     )
//     .replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, (match) => {
//       equations.push(match);
//       return `__EQ${equations.length - 1}__`;
//     });

//   // 1. Handle Environments
//   processed = processed.replace(
//     /\\begin\{(abstract|acknowledgements?|preface|theorem|lemma|proof|definition|corollary|proposition|example|remark|note)\}([\s\S]*?)\\end\{\1\}/gi,
//     (match, envName, content) =>
//       `\n\n<h3><strong>${
//         envName.charAt(0).toUpperCase() + envName.slice(1)
//       }</strong></h3>\n<p>${content.trim()}</p>\n`
//   );

//   // 2. Handle Flushleft/center/right
//   processed = processed.replace(
//     /\\begin\{(flushleft|center|flushright)\}([\s\S]*?)\\end\{\1\}/gi,
//     (match, align, content) =>
//       `\n<div class="latex-${align}">${content.trim()}</div>\n`
//   );

//   // 3. Remove vspace
//   processed = processed.replace(/\\vspace\{[^}]+\}/g, "");

//   // 4. Handle Sections
//   processed = processed
//     .replace(/\\section\{([^}]*)\}/g, "<h2><strong>$1</strong></h2>")
//     .replace(/\\subsection\{([^}]*)\}/g, "<h3><strong>$1</strong></h3>")
//     .replace(/\\subsubsection\{([^}]*)\}/g, "<h4><strong>$1</strong></h4>");

//   // 5. Handle Lists
//   processed = processed.replace(
//     /\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g,
//     (match, content) => {
//       const items = content
//         .split(/\\item\s+/)
//         .filter((i) => i.trim())
//         .map((i) => `<li>${i.trim()}</li>`)
//         .join("");
//       return `<ul>${items}</ul>`;
//     }
//   );

//   processed = processed.replace(
//     /\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g,
//     (match, content) => {
//       const items = content
//         .split(/\\item\s+/)
//         .filter((i) => i.trim())
//         .map((i) => `<li>${i.trim()}</li>`)
//         .join("");
//       return `<ol>${items}</ol>`;
//     }
//   );

//   // 6. Formatting
//   processed = processed
//     .replace(/\\textbf\{([^}]+)\}/g, "<strong>$1</strong>")
//     .replace(/\\textit\{([^}]+)\}/g, "<em>$1</em>")
//     .replace(/\\emph\{([^}]+)\}/g, "<em>$1</em>")
//     .replace(/\\texttt\{([^}]+)\}/g, "<code>$1</code>")
//     .replace(/\\underline\{([^}]+)\}/g, "<u>$1</u>")
//     .replace(/\\today/g, "[Date: Today]");

//   const paragraphs = processed
//     .split(/\n\n+/)
//     .filter((p) => p.trim())
//     .map((p) => {
//       const trimmed = p.trim();
//       return trimmed.startsWith("<") ? trimmed : `<p>${trimmed}</p>`;
//     })
//     .join("\n\n");

//   let result = paragraphs;
//   equations.forEach((eq, i) => {
//     result = result.replace(`__EQ${i}__`, eq);
//   });

//   // --- Step D: Store Preamble/Postamble as DATA ATTRIBUTES ---
//   // Use a special marker comment that won't be touched by the editor
//   let prefix = "";
//   let suffix = "";

//   if (preamble) {
//     // Store as hidden comment-like div with data attribute
//     const encoded = btoa(unescape(encodeURIComponent(preamble)));
//     prefix = `<!--LATEX_PREAMBLE:${encoded}-->`;
//     console.log("📦 Preamble encoded (length):", encoded.length);
//   }

//   if (postamble) {
//     const encoded = btoa(unescape(encodeURIComponent(postamble)));
//     suffix = `<!--LATEX_POSTAMBLE:${encoded}-->`;
//     console.log("📦 Postamble encoded (length):", encoded.length);
//   }

//   const finalResult = prefix + result + suffix;
//   console.log("📝 Final rich text length:", finalResult.length);
//   console.log("=== END LATEX TO RICH TEXT ===\n");

//   return finalResult;
// };

// // ============ 4. RICH TEXT TO LATEX (For Visual Editor) - ULTRA ROBUST ============
// export const richTextToLatex = (richText) => {
//   if (!richText) return "";

//   console.log("=== RICH TEXT TO LATEX ===");
//   console.log("Input length:", richText.length);

//   let latex = richText;
//   let restoredPreamble = "";
//   let restoredPostamble = "";

//   // --- Step A: Extract Hidden Preamble/Postamble from HTML Comments ---

//   // Extract preamble
//   const preambleMatch = latex.match(/<!--LATEX_PREAMBLE:([^-]+)-->/);
//   if (preambleMatch) {
//     try {
//       const encoded = preambleMatch[1];
//       restoredPreamble = decodeURIComponent(escape(atob(encoded)));
//       latex = latex.replace(preambleMatch[0], "");
//       console.log("✅ Preamble restored:", restoredPreamble.length, "chars");
//     } catch (e) {
//       console.error("❌ Error decoding preamble:", e);
//     }
//   } else {
//     console.warn("⚠️ No preamble marker found");
//   }

//   // Extract postamble
//   const postambleMatch = latex.match(/<!--LATEX_POSTAMBLE:([^-]+)-->/);
//   if (postambleMatch) {
//     try {
//       const encoded = postambleMatch[1];
//       restoredPostamble = decodeURIComponent(escape(atob(encoded)));
//       latex = latex.replace(postambleMatch[0], "");
//       console.log("✅ Postamble restored:", restoredPostamble.length, "chars");
//     } catch (e) {
//       console.error("❌ Error decoding postamble:", e);
//     }
//   } else {
//     console.warn("⚠️ No postamble marker found");
//   }

//   // --- Step B: Clean up HTML artifacts ---
//   // Remove <br> tags that editors add
//   latex = latex.replace(/<br\s*\/?>/gi, "\n");

//   // Remove any stray HTML comments
//   latex = latex.replace(/<!--(?!LATEX_)[^>]*-->/g, "");

//   // --- Step C: Process Body Content ---
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

//   // 1. Restore Layouts
//   latex = latex.replace(
//     /<div class="latex-(flushleft|center|flushright)">([\s\S]*?)<\/div>/gi,
//     (match, align, content) =>
//       `\n\\begin{${align}}\n${content.trim()}\n\\end{${align}}\n`
//   );

//   // 2. Restore \today
//   latex = latex.replace(/\[Date: Today\]/g, "\\today");

//   // 3. Restore environments
//   latex = latex.replace(
//     /<h3[^>]*>\s*<strong>(Abstract|Acknowledgements?|Preface|Theorem|Lemma|Proof|Definition|Corollary|Proposition|Example|Remark|Note)<\/strong>\s*<\/h3>\s*<p>([^<]*)<\/p>/gi,
//     (match, envName, content) =>
//       `\n\n\\begin{${envName.toLowerCase()}}\n${content.trim()}\n\\end{${envName.toLowerCase()}}\n`
//   );

//   // 4. Restore sections
//   latex = latex
//     .replace(
//       /<h2[^>]*>(?:<strong>)?([^<]+)(?:<\/strong>)?<\/h2>/gi,
//       "\n\n\\section{$1}\n\n"
//     )
//     .replace(
//       /<h3[^>]*>(?:<strong>)?([^<]+)(?:<\/strong>)?<\/h3>/gi,
//       "\n\n\\subsection{$1}\n\n"
//     )
//     .replace(
//       /<h4[^>]*>(?:<strong>)?([^<]+)(?:<\/strong>)?<\/h4>/gi,
//       "\n\n\\subsubsection{$1}\n\n"
//     );

//   // 5. Restore lists
//   latex = latex.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
//     const items = content
//       .split(/<li[^>]*>/)
//       .slice(1)
//       .map((i) => `\\item ${i.replace(/<\/li>/gi, "").trim()}`)
//       .join("\n");
//     return `\n\\begin{itemize}\n${items}\n\\end{itemize}\n`;
//   });

//   latex = latex.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
//     const items = content
//       .split(/<li[^>]*>/)
//       .slice(1)
//       .map((i) => `\\item ${i.replace(/<\/li>/gi, "").trim()}`)
//       .join("\n");
//     return `\n\\begin{enumerate}\n${items}\n\\end{enumerate}\n`;
//   });

//   // 6. Restore formatting
//   latex = latex
//     .replace(/<strong[^>]*>([^<]+)<\/strong>/gi, "\\textbf{$1}")
//     .replace(/<b[^>]*>([^<]+)<\/b>/gi, "\\textbf{$1}")
//     .replace(/<em[^>]*>([^<]+)<\/em>/gi, "\\textit{$1}")
//     .replace(/<i[^>]*>([^<]+)<\/i>/gi, "\\textit{$1}")
//     .replace(/<code[^>]*>([^<]+)<\/code>/gi, "\\texttt{$1}")
//     .replace(/<u[^>]*>([^<]+)<\/u>/gi, "\\underline{$1}");

//   // 7. Clean up HTML
//   latex = latex
//     .replace(/<p[^>]*>/gi, "")
//     .replace(/<\/p>/gi, "\n\n")
//     .replace(/<div[^>]*>/gi, "")
//     .replace(/<\/div>/gi, "")
//     .replace(/&nbsp;/gi, " ")
//     .replace(/&lt;/gi, "<")
//     .replace(/&gt;/gi, ">")
//     .replace(/&amp;/gi, "&")
//     .replace(/\n{3,}/g, "\n\n")
//     .trim();

//   // 8. Restore equations
//   equations.forEach((eq, i) => {
//     latex = latex.replace(`__EQ${i}__`, eq);
//   });

//   // --- Step D: Combine Preamble + Body + Postamble ---
//   let finalLatex = "";

//   if (restoredPreamble) {
//     finalLatex = restoredPreamble;
//     if (!finalLatex.endsWith("\n")) {
//       finalLatex += "\n";
//     }
//   }

//   finalLatex += latex;

//   if (restoredPostamble) {
//     if (!finalLatex.endsWith("\n")) {
//       finalLatex += "\n";
//     }
//     finalLatex += restoredPostamble;
//   }

//   console.log("📝 Final LaTeX length:", finalLatex.length);
//   console.log(
//     "📝 Has \\begin{document}:",
//     finalLatex.includes("\\begin{document}")
//   );
//   console.log(
//     "📝 Has \\end{document}:",
//     finalLatex.includes("\\end{document}")
//   );
//   console.log("=== END RICH TEXT TO LATEX ===\n");

//   return finalLatex;
// };

// export const debugConversion = (latex) => {
//   console.log("\n=== DEBUG CONVERSION ===");
//   const richText = latexToRichText(latex);
//   console.log("Rich text output:", richText.substring(0, 200));
//   const backToLatex = richTextToLatex(richText);
//   console.log("Back to LaTeX:", backToLatex.substring(0, 200));
//   console.log(
//     "Lengths - Original:",
//     latex.length,
//     "Final:",
//     backToLatex.length
//   );
//   console.log("Match:", latex === backToLatex);
//   console.log("=== END DEBUG ===\n");
//   return { richText, backToLatex, match: latex === backToLatex };
// };

// export default {
//   extractLatexBody,
//   reconstructLatexDocument,
//   latexToRichText,
//   richTextToLatex,
//   latexToSections,
//   sectionsToLatex,
//   escapeLatexSpecialChars,
//   unescapeLatexSpecialChars,
//   debugConversion,
// };
import React from "react";

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
    (char) => escapeMap[char] || char
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
    beginDocIndex + "\\begin{document}".length
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
  const beginDocIndex = originalLatex.indexOf("\\begin{document}");
  const endDocIndex = originalLatex.lastIndexOf("\\end{document}");

  if (beginDocIndex === -1 || endDocIndex === -1) {
    // If original structure is broken, just return body (or wrap it in default)
    return newBodyContent;
  }

  // 1. Get Preamble (everything before \begin{document} + \begin{document})
  let preamble = originalLatex.substring(
    0,
    beginDocIndex + "\\begin{document}".length
  );

  // 2. Check for \maketitle in the original body start
  const originalBodyStart = originalLatex.substring(
    beginDocIndex + "\\begin{document}".length
  );
  if (originalBodyStart.trim().startsWith("\\maketitle")) {
    preamble += "\n\\maketitle";
  }

  // 3. Get Postamble (everything from \end{document} onwards)
  const postamble = originalLatex.substring(endDocIndex);

  return `${preamble}\n\n${newBodyContent}\n\n${postamble}`;
};

// ============ NEW HELPER: SPLIT LATEX INTO PARTS ============
export const splitLatex = (latexDoc) => {
  if (!latexDoc) return { preamble: "", body: "", postamble: "" };

  const beginIndex = latexDoc.indexOf("\\begin{document}");
  if (beginIndex === -1) {
    // If no document structure, treat entire thing as body
    return { preamble: "", body: latexDoc, postamble: "" };
  }

  // Calculate where the Body starts
  let splitPoint = beginIndex + "\\begin{document}".length;

  // Optionally include \maketitle in the "hidden" preamble so it doesn't show in editor
  const afterBegin = latexDoc.substring(splitPoint);
  const makeTitleMatch = afterBegin.match(/^\s*\\maketitle/);
  if (makeTitleMatch) {
    splitPoint += makeTitleMatch[0].length;
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

  // Use the splitter to isolate content
  const { preamble, body, postamble } = splitLatex(latexDoc);

  // 1. Store Preamble
  if (preamble) {
    root.push({
      id: "preamble-block",
      type: "preamble",
      name: "Document Configuration",
      content: preamble,
      children: [],
    });
  }

  // 2. Parse Body Sections
  let currentSection = null;
  let currentSubsection = null;
  const parts = body.split(
    /(\\(?:section|subsection|subsubsection)\{[^}]*\})/g
  );

  parts.forEach((part) => {
    if (!part.trim()) return;
    const match = part.match(/\\(section|subsection|subsubsection)\{([^}]*)\}/);

    if (match) {
      const type = match[1];
      const name = match[2];
      const newBlock = {
        id: Date.now() + Math.random(),
        type,
        name,
        content: "",
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
    } else {
      // Content Logic
      if (currentSubsection && currentSubsection.children.length > 0) {
        currentSubsection.children[
          currentSubsection.children.length - 1
        ].content += part;
      } else if (currentSubsection) {
        currentSubsection.content += part;
      } else if (currentSection) {
        if (currentSection.children.length > 0)
          currentSection.children[currentSection.children.length - 1].content +=
            part;
        else currentSection.content += part;
      } else {
        // Root Text (Introduction)
        const lastRoot = root[root.length - 1];
        if (
          lastRoot &&
          (lastRoot.type === "section" || lastRoot.type === "preamble")
        ) {
          if (lastRoot.type === "preamble")
            root.push({
              id: Date.now() + Math.random(),
              type: "section",
              name: "Introduction",
              content: part,
              children: [],
            });
          else lastRoot.content += part;
        } else {
          root.push({
            id: Date.now() + Math.random(),
            type: "section",
            name: "Introduction",
            content: part,
            children: [],
          });
        }
      }
    }
  });

  // 3. Store Postamble
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
    } else if (["section", "subsection", "subsubsection"].includes(node.type)) {
      latex += `\n\\${node.type}{${node.name}}\n`;
    }

    if (node.content && node.type !== "preamble") {
      latex += node.content + "\n";
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
  let processed = stripLatexComments(latexBody);

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

  // Handle Layouts (Just clear the commands, keep text)
  processed = processed.replace(
    /\\begin\{(flushleft|center|flushright)\}([\s\S]*?)\\end\{\1\}/gi,
    "$2"
  );
  processed = processed.replace(/\\vspace\{[^}]+\}/g, ""); // Remove vspace completely

  // Environments
  processed = processed.replace(
    /\\begin\{(abstract|acknowledgements?|preface|theorem|lemma|proof|definition|corollary|proposition|example|remark|note)\}([\s\S]*?)\\end\{\1\}/gi,
    (match, envName, content) =>
      `\n\n<h3><strong>${
        envName.charAt(0).toUpperCase() + envName.slice(1)
      }</strong></h3>\n<p>${content.trim()}</p>\n`
  );

  // Sections/Lists/Formatting
  processed = processed
    .replace(/\\section\{([^}]*)\}/g, "<h2><strong>$1</strong></h2>")
    .replace(/\\subsection\{([^}]*)\}/g, "<h3><strong>$1</strong></h3>")
    .replace(/\\subsubsection\{([^}]*)\}/g, "<h4><strong>$1</strong></h4>")
    .replace(
      /\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g,
      (match, content) =>
        `<ul>${content
          .split(/\\item\s+/)
          .filter((i) => i.trim())
          .map((i) => `<li>${i.trim()}</li>`)
          .join("")}</ul>`
    )
    .replace(
      /\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g,
      (match, content) =>
        `<ol>${content
          .split(/\\item\s+/)
          .filter((i) => i.trim())
          .map((i) => `<li>${i.trim()}</li>`)
          .join("")}</ol>`
    )
    .replace(/\\textbf\{([^}]+)\}/g, "<strong>$1</strong>")
    .replace(/\\textit\{([^}]+)\}/g, "<em>$1</em>")
    .replace(/\\emph\{([^}]+)\}/g, "<em>$1</em>")
    .replace(/\\texttt\{([^}]+)\}/g, "<code>$1</code>")
    .replace(/\\underline\{([^}]+)\}/g, "<u>$1</u>")
    .replace(/\\today/g, "[Date: Today]");

  const paragraphs = processed
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((p) => {
      const trimmed = p.trim();
      return trimmed.startsWith("<") ? trimmed : `<p>${trimmed}</p>`;
    })
    .join("\n\n");

  let result = paragraphs;
  equations.forEach((eq, i) => {
    result = result.replace(`__EQ${i}__`, eq);
  });
  return result;
};

// ============ 4. RICH TEXT TO LATEX ============
export const richTextToLatex = (richText) => {
  if (!richText) return "";
  let latex = richText;
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

  latex = latex
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p><p>/gi, "\n\n")
    .replace(/<p>/gi, "")
    .replace(/<\/p>/gi, "\n")
    .replace(/\[Date: Today\]/g, "\\today")
    .replace(
      /<h2[^>]*>(?:<strong>)?([^<]+)(?:<\/strong>)?<\/h2>/gi,
      "\n\n\\section{$1}\n\n"
    )
    .replace(
      /<h3[^>]*>(?:<strong>)?([^<]+)(?:<\/strong>)?<\/h3>/gi,
      "\n\n\\subsection{$1}\n\n"
    )
    .replace(
      /<h4[^>]*>(?:<strong>)?([^<]+)(?:<\/strong>)?<\/h4>/gi,
      "\n\n\\subsubsection{$1}\n\n"
    )
    .replace(
      /<ul[^>]*>([\s\S]*?)<\/ul>/gi,
      (match, content) =>
        `\n\\begin{itemize}\n${content
          .split(/<li[^>]*>/)
          .slice(1)
          .map((i) => `\\item ${i.replace(/<\/li>/gi, "").trim()}`)
          .join("\n")}\n\\end{itemize}\n`
    )
    .replace(
      /<ol[^>]*>([\s\S]*?)<\/ol>/gi,
      (match, content) =>
        `\n\\begin{enumerate}\n${content
          .split(/<li[^>]*>/)
          .slice(1)
          .map((i) => `\\item ${i.replace(/<\/li>/gi, "").trim()}`)
          .join("\n")}\n\\end{enumerate}\n`
    )
    .replace(/<strong[^>]*>([^<]+)<\/strong>/gi, "\\textbf{$1}")
    .replace(/<b[^>]*>([^<]+)<\/b>/gi, "\\textbf{$1}")
    .replace(/<em[^>]*>([^<]+)<\/em>/gi, "\\textit{$1}")
    .replace(/<i[^>]*>([^<]+)<\/i>/gi, "\\textit{$1}")
    .replace(/<code[^>]*>([^<]+)<\/code>/gi, "\\texttt{$1}")
    .replace(/<u[^>]*>([^<]+)<\/u>/gi, "\\underline{$1}");

  latex = latex.replace(/\n{3,}/g, "\n\n").trim();
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
  splitLatex,
  escapeLatexSpecialChars,
  unescapeLatexSpecialChars,
};
