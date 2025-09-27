import React, { useState, useEffect } from "react";
import { TbX, TbCopy, TbSearch, TbPlayerPlay, TbDeviceFloppy, TbFolder } from "react-icons/tb";

const API_BASE_URL = 'http://localhost:3001'

// Utility to wrap placeholder parts
const wrapPlaceholder = (latex) =>
  latex.replace(/⟨([^⟩]+)⟩/g, "‹$1›"); // visually highlight placeholders

const EasyMathInput = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState("editor");
  const [latexCode, setLatexCode] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);
  const [savedEquations, setSavedEquations] = useState([]);
  const [savedEquationSearch, setSavedEquationSearch] = useState("");
  const [selectedSavedEquation, setSelectedSavedEquation] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFileName, setSaveFileName] = useState("");

  // Load saved equations on component mount
  useEffect(() => {
    loadSavedEquations();
  }, []);

  const loadSavedEquations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/equations/list`);
      if (response.ok) {
        const equations = await response.json();
        setSavedEquations(equations);
      }
    } catch (error) {
      console.error('Failed to load saved equations:', error);
    }
  };

// LaTeX compilation function
const compileLatex = async (latex, isTemp = true, fileName = 'temp') => {
    setIsCompiling(true);
    try {
        console.log('Compiling LaTeX:', { latex: latex.substring(0, 100) + '...', isTemp, fileName });
        
        // Clean the latex code (remove placeholder markers)
        const cleanLatex = latex.replace(/[‹›]/g, "");
        
        // Request image format for better preview
        const response = await fetch(`${API_BASE_URL}/api/latex/compile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                latex: cleanLatex,
                isTemp,
                fileName,
                format: 'image'  // Request image format instead of PDF
            }),
        });

        console.log('Compile response status:', response.status);

        if (response.ok) {
            const result = await response.json();
            console.log('Compilation successful:', result);
            return `${API_BASE_URL}${result.pdfUrl}`;
        } else {
            const errorText = await response.text();
            console.error('Compilation failed:', response.status, errorText);
            throw new Error(`Compilation failed: ${errorText}`);
        }
    } catch (error) {
        console.error('Compilation error:', error);
        alert(`Compilation failed: ${error.message}`);
        return null;
    } finally {
        setIsCompiling(false);
    }
};

  const handleCompile = async () => {
    if (!latexCode.trim()) {
      alert('Please enter some LaTeX code first');
      return;
    }

    const pdfUrl = await compileLatex(latexCode);
    if (pdfUrl) {
      setPreviewUrl(pdfUrl);
    }
  };

  const handleSaveEquation = async () => {
    if (!saveFileName.trim()) {
      alert('Please enter a filename');
      return;
    }

    if (!latexCode.trim()) {
      alert('Please enter some LaTeX code first');
      return;
    }

    try {
      const cleanLatex = latexCode.replace(/[‹›]/g, "");
      
      const response = await fetch(`${API_BASE_URL}/api/equations/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: saveFileName,
          latex: cleanLatex
        }),
      });

      if (response.ok) {
        alert('Equation saved successfully!');
        setShowSaveDialog(false);
        setSaveFileName("");
        loadSavedEquations(); // Refresh the list
      } else {
        const error = await response.text();
        throw new Error(error);
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert(`Save failed: ${error.message}`);
    }
  };

  const loadSavedEquation = async (fileName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/equations/load/${fileName}`);
      if (response.ok) {
        const data = await response.json();
        setLatexCode(data.latex);
        setActiveTab("editor");
      }
    } catch (error) {
      console.error('Failed to load equation:', error);
    }
  };

  const compileSavedEquation = async (fileName, latex) => {
    const pdfUrl = await compileLatex(latex, false, fileName);
    return pdfUrl;
  };

  const copyEquationToClipboard = async (latex) => {
    try {
      await navigator.clipboard.writeText(latex);
      alert("LaTeX code copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  // Your existing mathSymbols and commonSymbols arrays (keeping them the same)
  const mathSymbols = [
    { symbol: "+", latex: "+", name: "Plus", category: "Basic" },
    { symbol: "-", latex: "-", name: "Minus", category: "Basic" },
    { symbol: "×", latex: "\\times", name: "Multiplication", category: "Basic" },
    { symbol: "÷", latex: "\\div", name: "Division", category: "Basic" },
    { symbol: "=", latex: "=", name: "Equals", category: "Basic" },
    { symbol: "≠", latex: "\\neq", name: "Not Equal", category: "Basic" },
    { symbol: "±", latex: "\\pm", name: "Plus-Minus", category: "Basic" },

    // Fractions & Roots (corrected templates)
    { symbol: "a/b", template: "\\frac{⟨numerator⟩}{⟨denominator⟩}", latex: "\\frac{⟨numerator⟩}{⟨denominator⟩}", name: "Fraction", category: "Fractions" },
    { symbol: "√", template: "\\sqrt{⟨arg⟩}", latex: "\\sqrt{⟨arg⟩}", name: "Square Root", category: "Roots" },
    { symbol: "∛", template: "\\sqrt[3]{⟨arg⟩}", latex: "\\sqrt[3]{⟨arg⟩}", name: "Cube Root", category: "Roots" },
    { symbol: "∜", template: "\\sqrt[4]{⟨arg⟩}", latex: "\\sqrt[4]{⟨arg⟩}", name: "Fourth Root", category: "Roots" },
    { symbol: "ⁿ√", template: "\\sqrt[⟨n⟩]{⟨arg⟩}", latex: "\\sqrt[⟨n⟩]{⟨arg⟩}", name: "Nth Root", category: "Roots" },

    // Greek Uppercase
    { symbol: "Γ", latex: "\\Gamma", name: "Gamma", category: "Greek" },
    { symbol: "Δ", latex: "\\Delta", name: "Delta", category: "Greek" },
    { symbol: "Θ", latex: "\\Theta", name: "Theta", category: "Greek" },
    { symbol: "Λ", latex: "\\Lambda", name: "Lambda", category: "Greek" },
    { symbol: "Ξ", latex: "\\Xi", name: "Xi", category: "Greek" },
    { symbol: "Π", latex: "\\Pi", name: "Pi (upper)", category: "Greek" },
    { symbol: "Σ", latex: "\\Sigma", name: "Sigma (upper)", category: "Greek" },
    { symbol: "Φ", latex: "\\Phi", name: "Phi (upper)", category: "Greek" },
    { symbol: "Ψ", latex: "\\Psi", name: "Psi (upper)", category: "Greek" },
    { symbol: "Ω", latex: "\\Omega", name: "Omega (upper)", category: "Greek" },

    // Greek Lowercase (common)
    { symbol: "α", latex: "\\alpha", name: "alpha", category: "Greek" },
    { symbol: "β", latex: "\\beta", name: "beta", category: "Greek" },
    { symbol: "γ", latex: "\\gamma", name: "gamma", category: "Greek" },
    { symbol: "δ", latex: "\\delta", name: "delta", category: "Greek" },
    { symbol: "ε", latex: "\\epsilon", name: "epsilon", category: "Greek" },
    { symbol: "ζ", latex: "\\zeta", name: "zeta", category: "Greek" },
    { symbol: "η", latex: "\\eta", name: "eta", category: "Greek" },
    { symbol: "θ", latex: "\\theta", name: "theta", category: "Greek" },
    { symbol: "ι", latex: "\\iota", name: "iota", category: "Greek" },
    { symbol: "κ", latex: "\\kappa", name: "kappa", category: "Greek" },
    { symbol: "λ", latex: "\\lambda", name: "lambda", category: "Greek" },
    { symbol: "μ", latex: "\\mu", name: "mu", category: "Greek" },
    { symbol: "ν", latex: "\\nu", name: "nu", category: "Greek" },
    { symbol: "ξ", latex: "\\xi", name: "xi", category: "Greek" },
    { symbol: "π", latex: "\\pi", name: "pi", category: "Greek" },
    { symbol: "ρ", latex: "\\rho", name: "rho", category: "Greek" },
    { symbol: "σ", latex: "\\sigma", name: "sigma", category: "Greek" },
    { symbol: "τ", latex: "\\tau", name: "tau", category: "Greek" },
    { symbol: "υ", latex: "\\upsilon", name: "upsilon", category: "Greek" },
    { symbol: "φ", latex: "\\phi", name: "phi", category: "Greek" },
    { symbol: "χ", latex: "\\chi", name: "chi", category: "Greek" },
    { symbol: "ψ", latex: "\\psi", name: "psi", category: "Greek" },
    { symbol: "ω", latex: "\\omega", name: "omega", category: "Greek" },

    // Calculus (corrected templates)
    { symbol: "∫", template: "\\int_{⟨lower⟩}^{⟨upper⟩} ⟨integrand⟩ \\, \\mathrm{d}⟨variable⟩", latex: "\\int_{⟨lower⟩}^{⟨upper⟩} ⟨integrand⟩ \\, \\mathrm{d}⟨variable⟩", name: "Definite Integral", category: "Calculus" },
    { symbol: "∫", latex: "\\int ⟨integrand⟩ \\, \\mathrm{d}⟨variable⟩", name: "Indefinite Integral", category: "Calculus" },
    { symbol: "∮", latex: "\\oint", name: "Contour Integral", category: "Calculus" },
    { symbol: "∂", latex: "\\partial", name: "Partial Derivative", category: "Calculus" },
    { symbol: "∇", latex: "\\nabla", name: "Nabla", category: "Calculus" },
    { symbol: "∞", latex: "\\infty", name: "Infinity", category: "Calculus" },
    { symbol: "lim", template: "\\lim_{⟨variable⟩ \\to ⟨value⟩} ⟨expression⟩", latex: "\\lim_{⟨variable⟩ \\to ⟨value⟩} ⟨expression⟩", name: "Limit", category: "Calculus" },
    { symbol: "∑", template: "\\sum_{⟨index⟩=⟨start⟩}^{⟨end⟩} ⟨expression⟩", latex: "\\sum_{⟨index⟩=⟨start⟩}^{⟨end⟩} ⟨expression⟩", name: "Summation", category: "Calculus" },
    { symbol: "∏", template: "\\prod_{⟨index⟩=⟨start⟩}^{⟨end⟩} ⟨expression⟩", latex: "\\prod_{⟨index⟩=⟨start⟩}^{⟨end⟩} ⟨expression⟩", name: "Product", category: "Calculus" },
    { symbol: "dx", latex: "\\mathrm{d}x", name: "differential dx", category: "Calculus" },
    { symbol: "dy", latex: "\\mathrm{d}y", name: "differential dy", category: "Calculus" },
    { symbol: "dt", latex: "\\mathrm{d}t", name: "differential dt", category: "Calculus" },

    // Operators & functions
    { symbol: "sin", latex: "\\sin", name: "sine", category: "Functions" },
    { symbol: "cos", latex: "\\cos", name: "cosine", category: "Functions" },
    { symbol: "tan", latex: "\\tan", name: "tangent", category: "Functions" },
    { symbol: "sec", latex: "\\sec", name: "secant", category: "Functions" },
    { symbol: "csc", latex: "\\csc", name: "cosecant", category: "Functions" },
    { symbol: "cot", latex: "\\cot", name: "cotangent", category: "Functions" },
    { symbol: "arcsin", latex: "\\arcsin", name: "arcsine", category: "Functions" },
    { symbol: "arccos", latex: "\\arccos", name: "arccosine", category: "Functions" },
    { symbol: "arctan", latex: "\\arctan", name: "arctangent", category: "Functions" },
    { symbol: "sinh", latex: "\\sinh", name: "hyperbolic sine", category: "Functions" },
    { symbol: "cosh", latex: "\\cosh", name: "hyperbolic cosine", category: "Functions" },
    { symbol: "tanh", latex: "\\tanh", name: "hyperbolic tangent", category: "Functions" },
    { symbol: "log", template: "\\log_{⟨base⟩} ⟨argument⟩", latex: "\\log_{⟨base⟩} ⟨argument⟩", name: "logarithm", category: "Functions" },
    { symbol: "ln", latex: "\\ln", name: "natural log", category: "Functions" },
    { symbol: "lg", latex: "\\lg", name: "log base 10", category: "Functions" },
    { symbol: "exp", latex: "\\exp", name: "exponential", category: "Functions" },
    { symbol: "max", latex: "\\max", name: "maximum", category: "Functions" },
    { symbol: "min", latex: "\\min", name: "minimum", category: "Functions" },
    { symbol: "sup", latex: "\\sup", name: "supremum", category: "Functions" },
    { symbol: "inf", latex: "\\inf", name: "infimum", category: "Functions" },
    { symbol: "argmax", latex: "\\operatorname{argmax}", name: "argmax", category: "Functions" },
    { symbol: "argmin", latex: "\\operatorname{argmin}", name: "argmin", category: "Functions" },

    // Sets & logic
    { symbol: "∈", latex: "\\in", name: "Element Of", category: "Set Theory" },
    { symbol: "∉", latex: "\\notin", name: "Not Element Of", category: "Set Theory" },
    { symbol: "⊂", latex: "\\subset", name: "Subset", category: "Set Theory" },
    { symbol: "⊆", latex: "\\subseteq", name: "Subset or Equal", category: "Set Theory" },
    { symbol: "⊃", latex: "\\supset", name: "Superset", category: "Set Theory" },
    { symbol: "⊇", latex: "\\supseteq", name: "Superset or Equal", category: "Set Theory" },
    { symbol: "∪", latex: "\\cup", name: "Union", category: "Set Theory" },
    { symbol: "∩", latex: "\\cap", name: "Intersection", category: "Set Theory" },
    { symbol: "∅", latex: "\\varnothing", name: "Empty Set", category: "Set Theory" },
    { symbol: "∀", latex: "\\forall", name: "For All", category: "Set Theory" },
    { symbol: "∃", latex: "\\exists", name: "There Exists", category: "Set Theory" },
    { symbol: "∄", latex: "\\nexists", name: "Does Not Exist", category: "Set Theory" },
    { symbol: "ℕ", latex: "\\mathbb{N}", name: "Natural Numbers", category: "Set Theory" },
    { symbol: "ℤ", latex: "\\mathbb{Z}", name: "Integers", category: "Set Theory" },
    { symbol: "ℚ", latex: "\\mathbb{Q}", name: "Rational Numbers", category: "Set Theory" },
    { symbol: "ℝ", latex: "\\mathbb{R}", name: "Real Numbers", category: "Set Theory" },
    { symbol: "ℂ", latex: "\\mathbb{C}", name: "Complex Numbers", category: "Set Theory" },

    // Relational
    { symbol: "<", latex: "<", name: "Less Than", category: "Relations" },
    { symbol: ">", latex: ">", name: "Greater Than", category: "Relations" },
    { symbol: "≤", latex: "\\leq", name: "Less or Equal", category: "Relations" },
    { symbol: "≥", latex: "\\geq", name: "Greater or Equal", category: "Relations" },
    { symbol: "≈", latex: "\\approx", name: "Approximately Equal", category: "Relations" },
    { symbol: "≡", latex: "\\equiv", name: "Equivalent", category: "Relations" },
    { symbol: "≅", latex: "\\cong", name: "Congruent", category: "Relations" },
    { symbol: "∝", latex: "\\propto", name: "Proportional To", category: "Relations" },
    { symbol: "≪", latex: "\\ll", name: "Much Less Than", category: "Relations" },
    { symbol: "≫", latex: "\\gg", name: "Much Greater Than", category: "Relations" },

    // Arrows
    { symbol: "→", latex: "\\rightarrow", name: "Right Arrow", category: "Arrows" },
    { symbol: "←", latex: "\\leftarrow", name: "Left Arrow", category: "Arrows" },
    { symbol: "↔", latex: "\\leftrightarrow", name: "Left Right Arrow", category: "Arrows" },
    { symbol: "⇒", latex: "\\Rightarrow", name: "Right Double Arrow", category: "Arrows" },
    { symbol: "⇐", latex: "\\Leftarrow", name: "Left Double Arrow", category: "Arrows" },
    { symbol: "⇔", latex: "\\Leftrightarrow", name: "Left Right Double Arrow", category: "Arrows" },
    { symbol: "↑", latex: "\\uparrow", name: "Up Arrow", category: "Arrows" },
    { symbol: "↓", latex: "\\downarrow", name: "Down Arrow", category: "Arrows" },

    // Geometry
    { symbol: "∠", latex: "\\angle", name: "Angle", category: "Geometry" },
    { symbol: "∡", latex: "\\measuredangle", name: "Measured Angle", category: "Geometry" },
    { symbol: "∥", latex: "\\parallel", name: "Parallel", category: "Geometry" },
    { symbol: "⊥", latex: "\\perp", name: "Perpendicular", category: "Geometry" },
    { symbol: "△", latex: "\\triangle", name: "Triangle", category: "Geometry" },
    { symbol: "□", latex: "\\square", name: "Square", category: "Geometry" },
    { symbol: "○", latex: "\\circ", name: "Circle", category: "Geometry" },

    // Accents / decorations (corrected templates)
    { symbol: "â", template: "\\hat{⟨variable⟩}", latex: "\\hat{⟨variable⟩}", name: "Hat", category: "Accents" },
    { symbol: "ã", template: "\\tilde{⟨variable⟩}", latex: "\\tilde{⟨variable⟩}", name: "Tilde", category: "Accents" },
    { symbol: "a̅", template: "\\overline{⟨expression⟩}", latex: "\\overline{⟨expression⟩}", name: "Overline", category: "Accents" },
    { symbol: "a̲", template: "\\underline{⟨expression⟩}", latex: "\\underline{⟨expression⟩}", name: "Underline", category: "Accents" },
    { symbol: "a⃗", template: "\\vec{⟨variable⟩}", latex: "\\vec{⟨variable⟩}", name: "Vector", category: "Accents" },
    { symbol: "ȧ", template: "\\dot{⟨variable⟩}", latex: "\\dot{⟨variable⟩}", name: "Dot", category: "Accents" },
    { symbol: "ä", template: "\\ddot{⟨variable⟩}", latex: "\\ddot{⟨variable⟩}", name: "Double Dot", category: "Accents" },
    { symbol: "á", template: "\\acute{⟨variable⟩}", latex: "\\acute{⟨variable⟩}", name: "Acute", category: "Accents" },
    { symbol: "à", template: "\\grave{⟨variable⟩}", latex: "\\grave{⟨variable⟩}", name: "Grave", category: "Accents" },

    // Brackets & Delimiters
    { symbol: "(", latex: "(", name: "Left Parenthesis", category: "Brackets" },
    { symbol: ")", latex: ")", name: "Right Parenthesis", category: "Brackets" },
    { symbol: "[", latex: "[", name: "Left Bracket", category: "Brackets" },
    { symbol: "]", latex: "]", name: "Right Bracket", category: "Brackets" },
    { symbol: "{}", template: "\\{⟨content⟩\\}", latex: "\\{⟨content⟩\\}", name: "Curly Braces", category: "Brackets" },
    { symbol: "⟨⟩", template: "\\langle ⟨content⟩ \\rangle", latex: "\\langle ⟨content⟩ \\rangle", name: "Angle Brackets", category: "Brackets" },
    { symbol: "||", template: "\\left| ⟨content⟩ \\right|", latex: "\\left| ⟨content⟩ \\right|", name: "Absolute Value", category: "Brackets" },
    { symbol: "∥∥", template: "\\left\\| ⟨content⟩ \\right\\|", latex: "\\left\\| ⟨content⟩ \\right\\|", name: "Norm", category: "Brackets" },
    { symbol: "⌈⌉", template: "\\left\\lceil ⟨content⟩ \\right\\rceil", latex: "\\left\\lceil ⟨content⟩ \\right\\rceil", name: "Ceiling", category: "Brackets" },
    { symbol: "⌊⌋", template: "\\left\\lfloor ⟨content⟩ \\right\\rfloor", latex: "\\left\\lfloor ⟨content⟩ \\right\\rfloor", name: "Floor", category: "Brackets" },

    // Matrices & arrays (corrected templates)
    { symbol: "matrix", template: "\\begin{matrix} ⟨a₁₁⟩ & ⟨a₁₂⟩ \\\\ ⟨a₂₁⟩ & ⟨a₂₂⟩ \\end{matrix}", latex: "\\begin{matrix} ⟨a₁₁⟩ & ⟨a₁₂⟩ \\\\ ⟨a₂₁⟩ & ⟨a₂₂⟩ \\end{matrix}", name: "Matrix", category: "Matrices" },
    { symbol: "pmatrix", template: "\\begin{pmatrix} ⟨a₁₁⟩ & ⟨a₁₂⟩ \\\\ ⟨a₂₁⟩ & ⟨a₂₂⟩ \\end{pmatrix}", latex: "\\begin{pmatrix} ⟨a₁₁⟩ & ⟨a₁₂⟩ \\\\ ⟨a₂₁⟩ & ⟨a₂₂⟩ \\end{pmatrix}", name: "Parentheses Matrix", category: "Matrices" },
    { symbol: "bmatrix", template: "\\begin{bmatrix} ⟨a₁₁⟩ & ⟨a₁₂⟩ \\\\ ⟨a₂₁⟩ & ⟨a₂₂⟩ \\end{bmatrix}", latex: "\\begin{bmatrix} ⟨a₁₁⟩ & ⟨a₁₂⟩ \\\\ ⟨a₂₁⟩ & ⟨a₂₂⟩ \\end{bmatrix}", name: "Bracket Matrix", category: "Matrices" },
    { symbol: "vmatrix", template: "\\begin{vmatrix} ⟨a₁₁⟩ & ⟨a₁₂⟩ \\\\ ⟨a₂₁⟩ & ⟨a₂₂⟩ \\end{vmatrix}", latex: "\\begin{vmatrix} ⟨a₁₁⟩ & ⟨a₁₂⟩ \\\\ ⟨a₂₁⟩ & ⟨a₂₂⟩ \\end{vmatrix}", name: "Determinant", category: "Matrices" },

    // Cases, piecewise (corrected)
    { symbol: "cases", template: "\\begin{cases} ⟨expression₁⟩ & \\text{if } ⟨condition₁⟩ \\\\ ⟨expression₂⟩ & \\text{if } ⟨condition₂⟩ \\end{cases}", latex: "\\begin{cases} ⟨expression₁⟩ & \\text{if } ⟨condition₁⟩ \\\\ ⟨expression₂⟩ & \\text{if } ⟨condition₂⟩ \\end{cases}", name: "Piecewise Function", category: "Environments" },

    // Display/Equation environments (corrected)
    { symbol: "align", template: "\\begin{align} ⟨equation₁⟩ \\\\ ⟨equation₂⟩ \\end{align}", latex: "\\begin{align} ⟨equation₁⟩ \\\\ ⟨equation₂⟩ \\end{align}", name: "Aligned Equations", category: "Environments" },
    { symbol: "equation", template: "\\begin{equation} ⟨expression⟩ \\end{equation}", latex: "\\begin{equation} ⟨expression⟩ \\end{equation}", name: "Numbered Equation", category: "Environments" },

    // Superscripts & subscripts
    { symbol: "x²", template: "⟨base⟩^{⟨exponent⟩}", latex: "⟨base⟩^{⟨exponent⟩}", name: "Superscript", category: "Scripts" },
    { symbol: "x₂", template: "⟨base⟩_{⟨subscript⟩}", latex: "⟨base⟩_{⟨subscript⟩}", name: "Subscript", category: "Scripts" },
    { symbol: "x₂³", template: "⟨base⟩_{⟨subscript⟩}^{⟨superscript⟩}", latex: "⟨base⟩_{⟨subscript⟩}^{⟨superscript⟩}", name: "Sub and Superscript", category: "Scripts" },

    // Combinatorics & special
    { symbol: "nCr", template: "\\binom{⟨n⟩}{⟨r⟩}", latex: "\\binom{⟨n⟩}{⟨r⟩}", name: "Binomial Coefficient", category: "Combinatorics" },
    { symbol: "n!", latex: "⟨n⟩!", name: "Factorial", category: "Combinatorics" },
    { symbol: "P(n,r)", template: "P(⟨n⟩,⟨r⟩)", latex: "P(⟨n⟩,⟨r⟩)", name: "Permutation", category: "Combinatorics" },
    { symbol: "C(n,r)", template: "C(⟨n⟩,⟨r⟩)", latex: "C(⟨n⟩,⟨r⟩)", name: "Combination", category: "Combinatorics" },

    // Spacing
    { symbol: "\\,", latex: "\\,", name: "Thin space", category: "Spacing" },
    { symbol: "\\:", latex: "\\:", name: "Medium space", category: "Spacing" },
    { symbol: "\\;", latex: "\\;", name: "Thick space", category: "Spacing" },
    { symbol: "\\quad", latex: "\\quad", name: "Quad space", category: "Spacing" },
    { symbol: "\\qquad", latex: "\\qquad", name: "Double quad space", category: "Spacing" },

    // Special symbols
    { symbol: "°", latex: "^{\\circ}", name: "Degree", category: "Special" },
    { symbol: "ℏ", latex: "\\hbar", name: "Reduced Planck Constant", category: "Special" },
    { symbol: "ℵ", latex: "\\aleph", name: "Aleph", category: "Special" },
    { symbol: "ℓ", latex: "\\ell", name: "Script l", category: "Special" },
    { symbol: "℘", latex: "\\wp", name: "Weierstrass p", category: "Special" },
    { symbol: "ℜ", latex: "\\Re", name: "Real part", category: "Special" },
    { symbol: "ℑ", latex: "\\Im", name: "Imaginary part", category: "Special" },

    // Logic & Boolean
    { symbol: "∧", latex: "\\land", name: "Logical AND", category: "Logic" },
    { symbol: "∨", latex: "\\lor", name: "Logical OR", category: "Logic" },
    { symbol: "¬", latex: "\\neg", name: "Logical NOT", category: "Logic" },
    { symbol: "⊕", latex: "\\oplus", name: "XOR", category: "Logic" },
    { symbol: "⊤", latex: "\\top", name: "True", category: "Logic" },
    { symbol: "⊥", latex: "\\bot", name: "False", category: "Logic" },
    // Add your full symbol list here
  ];

  const commonSymbols = [
    { symbol: "∫", latex: "\\int ⟨integrand⟩ \\, \\mathrm{d}⟨variable⟩", name: "Integral" },
    { symbol: "∑", latex: "\\sum_{⟨index⟩=⟨start⟩}^{⟨end⟩} ⟨expression⟩", name: "Summation" },
    { symbol: "√", latex: "\\sqrt{⟨argument⟩}", name: "Square Root" },
    { symbol: "a/b", latex: "\\frac{⟨numerator⟩}{⟨denominator⟩}", name: "Fraction" },
    { symbol: "x²", latex: "⟨base⟩^{⟨exponent⟩}", name: "Power" },
    { symbol: "x₁", latex: "⟨base⟩_{⟨subscript⟩}", name: "Subscript" },
    { symbol: "lim", latex: "\\lim_{⟨variable⟩ \\to ⟨value⟩} ⟨expression⟩", name: "Limit" },
    { symbol: "α", latex: "\\alpha", name: "Alpha" },
    { symbol: "π", latex: "\\pi", name: "Pi" },
    { symbol: "∞", latex: "\\infty", name: "Infinity" },
    { symbol: "≠", latex: "\\neq", name: "Not Equal" },
    { symbol: "≤", latex: "\\leq", name: "Less or Equal" },
  ];

  const insertSymbol = (latex) => {
    const highlighted = wrapPlaceholder(latex);
    setLatexCode((prev) => prev + highlighted + " ");
    setShowDropdown(false);
    setSearchTerm("");
  };

  const copyToClipboard = async () => {
    try {
      const cleanLatex = latexCode.replace(/[‹›]/g, "");
      await navigator.clipboard.writeText(cleanLatex);
      alert("LaTeX code copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const filteredSymbols = mathSymbols.filter((symbol) =>
    symbol.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    symbol.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    symbol.latex.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSavedEquations = savedEquations.filter((equation) =>
    selectedSavedEquation === "" || equation.fileName === selectedSavedEquation
  );

  const categories = [...new Set(mathSymbols.map((symbol) => symbol.category))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl border border-gray-300 w-[95vw] max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-800">Easy Math Input</h2>
            {/* Tab Navigation */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("editor")}
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === "editor"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Editor
              </button>
              <button
                onClick={() => setActiveTab("saved")}
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === "saved"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Saved Equations
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1"
          >
            <TbX size={24} />
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "editor" && (
          <>
            {/* Info Banner */}
            <div className="px-4 py-2 bg-blue-50 text-sm text-blue-800 border-b border-gray-200">
              <strong>Tip:</strong> Placeholders are shown as ‹like this›. Replace them with your values. Click symbols to insert LaTeX code with placeholders.
            </div>

            {/* Main Editor Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left Panel - Common Symbols */}
              <div className="w-1/5 border-r border-gray-200 p-4 overflow-y-auto">
                <h3 className="font-semibold mb-3 text-gray-700">Common Symbols</h3>
                <div className="grid grid-cols-2 gap-2">
                  {commonSymbols.map((symbol, index) => (
                    <button
                      key={index}
                      onClick={() => insertSymbol(symbol.latex)}
                      className="p-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors text-sm flex flex-col items-center justify-center min-h-[50px]"
                      title={`${symbol.name}: ${symbol.latex}`}
                    >
                      <span className="text-lg mb-1">{symbol.symbol}</span>
                      <span className="text-xs text-gray-600 truncate w-full text-center">{symbol.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Center Panel - Textarea and Preview */}
              <div className="flex-1 flex flex-col p-4">
                {/* LaTeX Code Section */}
                <div className="flex flex-col mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-semibold text-gray-700">LaTeX Code</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowSaveDialog(true)}
                        className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
                      >
                        <TbDeviceFloppy size={16} />
                        Save
                      </button>
                      <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                      >
                        <TbCopy size={16} />
                        Copy
                      </button>
                      <button
                        onClick={handleCompile}
                        disabled={isCompiling}
                        className="flex items-center gap-1 px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-sm disabled:opacity-50"
                      >
                        <TbPlayerPlay size={16} />
                        {isCompiling ? "Compiling..." : "Compile"}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={latexCode}
                    onChange={(e) => setLatexCode(e.target.value)}
                    className="h-32 w-full p-3 border border-gray-300 rounded resize-none font-mono text-sm leading-relaxed"
                    placeholder="Your LaTeX code will appear here... Click symbols to insert them with placeholders."
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    Placeholders in ‹brackets› should be replaced with your actual values.
                  </div>
                </div>

                {/* Preview Section */}
                <div className="flex-1 flex flex-col">
                  <label className="font-semibold text-gray-700 mb-2">Preview</label>
                  <div className="flex-1 border border-gray-300 rounded bg-white overflow-hidden">
                    {previewUrl ? (
                      <iframe
                        src={previewUrl}
                        className="w-full h-full"
                        title="LaTeX Preview"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <TbPlayerPlay size={48} className="mx-auto mb-2 opacity-50" />
                          <p>Click "Compile" to preview your equation</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Panel - Search + Categories */}
              <div className="w-1/4 border-l border-gray-200 p-4 flex flex-col">
                <div className="relative mb-3">
                  <div className="flex items-center border border-gray-300 rounded">
                    <TbSearch className="absolute left-2 text-gray-400" size={20} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Search symbols, functions, etc..."
                      className="w-full pl-9 pr-3 py-2 outline-none"
                    />
                  </div>

                  {showDropdown && searchTerm && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto z-10">
                      {filteredSymbols.slice(0, 50).map((symbol, index) => (
                        <button
                          key={index}
                          onClick={() => insertSymbol(symbol.latex)}
                          className="w-full p-2 text-left hover:bg-gray-100 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                        >
                          <span className="text-lg w-8 text-center flex-shrink-0">{symbol.symbol}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-xs bg-gray-100 px-1 rounded truncate">
                              {symbol.latex}
                            </div>
                            <div className="text-sm text-gray-600 truncate">{symbol.name}</div>
                          </div>
                        </button>
                      ))}
                      {filteredSymbols.length === 0 && (
                        <div className="p-3 text-center text-gray-500">No symbols found</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="overflow-y-auto flex-1">
                  {categories.map((category) => {
                    const categorySymbols = mathSymbols.filter((symbol) => symbol.category === category);
                    return (
                      <div key={category} className="mb-4">
                        <h4 className="font-semibold text-gray-700 mb-2 sticky top-0 bg-white py-1 border-b border-gray-200">
                          {category} ({categorySymbols.length})
                        </h4>
                        <div className="grid grid-cols-4 gap-1">
                          {categorySymbols.slice(0, 12).map((symbol, index) => (
                            <button
                              key={index}
                              onClick={() => insertSymbol(symbol.latex)}
                              className="p-2 border border-gray-200 rounded hover:bg-gray-100 text-center transition-colors"
                              title={`${symbol.name}: ${symbol.latex}`}
                            >
                              <span className="text-lg">{symbol.symbol}</span>
                            </button>
                          ))}
                          {categorySymbols.length > 12 && (
                            <div className="p-2 text-xs text-gray-500 text-center">
                              +{categorySymbols.length - 12} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "saved" && (
          <div className="flex-1 flex flex-col p-4">
            {/* Search for saved equations */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Saved Equations
              </label>
              <select
                value={selectedSavedEquation}
                onChange={(e) => setSelectedSavedEquation(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All equations</option>
                {savedEquations.map((equation) => (
                  <option key={equation.fileName} value={equation.fileName}>
                    {equation.fileName}
                  </option>
                ))}
              </select>
            </div>

            {/* Saved equations table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left w-1/6">File Name</th>
                    <th className="border border-gray-300 px-4 py-2 text-left w-2/6">LaTeX Code</th>
                    <th className="border border-gray-300 px-4 py-2 text-left w-1/6">Actions</th>
                    <th className="border border-gray-300 px-4 py-2 text-left w-2/6">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSavedEquations.map((equation) => (
                    <SavedEquationRow
                      key={equation.fileName}
                      equation={equation}
                      onCopy={copyEquationToClipboard}
                      onLoad={loadSavedEquation}
                      onCompile={compileSavedEquation}
                    />
                  ))}
                </tbody>
              </table>
              {filteredSavedEquations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No saved equations found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Save Equation</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Name
                </label>
                <input
                  type="text"
                  value={saveFileName}
                  onChange={(e) => setSaveFileName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter filename (without .tex extension)"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEquation}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Component for saved equation rows
const SavedEquationRow = ({ equation, onCopy, onLoad, onCompile }) => {
  const [previewUrl, setPreviewUrl] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);

  const handleCompile = async () => {
    setIsCompiling(true);
    const url = await onCompile(equation.fileName, equation.latex);
    if (url) {
      setPreviewUrl(url);
    }
    setIsCompiling(false);
  };

  return (
    <tr>
      <td className="border border-gray-300 px-4 py-2 font-medium">
        {equation.fileName}
      </td>
      <td className="border border-gray-300 px-4 py-2">
        <div className="font-mono text-sm bg-gray-50 p-2 rounded max-w-xs overflow-x-auto">
          {equation.latex}
        </div>
      </td>
      <td className="border border-gray-300 px-4 py-2">
        <div className="flex gap-2">
          <button
            onClick={() => onCopy(equation.latex)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="Copy LaTeX"
          >
            <TbCopy size={16} />
          </button>
          <button
            onClick={() => onLoad(equation.fileName)}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
            title="Load to Editor"
          >
            <TbFolder size={16} />
          </button>
        </div>
      </td>
<td className="border border-gray-300 px-4 py-2">
  <div className="flex items-center gap-2">
    <button
      onClick={handleCompile}
      disabled={isCompiling}
      className="p-1 text-orange-600 hover:bg-orange-50 rounded disabled:opacity-50 flex-shrink-0"
      title="Compile Preview"
    >
      <TbPlayerPlay size={16} />
    </button>
    {previewUrl && (
      <div className="flex-1 flex justify-center">
        {previewUrl.endsWith('.png') ? (
          <img
            src={previewUrl}
            alt={`Preview for ${equation.fileName}`}
            className="max-w-full max-h-32 object-contain border rounded bg-white"
            style={{ 
              minWidth: '120px',
              minHeight: '60px'
            }}
          />
        ) : (
          <iframe
            src={previewUrl}
            className="w-full h-32 border rounded bg-white"
            title={`Preview for ${equation.fileName}`}
          />
        )}
      </div>
    )}
  </div>
</td>

    </tr>
  );
};

export default EasyMathInput;
