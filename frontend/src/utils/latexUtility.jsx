import React from "react";

// Extract LaTeX body content (content after \maketitle or \begin{document})
export const extractLatexBody = (latex) => {
  // Find the actual content start
  const beginDocIndex = latex.indexOf("\\begin{document}");
  if (beginDocIndex === -1) return latex;

  const afterBeginDoc = latex.substring(
    beginDocIndex + "\\begin{document}".length
  );
  const endDocIndex = afterBeginDoc.indexOf("\\end{document}");

  if (endDocIndex === -1) return afterBeginDoc;

  let content = afterBeginDoc.substring(0, endDocIndex);

  // Remove \maketitle if it's at the beginning
  content = content.replace(/^\s*\\maketitle\s*/, "").trim();

  return content;
};

// Reconstruct full LaTeX document EXACTLY as it was
export const reconstructLatexDocument = (originalLatex, newBodyContent) => {
  const beginDocIndex = originalLatex.indexOf("\\begin{document}");
  const endDocIndex = originalLatex.lastIndexOf("\\end{document}");

  if (beginDocIndex === -1 || endDocIndex === -1) {
    return originalLatex; // Return original if structure is broken
  }

  const preamble = originalLatex.substring(
    0,
    beginDocIndex + "\\begin{document}".length
  );
  const hasmaketitle = originalLatex.includes("\\maketitle");

  let reconstructed = preamble;

  if (hasmaketitle) {
    reconstructed += "\n\n\\maketitle\n\n";
  } else {
    reconstructed += "\n\n";
  }

  reconstructed += newBodyContent;
  reconstructed += "\n\n\\end{document}";

  return reconstructed;
};

// Convert LaTeX body to Rich Text HTML (FIXED LISTS)
export const latexToRichText = (latexBody) => {
  if (!latexBody) return "";

  return (
    latexBody
      // Sections
      .replace(/\\section\{([^}]*)\}/g, "<h2>$1</h2>")
      .replace(/\\subsection\{([^}]*)\}/g, "<h3>$1</h3>")
      .replace(/\\subsubsection\{([^}]*)\}/g, "<h4>$1</h4>")

      // Text formatting
      .replace(/\\textbf\{([^}]*)\}/g, "<strong>$1</strong>")
      .replace(/\\textit\{([^}]*)\}/g, "<em>$1</em>")
      .replace(/\\emph\{([^}]*)\}/g, "<em>$1</em>")
      .replace(/\\underline\{([^}]*)\}/g, "<u>$1</u>")

      // Lists (Proper handling of \item)
      .replace(
        /\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g,
        (match, content) => {
          const items = content
            .split(/\\item\s*/)
            .filter((item) => item.trim())
            .map((item) => {
              const cleanItem = item
                .trim()
                .replace(/\n\s*$/, "")
                .replace(/\n/g, " ")
                .trim();
              return cleanItem ? `<li>${cleanItem}</li>` : "";
            })
            .filter((item) => item) // Remove empty items
            .join("");
          return `<ul>${items}</ul>`;
        }
      )
      .replace(
        /\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g,
        (match, content) => {
          const items = content
            .split(/\\item\s*/)
            .filter((item) => item.trim())
            .map((item) => {
              const cleanItem = item
                .trim()
                .replace(/\n\s*$/, "")
                .replace(/\n/g, " ")
                .trim();
              return cleanItem ? `<li>${cleanItem}</li>` : "";
            })
            .filter((item) => item) // Remove empty items
            .join("");
          return `<ol>${items}</ol>`;
        }
      )

      // Math formatting
      .replace(
        /\\\[([\s\S]*?)\\\]/g,
        '<div style="text-align: center; background: #f8f9fa; padding: 10px; margin: 10px 0; border-left: 4px solid #007bff; font-family: monospace;">\\[$1\\]</div>'
      )
      .replace(
        /\$([^$\n]+)\$/g,
        '<span style="background: #e9ecef; padding: 2px 4px; border-radius: 3px; color: #d63384;">$$1$</span>'
      )

      // Convert line breaks to paragraphs
      .replace(/\n\s*\n/g, "</p><p>")
      .replace(/^/, "<p>")
      .replace(/$/, "</p>")

      // Clean up empty paragraphs and fix structure
      .replace(/<p>\s*<\/p>/g, "")
      .replace(/<p>(\s*<h[1-6])/g, "$1")
      .replace(/(<\/h[1-6]>\s*)<\/p>/g, "$1")
      .replace(/<p>(\s*<[uo]l)/g, "$1")
      .replace(/(<\/[uo]l>\s*)<\/p>/g, "$1")
      .replace(/<p>(\s*<div)/g, "$1")
      .replace(/(<\/div>\s*)<\/p>/g, "$1")

      .trim()
  );
};

