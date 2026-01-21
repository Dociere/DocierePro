// renderStrategies.js

// --- 1. TEMPLATE REGISTRY ---
export const TEMPLATE_REGISTRY = {
  "ai4x": ["Introduction", "Main Content", "Related Work", "Acknowledgments", "Appendices"],
  "springer_nature": ["Introduction", "Results", "Discussion", "Methods", "Conclusion", "Declarations", "Supplementary Information", "Acknowledgments", "Appendices"],
  "ieee_transmag": ["Introduction", "Methodology", "Results", "Conclusion", "Acknowledgment", "Appendices", "Biographies"],
  "ieee_tmi": ["Introduction", "Guidelines for Manuscript Preparation", "Math", "Units", "Guidelines for Graphics Preparation", "Conclusion", "Appendix", "Acknowledgment", "References"],
  "ieee_journal": ["Introduction", "System Model", "Methodology", "Results", "Conclusion", "Acknowledgments", "Appendices", "Biographies"],
  "ieee_tns": ["Introduction", "Structure of Paper", "Experimental Setup", "Data Analysis", "Conclusion", "Appendix", "Acknowledgment", "References"],
  "ieee_journal_letters": ["Introduction", "System Model", "Methodology", "Results", "Conclusion", "Appendix", "Acknowledgment", "References"],
  "mdpi": ["Introduction", "Materials and Methods", "Results", "Discussion", "Conclusions", "Author Contributions", "Funding", "Institutional Review Board Statement", "Informed Consent Statement", "Data Availability Statement", "Acknowledgments", "Conflicts of Interest"],
  "acm_manuscript": ["Introduction", "Related Work", "Methodology", "Experiments", "Results", "Conclusion", "Acknowledgments", "Appendices"],
  "cell_press": ["Introduction", "Results", "Discussion", "Methods", "Resource Availability", "Acknowledgments", "Author Contributions", "Declaration of Interests", "Declaration of Generative AI", "Figure Legends", "Tables"],
  "acs": ["Introduction", "Results and discussion", "Experimental", "Conclusion", "Acknowledgements", "Supporting information"],
  "frontiers": ["Introduction", "Material and Methods", "Results", "Discussion", "Conflict of Interest Statement", "Author Contributions", "Funding", "Acknowledgments", "Data Availability Statement"],
  "elsarticle": ["Introduction", "Methodology", "Results", "Discussion", "Conclusion", "Acknowledgments", "Appendices", "References"],
  "ajp": ["Introduction", "Theory", "Experiment", "Results", "Conclusion", "Appendix", "Acknowledgments"],
  "aip": ["Lead Paragraph", "Introduction", "Theory", "Results", "Conclusion", "Acknowledgments", "Data Availability Statement", "Appendix"],
  "science": ["Introduction", "Results", "Discussion", "Materials and Methods", "Acknowledgments", "Supplementary Materials"],
  "rsc": ["Introduction", "Graphics and tables", "Equations", "Conclusions", "Author contributions", "Conflicts of interest", "Data availability", "Acknowledgements"],
  "asm_journal": ["Importance", "Introduction", "Materials and Methods", "Results", "Discussion", "Acknowledgments", "Funding", "Conflicts of Interest", "Data Availability Statement", "References"],
  "asme": ["Introduction", "Methodology", "Results", "Discussion", "Conclusion", "Acknowledgment", "Funding Data", "Nomenclature", "Appendices"],
  "ams_tran": ["Introduction", "Main Results", "Proofs", "Conclusion", "References"],
  "ios_book_article": ["Introduction", "Typographical Style and Layout", "Illustrations", "Equations", "Fine Tuning", "Submitting the Manuscript", "References"],
  "spie_journal": ["Introduction", "Methodology", "Results", "Discussion", "Conclusion", "Appendices", "Disclosures", "Code, Data, and Materials Availability", "Acknowledgments", "Biographies"],
  "ieee": ["Introduction", "Methodology", "Results and Discussions", "Conclusion"]
};

// --- 2. RENDERER FUNCTIONS ---

const generate_ai4x_latex = (title, authors, abstract, sections, conference_info = {}) => {
  const aff_map = {};
  let aff_counter = 1;

  authors.forEach(author => {
    const org = author.organization;
    if (!aff_map[org]) {
      aff_map[org] = `aff${aff_counter}`;
      aff_counter++;
    }
  });

  let author_list_latex = "\\begin{icmlauthorlist}\n";
  authors.forEach(author => {
    const aff_id = aff_map[author.organization];
    const orcid = author.orcid || '';
    const presenting_tag = author.is_presenting ? "presenting" : "";
    author_list_latex += `\\icmlauthor{${author.name}}{${aff_id}}{${orcid}}{${presenting_tag}}\n`;
  });
  author_list_latex += "\\end{icmlauthorlist}\n";

  let affiliation_latex = "";
  for (const [org, aff_id] of Object.entries(aff_map)) {
    affiliation_latex += `\\icmlaffiliation{${aff_id}}{${org}}\n`;
  }

  let corr_author_latex = "";
  authors.forEach(author => {
    if (author.is_corresponding) {
      corr_author_latex += `\\icmlcorrespondingauthor{${author.name}}{${author.email}}\n`;
    }
  });

  let latex = `
\\documentclass{ai4x}
\\usepackage{tabulary}
\\usepackage{graphicx}
\\usepackage{amsmath}
\\usepackage{booktabs}
`;
  latex += `\\IACconference{${conference_info.conference_name || 'AI4X -- Accelerate'}}\n`;
  latex += `\\IACpaperyear{${conference_info.year || '2026'}}\n`;
  latex += `\\IAClocation{${conference_info.location || 'Singapore'}}\n`;
  latex += `\\IACdate{${conference_info.dates || '16--19 June 2026'}}\n`;
  latex += `\\title{${title}}\n`;

  latex += `
\\hypersetup{
    pdfkeywords={AI, machine learning, science, conference template}
}

\\begin{document}
\\twocolumn[
\\maketitle
\\icmlsetsymbol{equal}{*}
`;
  latex += author_list_latex + "\n" + affiliation_latex + "\n" + corr_author_latex;
  latex += `
\\printAffiliations
\\vskip 2.5ex
]
\\thispagestyle{fancy}
`;

  latex += `\\begin{abstract}\n${abstract}\n\\end{abstract}\n\n`;

  for (const [sectionName, content] of Object.entries(sections)) {
    const key = sectionName.toLowerCase();
    if (key === 'acknowledgments') {
      latex += `\\section*{${sectionName}}\n${content}\n\n`;
    } else if (key === 'appendices') {
      latex += `\\begin{appendices}\n${content}\n\\end{appendices}\n\n`;
    } else {
      latex += `\\section{${sectionName}}\n${content}\n\n`;
    }
  }

  latex += "\\bibliography{biblio}\n\\end{document}\n";
  return latex;
};

