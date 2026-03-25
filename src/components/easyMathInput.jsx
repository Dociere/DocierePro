import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/useAuth";
import { useNavigate } from "react-router-dom";
import {
  TbX,
  TbCopy,
  TbSearch,
  TbPlayerPlay,
  TbDeviceFloppy,
  TbChevronDown,
  TbRobot,
  TbArrowUp,
  TbListNumbers,
  TbMath,
  TbLoader,
  TbMathFunction,
  TbCode,
  TbTrash,
  TbFolder,
} from "react-icons/tb";
import { useSettings } from "../context/useSettings";
import ConfirmModal from "./confirmModal";
import axios from "axios";

const API_BASE_URL = "http://localhost:5000";

const EasyMathInput = ({ onClose, onInsert }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const { settings } = useSettings();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });

  // --- STATE ---
  const [activeTab, setActiveTab] = useState("editor");
  const [latexCode, setLatexCode] = useState("");

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
  const [equationMode, setEquationMode] = useState("numbered");

  const [toastMessage, setToastMessage] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

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

  const getWrappedCode = (raw) => {
    const clean = raw.trim();
    if (!clean) return "";

    // Simple Toggle: Numbered vs Normal (Display)
    if (equationMode === "numbered") {
      return `\\begin{equation}\n${clean}\n\\end{equation}`;
    } else {
      // "Normal" maps to standard unnumbered display math
      return `\\[\n${clean}\n\\]`;
    }
  };

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
      setErrorModal({
        isOpen: true,
        title: "Compile Error",
        message: `Error: ${e.message}`,
      });
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

    // 1. Check for active AI configuration
    const activeConfig = settings?.app?.aiConfigs?.find((c) => c.active);
    if (!activeConfig) {
      setShowConfigModal(true); // Trigger modal instead of alert
      return;
    }

    // 2. Prepare clean config (Python fetches the real key via userId)
    const cleanConfig = { ...activeConfig };
    if (cleanConfig.apiKey === "********") {
      delete cleanConfig.apiKey;
    }

    setIsGenerating(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/generate-equation`,
        {
          prompt: aiPrompt,
          aiConfig: cleanConfig,
        },
        { withCredentials: true }, // Critical for Python to access session cookies
      );

      if (res.data.success) {
        setLatexCode(res.data.latexEquation);
        setIsAiMode(false);
        setAiPrompt("");

        // Trigger a local compile for the preview
        setTimeout(async () => {
          setIsCompiling(true);
          const url = await compileLatex(res.data.latexEquation);
          if (url) setPreviewUrl(`${url}?t=${Date.now()}`);
          setIsCompiling(false);
        }, 100);
      } else {
        setErrorModal({
          isOpen: true,
          title: "AI Generation Failed",
          message:
            res.data.error || "The AI could not process your equation request.",
        });
      }
    } catch (e) {
      setErrorModal({
        isOpen: true,
        title: "Connection Error",
        message:
          "Could not connect to the AI service. Please check if the server is running.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveEquation = async () => {
    if (!saveFileName.trim()) {
      setErrorModal({
        isOpen: true,
        title: "Name Required",
        message: "Enter filename",
      });
      return;
    }
    try {
      await fetch(`${API_BASE_URL}/api/equations/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: saveFileName, latex: latexCode }),
      });
      setShowSaveDialog(false);
      loadSavedEquations();
    } catch (e) {
      setErrorModal({ isOpen: true, title: "Save Error", message: e.message });
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
    const finalCode = getWrappedCode(latexCode);
    navigator.clipboard.writeText(finalCode);

    // 👇 UPDATE: Simplified Toast Text
    const modeText = equationMode === "numbered" ? "Numbered Eq" : "Normal Eq";
    setToastMessage(`✓ Copied as ${modeText}`);

    setTimeout(() => setToastMessage(null), 2000);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm font-sans">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-300 w-[95vw] max-w-7xl h-[90vh] flex flex-col overflow-hidden">
        {/* --- HEADER --- */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 font-inter">
              <TbMathFunction className="text-gray-700" /> Equation Generator
            </h2>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("editor")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "editor" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              >
                Editor
              </button>
              <button
                onClick={() => setActiveTab("saved")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === "saved" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              >
                Saved Library
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <TbX size={24} />
          </button>
        </div>

        {/* --- MAIN CONTENT --- */}
        <div
          className={`flex flex-1 overflow-hidden ${activeTab === "saved" ? "bg-gray-50" : ""}`}
        >
          {/* --- LEFT PANEL (Library) --- */}
          {activeTab === "editor" && (
            <div className="w-[280px] flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">
              {/* Mode Selector */}
              <div className="p-4 pb-2">
                <div className="relative">
                  <select
                    value={leftPanelMode}
                    onChange={(e) => setLeftPanelMode(e.target.value)}
                    className="w-full appearance-none bg-white border border-gray-300 text-gray-900 py-2.5 px-4 pr-8 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer shadow-sm"
                  >
                    <option value="symbols">Math Symbols</option>
                    <option value="equations">Common Equations</option>
                  </select>
                  <TbChevronDown className="absolute right-3 top-3 text-gray-500 pointer-events-none" />
                </div>

                {/* Search */}
                <div className="relative mt-3">
                  <TbSearch className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={
                      leftPanelMode === "symbols"
                        ? "Search symbols..."
                        : "Search equations..."
                    }
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
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
                        className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
                      >
                        <button
                          onClick={() => toggleCategory(cat.category)}
                          className="w-full flex justify-between items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-600 uppercase transition-colors"
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
                                className="aspect-square flex flex-col items-center justify-center p-1 rounded hover:bg-gray-100 hover:text-black border border-transparent transition-all group"
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
                        className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-md transition-all group"
                      >
                        <div className="text-xs font-bold text-gray-500 group-hover:text-black mb-1">
                          {eq.name}
                        </div>
                        <div className="font-mono text-sm text-gray-800 truncate">
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
            <div className="flex-1 flex flex-col bg-white">
              {/* 1. UPPER SECTION: EDITOR TOOLBAR + TEXTAREA */}
              <div className="flex-grow flex flex-col p-6 min-h-[50%]">
                {/* Toolbar */}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-bold px-3 py-1 rounded-full flex items-center gap-2 transition-colors ${isAiMode ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-700"}`}
                    >
                      {isAiMode ? (
                        <TbRobot className="text-purple-600" />
                      ) : (
                        <TbCode className="text-gray-600" />
                      )}
                      {isAiMode ? "AI Mode" : "LaTeX Builder"}
                    </span>
                    <button
                      onClick={() => {
                        if (!isAiMode && !isAuthenticated) {
                          setShowAuthModal(true);
                        } else {
                          setIsAiMode(!isAiMode);
                        }
                      }}
                      className={`text-xs font-medium hover:underline ${isAiMode ? "text-purple-600" : "text-gray-500"}`}
                    >
                      Switch to {isAiMode ? "Manual Builder" : "AI Assistant"}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative group h-full">
                      <select
                        value={equationMode}
                        onChange={(e) => setEquationMode(e.target.value)}
                        className="appearance-none bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs py-2 pl-3 pr-8 rounded-lg cursor-pointer outline-none focus:ring-2 focus:ring-gray-300 transition-colors h-full"
                      >
                        <option value="numbered">Numbered (1)</option>
                        <option value="normal">Normal</option>
                      </select>
                      <TbChevronDown
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                        size={14}
                      />
                    </div>
                    <button
                      onClick={copyToClipboard}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                      title="Copy Code"
                    >
                      <TbCopy size={18} />
                    </button>
                    <button
                      onClick={() => setShowSaveDialog(true)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200 flex items-center justify-center"
                      title="Save to Library"
                    >
                      <TbDeviceFloppy size={18} />
                    </button>
                    {onInsert && (
                      <button
                        onClick={() => onInsert(getWrappedCode(latexCode))}
                        className="p-2 text-white bg-black hover:bg-gray-800 rounded-lg transition-colors border border-transparent shadow-sm flex items-center gap-1 font-medium text-xs px-3"
                        title="Insert into Document"
                      >
                        <TbArrowUp size={16} /> Insert
                      </button>
                    )}
                    {!isAiMode && (
                      <button
                        onClick={() => handleCompile()}
                        disabled={isCompiling}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white font-inter rounded-lg hover:bg-gray-800 shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className={`relative flex-grow rounded-xl border shadow-inner overflow-hidden focus-within:ring-2 focus-within:ring-opacity-50 transition-all ${isAiMode ? "border-purple-200 focus-within:ring-purple-500 bg-purple-50/20" : "border-gray-300 bg-gray-50 focus-within:ring-gray-400"}`}
                >
                  {isAiMode ? (
                    <>
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
                          className="h-full w-full p-5 bg-transparent resize-none outline-none text-base text-gray-800 placeholder-purple-300"
                          placeholder="Describe your equation (e.g. 'Schrodinger equation for a free particle')..."
                          autoFocus
                        />
                        <button
                          onClick={handleAiGenerate}
                          disabled={isGenerating || !aiPrompt.trim()}
                          className="absolute bottom-4 right-4 bg-purple-600 text-white p-3 rounded-xl shadow-lg hover:bg-purple-700 disabled:opacity-50 transition-all hover:scale-105 flex items-center gap-2 font-medium"
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
                      <div className="absolute top-2 right-4 text-[10px] text-purple-400 italic">
                        Content generated by AI is purely for reference. We do
                        not promote academic dishonesty.
                      </div>
                    </>
                  ) : (
                    <textarea
                      ref={textareaRef}
                      value={latexCode}
                      onChange={(e) => setLatexCode(e.target.value)}
                      className="h-full w-full p-5 bg-transparent resize-none outline-none font-mono text-sm leading-relaxed text-gray-900 placeholder-gray-400"
                      placeholder="Click symbols on the left to insert. Placeholders ⟨x⟩ allow smart nesting..."
                      spellCheck={false}
                    />
                  )}
                </div>
              </div>

              {/* 2. LOWER SECTION: PREVIEW AREA */}
              <div className="h-[35%] bg-white border-t border-gray-200 flex flex-col p-6 pt-0">
                <div className="flex items-center gap-2 mb-2 pt-4">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Live Preview
                  </span>
                  <div className="flex-1 h-px bg-gray-100"></div>
                </div>

                <div className="flex-1 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/30 flex items-center justify-center relative overflow-hidden">
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
            <div className="flex-1 p-8 overflow-y-auto overflow-x-hidden">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 relative">
                    <TbSearch className="absolute left-3 top-3 text-gray-400" />
                    <input
                      value={savedEquationSearch}
                      onChange={(e) => setSavedEquationSearch(e.target.value)}
                      placeholder="Search your library..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-4 max-w-4xl mx-auto">
                  {filteredSavedEquations.map((eq, i) => (
                    <div
                      key={i}
                      className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow group min-w-0"
                    >
                      <div className="flex-1 min-w-0 mr-6">
                        <h4 className="font-bold text-gray-800 mb-1">
                          {eq.fileName}
                        </h4>

                        <div className="font-mono text-xs text-gray-500 bg-gray-50 p-1.5 rounded border border-gray-100 overflow-hidden whitespace-nowrap text-ellipsis max-w-full">
                          {eq.latex}
                        </div>

                        {/* Inline Preview */}
                        {cardPreviewUrl?.fileName === eq.fileName && (
                          <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 flex justify-center">
                            <img
                              src={cardPreviewUrl.url}
                              alt="Equation Preview"
                              className="max-h-24 object-contain"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCardPreview(eq)}
                          className="p-2 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg border border-transparent hover:border-orange-200"
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
                            setToastMessage("✓ Copied to clipboard");
                            setTimeout(() => setToastMessage(null), 2000);
                          }}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded transition-colors"
                          title="Copy LaTeX"
                        >
                          <TbCopy size={18} />
                        </button>
                        {onInsert && (
                          <button
                            onClick={() => {
                              onInsert(eq.latex);
                              setToastMessage("✓ Inserted into document");
                              setTimeout(() => setToastMessage(null), 2000);
                            }}
                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-white rounded transition-colors"
                            title="Insert to Document"
                          >
                            <TbArrowUp size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setLatexCode(eq.latex);
                            setActiveTab("editor");
                            setIsAiMode(false);
                          }}
                          className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg border border-transparent hover:border-gray-200"
                        >
                          <TbFolder size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(eq.fileName)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100"
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
            <div className="bg-white rounded-xl p-6 w-96 shadow-2xl transform transition-all scale-100 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Save to Library
              </h3>
              <input
                value={saveFileName}
                onChange={(e) => setSaveFileName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-gray-500 outline-none"
                placeholder="Name your equation..."
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEquation}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 font-medium shadow-sm"
                >
                  Save Equation
                </button>
              </div>
            </div>
          </div>
        )}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 w-96 shadow-2xl border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Delete Equation
              </h3>

              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete
                <span className="font-semibold"> "{deleteTarget}"</span>? This
                action cannot be undone.
              </p>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Cancel
                </button>

                <button
                  onClick={async () => {
                    await handleDeleteEquation(deleteTarget);
                    setDeleteTarget(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        <div
          className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-full shadow-xl text-sm font-medium transition-all duration-300 pointer-events-none z-[70] flex items-center gap-2 ${toastMessage ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          {toastMessage}
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80]">
          <div className="bg-white rounded-xl shadow-xl p-8 w-[380px] max-w-full text-center font-inter">
            <div className="text-5xl mb-3">👤</div>
            <h3 className="font-semibold text-lg text-[#343434] mb-1">
              Not Signed In
            </h3>
            <p className="text-sm text-[#7D7D7D] mb-5">
              Sign in to use the AI equation assistant
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate("/login")}
                className="px-5 py-2 bg-[#AB2D2D] text-white rounded-md text-sm hover:bg-[#8a2424] transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate("/signup")}
                className="px-5 py-2 border border-[#CFCFCF] text-[#343434] rounded-md text-sm hover:bg-[#F9F9F9] transition-colors"
              >
                Create Account
              </button>
            </div>
            <button
              onClick={() => setShowAuthModal(false)}
              className="mt-4 text-xs text-[#7D7D7D] hover:text-[#343434] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={showConfigModal}
        onConfirm={() => {
          setShowConfigModal(false);
          navigate("/settings");
        }}
        onCancel={() => setShowConfigModal(false)}
        title="AI Configuration Required"
        message="No active AI Configuration found. Please set up a provider in the Settings page to use the AI Equation Assistant."
        confirmText="Go to Settings"
        cancelText="Cancel"
      />
      <ConfirmModal
        isOpen={errorModal.isOpen}
        onConfirm={() => setErrorModal({ ...errorModal, isOpen: false })}
        onCancel={() => setErrorModal({ ...errorModal, isOpen: false })}
        title={errorModal.title}
        message={errorModal.message}
        confirmText="OK"
        cancelText=""
      />
    </div>
  );
};

export default EasyMathInput;
