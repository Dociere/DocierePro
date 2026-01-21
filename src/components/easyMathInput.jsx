import React, { useState, useEffect, useRef } from "react";
import {
  TbX,
  TbCopy,
  TbSearch,
  TbPlayerPlay,
  TbDeviceFloppy,
  TbChevronDown,
  TbRobot,
  TbArrowUp,
  TbLoader,
  TbMathFunction,
  TbCode,
  TbTrash,
  TbFolder,
} from "react-icons/tb";
import { useSettings } from "../context/useSettings";

const API_BASE_URL = "http://localhost:5000";

const EasyMathInput = ({ onClose }) => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState("editor");
  const [latexCode, setLatexCode] = useState("");
  const { settings } = useSettings();
  const isDark = settings.appearance.mode === "dark";

  // AI Mode
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiMode, setIsAiMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // UI State
  const [leftPanelMode, setLeftPanelMode] = useState("symbols"); // 'symbols' | 'equations'
  const [searchTerm, setSearchTerm] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);

  // Saved Data
  const [savedEquations, setSavedEquations] = useState([]);
  const [savedEquationSearch, setSavedEquationSearch] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFileName, setSaveFileName] = useState("");

  const [cardPreviewUrl, setCardPreviewUrl] = useState(null);
  const [cardPreviewLoading, setCardPreviewLoading] = useState(null); // fileName

  const [deleteTarget, setDeleteTarget] = useState(null);

  // Default expanded categories
  const [expandedCategories, setExpandedCategories] = useState(
    new Set([
      "Basic Arithmetic",
      "Fractions & Roots",
      "Calculus",
      "Greek Lowercase",
    ]),
  );

  const textareaRef = useRef(null);

  // --- EFFECTS ---
  useEffect(() => {
    loadSavedEquations();
  }, []);
  useEffect(() => {
    if (activeTab !== "editor") setPreviewUrl("");
    if (activeTab !== "saved") {
      setCardPreviewUrl(null);
      setCardPreviewLoading(null);
    }
  }, [activeTab]);

  // --- SMART INSERTION LOGIC (Enables Nesting) ---
  const insertAtCursor = (template) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = latexCode;

    // 1. Insert the text (replacing selection if any)
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newText = before + template + after;

    setLatexCode(newText);
    setIsAiMode(false);

    // 2. Auto-select the first placeholder ⟨x⟩
    const placeholderRegex = /⟨([^⟩]+)⟩/;
    const match = placeholderRegex.exec(template);

    setTimeout(() => {
      textarea.focus();
      if (match) {
        // Select the placeholder content so next click replaces it (Nesting!)
        const placeholderStart = start + match.index;
        const placeholderEnd = placeholderStart + match[0].length;
        textarea.setSelectionRange(placeholderStart, placeholderEnd);
      } else {
        // Place cursor at end if no placeholder
        const newCursorPos = start + template.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // --- API HANDLERS ---
  const loadSavedEquations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/equations/list`);
      if (res.ok) {
        const data = await res.json();
        // Ensure we set an array, otherwise default to empty []
        setSavedEquations(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
      setSavedEquations([]); // Fallback to empty to prevent crash
    }
  };

  const compileLatex = async (latex, isTemp = true, fileName = "temp") => {
    setIsCompiling(true);
    try {
      // Strip placeholders for compilation
      const cleanLatex = latex.replace(/[‹›]/g, "").replace(/⟨[^⟩]+⟩/g, "");
      const res = await fetch(`${API_BASE_URL}/api/latex/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latex: cleanLatex,
          isTemp,
          fileName,
          format: "image",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.success && data.pdfUrl) return `${API_BASE_URL}${data.pdfUrl}`;
      throw new Error("No URL returned");
    } catch (e) {
      alert(`Error: ${e.message}`);
      return null;
    } finally {
      setIsCompiling(false);
    }
  };

  const handleCardPreview = async (eq) => {
    setCardPreviewLoading(eq.fileName);
    setCardPreviewUrl(null);

    const url = await compileLatex(eq.latex, true, `preview-${eq.fileName}`);
    if (url) {
      setCardPreviewUrl({
        fileName: eq.fileName,
        url: `${url}?t=${Date.now()}`,
      });
    }

    setCardPreviewLoading(null);
  };

  const handleCompile = async () => {
    if (!latexCode.trim()) return;
    setPreviewUrl("");
    const url = await compileLatex(latexCode);
    if (url) setPreviewUrl(`${url}?t=${Date.now()}`);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/generate-equation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();
      if (data.success) {
        setLatexCode(data.latexEquation);
        setIsAiMode(false);
        setAiPrompt("");
        setTimeout(async () => {
          setIsCompiling(true);
          const url = await compileLatex(data.latexEquation);
          if (url) setPreviewUrl(`${url}?t=${Date.now()}`);
          setIsCompiling(false);
        }, 100);
      } else {
        alert("AI Error: " + data.error);
      }
    } catch (e) {
      alert("Connection Error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveEquation = async () => {
    if (!saveFileName.trim()) return alert("Enter filename");
    try {
      await fetch(`${API_BASE_URL}/api/equations/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: saveFileName, latex: latexCode }),
      });
      setShowSaveDialog(false);
      loadSavedEquations();
    } catch (e) {
      alert(e.message);
    }
  };
  const handleDeleteEquation = async (fileName) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/equations/${fileName}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadSavedEquations();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteClick = (fileName) => {
    setDeleteTarget(fileName);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(latexCode);
    alert("Copied to clipboard!");
  };

  // --- EXTENSIVE DATA LIBRARY ---
  const allEquations = [
    {
      name: "Quadratic Formula",
      latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
    },
    { name: "Pythagorean Theorem", latex: "a^2 + b^2 = c^2" },
    { name: "Euler's Identity", latex: "e^{i\\pi} + 1 = 0" },
    {
      name: "Calculus: Definition of Limit",
      latex: "\\lim_{x \\to a} f(x) = L",
    },
    {
      name: "Calculus: Derivative Definition",
      latex: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}",
    },
    {
      name: "Calculus: Fundamental Thm",
      latex: "\\int_{a}^{b} f(x) \\,dx = F(b) - F(a)",
    },
    {
      name: "Physics: Newton's 2nd Law",
      latex: "\\vec{F} = \\frac{d\\vec{p}}{dt} = m\\vec{a}",
    },
    { name: "Physics: Mass-Energy", latex: "E = mc^2" },
    {
      name: "Physics: Schrödinger Eq",
      latex: "i\\hbar\\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi",
    },
    {
      name: "Physics: Maxwell (Gauss)",
      latex: "\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\epsilon_0}",
    },
    {
      name: "Physics: Maxwell (Faraday)",
      latex:
        "\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}",
    },
    {
      name: "Physics: Heisenberg Uncertainty",
      latex: "\\Delta x \\Delta p \\geq \\frac{\\hbar}{2}",
    },
    {
      name: "Stats: Normal Distribution",
      latex:
        "f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}",
    },
    {
      name: "Stats: Bayes' Theorem",
      latex: "P(A|B) = \\frac{P(B|A)P(A)}{P(B)}",
    },
    {
      name: "Stats: Standard Deviation",
      latex: "\\sigma = \\sqrt{\\frac{\\sum(x_i - \\mu)^2}{N}}",
    },
    { name: "Chem: Ideal Gas Law", latex: "PV = nRT" },
    {
      name: "Chem: Gibbs Free Energy",
      latex: "\\Delta G = \\Delta H - T\\Delta S",
    },
    {
      name: "Chem: Equilibrium Constant",
      latex: "K_c = \\frac{[C]^c[D]^d}{[A]^a[B]^b}",
    },
    {
      name: "Chem: Photosynthesis",
      latex: "6CO_2 + 6H_2O \\xrightarrow{h\\nu} C_6H_{12}O_6 + 6O_2",
    },
    {
      name: "Algebra: Binomial Thm",
      latex: "(x+y)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^{n-k} y^k",
    },
    { name: "Algebra: Diff of Squares", latex: "a^2 - b^2 = (a-b)(a+b)" },
    { name: "Trig: Identity", latex: "\\sin^2\\theta + \\cos^2\\theta = 1" },
    {
      name: "Trig: Law of Cosines",
      latex: "c^2 = a^2 + b^2 - 2ab\\cos\\gamma",
    },
    {
      name: "Fourier Transform",
      latex:
        "\\hat{f}(\\xi) = \\int_{-\\infty}^{\\infty} f(x) e^{-2\\pi i x \\xi} \\,dx",
    },
    {
      name: "Navier-Stokes (Momentum)",
      latex:
        "\\rho \\left(\\frac{\\partial \\mathbf{v}}{\\partial t} + \\mathbf{v} \\cdot \\nabla \\mathbf{v}\\right) = -\\nabla p + \\mu \\nabla^2 \\mathbf{v} + \\mathbf{f}",
    },
    {
      name: "Black-Scholes Equation",
      latex:
        "\\frac{\\partial V}{\\partial t} + \\frac{1}{2}\\sigma^2 S^2 \\frac{\\partial^2 V}{\\partial S^2} + rS \\frac{\\partial V}{\\partial S} - rV = 0",
    },
    {
      name: "Information Entropy",
      latex: "H(X) = -\\sum_{i=1}^{n} P(x_i) \\log P(x_i)",
    },
    {
      name: "Relativity: Time Dilation",
      latex: "\\Delta t' = \\frac{\\Delta t}{\\sqrt{1 - v^2/c^2}}",
    },
    { name: "Complex: Roots of Unity", latex: "z_k = e^{2\\pi i k / n}" },
    {
      name: "Series: Taylor",
      latex: "f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x-a)^n",
    },
  ];

  const allSymbols = [
    {
      category: "Basic Arithmetic",
      items: [
        { symbol: "+", latex: "+" },
        { symbol: "-", latex: "-" },
        { symbol: "×", latex: "\\times" },
        { symbol: "⋅", latex: "\\cdot" },
        { symbol: "÷", latex: "\\div" },
        { symbol: "=", latex: "=" },
        { symbol: "≠", latex: "\\neq" },
        { symbol: "≈", latex: "\\approx" },
        { symbol: "±", latex: "\\pm" },
        { symbol: "∓", latex: "\\mp" },
        { symbol: "∞", latex: "\\infty" },
        { symbol: "∝", latex: "\\propto" },
      ],
    },
    {
      category: "Fractions & Roots",
      items: [
        { symbol: "a/b", latex: "\\frac{⟨num⟩}{⟨den⟩}", name: "Fraction" },
        {
          symbol: "∂f/∂x",
          latex: "\\frac{\\partial ⟨f⟩}{\\partial ⟨x⟩}",
          name: "Partial Frac",
        },
        { symbol: "dy/dx", latex: "\\frac{d⟨y⟩}{d⟨x⟩}", name: "Derivative" },
        { symbol: "√", latex: "\\sqrt{⟨x⟩}", name: "Sqrt" },
        { symbol: "∛", latex: "\\sqrt[3]{⟨x⟩}", name: "Cube Rt" },
        { symbol: "ⁿ√", latex: "\\sqrt[⟨n⟩]{⟨x⟩}", name: "N-th Rt" },
        { symbol: "x²", latex: "^{⟨2⟩}", name: "Superscript" },
        { symbol: "x₁", latex: "_{⟨1⟩}", name: "Subscript" },
        { symbol: "x₁²", latex: "_{⟨sub⟩}^{⟨sup⟩}", name: "Sub+Sup" },
      ],
    },
    {
      category: "Calculus",
      items: [
        { symbol: "∫", latex: "\\int_{⟨a⟩}^{⟨b⟩}", name: "Definite Int" },
        { symbol: "∫", latex: "\\int", name: "Indefinite Int" },
        { symbol: "∮", latex: "\\oint", name: "Contour Int" },
        { symbol: "∑", latex: "\\sum_{⟨i⟩=⟨0⟩}^{⟨n⟩}", name: "Sum" },
        { symbol: "∏", latex: "\\prod_{⟨i⟩=⟨1⟩}^{⟨n⟩}", name: "Product" },
        { symbol: "lim", latex: "\\lim_{⟨x⟩ \\to ⟨a⟩}", name: "Limit" },
        { symbol: "∇", latex: "\\nabla", name: "Nabla/Del" },
        { symbol: "∂", latex: "\\partial", name: "Partial" },
        { symbol: "′", latex: "'", name: "Prime" },
        { symbol: "″", latex: "''", name: "Double Prime" },
      ],
    },
    {
      category: "Greek Lowercase",
      items: [
        { symbol: "α", latex: "\\alpha" },
        { symbol: "β", latex: "\\beta" },
        { symbol: "γ", latex: "\\gamma" },
        { symbol: "δ", latex: "\\delta" },
        { symbol: "ε", latex: "\\epsilon" },
        { symbol: "ζ", latex: "\\zeta" },
        { symbol: "η", latex: "\\eta" },
        { symbol: "θ", latex: "\\theta" },
        { symbol: "ι", latex: "\\iota" },
        { symbol: "κ", latex: "\\kappa" },
        { symbol: "λ", latex: "\\lambda" },
        { symbol: "μ", latex: "\\mu" },
        { symbol: "ν", latex: "\\nu" },
        { symbol: "ξ", latex: "\\xi" },
        { symbol: "π", latex: "\\pi" },
        { symbol: "ρ", latex: "\\rho" },
        { symbol: "σ", latex: "\\sigma" },
        { symbol: "τ", latex: "\\tau" },
        { symbol: "υ", latex: "\\upsilon" },
        { symbol: "φ", latex: "\\phi" },
        { symbol: "χ", latex: "\\chi" },
        { symbol: "ψ", latex: "\\psi" },
        { symbol: "ω", latex: "\\omega" },
      ],
    },
    {
      category: "Greek Uppercase",
      items: [
        { symbol: "Γ", latex: "\\Gamma" },
        { symbol: "Δ", latex: "\\Delta" },
        { symbol: "Θ", latex: "\\Theta" },
        { symbol: "Λ", latex: "\\Lambda" },
        { symbol: "Ξ", latex: "\\Xi" },
        { symbol: "Π", latex: "\\Pi" },
        { symbol: "Σ", latex: "\\Sigma" },
        { symbol: "Φ", latex: "\\Phi" },
        { symbol: "Ψ", latex: "\\Psi" },
        { symbol: "Ω", latex: "\\Omega" },
      ],
    },
    {
      category: "Geometry & Trig",
      items: [
        { symbol: "sin", latex: "\\sin(⟨x⟩)" },
        { symbol: "cos", latex: "\\cos(⟨x⟩)" },
        { symbol: "tan", latex: "\\tan(⟨x⟩)" },
        { symbol: "csc", latex: "\\csc(⟨x⟩)" },
        { symbol: "sec", latex: "\\sec(⟨x⟩)" },
        { symbol: "cot", latex: "\\cot(⟨x⟩)" },
        { symbol: "∠", latex: "\\angle" },
        { symbol: "°", latex: "^{\\circ}" },
        { symbol: "⊥", latex: "\\perp" },
        { symbol: "∥", latex: "\\parallel" },
        { symbol: "△", latex: "\\triangle" },
        { symbol: "≅", latex: "\\cong" },
        { symbol: "∼", latex: "\\sim" },
      ],
    },
    {
      category: "Matrices & Brackets",
      items: [
        {
          symbol: "[ ]",
          latex: "\\begin{bmatrix} ⟨a⟩ & ⟨b⟩ \\\\ ⟨c⟩ & ⟨d⟩ \\end{bmatrix}",
          name: "Bracket Mat",
        },
        {
          symbol: "( )",
          latex: "\\begin{pmatrix} ⟨a⟩ & ⟨b⟩ \\\\ ⟨c⟩ & ⟨d⟩ \\end{pmatrix}",
          name: "Paren Mat",
        },
        {
          symbol: "| |",
          latex: "\\begin{vmatrix} ⟨a⟩ & ⟨b⟩ \\\\ ⟨c⟩ & ⟨d⟩ \\end{vmatrix}",
          name: "Determinant",
        },
        { symbol: "{ }", latex: "\\{ ⟨x⟩ \\}", name: "Curly" },
        { symbol: "⟨ ⟩", latex: "\\langle ⟨x⟩ \\rangle", name: "Angle" },
        {
          symbol: "cases",
          latex:
            "\\begin{cases} ⟨exp1⟩ & \\text{if } ⟨c1⟩ \\\\ ⟨exp2⟩ & \\text{if } ⟨c2⟩ \\end{cases}",
          name: "Cases",
        },
      ],
    },
    {
      category: "Sets & Logic",
      items: [
        { symbol: "∀", latex: "\\forall" },
        { symbol: "∃", latex: "\\exists" },
        { symbol: "∄", latex: "\\nexists" },
        { symbol: "∈", latex: "\\in" },
        { symbol: "∉", latex: "\\notin" },
        { symbol: "⊂", latex: "\\subset" },
        { symbol: "⊆", latex: "\\subseteq" },
        { symbol: "∪", latex: "\\cup" },
        { symbol: "∩", latex: "\\cap" },
        { symbol: "∅", latex: "\\emptyset" },
        { symbol: "⇒", latex: "\\implies" },
        { symbol: "⇔", latex: "\\iff" },
        { symbol: "∧", latex: "\\land" },
        { symbol: "∨", latex: "\\lor" },
        { symbol: "¬", latex: "\\neg" },
        { symbol: "∴", latex: "\\therefore" },
        { symbol: "ℝ", latex: "\\mathbb{R}" },
        { symbol: "ℤ", latex: "\\mathbb{Z}" },
        { symbol: "ℕ", latex: "\\mathbb{N}" },
        { symbol: "ℚ", latex: "\\mathbb{Q}" },
        { symbol: "ℂ", latex: "\\mathbb{C}" },
      ],
    },
    {
      category: "Physics & Chemistry",
      items: [
        { symbol: "ℏ", latex: "\\hbar" },
        { symbol: "Å", latex: "\\AA" },
        { symbol: "vec", latex: "\\vec{⟨v⟩}" },
        { symbol: "hat", latex: "\\hat{⟨n⟩}" },
        { symbol: "dot", latex: "\\dot{⟨x⟩}" },
        { symbol: "ddot", latex: "\\ddot{⟨x⟩}" },
        { symbol: "bar", latex: "\\bar{⟨x⟩}" },
        { symbol: "Ω", latex: "\\Omega" },
        { symbol: "μ₀", latex: "\\mu_0" },
        { symbol: "ε₀", latex: "\\epsilon_0" },
        { symbol: "→", latex: "\\rightarrow" },
        { symbol: "⇌", latex: "\\rightleftharpoons" },
        { symbol: "↑", latex: "\\uparrow" },
        { symbol: "↓", latex: "\\downarrow" },
        { symbol: "Δ", latex: "\\Delta" },
        { symbol: "Iso", latex: "^{⟨A⟩}_{⟨Z⟩}\\text{⟨El⟩}" },
        { symbol: "M", latex: "\\text{M}" },
        { symbol: "⦵", latex: "^{\\ominus}" },
      ],
    },
  ];

  // Filtering Logic
  const filteredSymbols = allSymbols
    .map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.latex.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.name &&
            item.name.toLowerCase().includes(searchTerm.toLowerCase())),
      ),
    }))
    .filter((cat) => cat.items.length > 0);

  const filteredEquations = allEquations.filter(
    (eq) =>
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.latex.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const toggleCategory = (cat) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const filteredSavedEquations = Array.isArray(savedEquations)
    ? savedEquations.filter((eq) => {
      if (!savedEquationSearch) return true;
      const name = eq.fileName || "";
      return name.toLowerCase().includes(savedEquationSearch.toLowerCase());
    })
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm font-sans transition-all duration-300">
      <div className={`rounded-xl shadow-2xl border w-[95vw] max-w-7xl h-[90vh] flex flex-col overflow-hidden transition-all duration-300 ${isDark ? "bg-[#1a1a1a] border-[#333]" : "bg-white border-gray-300"
        }`}>
        {/* --- HEADER --- */}
        <div className={`flex justify-between items-center px-6 py-4 border-b transition-all duration-300 ${isDark ? "bg-[#1a1a1a] border-[#333]" : "bg-white border-gray-200"
          }`}>
          <div className="flex items-center gap-6">
            <h2 className={`text-xl font-bold flex items-center gap-2 transition-colors ${isDark ? "text-white" : "text-gray-900"
              }`}>
              <TbMathFunction className={isDark ? "text-blue-400" : "text-gray-700"} /> Easy Math Input
            </h2>
            <div className={`flex p-1 rounded-lg transition-colors ${isDark ? "bg-[#2d2d2d]" : "bg-gray-100"
              }`}>
              <button
                onClick={() => setActiveTab("editor")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "editor"
                  ? (isDark ? "bg-[#444] text-white shadow-sm" : "bg-white text-black shadow-sm")
                  : (isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900")
                  }`}
              >
                Editor
              </button>
              <button
                onClick={() => setActiveTab("saved")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "saved"
                  ? (isDark ? "bg-[#444] text-white shadow-sm" : "bg-white text-black shadow-sm")
                  : (isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900")
                  }`}
              >
                Saved Library
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`transition-colors p-1 rounded-full ${isDark ? "text-gray-400 hover:text-white hover:bg-[#333]" : "text-gray-400 hover:text-gray-900 hover:bg-gray-100"
              }`}
          >
            <TbX size={24} />
          </button>
        </div>

        {/* --- MAIN CONTENT --- */}
        <div
          className={`flex flex-1 overflow-hidden transition-colors ${activeTab === "saved" ? (isDark ? "bg-[#121212]" : "bg-gray-50") : (isDark ? "bg-[#1a1a1a]" : "bg-white")
            }`}
        >
          {/* --- LEFT PANEL (Library) --- */}
          {activeTab === "editor" && (
            <div className={`w-[280px] flex-shrink-0 border-r flex flex-col transition-colors ${isDark ? "bg-[#121212] border-[#333]" : "bg-gray-50 border-gray-200"
              }`}>
              {/* Mode Selector */}
              <div className="p-4 pb-2">
                <div className="relative">
                  <select
                    value={leftPanelMode}
                    onChange={(e) => setLeftPanelMode(e.target.value)}
                    className={`w-full appearance-none border py-2.5 px-4 pr-8 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-opacity-50 cursor-pointer shadow-sm transition-all ${isDark
                        ? "bg-[#2d2d2d] border-[#444] text-white focus:ring-blue-500"
                        : "bg-white border-gray-300 text-gray-900 focus:ring-gray-400"
                      }`}
                  >
                    <option value="symbols">Math Symbols</option>
                    <option value="equations">Common Equations</option>
                  </select>
                  <TbChevronDown className={`absolute right-3 top-3 pointer-events-none transition-colors ${isDark ? "text-gray-400" : "text-gray-500"
                    }`} />
                </div>

                {/* Search */}
                <div className="relative mt-3">
                  <TbSearch className={`absolute left-3 top-2.5 transition-colors ${isDark ? "text-gray-500" : "text-gray-400"
                    }`} />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={
                      leftPanelMode === "symbols"
                        ? "Search symbols..."
                        : "Search equations..."
                    }
                    className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all ${isDark
                        ? "bg-[#2d2d2d] border-[#444] text-white placeholder:text-gray-600 focus:ring-blue-500"
                        : "bg-white border-gray-300 focus:ring-gray-400"
                      }`}
                  />
                </div>
              </div>

              {/* Content List */}
              <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
                {leftPanelMode === "symbols" ? (
                  <div className="space-y-4">
                    {filteredSymbols.map((cat, idx) => (
                      <div
                        key={idx}
                        className={`rounded-lg border overflow-hidden shadow-sm transition-all ${isDark ? "bg-[#1a1a1a] border-[#333]" : "bg-white border-gray-200"
                          }`}
                      >
                        <button
                          onClick={() => toggleCategory(cat.category)}
                          className={`w-full flex justify-between items-center px-3 py-2 text-xs font-bold uppercase transition-colors ${isDark
                              ? "bg-[#333] hover:bg-[#444] text-gray-400"
                              : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                            }`}
                        >
                          {cat.category}
                          <TbChevronDown
                            className={`transition-transform duration-200 ${expandedCategories.has(cat.category) ? "rotate-180" : ""}`}
                          />
                        </button>

                        {expandedCategories.has(cat.category) && (
                          <div className="grid grid-cols-4 gap-1 p-2">
                            {cat.items.map((item, i) => (
                              <button
                                key={i}
                                onClick={() => insertAtCursor(item.latex)}
                                className={`aspect-square flex flex-col items-center justify-center p-1 rounded border border-transparent transition-all group ${isDark
                                    ? "text-gray-300 hover:bg-[#333] hover:text-blue-400"
                                    : "hover:bg-gray-100 hover:text-black"
                                  }`}
                                title={item.name || item.latex}
                              >
                                <span className="text-lg leading-none font-serif">
                                  {item.symbol}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredEquations.map((eq, idx) => (
                      <button
                        key={idx}
                        onClick={() => insertAtCursor(eq.latex)}
                        className={`w-full text-left p-3 border rounded-lg transition-all group ${isDark
                            ? "bg-[#1a1a1a] border-[#333] hover:border-blue-500 hover:shadow-lg hover:shadow-blue-900/10"
                            : "bg-white border-gray-200 hover:border-gray-400 hover:shadow-md"
                          }`}
                      >
                        <div className={`text-xs font-bold mb-1 transition-colors ${isDark ? "text-gray-500 group-hover:text-blue-400" : "text-gray-500 group-hover:text-black"
                          }`}>
                          {eq.name}
                        </div>
                        <div className={`font-mono text-sm truncate transition-colors ${isDark ? "text-gray-300" : "text-gray-800"
                          }`}>
                          {eq.latex}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- RIGHT PANEL (Editor + Preview) --- */}
          {activeTab === "editor" ? (
            <div className={`flex-1 flex flex-col transition-colors ${isDark ? "bg-[#1a1a1a]" : "bg-white"}`}>
              {/* 1. UPPER SECTION: EDITOR TOOLBAR + TEXTAREA */}
              <div className="flex-grow flex flex-col p-6 min-h-[50%]">
                {/* Toolbar */}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-bold px-3 py-1 rounded-full flex items-center gap-2 transition-colors ${isAiMode
                          ? (isDark ? "bg-purple-900/30 text-purple-400" : "bg-purple-100 text-purple-700")
                          : (isDark ? "bg-[#2d2d2d] text-gray-400" : "bg-gray-100 text-gray-700")
                        }`}
                    >
                      {isAiMode ? (
                        <TbRobot className={isDark ? "text-purple-400" : "text-purple-600"} />
                      ) : (
                        <TbCode className={isDark ? "text-gray-400" : "text-gray-600"} />
                      )}
                      {isAiMode ? "AI Mode" : "LaTeX Builder"}
                    </span>
                    <button
                      onClick={() => setIsAiMode(!isAiMode)}
                      className={`text-xs font-medium hover:underline transition-colors ${isAiMode ? "text-purple-500" : (isDark ? "text-gray-500" : "text-gray-500")}`}
                    >
                      Switch to {isAiMode ? "Manual Builder" : "AI Assistant"}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={copyToClipboard}
                      className={`p-2 rounded-lg transition-all border border-transparent ${isDark
                          ? "text-gray-400 hover:bg-[#333] hover:border-[#444] hover:text-white"
                          : "text-gray-600 hover:bg-gray-100 hover:border-gray-200"
                        }`}
                      title="Copy Code"
                    >
                      <TbCopy size={18} />
                    </button>
                    <button
                      onClick={() => setShowSaveDialog(true)}
                      className={`p-2 rounded-lg transition-all border border-transparent ${isDark
                          ? "text-gray-400 hover:bg-[#333] hover:border-[#444] hover:text-white"
                          : "text-gray-600 hover:bg-gray-100 hover:border-gray-200"
                        }`}
                      title="Save to Library"
                    >
                      <TbDeviceFloppy size={18} />
                    </button>
                    {!isAiMode && (
                      <button
                        onClick={() => handleCompile()}
                        disabled={isCompiling}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isDark
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-black text-white hover:bg-gray-800"
                          }`}
                      >
                        {isCompiling ? (
                          <TbLoader className="animate-spin" />
                        ) : (
                          <TbPlayerPlay />
                        )}
                        Compile
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Editor Input */}
                <div
                  className={`relative flex-grow rounded-xl border shadow-inner overflow-hidden focus-within:ring-2 focus-within:ring-opacity-50 transition-all ${isAiMode
                      ? (isDark ? "border-purple-800 bg-purple-900/10 focus-within:ring-purple-600" : "border-purple-200 focus-within:ring-purple-500 bg-purple-50/20")
                      : (isDark ? "border-[#333] bg-[#121212] focus-within:ring-blue-500" : "border-gray-300 bg-gray-50 focus-within:ring-gray-400")
                    }`}
                >
                  {isAiMode ? (
                    <div className="h-full w-full relative">
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAiGenerate();
                          }
                        }}
                        className={`h-full w-full p-5 bg-transparent resize-none outline-none text-base transition-colors ${isDark ? "text-gray-100 placeholder-purple-800" : "text-gray-800 placeholder-purple-300"
                          }`}
                        placeholder="Describe your equation (e.g. 'Schrodinger equation for a free particle')..."
                        autoFocus
                      />
                      <button
                        onClick={handleAiGenerate}
                        disabled={isGenerating || !aiPrompt.trim()}
                        className={`absolute bottom-4 right-4 p-3 rounded-xl shadow-lg transition-all hover:scale-105 flex items-center gap-2 font-medium disabled:opacity-50 ${isDark ? "bg-purple-700 text-white hover:bg-purple-600" : "bg-purple-600 text-white hover:bg-purple-700"
                          }`}
                      >
                        {isGenerating ? (
                          <TbLoader className="animate-spin" />
                        ) : (
                          <>
                            <TbRobot /> Generate
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <textarea
                      ref={textareaRef}
                      value={latexCode}
                      onChange={(e) => setLatexCode(e.target.value)}
                      className={`h-full w-full p-5 bg-transparent resize-none outline-none font-mono text-sm leading-relaxed transition-colors ${isDark ? "text-blue-300 placeholder-gray-700" : "text-gray-900 placeholder-gray-400"
                        }`}
                      placeholder="Click symbols on the left to insert. Placeholders ⟨x⟩ allow smart nesting..."
                      spellCheck={false}
                    />
                  )}
                </div>
              </div>

              {/* 2. LOWER SECTION: PREVIEW AREA */}
              <div className={`h-[35%] border-t flex flex-col p-6 pt-0 transition-colors ${isDark ? "bg-[#1a1a1a] border-[#333]" : "bg-white border-gray-200"
                }`}>
                <div className="flex items-center gap-2 mb-2 pt-4">
                  <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${isDark ? "text-gray-500" : "text-gray-400"
                    }`}>
                    Live Preview
                  </span>
                  <div className={`flex-1 h-px transition-colors ${isDark ? "bg-[#333]" : "bg-gray-100"}`}></div>
                </div>

                <div className={`flex-1 rounded-xl border-2 border-dashed flex items-center justify-center relative overflow-hidden transition-colors ${isDark ? "bg-white border-[#333]" : "bg-gray-50/30 border-gray-200"
                  }`}>
                  {isCompiling || isGenerating ? (
                    <div className="flex flex-col items-center text-gray-400 animate-pulse">
                      <TbLoader size={32} className="animate-spin mb-2" />
                      <span className="text-sm font-medium">
                        {isGenerating
                          ? "AI is thinking..."
                          : "Rendering LaTeX..."}
                      </span>
                    </div>
                  ) : previewUrl ? (
                    previewUrl.includes(".pdf") ? (
                      <iframe
                        src={previewUrl}
                        className="w-full h-full border-none"
                        title="PDF Preview"
                      />
                    ) : (
                      <img
                        src={previewUrl}
                        className="max-w-[90%] max-h-[90%] object-contain"
                        alt="Equation Preview"
                      />
                    )
                  ) : (
                    <div className="text-center text-gray-400">
                      <TbMathFunction
                        size={40}
                        className="mx-auto mb-2 opacity-20"
                      />
                      <p className="text-sm opacity-50">
                        Preview will appear here
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // --- SAVED TAB CONTENT ---
            <div className={`flex-1 p-8 overflow-y-auto overflow-x-hidden transition-colors ${isDark ? "bg-[#121212]" : ""}`}>
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 relative">
                    <TbSearch className={`absolute left-3 top-3 transition-colors ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                    <input
                      value={savedEquationSearch}
                      onChange={(e) => setSavedEquationSearch(e.target.value)}
                      placeholder="Search your library..."
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg outline-none transition-all ${isDark
                          ? "bg-[#2d2d2d] border-[#444] text-white focus:ring-2 focus:ring-blue-500 placeholder:text-gray-600"
                          : "bg-white border-gray-300 focus:ring-2 focus:ring-gray-400"
                        }`}
                    />
                  </div>
                </div>

                <div className="grid gap-4 max-w-4xl mx-auto">
                  {filteredSavedEquations.map((eq, i) => (
                    <div
                      key={i}
                      className={`border rounded-xl p-4 flex items-center justify-between transition-all group min-w-0 ${isDark
                          ? "bg-[#1a1a1a] border-[#333] hover:border-blue-500 hover:shadow-lg hover:shadow-black/20"
                          : "bg-white border-gray-200 hover:shadow-md"
                        }`}
                    >
                      <div className="flex-1 min-w-0 mr-6">
                        <h4 className={`font-bold mb-1 transition-colors ${isDark ? "text-white" : "text-gray-800"}`}>
                          {eq.fileName}
                        </h4>

                        <div className={`font-mono text-xs p-1.5 rounded border overflow-hidden whitespace-nowrap text-ellipsis max-w-full transition-colors ${isDark
                            ? "bg-[#121212] border-[#333] text-blue-400"
                            : "bg-gray-50 border-gray-100 text-gray-500"
                          }`}>
                          {eq.latex}
                        </div>

                        {/* Inline Preview */}
                        {cardPreviewUrl?.fileName === eq.fileName && (
                          <div className={`mt-3 border rounded-lg p-3 flex justify-center transition-colors ${isDark ? "bg-white border-[#333]" : "bg-gray-50 border-gray-200"
                            }`}>
                            <img
                              src={cardPreviewUrl.url}
                              alt="Equation Preview"
                              className={`max-h-24 object-contain ${isDark ? "brightness-110" : ""}`}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCardPreview(eq)}
                          className={`p-2 rounded-lg border border-transparent transition-colors ${isDark ? "text-orange-400 hover:bg-orange-900/30 hover:border-orange-800" : "text-orange-500 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-200"
                            }`}
                          title="Preview"
                        >
                          {cardPreviewLoading === eq.fileName ? (
                            <TbLoader className="animate-spin" size={18} />
                          ) : (
                            <TbPlayerPlay size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(eq.latex);
                            alert("Copied");
                          }}
                          className={`p-2 rounded-lg border border-transparent transition-colors ${isDark ? "text-gray-400 hover:text-white hover:bg-[#333] hover:border-[#444]" : "text-gray-500 hover:text-black hover:bg-gray-100 hover:border-gray-200"
                            }`}
                        >
                          <TbCopy size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setLatexCode(eq.latex);
                            setActiveTab("editor");
                            setIsAiMode(false);
                          }}
                          className={`p-2 rounded-lg border border-transparent transition-colors ${isDark ? "text-gray-400 hover:text-white hover:bg-[#333] hover:border-[#444]" : "text-gray-500 hover:text-black hover:bg-gray-100 hover:border-gray-200"
                            }`}
                        >
                          <TbFolder size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(eq.fileName)}
                          className={`p-2 rounded-lg border border-transparent transition-colors ${isDark ? "text-gray-400 hover:text-red-400 hover:bg-red-900/30 hover:border-red-900" : "text-gray-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100"
                            }`}
                          title="Delete"
                        >
                          <TbTrash size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredSavedEquations.length === 0 && (
                    <div className="text-center py-10 text-gray-400">
                      Library is empty
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- SAVE DIALOG MODAL --- */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] backdrop-blur-sm">
            <div className={`rounded-xl p-6 w-96 shadow-2xl transform transition-all scale-100 border transition-colors duration-300 ${isDark ? "bg-[#2d2d2d] border-[#444]" : "bg-white border-gray-100"
              }`}>
              <h3 className={`text-lg font-bold mb-4 transition-colors ${isDark ? "text-white" : "text-gray-900"}`}>
                Save to Library
              </h3>
              <input
                value={saveFileName}
                onChange={(e) => setSaveFileName(e.target.value)}
                className={`w-full p-3 border rounded-lg mb-4 outline-none transition-all ${isDark
                  ? "bg-[#1a1a1a] border-[#444] text-white focus:ring-2 focus:ring-blue-500 placeholder:text-gray-700"
                  : "bg-white border-gray-300 focus:ring-2 focus:ring-gray-500"
                  }`}
                placeholder="Name your equation..."
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? "text-gray-400 hover:bg-[#333]" : "text-gray-600 hover:bg-gray-100"
                    }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEquation}
                  className={`px-4 py-2 rounded-lg font-medium shadow-sm transition-all active:scale-95 ${isDark ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-black text-white hover:bg-gray-800"
                    }`}
                >
                  Save Equation
                </button>
              </div>
            </div>
          </div>
        )}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] backdrop-blur-sm">
            <div className={`rounded-xl p-6 w-96 shadow-2xl border transition-colors duration-300 ${isDark ? "bg-[#2d2d2d] border-[#444]" : "bg-white border-gray-100"
              }`}>
              <h3 className={`text-lg font-bold mb-3 transition-colors ${isDark ? "text-white" : "text-gray-900"}`}>
                Delete Equation
              </h3>

              <p className={`text-sm mb-6 transition-colors ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Are you sure you want to delete
                <span className={`font-semibold ${isDark ? "text-white" : ""}`}> "{deleteTarget}"</span>? This
                action cannot be undone.
              </p>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? "text-gray-400 hover:bg-[#333]" : "text-gray-600 hover:bg-gray-100"
                    }`}
                >
                  Cancel
                </button>

                <button
                  onClick={async () => {
                    await handleDeleteEquation(deleteTarget);
                    setDeleteTarget(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-all active:scale-95 shadow-lg shadow-red-900/20"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EasyMathInput;