const generate_springer_latex = (title, authors, abstract, keywords, sections) => {
  const org_map = {};
  let org_counter = 1;

  authors.forEach(author => {
    const org = author.organization;
    if (!org_map[org]) {
      org_map[org] = org_counter;
      org_counter++;
    }
  });

  let latex = `
\\documentclass[pdflatex,sn-mathphys-num]{sn-jnl}
\\usepackage{graphicx}
\\usepackage{multirow}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{amsthm}
\\usepackage{mathrsfs}
\\usepackage[title]{appendix}
\\usepackage{xcolor}
\\usepackage{textcomp}
\\usepackage{manyfoot}
\\usepackage{booktabs}
\\usepackage{algorithm}
\\usepackage{algorithmicx}
\\usepackage{algpseudocode}
\\usepackage{listings}

\\theoremstyle{thmstyleone}
\\newtheorem{theorem}{Theorem}
\\newtheorem{proposition}[theorem]{Proposition}
\\theoremstyle{thmstyletwo}
\\newtheorem{example}{Example}
\\newtheorem{remark}{Remark}
\\theoremstyle{thmstylethree}
\\newtheorem{definition}{Definition}
\\raggedbottom

\\begin{document}
`;
  latex += `\\title[${title.substring(0, 50)}...]{${title}}\n`;

  authors.forEach(author => {
    const aff_id = org_map[author.organization];
    const star = author.is_corresponding ? "*" : "";
    
    const nameParts = author.name.trim().split(' ');
    const sur = nameParts.length > 1 ? nameParts.pop() : nameParts[0];
    const fnm = nameParts.length > 0 ? nameParts.join(' ') : ""; // Handle single names

    latex += `\\author${star}[${aff_id}]{\\fnm{${fnm}} \\sur{${sur}}}\n`;
    if (author.email) latex += `\\email{${author.email}}\n`;
    if (author.equal_contribution) latex += "\\equalcont{These authors contributed equally to this work.}\n";
  });

  for (const [org, aff_id] of Object.entries(org_map)) {
    latex += `\\affil[${aff_id}]{\\orgname{${org}}}\n`;
  }

  latex += `\\abstract{${abstract}}\n`;
  latex += `\\keywords{${keywords}}\n`;
  latex += "\\maketitle\n\n";

  for (const [sectionName, content] of Object.entries(sections)) {
    const key = sectionName.toLowerCase();
    if (['acknowledgments', 'acknowledgements'].includes(key)) {
      latex += `\\bmhead{${sectionName}}\n${content}\n\n`;
    } else if (key === 'supplementary information') {
      latex += `\\backmatter\n\\bmhead{${sectionName}}\n${content}\n\n`;
    } else if (key === 'appendices') {
      latex += `\\begin{appendices}\n${content}\n\\end{appendices}\n\n`;
    } else if (key === 'declarations') {
      latex += `\\section*{${sectionName}}\n${content}\n\n`;
    } else {
      latex += `\\section{${sectionName}}\n${content}\n\n`;
    }
  }

  latex += "\\bibliography{sn-bibliography}\n\\end{document}\n";
  return latex;
};

const generate_transmag_latex = (title, authors, abstract, keywords, sections) => {
  const org_map = {};
  let org_counter = 1;

  authors.forEach(author => {
    const org = author.organization;
    if (!org_map[org]) {
      org_map[org] = org_counter;
      org_counter++;
    }
  });

  const name_list = authors.map(author => {
    const aff_id = org_map[author.organization];
    let name_entry = `${author.name}\\IEEEauthorrefmark{${aff_id}}`;
    if (author.membership) name_entry += `,~\\IEEEmembership{${author.membership}}`;
    return name_entry;
  });

  const names_latex = name_list.join(",\n");
  
  let affil_latex = "";
  for (const [org, aff_id] of Object.entries(org_map)) {
    affil_latex += `\\IEEEauthorblockA{\\IEEEauthorrefmark{${aff_id}}${org}}\n`;
  }

  let thanks_text = "";
  const corr = authors.find(a => a.is_corresponding);
  if (corr) {
    thanks_text = `\\thanks{Corresponding author: ${corr.name} (email: ${corr.email}).}`;
  }

  let latex = `
\\documentclass[journal,transmag]{IEEEtran}
\\usepackage{cite}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{algorithmic}
\\usepackage{graphicx}
\\usepackage{textcomp}
\\usepackage{xcolor}
\\hyphenation{op-tical net-works semi-conduc-tor}

\\begin{document}
`;
  latex += `\\title{${title}}\n`;
  latex += `\\author{\\IEEEauthorblockN{\n${names_latex}\n}\n${affil_latex}${thanks_text}}\n`;
  
  latex += `\\IEEEtitleabstractindextext{%\n\\begin{abstract}\n${abstract}\n\\end{abstract}\n`;
  latex += `\\begin{IEEEkeywords}\n${keywords}\n\\end{IEEEkeywords}}\n`;
  
  latex += "\\maketitle\n\\IEEEdisplaynontitleabstractindextext\n\\IEEEpeerreviewmaketitle\n\n";

  for (const [sectionName, content] of Object.entries(sections)) {
    const key = sectionName.toLowerCase();
    if (key === 'acknowledgment') {
      latex += `\\section*{${sectionName}}\n${content}\n\n`;
    } else if (key === 'appendices') {
      latex += `\\appendices\n${content}\n\n`;
    } else if (key === 'biographies') {
      // handled below
    } else {
      latex += `\\section{${sectionName}}\n${content}\n\n`;
    }
  }

  authors.forEach(author => {
    const bio = author.bio_text || "Biography text here.";
    latex += `\\begin{IEEEbiographynophoto}{${author.name}}\n${bio}\n\\end{IEEEbiographynophoto}\n\n`;
  });

  latex += "\\bibliographystyle{IEEEtran}\n\\bibliography{references}\n\\end{document}\n";
  return latex;
};

const generate_tmi_latex = (title, authors, abstract, keywords, sections, journal_meta = {}) => {
  let latex = `
\\documentclass[journal,twoside,web]{ieeecolor}
\\usepackage{tmi}
\\usepackage{cite}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{algorithmic}
\\usepackage{graphicx}
\\usepackage{textcomp}
\\def\\BibTeX{{\\rm B\\kern-.05em{\\sc i\\kern-.025em b}\\kern-.08em
    T\\kern-.1667em\\lower.7ex\\hbox{E}\\kern-.125emX}}
`;
  
  const firstAuthorSurname = authors.length > 0 ? authors[0].name.split(' ').pop() : "Author";
  const vol = journal_meta.volume || 'XX';
  const no = journal_meta.number || 'XX';
  const year = journal_meta.year || '2026';

  latex += `\\markboth{\\journalname, VOL. ${vol}, NO. ${no}, ${year}}\n`;
  latex += `{${firstAuthorSurname} \\MakeLowercase{\\textit{et al.}}: ${title}}\n`;
  latex += "\\begin{document}\n";
  latex += `\\title{${title}}\n`;

  const author_strings = [];
  const thanks_strings = [];
  
  const submission_date = journal_meta.submission_date || 'Month XX, 2026';
  const grants = journal_meta.grants || 'No grants specified.';
  thanks_strings.push(`\\thanks{This work was submitted for review on ${submission_date}. This work was supported by ${grants}}`);

  authors.forEach(author => {
    let name_str = author.name;
    if (author.membership) name_str += `, \\IEEEmembership{${author.membership}}`;
    author_strings.push(name_str);
    thanks_strings.push(`\\thanks{${author.name} is with ${author.organization} (e-mail: ${author.email}).}`);
  });

  let authors_latex = author_strings[0];
  if (author_strings.length > 1) {
    authors_latex = author_strings.slice(0, -1).join(", ") + ", and " + author_strings[author_strings.length - 1];
  }

  latex += `\\author{${authors_latex}\n` + thanks_strings.join("\n") + "}\n\n";
  latex += "\\maketitle\n\n";
  latex += `\\begin{abstract}\n${abstract}\n\\end{abstract}\n\n`;
  latex += `\\begin{IEEEkeywords}\n${keywords}\n\\end{IEEEkeywords}\n\n`;

  for (const [sectionName, content] of Object.entries(sections)) {
    const key = sectionName.toLowerCase();
    if (key === 'introduction') {
      const words = content.split(' ');
      if (words.length > 0 && words[0].length > 1) {
        const char = words[0][0];
        const rest = words[0].slice(1);
        const text = words.slice(1).join(' ');
        latex += `\\section{${sectionName}}\n\\label{sec:introduction}\n\\IEEEPARstart{${char}}{${rest}} ${text}\n\n`;
      } else {
        latex += `\\section{${sectionName}}\n\\label{sec:introduction}\n${content}\n\n`;
      }
    } else if (key === 'appendix') {
      latex += `\\appendices\n\\section*{Appendix}\n${content}\n\n`;
    } else if (['acknowledgment', 'acknowledgments'].includes(key)) {
      latex += `\\section*{Acknowledgment}\n${content}\n\n`;
    } else {
      latex += `\\section{${sectionName}}\n${content}\n\n`;
    }
  }

  latex += "\\bibliographystyle{IEEEtran}\n\\bibliography{references}\n\\end{document}\n";
  return latex;
};