// Convert Rich Text HTML back to LaTeX body (IMPROVED LIST HANDLING)
export const richTextToLatex = (html) => {
  if (!html) return "";

  return (
    html
      // Convert headings
      .replace(/<h2[^>]*>([^<]*)<\/h2>/g, "\n\\section{$1}\n")
      .replace(/<h3[^>]*>([^<]*)<\/h3>/g, "\n\\subsection{$1}\n")
      .replace(/<h4[^>]*>([^<]*)<\/h4>/g, "\n\\subsubsection{$1}\n")

      // Convert formatting
      .replace(/<strong[^>]*>([^<]*)<\/strong>/g, "\\textbf{$1}")
      .replace(/<b[^>]*>([^<]*)<\/b>/g, "\\textbf{$1}")
      .replace(/<em[^>]*>([^<]*)<\/em>/g, "\\textit{$1}")
      .replace(/<i[^>]*>([^<]*)<\/i>/g, "\\textit{$1}")
      .replace(/<u[^>]*>([^<]*)<\/u>/g, "\\underline{$1}")

      // IMPROVED: Convert lists (Handle ReactQuill's nested structure)
      .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/g, (match, content) => {
        // Extract all list items, handling nested content
        let items = "";
        const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/g;
        let liMatch;

        while ((liMatch = liRegex.exec(content)) !== null) {
          const itemContent = liMatch[1]
            .replace(/<[^>]+>/g, "") // Remove HTML tags
            .replace(/\s+/g, " ") // Normalize whitespace
            .trim();

          if (itemContent) {
            items += `    \\item ${itemContent}\n`;
          }
        }

        return items ? `\n\\begin{itemize}\n${items}\\end{itemize}\n` : "";
      })

      .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/g, (match, content) => {
        // Extract all list items, handling nested content
        let items = "";
        const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/g;
        let liMatch;

        while ((liMatch = liRegex.exec(content)) !== null) {
          const itemContent = liMatch[1]
            .replace(/<[^>]+>/g, "") // Remove HTML tags
            .replace(/\s+/g, " ") // Normalize whitespace
            .trim();

          if (itemContent) {
            items += `    \\item ${itemContent}\n`;
          }
        }

        return items ? `\n\\begin{enumerate}\n${items}\\end{enumerate}\n` : "";
      })

      // Convert math back (preserve LaTeX)
      .replace(/<div[^>]*>\\\[([\s\S]*?)\\\]<\/div>/g, "\n\\[$1\\]\n")
      .replace(/<span[^>]*>\$([^$]*?)\$<\/span>/g, "$$1$")

      // Convert paragraphs
      .replace(/<p[^>]*>([^<]*)<\/p>/g, "$1\n\n")
      .replace(/<br\s*\/?>/g, "\n")

      // Remove remaining HTML tags
      .replace(/<[^>]+>/g, "")

      // Clean up whitespace
      .replace(/\n\s*\n\s*\n+/g, "\n\n")
      .replace(/^\s+|\s+$/g, "")
      .trim()
  );
};
