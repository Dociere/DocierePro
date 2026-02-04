/**
 * LaTeX Monarch Language Definition for Monaco Editor
 * Provides syntax highlighting similar to Overleaf
 * Only colors LaTeX syntax - user text content stays black
 */

export const latexLanguageConfig = {
  comments: {
    lineComment: '%',
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '$', close: '$' },
    { open: '`', close: "'" },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '$', close: '$' },
    { open: '`', close: "'" },
  ],
};

export const latexMonarchTokens = {
  defaultToken: '',
  tokenPostfix: '.latex',

  tokenizer: {
    root: [
      // Comments - green italic
      [/%.*$/, 'comment'],

      // Math mode - display math $$...$$
      [/\$\$/, { token: 'string.math', next: '@displayMath' }],

      // Math mode - inline math $...$
      [/\$/, { token: 'string.math', next: '@inlineMath' }],

      // Math mode - \[...\] display
      [/\\\[/, { token: 'string.math', next: '@displayMathBracket' }],

      // Math mode - \(...\) inline
      [/\\\(/, { token: 'string.math', next: '@inlineMathParen' }],

      // Begin/End environment - purple bold, then capture environment name
      [/\\begin(?=\s*\{)/, { token: 'keyword.control', next: '@envName' }],
      [/\\end(?=\s*\{)/, { token: 'keyword.control', next: '@envName' }],

      // Section commands with title - blue bold command, black title
      [/\\(section|subsection|subsubsection|paragraph|chapter|part)\*?/, 'keyword.section'],

      // Document structure commands - brown
      [/\\(documentclass|usepackage|RequirePackage|input|include)/, 'keyword.structure'],

      // Formatting commands - blue
      [/\\(textbf|textit|texttt|emph|underline|textrm|textsf|textsc|textup|textsl)/, 'keyword.format'],

      // Reference/citation commands - teal
      [/\\(cite|ref|label|pageref|eqref|autoref|hyperref|url|href)/, 'keyword.reference'],

      // Important structure commands
      [/\\(title|author|date|thanks|maketitle|tableofcontents|bibliography|bibliographystyle)/, 'keyword.structure'],

      // Table/figure commands
      [/\\(caption|centering|includegraphics|hline|cline|multicolumn|multirow|toprule|midrule|bottomrule)/, 'keyword'],

      // Spacing and layout commands
      [/\\(vspace|hspace|quad|qquad|newpage|clearpage|pagebreak|linebreak|noindent|par|newline)/, 'keyword'],

      // List items
      [/\\item/, 'keyword'],

      // Double backslash (line break in tables/align) - must come before generic command
      [/\\\\/, 'operator.linebreak'],

      // Any other backslash command - blue
      [/\\[a-zA-Z@]+\*?/, 'keyword'],

      // Escaped special characters - red
      [/\\[{}$&#%_^~]/, 'constant.character.escape'],
      [/\\[,;!]/, 'constant.character.escape'],

      // Curly braces - just delimiters, content stays black
      [/[{}]/, 'delimiter.curly'],

      // Square brackets
      [/[\[\]]/, 'delimiter.square'],

      // Ampersand (table column separator) - purple bold
      [/&/, 'operator.table'],

      // Tilde (non-breaking space)
      [/~/, 'constant.character'],

      // Everything else stays default (black)
    ],

    // State for capturing environment name after \begin or \end
    envName: [
      [/\s+/, ''], // skip whitespace
      [/\{/, 'delimiter.curly'],
      [/[a-zA-Z*]+/, 'type.environment'],
      [/\}/, { token: 'delimiter.curly', next: '@pop' }],
    ],

    // Math modes - content inside math is purple
    inlineMath: [
      [/\$/, { token: 'string.math', next: '@pop' }],
      [/\\[a-zA-Z]+/, 'keyword.math'],
      [/[^$\\]+/, 'string.math'],
      [/\\[{}$&#%_^~\\]/, 'string.math'],
    ],

    displayMath: [
      [/\$\$/, { token: 'string.math', next: '@pop' }],
      [/\\[a-zA-Z]+/, 'keyword.math'],
      [/[^$\\]+/, 'string.math'],
      [/\\[{}$&#%_^~\\]/, 'string.math'],
    ],

    displayMathBracket: [
      [/\\\]/, { token: 'string.math', next: '@pop' }],
      [/\\[a-zA-Z]+/, 'keyword.math'],
      [/[^\\\]]+/, 'string.math'],
      [/\\[{}$&#%_^~\\]/, 'string.math'],
    ],

    inlineMathParen: [
      [/\\\)/, { token: 'string.math', next: '@pop' }],
      [/\\[a-zA-Z]+/, 'keyword.math'],
      [/[^\\)]+/, 'string.math'],
      [/\\[{}$&#%_^~\\]/, 'string.math'],
    ],
  },
};

/**
 * LaTeX theme rules for Monaco Editor
 * Colors similar to Overleaf's color scheme
 * Only syntax is colored - text content stays black
 */
export const latexThemeRules = [
  // Comments - green italic
  { token: 'comment', foreground: '408000', fontStyle: 'italic' },

  // Keywords/Commands - blue
  { token: 'keyword', foreground: '0000FF' },
  { token: 'keyword.control', foreground: 'AF00DB', fontStyle: 'bold' }, // \begin, \end
  { token: 'keyword.section', foreground: '0070C1', fontStyle: 'bold' }, // \section, etc.
  { token: 'keyword.structure', foreground: '795E26' }, // \documentclass, \usepackage
  { token: 'keyword.format', foreground: '0000FF' }, // \textbf, etc.
  { token: 'keyword.reference', foreground: '098658' }, // \cite, \ref
  { token: 'keyword.math', foreground: '0000FF' }, // Commands in math mode

  // Environment names - teal bold
  { token: 'type.environment', foreground: '267F99', fontStyle: 'bold' },

  // Math mode content - purple
  { token: 'string.math', foreground: 'AF00DB' },

  // Delimiters - dark gray (subtle)
  { token: 'delimiter.curly', foreground: '666666' },
  { token: 'delimiter.square', foreground: '666666' },

  // Special characters and escapes
  { token: 'constant.character.escape', foreground: 'EE0000' },
  { token: 'constant.character', foreground: '666666' },

  // Operators
  { token: 'operator.table', foreground: 'AF00DB', fontStyle: 'bold' }, // &
  { token: 'operator.linebreak', foreground: 'AF00DB' }, // \\
];

/**
 * Register LaTeX language and theme with Monaco
 */
export function registerLatexLanguage(monaco) {
  const languages = monaco.languages.getLanguages();
  const latexExists = languages.some(lang => lang.id === 'latex');
  
  if (!latexExists) {
    monaco.languages.register({ id: 'latex', extensions: ['.tex', '.sty', '.cls', '.bib'] });
  }

  monaco.languages.setLanguageConfiguration('latex', latexLanguageConfig);
  monaco.languages.setMonarchTokensProvider('latex', latexMonarchTokens);
}

/**
 * Define a custom theme with LaTeX syntax colors
 */
export function defineLatexTheme(monaco) {
  monaco.editor.defineTheme('latex-light', {
    base: 'vs',
    inherit: true,
    rules: latexThemeRules,
    colors: {
      'editorLineNumber.foreground': '#888888',
      'editorLineNumber.activeForeground': '#000000',
      'editor.background': '#FFFFFF',
      'editor.foreground': '#000000',
    },
  });
}