const generate_ieee_journal_latex = (title, authors, abstract, keywords, sections, journal_meta = {}) => {
  let latex = `
\\documentclass[lettersize,journal]{IEEEtran}
\\usepackage{amsmath,amsfonts}
\\usepackage{algorithmic}
\\usepackage{algorithm}
\\usepackage{array}
\\usepackage[caption=false,font=normalsize,labelfont=sf,textfont=sf]{subfig}
\\usepackage{textcomp}
\\usepackage{stfloats}
\\usepackage{url}
\\usepackage{verbatim}
\\usepackage{graphicx}
\\usepackage{cite}
\\hyphenation{op-tical net-works semi-conduc-tor IEEE-Xplore}

\\begin{document}
`;
  latex += `\\title{${title}}\n`;

  const author_list = [];
  const thanks_list = [];

  authors.forEach(author => {
    let name_str = author.name;
    if (author.membership) name_str += `,~\\IEEEmembership{${author.membership}}`;
    author_list.push(name_str);
    thanks_list.push(`\\thanks{${author.name} is with ${author.organization} (e-mail: ${author.email}).}`);
  });

  latex += "\\author{" + author_list.join(", ") + "\n" + thanks_list.join("\n") + "}\n";

  const firstAuthorSurname = authors.length > 0 ? authors[0].name.split(' ').pop() : "Author";
  latex += `\\markboth{${journal_meta.journal_name || 'IEEE Journal'},~Vol.~${journal_meta.volume || '14'}, No.~${journal_meta.issue || '8'}, ${journal_meta.date || 'August 2021'}}%\n`;
  latex += `{${firstAuthorSurname} \\MakeLowercase{\\textit{et al.}}: ${title}}\n`;
  latex += "\\IEEEpubid{0000--0000/00\\$00.00~\\copyright~2021 IEEE}\n";
  latex += "\\maketitle\n";
  latex += `\\begin{abstract}\n${abstract}\n\\end{abstract}\n\n`;
  latex += `\\begin{IEEEkeywords}\n${keywords}\n\\end{IEEEkeywords}\n\n`;

  for (const [sectionName, content] of Object.entries(sections)) {
    const key = sectionName.toLowerCase();
    if (key === 'introduction') {
      const words = content.split(' ');
      let formatted = content;
      if (words.length > 0 && words[0].length > 1) {
        formatted = `\\IEEEPARstart{${words[0][0]}}{${words[0].slice(1)}} ${words.slice(1).join(' ')}`;
      }
      formatted += "\n\\IEEEpubidadjcol\n";
      latex += `\\section{${sectionName}}\n${formatted}\n\n`;
    } else if (key === 'appendices') {
      latex += `\\appendices\n${content}\n\n`;
    } else if (['acknowledgments', 'acknowledgment'].includes(key)) {
      latex += `\\section*{Acknowledgments}\n${content}\n\n`;
    } else if (key === 'biographies') {
      // skip
    } else {
      latex += `\\section{${sectionName}}\n${content}\n\n`;
    }
  }

  latex += "\\bibliographystyle{IEEEtran}\n\\bibliography{references}\n";

  if (sections['Biographies']) {
    latex += sections['Biographies'];
  } else {
    latex += "\\newpage\n\n";
    authors.forEach(author => {
      const bio = author.bio_text || "Biography text here.";
      const env = author.photo_path ? `IEEEbiography` : `IEEEbiographynophoto`;
      const arg = author.photo_path ? `[${author.photo_path}]` : ``;
      latex += `\\begin{${env}}${arg}{${author.name}}\n${bio}\n\\end{${env}}\n\n`;
    });
  }

  latex += "\\vfill\n\\end{document}\n";
  return latex;
};

const generate_ieee_journal_letters_latex = (title, authors, abstract, keywords, sections, journal_meta = {}) => {
  // Letters usually shares same structure as Journal, reusing for robustness
  return generate_ieee_journal_latex(title, authors, abstract, keywords, sections, journal_meta);
};

const generate_tns_latex = (title, authors, abstract, keywords, sections, journal_meta = {}) => {
  let latex = `
\\documentclass{IEEEtran}
\\usepackage{cite}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{graphicx}
\\usepackage{textcomp,nicefrac}
\\def\\BibTeX{{\\rm B\\kern-.05em{\\sc i\\kern-.025em b}\\kern-.08em
T\\kern-.1667em\\lower.7ex\\hbox{E}\\kern-.125emX}}
`;
  const vol = journal_meta.volume || 'XX';
  const no = journal_meta.number || 'XX';
  const month_year = journal_meta.month_year || 'January 2025';
  const journal_name = journal_meta.journal_name || 'IEEE TRANSACTIONS ON NUCLEAR SCIENCE';
  const firstAuthorSurname = authors.length > 0 ? authors[0].name.split(' ').pop() : "Author";

  latex += `\\markboth{${journal_name}, VOL. ${vol}, NO. ${no}, ${month_year}}\n`;
  latex += `{${firstAuthorSurname} \\MakeLowercase{\\textit{et al.}}: ${title}}\n`;
  latex += "\\begin{document}\n";
  latex += `\\title{${title}}\n`;

  const author_names = [];
  const thanks_entries = [];
  
  const sub_date = journal_meta.submission_date || 'Month XX, 2025';
  const funding = journal_meta.funding || 'No funding source specified.';
  thanks_entries.push(`\\thanks{This work was submitted for review on ${sub_date}. ${funding}}`);

  authors.forEach(author => {
    let name = author.name;
    if (author.membership) name += `, \\IEEEmembership{${author.membership}}`;
    author_names.push(name);
    thanks_entries.push(`\\thanks{${author.name} is with ${author.organization} (e-mail: ${author.email}).}`);
  });

  let names_latex = author_names[0];
  if (author_names.length > 1) {
    names_latex = author_names.slice(0, -1).join(", ") + ", and " + author_names[author_names.length - 1];
  }

  latex += `\\author{${names_latex}\n` + thanks_entries.join("\n") + "}\n\n";
  latex += "\\maketitle\n\n";
  latex += `\\begin{abstract}\n${abstract}\n\\end{abstract}\n\n`;
  latex += `\\begin{IEEEkeywords}\n${keywords}\n\\end{IEEEkeywords}\n\n`;

  for (const [sectionName, content] of Object.entries(sections)) {
    const key = sectionName.toLowerCase();
    if (key === 'introduction') {
      const words = content.split(' ');
      if (words.length > 0 && words[0].length > 1) {
        latex += `\\section{${sectionName}}\n\\label{sec:introduction}\n\\IEEEPARstart{${words[0][0]}}{${words[0].slice(1)}} ${words.slice(1).join(' ')}\n\n`;
      } else {
        latex += `\\section{${sectionName}}\n\\label{sec:introduction}\n${content}\n\n`;
      }
    } else if (['appendix', 'appendices'].includes(key)) {
      latex += `\\appendices\n\\section*{Appendix}\n${content}\n\n`;
    } else if (['acknowledgment', 'acknowledgments'].includes(key)) {
      latex += `\\section*{Acknowledgment}\n${content}\n\n`;
    } else {
      latex += `\\section{${sectionName}}\n${content}\n\n`;
    }
  }

  latex += "\\bibliographystyle{IEEEtran}\n\\bibliography{references}\n\\end{document}\n";
  return latex;
};

const generate_mdpi_latex = (title, authors, abstract, keywords, sections, journal_meta = {}) => {
  const journal_name = journal_meta.journal_id || 'journal';
  let latex = `\\documentclass[${journal_name},article,submit,pdftex,moreauthors]{Definitions/mdpi}\n`;
  latex += `
\\firstpage{1} 
\\makeatletter 
\\setcounter{page}{\\@firstpage} 
\\makeatother
`;
  latex += `\\pubvolume{${journal_meta.volume || '1'}}\n\\issuenum{${journal_meta.issue || '1'}}\n`;
  latex += `\\pubyear{${journal_meta.year || '2026'}}\n\\copyrightyear{${journal_meta.year || '2026'}}\n`;
  latex += `\\Title{${title}}\n`;

  const org_map = {};
  let org_counter = 1;
  const author_latex_list = [];

  authors.forEach(author => {
    const org = author.organization;
    if (!org_map[org]) {
      org_map[org] = org_counter;
      org_counter++;
    }
    const aff_id = org_map[org];
    const star = author.is_corresponding ? "*" : "";
    author_latex_list.push(`${author.name} $^{${aff_id}}${star}`);
  });

  latex += `\\Author{${author_latex_list.join(", ")}}\n`;
  const authorNames = authors.map(a => a.name).join(", ");
  latex += `\\AuthorNames{${authorNames}}\n`;

  let address_lines = [];
  for (const [org, aff_id] of Object.entries(org_map)) {
    address_lines.push(`$^{${aff_id}}$ \\quad ${org}`);
  }
  latex += `\\address{%\n${address_lines.join("\\\\ \n")}}\n`;

  const corr = authors.find(a => a.is_corresponding);
  const corr_email = corr ? corr.email : "email@example.com";
  latex += `\\corres{Correspondence: ${corr_email}}\n`;
  latex += `\\abstract{${abstract}}\n`;
  latex += `\\keyword{${keywords}}\n`;
  latex += "\\begin{document}\n";

  const mdpi_special = {
    'author contributions': '\\authorcontributions',
    'funding': '\\funding',
    'institutional review board statement': '\\institutionalreview',
    'informed consent statement': '\\informedconsent',
    'data availability statement': '\\dataavailability',
    'acknowledgments': '\\acknowledgments',
    'conflicts of interest': '\\conflictsofinterest'
  };

  for (const [sectionName, content] of Object.entries(sections)) {
    const key = sectionName.toLowerCase().trim();
    if (mdpi_special[key]) {
      latex += `${mdpi_special[key]}{${content}}\n\n`;
    } else if (key === 'abbreviations') {
      latex += `\\abbreviations{Abbreviations}{\n${content}\n}\n\n`;
    } else if (key === 'appendix') {
      latex += `\\appendixtitles{yes}\n\\appendixstart\n\\appendix\n\\section{}\n${content}\n\n`;
    } else {
      latex += `\\section{${sectionName}}\n${content}\n\n`;
    }
  }

  latex += "\\reftitle{References}\n\\externalbibliography{yes}\n\\bibliography{references}\n\\end{document}\n";
  return latex;
};

const generate_acm_latex = (title, authors, abstract, keywords, sections) => {
  let latex = `
\\documentclass[manuscript,screen,review]{acmart}
\\AtBeginDocument{%
  \\providecommand\\BibTeX{{%
    Bib\\TeX}}}
\\setcopyright{acmlicensed}
\\copyrightyear{2026}
\\acmYear{2026}
\\acmDOI{XXXXXXX.XXXXXXX}
\\begin{document}
`;
  latex += `\\title{${title}}\n\n`;

  authors.forEach(author => {
    latex += `\\author{${author.name}}\n\\email{${author.email}}\n`;
    latex += `\\affiliation{\n  \\institution{${author.organization}}\n  \\country{Country}\n}\n\n`;
  });

  if (authors.length > 0) {
    const firstSurname = authors[0].name.split(' ').pop();
    latex += `\\renewcommand{\\shortauthors}{${firstSurname} et al.}\n`;
  }

  latex += `\\begin{abstract}\n${abstract}\n\\end{abstract}\n\n`;
  latex += `
\\begin{CCSXML}
<ccs2012>
 <concept>
  <concept_id>00000000.00000000.00000000</concept_id>
  <concept_desc>Computer systems organization~Architectures</concept_desc>
  <concept_significance>500</concept_significance>
 </concept>
</ccs2012>
\\end{CCSXML}
\\ccsdesc[500]{Computer systems organization~Architectures}
`;
  latex += `\\keywords{${keywords}}\n\n`;
  latex += "\\maketitle\n\n";

  for (const [sectionName, content] of Object.entries(sections)) {
    const key = sectionName.toLowerCase();
    if (['acknowledgments', 'acknowledgements'].includes(key)) {
      latex += `\\begin{acks}\n${content}\n\\end{acks}\n\n`;
    } else if (['appendix', 'appendices'].includes(key)) {
      latex += `\\appendix\n${content}\n\n`;
    } else {
      latex += `\\section{${sectionName}}\n${content}\n\n`;
    }
  }

  latex += "\\bibliographystyle{ACM-Reference-Format}\n\\bibliography{references}\n\\end{document}\n";
  return latex;
};

const generate_cell_press_latex = (title, authors, abstract, keywords, sections) => {
  let latex = `
\\documentclass[12pt,letterpaper]{article}
\\usepackage[a4paper, total={7in, 10in}]{geometry}
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage{graphicx}
\\usepackage{helvet}
\\usepackage{authblk}
\\usepackage{hyperref}
\\usepackage{amsmath} 
\\usepackage{amssymb} 
\\usepackage{orcidlink} 
\\usepackage[super,comma,sort&compress]{natbib}
\\bibliographystyle{numbered}
\\usepackage[right]{lineno} \\linenumbers
\\makeatletter
\\renewcommand{\\maketitle}{\\bgroup\\setlength{\\parindent}{0pt}
\\begin{flushleft}
  \\textbf{\\@title}
  
  \\@author
\\end{flushleft}\\egroup}
\\makeatother
`;
  latex += `\\title{${title}}\n\\date{}\n`;

  const org_map = {};
  let org_counter = 1;
  authors.forEach(author => {
    if (!org_map[author.organization]) {
      org_map[author.organization] = org_counter;
      org_counter++;
    }
  });

  authors.forEach(author => {
    const affils = [org_map[author.organization]];
    if (author.orcid) affils.push(`\\orcidlink{${author.orcid}}`);
    if (author.is_corresponding) affils.push("*");
    latex += `\\author[${affils.join(',')}]{${author.name}}\n`;
  });

  for (const [org, oid] of Object.entries(org_map)) {
    latex += `\\affil[${oid}]{${org}}\n`;
  }

  const corr = authors.find(a => a.is_corresponding);
  const corr_email = corr ? corr.email : "email@example.com";
  latex += `\\affil[*]{Correspondence: ${corr_email}}\n`;

  latex += "\\begin{document}\n\\maketitle\n\n";
  latex += `\\section*{SUMMARY}\n${abstract}\n\n`;
  latex += `\\section*{KEYWORDS}\n${keywords}\n\n`;

  for (const [sectionName, content] of Object.entries(sections)) {
    const header = sectionName.toUpperCase();
    if (header === "RESOURCE AVAILABILITY") {
      latex += `\\section*{${header}}\n\\subsection*{Lead contact}\nRequests to lead contact.\n\\subsection*{Materials availability}\nMaterials available upon request.\n\\subsection*{Data and code availability}\n${content}\n\n`;
    } else {
      latex += `\\section*{${header}}\n${content}\n\n`;
    }
  }

  latex += "\\bibliography{references}\n\\end{document}\n";
  return latex;
};

const generate_acs_latex = (title, authors, abstract, keywords, sections) => {
  let latex = `
\\documentclass[letterpaper]{article}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\geometry{margin=1in}
\\usepackage{setspace}
\\usepackage{graphicx}
\\usepackage{float}
\\usepackage{authblk}
\\usepackage{chemformula}
\\usepackage[version=4]{mhchem}
\\usepackage[style=chem-acs]{biblatex}
\\addbibresource{references.bib}
\\setcounter{secnumdepth}{-1}
\\begin{document}
`;
  latex += `\\title{${title}}\n`;

  const org_map = {};
  let org_counter = 1;
  authors.forEach(author => {
    if (!org_map[author.organization]) {
      org_map[author.organization] = org_counter;
      org_counter++;
    }
  });

  let corr_email = null;
  authors.forEach(author => {
    const affil_id = org_map[author.organization];
    if (author.is_corresponding) corr_email = author.email;
    latex += `\\author[${affil_id}]{${author.name}}\n`;
  });

  for (const [org, affil_id] of Object.entries(org_map)) {
    latex += `\\affil[${affil_id}]{${org}}\n`;
  }

  if (corr_email) latex += `\\date{*Email: ${corr_email}}\n`;
  else latex += "\\date{}\n";

  latex += "\\maketitle\n\n";
  latex += `\\begin{abstract}\n${abstract}\n\\end{abstract}\n\n`;
  if (keywords) latex += `\\section*{Keywords}\n${keywords}\n\n`;

  for (const [sectionName, content] of Object.entries(sections)) {
    const key = sectionName.toLowerCase();
    if (['acknowledgements', 'acknowledgments'].includes(key)) {
      latex += `\\section*{Acknowledgements}\n${content}\n\n`;
    } else if (key === 'supporting information') {
      latex += `\\section*{Supporting information}\n${content}\n\n`;
    } else {
      latex += `\\section{${sectionName}}\n${content}\n\n`;
    }
  }

  latex += "\\printbibliography\n\\end{document}\n";
  return latex;
};

const generate_frontiers_latex = (title, authors, abstract, keywords, sections, running_title = "Article Title") => {
  const org_map = {};
  let org_counter = 1;
  authors.forEach(author => {
    if (!org_map[author.organization]) {
      org_map[author.organization] = org_counter;
      org_counter++;
    }
  });

  const author_list_strs = [];
  let corr_author_name = "";
  let corr_author_email = "";
  
  authors.forEach(author => {
    const aff_id = org_map[author.organization];
    const superscripts = [String(aff_id)];
    if (author.is_corresponding) {
      superscripts.push("*");
      corr_author_name = author.name;
      corr_author_email = author.email;
    }
    author_list_strs.push(`${author.name}\\,^{${superscripts.join(',')}}`);
  });

  let authors_def = author_list_strs[0];
  if (author_list_strs.length > 1) {
    authors_def = author_list_strs.slice(0, -1).join(", ") + " and " + author_list_strs[author_list_strs.length - 1];
  }

  let address_def = "";
  for (const [org, aff_id] of Object.entries(org_map)) {
    address_def += `$^{${aff_id}}${org} \\\\\n`;
  }

  const firstAuthorSurname = authors.length > 0 ? authors[0].name.split(' ').pop() : "Author";

  let latex = `
\\documentclass[utf8]{FrontiersinHarvard}
\\usepackage{url,hyperref,lineno,microtype,subcaption}
\\usepackage[onehalfspacing]{setspace}
\\linenumbers
\\def\\keyFont{\\fontsize{8}{11}\\helveticabold }
`;
  latex += `\\def\\firstAuthorLast{${firstAuthorSurname} {et~al.}}\n`;
  latex += `\\def\\Authors{${authors_def}}\n`;
  latex += `\\def\\Address{${address_def}}\n`;
  latex += `\\def\\corrAuthor{${corr_author_name}}\n`;
  latex += `\\def\\corrEmail{${corr_author_email}}\n`;
  
  latex += `
\\begin{document}
\\onecolumn
\\firstpage{1}
`;
  latex += `\\title[${running_title}]{${title}}\n`;
  latex += "\\author[\\firstAuthorLast ]{\\Authors}\n\\address{}\n\\correspondance{}\n\\extraAuth{}\n\\maketitle\n\n";
  latex += `\\begin{abstract}\n${abstract}\n\n\\tiny\n \\keyFont{ \\section{Keywords:} ${keywords}}\n\\end{abstract}\n\n`;

  const back_matter = ['conflict of interest statement', 'author contributions', 'funding', 'acknowledgments', 'supplemental data', 'data availability statement'];
  
  for (const [sectionName, content] of Object.entries(sections)) {
    if (back_matter.includes(sectionName.toLowerCase())) {
      latex += `\\section*{${sectionName}}\n${content}\n\n`;
    } else {
      latex += `\\section{${sectionName}}\n${content}\n\n`;
    }
  }

  latex += "\\bibliographystyle{Frontiers-Harvard}\n\\bibliography{references}\n\\end{document}\n";
  return latex;
};

const generate_elsarticle_latex = (title, authors, abstract, keywords, sections, journal_meta = {}) => {
  let latex = `
\\documentclass[final,5p,times,twocolumn,authoryear]{elsarticle}
\\usepackage{amssymb}
\\usepackage{amsmath}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{lineno}
`;
  latex += `\\journal{${journal_meta.journal_name || 'Journal Name'}}\n`;
  latex += "\\begin{document}\n\\begin{frontmatter}\n";
  latex += `\\title{${title}}\n`;

  const org_map = {};
  let org_counter = 1;
  authors.forEach(author => {
    if (!org_map[author.organization]) {
      org_map[author.organization] = `aff${org_counter}`;
      org_counter++;
    }
  });

  authors.forEach(author => {
    latex += `\\author[${org_map[author.organization]}]{${author.name}}\n`;
  });

  for (const [org, label] of Object.entries(org_map)) {
    latex += `\\affiliation[${label}]{organization={${org}}}\n`;
  }

  latex += `\\begin{abstract}\n${abstract}\n\\end{abstract}\n\n`;
  if (keywords) {
    latex += `\\begin{keyword}\n${keywords.replace(/,/g, ' \\sep')}\n\\end{keyword}\n`;
  }
  latex += "\\end{frontmatter}\n\n";

  for (const [sectionName, content] of Object.entries(sections)) {
    const key = sectionName.toLowerCase();
    if (['appendix', 'appendices'].includes(key)) {
      latex += `\\appendix\n${content}\n\n`;
    } else if (['acknowledgments', 'acknowledgements'].includes(key)) {
      latex += `\\section*{Acknowledgments}\n${content}\n\n`;
    } else {
      latex += `\\section{${sectionName}}\n${content}\n\n`;
    }
  }

  latex += "\\bibliographystyle{elsarticle-harv}\n\\bibliography{references}\n\\end{document}\n";
  return latex;
};

const generate_ajp_latex = (title, authors, abstract, sections) => {
  let latex = `
\\documentclass[prb,preprint,letterpaper,noeprint,longbibliography,nodoi,footinbib]{revtex4-1}
\\usepackage[colorlinks, allcolors=blue]{hyperref}
\\bibliographystyle{AJP}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{graphicx}
\\begin{document}
`;
  latex += `\\title{${title}}\n`;
  
  authors.forEach(author => {
    latex += `\\author{${author.name}}\n`;
    if (author.email) latex += `\\email{${author.email}}\n`;
    latex += `\\affiliation{${author.organization}}\n`;
  });

  latex += `\\date{\\today}\n`;
  latex += `\\begin{abstract}\n${abstract}\n\\end{abstract}\n\n`;
  latex += "\\maketitle\n\n";

  for (const [sectionName, content] of Object.entries(sections)) {
    const key = sectionName.toLowerCase();
    if (['acknowledgments', 'acknowledgements'].includes(key)) {
      latex += `\\begin{acknowledgments}\n${content}\n\\end{acknowledgments}\n\n`;
    } else if (['appendix', 'appendices'].includes(key)) {
      latex += `\\appendix*\n\\section{}\n${content}\n\n`;
    } else {
      latex += `\\section{${sectionName}}\n${content}\n\n`;
    }
  }

  latex += "\\bibliography{AJPTemplate}\n\\end{document}\n";
  return latex;
};

const generate_aip_latex = (title, authors, abstract, keywords, sections) => {
  // Uses RevTeX structure, similar to AJP
  return generate_ajp_latex(title, authors, abstract, sections);
};

const generate_science_latex = (title, authors, abstract, keywords, sections) => {
  let latex = `
\\documentclass[12pt]{article}
\\usepackage{newtxtext,newtxmath}
\\usepackage{graphicx}
\\usepackage[letterpaper,margin=1in]{geometry}
\\linespread{1.5}
\\frenchspacing
\\usepackage{scicite}
\\usepackage{url}
\\renewenvironment{abstract}{\\quotation}{\\endquotation}
\\date{}
\\renewcommand\\refname{References and Notes}
\\def\\scititle{${title}}
\\title{\\bfseries \\boldmath \\scititle}
`;
  const org_map = {};
  let org_counter = 1;
  authors.forEach(author => {
    if (!org_map[author.organization]) {
      org_map[author.organization] = org_counter;
      org_counter++;
    }
  });

  const author_names = [];
  authors.forEach(author => {
    const aff_id = org_map[author.organization];
    const superscripts = [String(aff_id)];
    if (author.is_corresponding) superscripts.push("\\ast");
    author_names.push(`${author.name}^{${superscripts.join(',')}}`);
  });

  const affil_lines = [];
  for (const [org, aff_id] of Object.entries(org_map)) {
    affil_lines.push(`\\small^{${aff_id}}${org}.`);
  }

  latex += "\\author{\n" + author_names.join(", ") + "\\and\n" + affil_lines.join("\\and\n") + "\n}\n";
  latex += "\\begin{document}\n\\maketitle\n";
  latex += `\\begin{abstract} \\bfseries \\boldmath\n${abstract}\n\\end{abstract}\n\n`;

  let supp_content = null;
  for (const [sectionName, content] of Object.entries(sections)) {
    const key = sectionName.toLowerCase().trim();
    if (key === 'introduction') {
      latex += `\\noindent\n${content}\n\n`;
    } else if (key === 'acknowledgments') {
      latex += `\\section*{Acknowledgments}\n${content}\n\n`;
    } else if (['supplementary materials', 'supplementary text'].includes(key)) {
      supp_content = content;
    } else {
      latex += `\\subsection*{${sectionName}}\n${content}\n\n`;
    }
  }

  latex += "\\bibliographystyle{sciencemag}\n\\bibliography{references}\n";

  if (supp_content) {
    latex += `
\\newpage
\\begin{center}
\\section*{Supplementary Materials for\\\\ \\scititle}
\\end{center}
`;
    latex += `${supp_content}\n`;
  }

  latex += "\\end{document}\n";
  return latex;
};

const generate_rsc_latex = (title, authors, abstract, keywords, sections) => {
  let latex = `
\\documentclass[twoside,twocolumn,9pt]{article}
\\usepackage{extsizes}
\\usepackage[super,sort&compress,comma]{natbib} 
\\usepackage[version=3]{mhchem}
\\usepackage[left=1.5cm, right=1.5cm, top=1.785cm, bottom=2.0cm]{geometry}
\\usepackage{balance}
\\usepackage{mathptmx}
\\usepackage{sectsty}
\\usepackage{graphicx} 
\\usepackage{lastpage}
\\usepackage[format=plain,justification=justified,singlelinecheck=false,font={stretch=1.125,small,sf},labelfont=bf,labelsep=space]{caption}
\\usepackage{float}
\\usepackage{fancyhdr}
\\usepackage{fnpos}
\\usepackage[english]{babel}
\\addto{\\captionsenglish}{\\renewcommand{\\refname}{Notes and references}}
\\usepackage{array}
\\usepackage{droidsans}
\\usepackage{charter}
\\usepackage[T1]{fontenc}
\\usepackage[usenames,dvipsnames]{xcolor}
\\usepackage{setspace}
\\usepackage[compact]{titlesec}
\\usepackage{hyperref}
\\usepackage{epstopdf}
\\definecolor{cream}{RGB}{222,217,201}
\\begin{document}
\\pagestyle{fancy}
\\thispagestyle{plain}
\\fancypagestyle{plain}{\\renewcommand{\\headrulewidth}{0pt}}
\\makeFNbottom
\\makeatletter
\\renewcommand\\LARGE{\\@setfontsize\\LARGE{15pt}{17}}
\\renewcommand\\Large{\\@setfontsize\\Large{12pt}{14}}
\\renewcommand\\large{\\@setfontsize\\large{10pt}{12}}
\\renewcommand\\footnotesize{\\@setfontsize\\footnotesize{7pt}{10}}
\\makeatother
\\renewcommand{\\thefootnote}{\\fnsymbol{footnote}}
\\renewcommand\\footnoterule{\\vspace*{1pt} \\color{cream}\\hrule width 3.5in height 0.4pt \\color{black}\\vspace*{5pt}} 
\\setcounter{secnumdepth}{5}
\\makeatletter 
\\renewcommand\\@biblabel[1]{#1}            
\\renewcommand\\@makefntext[1]{\\noindent\\makebox[0pt][r]{\\@thefnmark\\,}#1}
\\makeatother 
\\renewcommand{\\figurename}{\\small{Fig.}~}
\\sectionfont{\\sffamily\\Large}
\\subsectionfont{\\normalsize}
\\subsubsectionfont{\\bf}
\\setstretch{1.125}
\\setlength{\\skip\\footins}{0.8cm}
\\setlength{\\footnotesep}{0.25cm}
\\setlength{\\jot}{10pt}
\\titlespacing*{\\section}{0pt}{4pt}{4pt}
\\titlespacing*{\\subsection}{0pt}{15pt}{1pt}
\\fancyfoot{}
\\fancyfoot[RO]{\\footnotesize{\\sffamily{1--\\pageref{LastPage} ~\\textbar  \\hspace{2pt}\\thepage}}}
\\fancyfoot[LE]{\\footnotesize{\\sffamily{\\thepage~\\textbar\\hspace{3.45cm} 1--\\pageref{LastPage}}}}
\\fancyhead{}
\\renewcommand{\\headrulewidth}{0pt} 
\\renewcommand{\\footrulewidth}{0pt}
\\setlength{\\arrayrulewidth}{1pt}
\\setlength{\\columnsep}{6.5mm}
\\setlength\\bibsep{1pt}
\\makeatletter 
\\newlength{\\figrulesep} 
\\setlength{\\figrulesep}{0.5\\textfloatsep} 
\\newcommand{\\topfigrule}{\\vspace*{-1pt} \\noindent{\\color{cream}\\rule[-\\figrulesep]{\\columnwidth}{1.5pt}} }
\\newcommand{\\botfigrule}{\\vspace*{-2pt} \\noindent{\\color{cream}\\rule[\\figrulesep]{\\columnwidth}{1.5pt}} }
\\newcommand{\\dblfigrule}{\\vspace*{-1pt} \\noindent{\\color{cream}\\rule[-\\figrulesep]{\\textwidth}{1.5pt}} }
\\makeatother
`;

  const author_latex_list = [];
  const org_map = {};
  let org_counter = 97; // 'a' ASCII

  authors.forEach(author => {
    const org = author.organization;
    if (!org_map[org]) {
      org_map[org] = String.fromCharCode(org_counter);
      org_counter++;
    }
    const aff_char = org_map[org];
    const star = author.is_corresponding ? "$^{\\ast}$" : "";
    author_latex_list.push(`${author.name},${star}\\textit{$^{${aff_char}}$}`);
  });

  const author_block = author_latex_list.join(", ");

  latex += `
\\twocolumn[
  \\begin{@twocolumnfalse}
\\vspace{1em}
\\sffamily
\\begin{tabular}{m{4.5cm} p{13.5cm} }
 & \\noindent\\LARGE{\\textbf{${title}$^\\dag$}} \\\\
\\vspace{0.3cm} & \\vspace{0.3cm} \\\\
 & \\noindent\\large{${author_block}} \\\\
 & \\noindent\\normalsize{${abstract}} \\\\
\\end{tabular}
 \\end{@twocolumnfalse} \\vspace{0.6cm}
  ]
\\renewcommand*\\rmdefault{bch}\\normalfont\\upshape
\\rmfamily
\\section*{}
\\vspace{-1cm}
`;

  for (const [org, char] of Object.entries(org_map)) {
    latex += `\\footnotetext{\\textit{$^{${char}}$~${org}}}\n`;
  }

  const special_sections = ['conclusions', 'author contributions', 'conflicts of interest', 'data availability', 'acknowledgements', 'acknowledgments'];
  for (const [sectionName, content] of Object.entries(sections)) {
    if (special_sections.includes(sectionName.toLowerCase())) {
      latex += `\\section*{${sectionName}}\n${content}\n\n`;
    } else {
      latex += `\\section{${sectionName}}\n${content}\n\n`;
    }
  }

  latex += "\\balance\n\\bibliography{rsc}\n\\bibliographystyle{rsc}\n\\end{document}\n";
  return latex;
};

const generate_asm_latex = (title, authors, abstract, keywords, sections) => {
  let latex = `
\\documentclass{asmarticle}
\\usepackage{url}
\\usepackage{graphicx}
\\usepackage[sort&compress]{natbib}
\\begin{document}
`;
  latex += `\\title{${title}}\n`;

  const org_map = {};
  const org_list = [];
  const author_parts = [];
  let corr_address = "";

  authors.forEach(author => {
    const org = author.organization;
    if (!org_map[org]) {
      org_map[org] = org_list.length + 1;
      org_list.push(org);
    }
    const idx = org_map[org];
    let marker = String(idx);
    if (author.is_corresponding) {
      marker += "*";
      corr_address = `\\corraddress{Address correspondence to ${author.name}, ${author.email}.}`;
    }
    author_parts.push(`${author.name}\\afn{${marker}}`);
  });

  latex += "\\author{" + author_parts.join(", ") + "}\n\n";
  org_list.forEach(org => {
    latex += `\\affil{${org}}\n`;
  });
  latex += `${corr_address}\n\\maketitle\n\n`;

  latex += `\\begin{abstract}\n${abstract}\n`;
  if (sections['Importance']) {
    latex += `\\begin{importance}\n${sections['Importance']}\n\\end{importance}\n`;
    delete sections['Importance'];
  }
  latex += "\\end{abstract}\n\n";

  const special_envs = {
    'acknowledgments': 'acknowledgments', 'funding': 'funding', 
    'conflicts of interest': 'conflictsinterest', 'author biographies': 'authorbios'
  };

  for (const [sectionName, content] of Object.entries(sections)) {
    const key = sectionName.toLowerCase().trim();
    if (special_envs[key]) {
      const env = special_envs[key];
      latex += `\\begin{${env}}\n\\section{${sectionName.toUpperCase()}}\n${content}\n\\end{${env}}\n\n`;
    } else {
      latex += `\\section{${sectionName.toUpperCase()}}\n${content}\n\n`;
    }
  }

  latex += "\\bibliographystyle{asm}\n\\bibliography{references}\n\\end{document}\n";
  return latex;
};

const generate_asme_latex = (title, authors, abstract, keywords, sections) => {
  let latex = `
\\documentclass[subscriptcorrection,upint,varvw,barcolor=Goldenrod3,mathalfa=cal=euler,balance,hyphenate,pdf-a]{asmejour}
\\hypersetup{pdfauthor={ASME Author},pdftitle={ASME Journal Paper},pdfkeywords={ASME, Journal, Template}}
`;
  latex += "\\JourName{Heat Transfer}\n\\begin{document}\n";

  authors.forEach(author => {
    let name_str = author.name;
    if (author.is_corresponding) name_str += "\\CorrespondingAuthor";
    const affiliation_str = `${author.organization}\\\\\nemail: ${author.email}`;
    latex += `\\SetAuthorBlock{${name_str}}{${affiliation_str}}\n`;
  });

  latex += `\\title{${title}}\n`;
  if (keywords) latex += `\\keywords{${keywords}}\n`;
  latex += `\\begin{abstract}\n${abstract}\n\\end{abstract}\n\n`;
  latex += "\\date{\\today}\n\\maketitle\n";

  for (const [sectionName, content] of Object.entries(sections)) {
    const key = sectionName.toLowerCase();
    if (key === 'nomenclature') {
      latex += `\\begin{nomenclature}\n${content}\n\\end{nomenclature}\n\n`;
    } else if (['acknowledgment', 'funding data'].includes(key)) {
      latex += `\\section*{${sectionName}}\n${content}\n\n`;
    } else if (['appendix', 'appendices'].includes(key)) {
      latex += `\\appendix\n${content}\n\n`;
    } else {
      latex += `\\section{${sectionName}}\n${content}\n\n`;
    }
  }

  latex += "\\bibliographystyle{asmejour}\n\\bibliography{references}\n\\end{document}";
  return latex;
};

const generate_ams_tran_latex = (title, authors, abstract, sections, journal_meta = {}) => {
  let latex = `
\\documentclass{tran-l}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage[cmtip,all]{xy}
\\newtheorem{theorem}{Theorem}[section]
\\newtheorem{lemma}[theorem]{Lemma}
\\theoremstyle{definition}
\\newtheorem{definition}[theorem]{Definition}
\\newtheorem{example}[theorem]{Example}
\\newtheorem{xca}[theorem]{Exercise}
\\theoremstyle{remark}
\\newtheorem{remark}[theorem]{Remark}
\\numberwithin{equation}{section}
\\begin{document}
`;
  latex += `\\title{${title}}\n`;

  authors.forEach(author => {
    latex += `\\author{${author.name}}\n`;
    if (author.organization) latex += `\\address{${author.organization}}\n`;
    if (author.email) latex += `\\email{${author.email}}\n`;
    latex += "\n";
  });

  const subj_class = journal_meta.subj_class || 'Primary 54C40, 14E20; Secondary 46E25, 20C20';
  latex += `\\subjclass[2010]{${subj_class}}\n\\date{\\today}\n`;
  latex += `\\begin{abstract}\n${abstract}\n\\end{abstract}\n\n`;
  latex += "\\maketitle\n\n";

  for (const [sectionName, content] of Object.entries(sections)) {
    latex += `\\section{${sectionName}}\n${content}\n\n`;
  }

  latex += "\\bibliographystyle{amsplain}\n\\bibliography{references}\n\\end{document}\n";
  return latex;
};

const generate_ios_press_latex = (title, authors, abstract, keywords, sections) => {
  let latex = `\\documentclass{IOS-Book-Article}
\\usepackage{mathptmx}
\\usepackage{graphicx}
\\begin{document}
\\begin{frontmatter}
`;
  latex += `\\title{${title}}\n\\runningtitle{${title.substring(0, 50)}...}\n`;

  const org_map = {};
  const org_keys = [];
  authors.forEach(author => {
    if (!org_map[author.organization]) {
      const key = String.fromCharCode(65 + org_keys.length); // 'A'
      org_map[author.organization] = key;
      org_keys.push(author.organization);
    }
  });

  const author_latex_list = [];
  authors.forEach(author => {
    const key = org_map[author.organization];
    const parts = author.name.split(' ');
    const snm = parts.pop();
    const fnms = parts.join(' ');
    
    let entry = `\\author[${key}]{\\fnms{${fnms}} \\snm{${snm}}`;
    if (author.is_corresponding) {
      entry += `\\thanks{Corresponding Author: ${author.name}, ${author.organization}; E-mail: ${author.email}.}`;
    }
    entry += "}";
    author_latex_list.push(entry);
  });

  let authors_str = author_latex_list[0];
  if (author_latex_list.length > 1) {
    authors_str = author_latex_list.slice(0, -1).join(", ") + "\nand\n" + author_latex_list[author_latex_list.length - 1];
  }

  latex += `${authors_str}\n\n`;
  const firstSurname = authors.length > 0 ? authors[0].name.split(' ').pop() : "Author";
  latex += `\\runningauthor{${firstSurname} et al.}\n`;

  org_keys.forEach(org => {
    latex += `\\address[${org_map[org]}]{${org}}\n`;
  });

  latex += `\\begin{abstract}\n${abstract}\n\\end{abstract}\n`;
  if (keywords) {
    latex += `\\begin{keyword}\n${keywords.replace(/,/g, '\\sep')}\n\\end{keyword}\n`;
  }
  latex += "\\end{frontmatter}\n\\thispagestyle{empty}\n\\pagestyle{empty}\n";

  for (const [sectionName, content] of Object.entries(sections)) {
    latex += `\\section{${sectionName}}\n${content}\n\n`;
  }

  latex += "\\bibliographystyle{vancouver}\n\\bibliography{references}\n\\end{document}\n";
  return latex;
};

const generate_spie_latex = (title, authors, abstract, keywords, sections) => {
  let latex = `
\\documentclass[12pt]{spieman}
\\usepackage{amsmath,amsfonts,amssymb}
\\usepackage{graphicx}
\\usepackage{setspace}
\\usepackage{tocloft}
\\usepackage{lineno}
\\linenumbers
\\renewcommand{\\cftdotsep}{\\cftnodots}
\\cftpagenumbersoff{figure}
\\cftpagenumbersoff{table} 
\\begin{document} 
`;
  latex += `\\title{${title}}\n`;

  const org_map = {};
  const org_keys = [];
  authors.forEach(author => {
    if (!org_map[author.organization]) {
      const key = String.fromCharCode(97 + org_keys.length); // 'a'
      org_map[author.organization] = key;
      org_keys.push(author.organization);
    }
  });

  let corr_author_name = "";
  let corr_author_email = "";

  authors.forEach(author => {
    const key = org_map[author.organization];
    let affil_marker = key;
    if (author.is_corresponding) {
      affil_marker += ",*";
      corr_author_name = author.name;
      corr_author_email = author.email;
    }
    latex += `\\author[${affil_marker}]{${author.name}}\n`;
  });

  org_keys.forEach(org => {
    latex += `\\affil[${org_map[org]}]{${org}}\n`;
  });

  latex += "\\maketitle\n\n";
  latex += `\\begin{abstract}\n${abstract}\n\\end{abstract}\n\n`;
  latex += `\\keywords{${keywords}}\n\n`;
  if (corr_author_name) {
    latex += `{\\noindent \\footnotesize\\textbf{*}${corr_author_name},  \\linkable{${corr_author_email}} }\n\n`;
  }
  latex += "\\begin{spacing}{2}\n";

  const unnumbered = ['disclosures', 'acknowledgments', 'acknowledgements', 'code, data, and materials availability', 'data availability'];
  
  for (const [sectionName, content] of Object.entries(sections)) {
    const key = sectionName.toLowerCase().trim();
    if (key === 'biographies') {
      latex += `\\vspace{2ex}\\noindent ${content}\n\n`;
    } else if (unnumbered.includes(key)) {
      latex += `\\subsection*{${sectionName}}\n${content}\n\n`;
    } else if (['appendix', 'appendices'].includes(key)) {
      latex += `\\appendix\n\\section{}\n${content}\n\n`;
    } else {
      latex += `\\section{${sectionName}}\n${content}\n\n`;
    }
  }

  latex += "\\bibliographystyle{spiejour}\n\\bibliography{report}\n\\listoffigures\n\\listoftables\n\\end{spacing}\n\\end{document}\n";
  return latex;
};
const generate_mla_latex = (title, authors, abstract, keywords, sections, course_info = {}) => {
  // 1. PREAMBLE
  let latex = `
\\documentclass{article}
\\usepackage{mla13}
\\usepackage{graphicx}
\\usepackage{lipsum} 
`;

  // 2. METADATA
  // Extract first author details (MLA usually focuses on the student/single author context)
  const firstAuthor = authors.length > 0 ? authors[0] : { name: 'Author Name' };
  const nameParts = firstAuthor.name.split(' ');
  const firstname = nameParts.length > 0 ? nameParts[0] : "";
  const lastname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : "";

  latex += `\\title{${title}}\n`;
  latex += `\\firstname{${firstname}}\n`;
  latex += `\\lastname{${lastname}}\n`;

  // Course / Professor Info (defaults if missing)
  const professor = course_info.professor || 'Professor Name';
  const course_name = course_info.course_name || 'Class Name';

  latex += `\\professor{${professor}}\n`;
  latex += `\\class{${course_name}}\n`;

  // Define bibliography file
  latex += "\\sources{references.bib}\n";

  latex += `
\\begin{document}
% Title Page
\\maketitlepage
\\newpage

% Table of Contents
\\tableofcontents
\\newpage
`;

  // 3. ABSTRACT (Optional in MLA, but included if provided)
  if (abstract && abstract.trim() !== "") {
      latex += `\\begin{abstract}\n${abstract}\n\\end{abstract}\n\\newpage\n`;
  }

  // 4. MAIN CONTENT START
  latex += "\\makeheader\n"; // Adds MLA header (Surname Page#)
  latex += "\\maketitle\n\n"; // Adds Title block on first page of text

  // 5. SECTIONS LOOP
  for (const [sectionName, content] of Object.entries(sections)) {
      // Skip 'Works Cited' if it's passed as a section, handled by command
      if (sectionName.toLowerCase() === 'works cited') {
          continue;
      }
      latex += `\\section{${sectionName}}\n${content}\n\n`;
  }

  // 6. WORKS CITED
  latex += "\\newpage\n";
  latex += "\\makeworkscited\n";

  latex += "\\end{document}\n";

  return latex;
};

const generate_blank_latex = (title, authors, abstract, keywords, sections) => {
  const authorName = authors.length > 0 ? authors[0].name : "Author";
  return `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{graphicx}

\\title{${title}}
\\author{${authorName}}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
${abstract}
\\end{abstract}

${Object.entries(sections).map(([name, content]) => `\\section{${name}}\n${content}`).join("\n\n")}

\\end{document}`;
};

// --- 3. MAIN EXPORT ---
export const RENDERERS = {
  "ai4x": generate_ai4x_latex,
  "springer_nature": generate_springer_latex,
  "ieee_transmag": generate_transmag_latex,
  "ieee_tmi": generate_tmi_latex,
  "ieee_journal": generate_ieee_journal_latex,
  "ieee_tns": generate_tns_latex,
  "ieee_journal_letters": generate_ieee_journal_letters_latex,
  "mdpi": generate_mdpi_latex,
  "acm_manuscript": generate_acm_latex,
  "cell_press": generate_cell_press_latex,
  "acs": generate_acs_latex,
  "frontiers": generate_frontiers_latex,
  "elsarticle": generate_elsarticle_latex,
  "ajp": generate_ajp_latex,
  "aip": generate_aip_latex,
  "science": generate_science_latex,
  "rsc": generate_rsc_latex,
  "asm_journal": generate_asm_latex,
  "asme": generate_asme_latex,
  "ams_tran": generate_ams_tran_latex,
  "ios_book_article": generate_ios_press_latex,
  "spie_journal": generate_spie_latex,
  "ieee": generate_ieee_journal_latex,
  "mla": generate_mla_latex,
  "blank": generate_blank_latex,
  "article": generate_blank_latex
};

export const getSkeletonContent = (templateType) => {
  const sectionsList = TEMPLATE_REGISTRY[templateType] || ["Introduction", "Methodology", "Results", "Conclusion"];
  const sections = {};
  
  sectionsList.forEach(sec => {
    sections[sec] = `% Insert ${sec} content here...`;
  });

  return {
    abstract: "% Abstract goes here...",
    keywords: "Keyword 1, Keyword 2, Keyword 3",
    sections: sections
  };
};