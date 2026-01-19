// import React, { useState, useEffect } from "react";
// import {
//   TbX,
//   TbCopy,
//   TbSearch,
//   TbPlayerPlay,
//   TbDeviceFloppy,
//   TbFolder,
//   TbChevronDown,
//   TbRobot,
//   TbArrowUp,
//   TbLoader,
// } from "react-icons/tb";

// const API_BASE_URL = "http://localhost:5000";

// // Utility to wrap placeholder parts
// const wrapPlaceholder = (latex) => latex.replace(/⟨([^⟩]+)⟩/g, "‹$1›");

// const EasyMathInput = ({ onClose }) => {
//   const [activeTab, setActiveTab] = useState("editor");
//   const [leftPanelMode, setLeftPanelMode] = useState("symbols"); // 'symbols' or 'equations'
//   const [latexCode, setLatexCode] = useState("");
//   const [aiPrompt, setAiPrompt] = useState("");
//   const [isAiMode, setIsAiMode] = useState(false);
//   const [isGenerating, setIsGenerating] = useState(false);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [showDropdown, setShowDropdown] = useState(false);
//   const [previewUrl, setPreviewUrl] = useState("");
//   const [isCompiling, setIsCompiling] = useState(false);
//   const [savedEquations, setSavedEquations] = useState([]);
//   const [savedEquationSearch, setSavedEquationSearch] = useState("");
//   const [selectedSavedEquation, setSelectedSavedEquation] = useState("");
//   const [showSaveDialog, setShowSaveDialog] = useState(false);
//   const [saveFileName, setSaveFileName] = useState("");
//   const [showSavedDropdown, setShowSavedDropdown] = useState(false);
//   const [expandedCategories, setExpandedCategories] = useState(new Set());

//   const toggleCategoryExpansion = (category) => {
//     setExpandedCategories((prev) => {
//       const newSet = new Set(prev);
//       if (newSet.has(category)) {
//         newSet.delete(category);
//       } else {
//         newSet.add(category);
//       }
//       return newSet;
//     });
//   };

//   useEffect(() => {
//     loadSavedEquations();
//   }, []);

//   const loadSavedEquations = async () => {
//     try {
//       const response = await fetch(`${API_BASE_URL}/api/equations/list`);
//       if (response.ok) {
//         const equations = await response.json();
//         setSavedEquations(equations);
//       }
//     } catch (error) {
//       console.error("Failed to load saved equations:", error);
//     }
//   };

//   const compileLatex = async (latex, isTemp = true, fileName = "temp") => {
//     setIsCompiling(true);
//     try {
//       const cleanLatex = latex.replace(/[‹›]/g, "");

//       console.log("🔄 Sending compilation request...", {
//         latex: cleanLatex.substring(0, 100),
//         isTemp,
//         fileName,
//       });

//       const response = await fetch(`${API_BASE_URL}/api/latex/compile`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           latex: cleanLatex,
//           isTemp,
//           fileName,
//           format: "image",
//         }),
//       });

//       if (!response.ok) {
//         const errorText = await response.text();
//         console.error("❌ Server response not OK:", response.status, errorText);
//         throw new Error(`Server error (${response.status}): ${errorText}`);
//       }

//       const result = await response.json();

//       console.log("✅ Compilation result:", result);

//       if (result.success && result.pdfUrl) {
//         return `${API_BASE_URL}${result.pdfUrl}`;
//       } else {
//         throw new Error(result.error || "Compilation failed - no URL returned");
//       }
//     } catch (error) {
//       console.error("❌ Compilation error:", error);
//       alert(`Compilation failed: ${error.message}`);
//       return null;
//     } finally {
//       setIsCompiling(false);
//     }
//   };

//   const handleCompile = async () => {
//     console.log("🔘 Compile button clicked!");
//     console.log("📝 Current latexCode:", latexCode?.substring(0, 50));

//     if (!latexCode.trim()) {
//       alert("Please enter some LaTeX code first");
//       return;
//     }

//     console.log("✅ Starting compilation...");
//     setIsCompiling(true);
//     setPreviewUrl(""); // Clear previous preview

//     try {
//       const pdfUrl = await compileLatex(latexCode);
//       console.log("📄 Received PDF URL:", pdfUrl);

//       if (pdfUrl) {
//         setPreviewUrl(`${pdfUrl}?t=${Date.now()}`);
//         console.log("✅ Preview URL set!");
//       } else {
//         console.error("❌ No PDF URL returned");
//         alert("Compilation failed - no output generated");
//       }
//     } catch (error) {
//       console.error("❌ Compilation error:", error);
//       alert(`Compilation failed: ${error.message}`);
//     } finally {
//       setIsCompiling(false);
//     }
//   };

//   const handleAiGenerate = async () => {
//     if (!aiPrompt.trim()) return;

//     console.log("🤖 AI Generate button clicked!");
//     setIsGenerating(true);

//     try {
//       const response = await fetch(`${API_BASE_URL}/api/generate-equation`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ prompt: aiPrompt }),
//       });

//       const data = await response.json();
//       console.log("🤖 AI Response:", data);

//       if (data.success && data.latexEquation) {
//         console.log("✅ Setting LaTeX code:", data.latexEquation);
//         setLatexCode(data.latexEquation); // Update text area
//         setIsAiMode(false); // Switch back to manual mode
//         setAiPrompt(""); // Clear prompt

//         // Auto-compile the result immediately
//         console.log("🔄 Auto-compiling AI result...");

//         // Small delay to ensure state is updated
//         setTimeout(async () => {
//           setIsCompiling(true);
//           const pdfUrl = await compileLatex(data.latexEquation);
//           if (pdfUrl) {
//             setPreviewUrl(`${pdfUrl}?t=${Date.now()}`);
//           }
//           setIsCompiling(false);
//         }, 100);
//       } else {
//         alert("Failed to generate: " + (data.error || "Unknown error"));
//       }
//     } catch (error) {
//       console.error("❌ AI Generation Error:", error);
//       alert("Error connecting to AI service");
//     } finally {
//       setIsGenerating(false);
//     }
//   };

//   const handleSaveEquation = async () => {
//     if (!saveFileName.trim()) return alert("Please enter a filename");
//     if (!latexCode.trim()) return alert("Please enter some LaTeX code first");

//     try {
//       const cleanLatex = latexCode.replace(/[‹›]/g, "");
//       const response = await fetch(`${API_BASE_URL}/api/equations/save`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ fileName: saveFileName, latex: cleanLatex }),
//       });

//       if (response.ok) {
//         alert("Equation saved successfully!");
//         setShowSaveDialog(false);
//         setSaveFileName("");
//         loadSavedEquations();
//       } else {
//         throw new Error(await response.text());
//       }
//     } catch (error) {
//       alert(`Save failed: ${error.message}`);
//     }
//   };

//   const loadSavedEquation = async (fileName) => {
//     try {
//       const response = await fetch(
//         `${API_BASE_URL}/api/equations/load/${fileName}`,
//       );
//       if (response.ok) {
//         const data = await response.json();
//         setLatexCode(data.latex);
//         setActiveTab("editor");
//       }
//     } catch (error) {
//       console.error("Failed to load equation:", error);
//     }
//   };

//   const insertSymbol = (latex) => {
//     const highlighted = wrapPlaceholder(latex);
//     setLatexCode((prev) => prev + highlighted + " ");
//     setShowDropdown(false);
//     setSearchTerm("");
//   };

//   const copyToClipboard = async () => {
//     try {
//       const cleanLatex = latexCode.replace(/[‹›]/g, "");
//       await navigator.clipboard.writeText(cleanLatex);
//       alert("LaTeX code copied to clipboard!");
//     } catch (err) {
//       console.error("Failed to copy: ", err);
//     }
//   };

//   // ==========================================
//   // DATA COLLECTIONS
//   // ==========================================

// const commonEquations = [
//   {
//     name: "Quadratic Formula",
//     latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
//     symbol: "x=...",
//   },
//   { name: "Pythagorean Thm", latex: "a^2 + b^2 = c^2", symbol: "a²+b²" },
//   { name: "Area of Circle", latex: "A = \\pi r^2", symbol: "πr²" },
//   {
//     name: "Calculus Limit",
//     latex: "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1",
//     symbol: "lim",
//   },
//   { name: "Newton's 2nd Law", latex: "F = ma", symbol: "F=ma" },
//   { name: "Mass-Energy", latex: "E = mc^2", symbol: "E=mc²" },
//   { name: "Ohm's Law", latex: "V = IR", symbol: "V=IR" },
//   { name: "Ideal Gas Law", latex: "PV = nRT", symbol: "PV=nRT" },
//   { name: "Euler's Identity", latex: "e^{i\\pi} + 1 = 0", symbol: "eⁱπ" },
//   {
//     name: "Wave Equation",
//     latex: "\\frac{\\partial^2 u}{\\partial t^2} = c^2 \\nabla^2 u",
//     symbol: "∇²u",
//   },
//   {
//     name: "Schrödinger Eq",
//     latex: "i\\hbar\\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi",
//     symbol: "Ψ",
//   },
//   {
//     name: "Maxwell (Gauss)",
//     latex: "\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\epsilon_0}",
//     symbol: "∇·E",
//   },
//   {
//     name: "Bayes' Theorem",
//     latex: "P(A|B) = \\frac{P(B|A)P(A)}{P(B)}",
//     symbol: "P(A|B)",
//   },
//   {
//     name: "Standard Deviation",
//     latex: "\\sigma = \\sqrt{\\frac{\\sum(x_i - \\mu)^2}{N}}",
//     symbol: "σ",
//   },
//   {
//     name: "Photosynthesis",
//     latex: "6CO_2 + 6H_2O \\xrightarrow{h\\nu} C_6H_{12}O_6 + 6O_2",
//     symbol: "Bio",
//   },
//   {
//     name: "Thermodynamics",
//     latex: "\\Delta G = \\Delta H - T\\Delta S",
//     symbol: "ΔG",
//   },
//   {
//     name: "Complex Number",
//     latex: "z = a + bi = re^{i\\theta}",
//     symbol: "a+bi",
//   },
//   {
//     name: "Definition of e",
//     latex: "e = \\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n",
//     symbol: "e",
//   },
//   {
//     name: "Log Change Base",
//     latex: "\\log_b x = \\frac{\\ln x}{\\ln b}",
//     symbol: "log",
//   },
//   {
//     name: "Chem Equilibrium",
//     latex: "K_c = \\frac{[C]^c[D]^d}{[A]^a[B]^b}",
//     symbol: "K_c",
//   },
// ];

// const commonSymbols = [
//   {
//     symbol: "∫",
//     latex: "\\int ⟨integrand⟩ \\, \\mathrm{d}⟨variable⟩",
//     name: "Integral",
//   },
//   { symbol: "∑", latex: "\\sum_{⟨start⟩}^{⟨end⟩}", name: "Summation" },
//   { symbol: "√", latex: "\\sqrt{⟨arg⟩}", name: "Square Root" },
//   { symbol: "a/b", latex: "\\frac{⟨num⟩}{⟨den⟩}", name: "Fraction" },
//   { symbol: "x²", latex: "^{⟨exp⟩}", name: "Power" },
//   { symbol: "x₁", latex: "_{⟨sub⟩}", name: "Subscript" },
//   { symbol: "lim", latex: "\\lim_{⟨x⟩ \\to ⟨val⟩}", name: "Limit" },
//   { symbol: "α", latex: "\\alpha", name: "Alpha" },
//   { symbol: "π", latex: "\\pi", name: "Pi" },
//   { symbol: "∞", latex: "\\infty", name: "Infinity" },
//   { symbol: "≠", latex: "\\neq", name: "Not Equal" },
//   { symbol: "≤", latex: "\\leq", name: "Less or Equal" },
//   { symbol: "→", latex: "\\to", name: "Right Arrow" },
//   { symbol: "±", latex: "\\pm", name: "Plus Minus" },
// ];

// const mathSymbols = [
//   // --- BASIC ARITHMETIC ---
//   { symbol: "+", latex: "+", name: "Plus", category: "Basic" },
//   { symbol: "-", latex: "-", name: "Minus", category: "Basic" },
//   {
//     symbol: "×",
//     latex: "\\times",
//     name: "Multiplication",
//     category: "Basic",
//   },
//   { symbol: "⋅", latex: "\\cdot", name: "Dot Product", category: "Basic" },
//   { symbol: "÷", latex: "\\div", name: "Division", category: "Basic" },
//   { symbol: "=", latex: "=", name: "Equals", category: "Basic" },
//   { symbol: "≠", latex: "\\neq", name: "Not Equal", category: "Basic" },
//   { symbol: "±", latex: "\\pm", name: "Plus-Minus", category: "Basic" },
//   { symbol: "∓", latex: "\\mp", name: "Minus-Plus", category: "Basic" },

//   // --- FRACTIONS & ROOTS ---
//   {
//     symbol: "a/b",
//     latex: "\\frac{⟨num⟩}{⟨den⟩}",
//     name: "Fraction",
//     category: "Fractions",
//   },
//   {
//     symbol: "∂f/∂x",
//     latex: "\\frac{\\partial ⟨f⟩}{\\partial ⟨x⟩}",
//     name: "Partial Frac",
//     category: "Fractions",
//   },
//   {
//     symbol: "df/dx",
//     latex: "\\frac{d ⟨f⟩}{d ⟨x⟩}",
//     name: "Derivative",
//     category: "Fractions",
//   },
//   {
//     symbol: "√",
//     latex: "\\sqrt{⟨arg⟩}",
//     name: "Square Root",
//     category: "Roots",
//   },
//   {
//     symbol: "∛",
//     latex: "\\sqrt[3]{⟨arg⟩}",
//     name: "Cube Root",
//     category: "Roots",
//   },
//   {
//     symbol: "ⁿ√",
//     latex: "\\sqrt[⟨n⟩]{⟨arg⟩}",
//     name: "Nth Root",
//     category: "Roots",
//   },

//   // --- PHYSICS & CHEMISTRY ---
//   { symbol: "ℏ", latex: "\\hbar", name: "H-bar", category: "Physics" },
//   { symbol: "Å", latex: "\\AA", name: "Angstrom", category: "Physics" },
//   {
//     symbol: "vec",
//     latex: "\\vec{⟨v⟩}",
//     name: "Vector Arrow",
//     category: "Physics",
//   },
//   {
//     symbol: "hat",
//     latex: "\\hat{⟨x⟩}",
//     name: "Unit Vector",
//     category: "Physics",
//   },
//   { symbol: "∇", latex: "\\nabla", name: "Nabla/Del", category: "Physics" },
//   {
//     symbol: "Δ",
//     latex: "\\Delta",
//     name: "Delta (Change)",
//     category: "Physics",
//   },
//   { symbol: "Ω", latex: "\\Omega", name: "Ohm", category: "Physics" },
//   {
//     symbol: "μ₀",
//     latex: "\\mu_0",
//     name: "Permeability",
//     category: "Physics",
//   },
//   {
//     symbol: "ε₀",
//     latex: "\\epsilon_0",
//     name: "Permittivity",
//     category: "Physics",
//   },
//   { symbol: "°", latex: "^{\\circ}", name: "Degree", category: "Physics" },

//   {
//     symbol: "→",
//     latex: "\\rightarrow",
//     name: "Reaction",
//     category: "Chemistry",
//   },
//   {
//     symbol: "⇌",
//     latex: "\\rightleftharpoons",
//     name: "Equilibrium",
//     category: "Chemistry",
//   },
//   {
//     symbol: "↑",
//     latex: "\\uparrow",
//     name: "Gas Evolved",
//     category: "Chemistry",
//   },
//   {
//     symbol: "↓",
//     latex: "\\downarrow",
//     name: "Precipitate",
//     category: "Chemistry",
//   },
//   {
//     symbol: "Δ",
//     latex: "\\Delta",
//     name: "Heat/Change",
//     category: "Chemistry",
//   },
//   {
//     symbol: "Iso",
//     latex: "^{⟨A⟩}_{⟨Z⟩}\\text{⟨El⟩}",
//     name: "Isotope",
//     category: "Chemistry",
//   },
//   {
//     symbol: "⦵",
//     latex: "^{\\ominus}",
//     name: "Standard State",
//     category: "Chemistry",
//   },
//   { symbol: "M", latex: "\\text{M}", name: "Molar", category: "Chemistry" },

//   // --- BIOLOGY & STATISTICS ---
//   {
//     symbol: "χ²",
//     latex: "\\chi^2",
//     name: "Chi-Squared",
//     category: "Stats/Bio",
//   },
//   { symbol: "μ", latex: "\\mu", name: "Mean", category: "Stats/Bio" },
//   { symbol: "σ", latex: "\\sigma", name: "Std Dev", category: "Stats/Bio" },
//   {
//     symbol: "x̄",
//     latex: "\\bar{x}",
//     name: "Sample Mean",
//     category: "Stats/Bio",
//   },
//   { symbol: "p̂", latex: "\\hat{p}", name: "P-hat", category: "Stats/Bio" },
//   { symbol: "H₀", latex: "H_0", name: "Null Hyp", category: "Stats/Bio" },
//   { symbol: "H₁", latex: "H_1", name: "Alt Hyp", category: "Stats/Bio" },
//   { symbol: "♂", latex: "\\mars", name: "Male", category: "Stats/Bio" }, // Requires wasysym package usually, using text fallback often better or standard symbol
//   { symbol: "♀", latex: "\\venus", name: "Female", category: "Stats/Bio" },

//   // --- GREEK ---
//   { symbol: "α", latex: "\\alpha", name: "Alpha", category: "Greek" },
//   { symbol: "β", latex: "\\beta", name: "Beta", category: "Greek" },
//   { symbol: "γ", latex: "\\gamma", name: "Gamma", category: "Greek" },
//   { symbol: "δ", latex: "\\delta", name: "Delta", category: "Greek" },
//   { symbol: "ε", latex: "\\epsilon", name: "Epsilon", category: "Greek" },
//   { symbol: "θ", latex: "\\theta", name: "Theta", category: "Greek" },
//   { symbol: "λ", latex: "\\lambda", name: "Lambda", category: "Greek" },
//   { symbol: "μ", latex: "\\mu", name: "Mu", category: "Greek" },
//   { symbol: "π", latex: "\\pi", name: "Pi", category: "Greek" },
//   { symbol: "ρ", latex: "\\rho", name: "Rho", category: "Greek" },
//   { symbol: "σ", latex: "\\sigma", name: "Sigma", category: "Greek" },
//   { symbol: "φ", latex: "\\phi", name: "Phi", category: "Greek" },
//   { symbol: "ω", latex: "\\omega", name: "Omega", category: "Greek" },
//   { symbol: "Γ", latex: "\\Gamma", name: "Gamma (U)", category: "Greek" },
//   { symbol: "Δ", latex: "\\Delta", name: "Delta (U)", category: "Greek" },
//   { symbol: "Θ", latex: "\\Theta", name: "Theta (U)", category: "Greek" },
//   { symbol: "Λ", latex: "\\Lambda", name: "Lambda (U)", category: "Greek" },
//   { symbol: "Σ", latex: "\\Sigma", name: "Sigma (U)", category: "Greek" },
//   { symbol: "Φ", latex: "\\Phi", name: "Phi (U)", category: "Greek" },
//   { symbol: "Ω", latex: "\\Omega", name: "Omega (U)", category: "Greek" },

//   // --- CALCULUS ---
//   {
//     symbol: "∫",
//     latex: "\\int_{⟨a⟩}^{⟨b⟩}",
//     name: "Definite Int",
//     category: "Calculus",
//   },
//   { symbol: "∫", latex: "\\int", name: "Integral", category: "Calculus" },
//   { symbol: "∮", latex: "\\oint", name: "Contour Int", category: "Calculus" },
//   { symbol: "∂", latex: "\\partial", name: "Partial", category: "Calculus" },
//   {
//     symbol: "lim",
//     latex: "\\lim_{⟨x⟩ \\to ⟨a⟩}",
//     name: "Limit",
//     category: "Calculus",
//   },
//   {
//     symbol: "∑",
//     latex: "\\sum_{⟨i⟩=⟨0⟩}^{⟨n⟩}",
//     name: "Summation",
//     category: "Calculus",
//   },
//   {
//     symbol: "∏",
//     latex: "\\prod_{⟨i⟩=⟨0⟩}^{⟨n⟩}",
//     name: "Product",
//     category: "Calculus",
//   },
//   { symbol: "′", latex: "'", name: "Prime", category: "Calculus" },
//   { symbol: "∞", latex: "\\infty", name: "Infinity", category: "Calculus" },

//   // --- LOGIC & SETS ---
//   { symbol: "∀", latex: "\\forall", name: "For All", category: "Logic/Sets" },
//   { symbol: "∃", latex: "\\exists", name: "Exists", category: "Logic/Sets" },
//   { symbol: "∈", latex: "\\in", name: "Element Of", category: "Logic/Sets" },
//   {
//     symbol: "∉",
//     latex: "\\notin",
//     name: "Not Element",
//     category: "Logic/Sets",
//   },
//   { symbol: "⊂", latex: "\\subset", name: "Subset", category: "Logic/Sets" },
//   { symbol: "∪", latex: "\\cup", name: "Union", category: "Logic/Sets" },
//   {
//     symbol: "∩",
//     latex: "\\cap",
//     name: "Intersection",
//     category: "Logic/Sets",
//   },
//   {
//     symbol: "∅",
//     latex: "\\emptyset",
//     name: "Empty Set",
//     category: "Logic/Sets",
//   },
//   {
//     symbol: "⇒",
//     latex: "\\implies",
//     name: "Implies",
//     category: "Logic/Sets",
//   },
//   {
//     symbol: "⇔",
//     latex: "\\iff",
//     name: "If and only if",
//     category: "Logic/Sets",
//   },
//   {
//     symbol: "ℝ",
//     latex: "\\mathbb{R}",
//     name: "Reals",
//     category: "Logic/Sets",
//   },
//   {
//     symbol: "ℤ",
//     latex: "\\mathbb{Z}",
//     name: "Integers",
//     category: "Logic/Sets",
//   },
//   {
//     symbol: "ℕ",
//     latex: "\\mathbb{N}",
//     name: "Naturals",
//     category: "Logic/Sets",
//   },

//   // --- MATRICES ---
//   {
//     symbol: "[ ]",
//     latex: "\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}",
//     name: "B-Matrix",
//     category: "Matrices",
//   },
//   {
//     symbol: "( )",
//     latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
//     name: "P-Matrix",
//     category: "Matrices",
//   },
//   {
//     symbol: "| |",
//     latex: "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}",
//     name: "Determinant",
//     category: "Matrices",
//   },
//   {
//     symbol: "vec",
//     latex: "\\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}",
//     name: "Col Vector",
//     category: "Matrices",
//   },

//   // --- FUNCTIONS ---
//   { symbol: "sin", latex: "\\sin(⟨x⟩)", name: "Sine", category: "Functions" },
//   {
//     symbol: "cos",
//     latex: "\\cos(⟨x⟩)",
//     name: "Cosine",
//     category: "Functions",
//   },
//   {
//     symbol: "tan",
//     latex: "\\tan(⟨x⟩)",
//     name: "Tangent",
//     category: "Functions",
//   },
//   { symbol: "ln", latex: "\\ln(⟨x⟩)", name: "Ln", category: "Functions" },
//   {
//     symbol: "log",
//     latex: "\\log_{⟨b⟩}(⟨x⟩)",
//     name: "Log",
//     category: "Functions",
//   },
//   { symbol: "exp", latex: "\\exp(⟨x⟩)", name: "Exp", category: "Functions" },

//   // --- LAYOUT ---
//   {
//     symbol: "txt",
//     latex: "\\text{⟨text⟩}",
//     name: "Text",
//     category: "Layout",
//   },
//   { symbol: "spc", latex: "\\quad", name: "Space", category: "Layout" },
//   {
//     symbol: "{ }",
//     latex: "\\{ ⟨content⟩ \\}",
//     name: "Braces",
//     category: "Layout",
//   },
//   {
//     symbol: "cases",
//     latex: "\\begin{cases} ⟨expr⟩ & \\text{if } ⟨cond⟩ \\end{cases}",
//     name: "Cases",
//     category: "Layout",
//   },
// ];

//   // Helper to filter saved equations
//   const filteredSavedEquations = savedEquations.filter((equation) => {
//     if (!savedEquationSearch && !selectedSavedEquation) return true;
//     if (selectedSavedEquation)
//       return equation.fileName === selectedSavedEquation;
//     return (
//       equation.fileName
//         .toLowerCase()
//         .includes(savedEquationSearch.toLowerCase()) ||
//       equation.latex.toLowerCase().includes(savedEquationSearch.toLowerCase())
//     );
//   });

//   const filteredSymbols = mathSymbols.filter(
//     (symbol) =>
//       symbol.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       symbol.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       symbol.latex.toLowerCase().includes(searchTerm.toLowerCase()),
//   );

//   const categories = [...new Set(mathSymbols.map((symbol) => symbol.category))];

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
//       <div className="bg-white rounded-lg shadow-xl border border-gray-300 w-[95vw] max-w-7xl h-[90vh] flex flex-col">
//         {/* Header */}
//         <div className="flex justify-between items-center p-4 border-b border-gray-200">
//           <div className="flex items-center gap-4">
//             <h2 className="text-xl font-semibold text-gray-800">
//               Easy Math Input
//             </h2>
//             <div className="flex border-b">
//               <button
//                 onClick={() => setActiveTab("editor")}
//                 className={`px-4 py-2 font-medium text-sm ${activeTab === "editor" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
//               >
//                 Editor
//               </button>
//               <button
//                 onClick={() => setActiveTab("saved")}
//                 className={`px-4 py-2 font-medium text-sm ${activeTab === "saved" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
//               >
//                 Saved Equations
//               </button>
//             </div>
//           </div>
//           <button
//             onClick={onClose}
//             className="text-gray-500 hover:text-gray-700 p-1"
//           >
//             <TbX size={24} />
//           </button>
//         </div>

//         {activeTab === "editor" && (
//           <>
//             <div className="px-4 py-2 bg-blue-50 text-sm text-blue-800 border-b border-gray-200">
//               <strong>Tip:</strong> Placeholders are shown as ‹like this›.
//               Replace them with your values.
//             </div>

//             <div className="flex flex-1 overflow-hidden">
//               {/* LEFT PANEL: Common Symbols / Equations Dropdown */}
//               <div className="w-1/5 border-r border-gray-200 p-4 overflow-y-auto bg-gray-50/30">
//                 {/* Dropdown Header */}
//                 <div className="relative mb-3">
//                   <select
//                     value={leftPanelMode}
//                     onChange={(e) => setLeftPanelMode(e.target.value)}
//                     className="w-full appearance-none bg-white border border-gray-300 text-gray-700 py-2 px-3 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-blue-500 font-semibold cursor-pointer"
//                   >
//                     <option value="symbols">Common Symbols</option>
//                     <option value="equations">Common Equations</option>
//                   </select>
//                   <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
//                     <TbChevronDown size={16} />
//                   </div>
//                 </div>

//                 {/* Left Panel Content */}
//                 <div
//                   className={
//                     leftPanelMode === "symbols"
//                       ? "grid grid-cols-2 gap-2"
//                       : "flex flex-col gap-2"
//                   }
//                 >
//                   {leftPanelMode === "symbols"
//                     ? commonSymbols.map((symbol, index) => (
//                         <button
//                           key={index}
//                           onClick={() => insertSymbol(symbol.latex)}
//                           className="p-2 border border-gray-300 bg-white rounded hover:bg-gray-100 transition-colors text-sm flex flex-col items-center justify-center min-h-[50px] shadow-sm"
//                           title={`${symbol.name}: ${symbol.latex}`}
//                         >
//                           <span className="text-lg mb-1">{symbol.symbol}</span>
//                           <span className="text-xs text-gray-600 truncate w-full text-center">
//                             {symbol.name}
//                           </span>
//                         </button>
//                       ))
//                     : commonEquations.map((eq, index) => (
//                         <button
//                           key={index}
//                           onClick={() => insertSymbol(eq.latex)}
//                           className="p-2 border border-gray-300 bg-white rounded hover:bg-gray-100 transition-colors text-sm flex flex-col items-start justify-center min-h-[50px] shadow-sm px-3"
//                           title={eq.latex}
//                         >
//                           <span className="text-xs font-bold text-gray-700 mb-1">
//                             {eq.name}
//                           </span>
//                           <span className="text-sm font-mono text-blue-600 truncate w-full text-left">
//                             {eq.symbol}
//                           </span>
//                         </button>
//                       ))}
//                 </div>
//               </div>

//               {/* CENTER PANEL: Editor */}
//               <div className="flex-1 flex flex-col p-4">
//                 <div className="flex flex-col mb-4">
//                   <div className="flex justify-between items-center mb-2">
//                     <label className="font-semibold text-gray-700">
//                       {isAiMode ? "Describe Equation" : "LaTeX Code"}
//                     </label>
//                     <div className="flex gap-2">
//                       <button
//                         onClick={() => setIsAiMode(!isAiMode)}
//                         className={`flex items-center gap-1 px-3 py-1 rounded transition-colors text-sm border ${
//                           isAiMode
//                             ? "bg-purple-100 text-purple-700 border-purple-300"
//                             : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
//                         }`}
//                         title={
//                           isAiMode
//                             ? "Switch to Manual Editor"
//                             : "Switch to AI Generator"
//                         }
//                       >
//                         <TbRobot size={16} />{" "}
//                         {isAiMode ? "Manual Mode" : "AI Mode"}
//                       </button>

//                       <button
//                         onClick={() => setShowSaveDialog(true)}
//                         className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm disabled:opacity-50"
//                         disabled={!latexCode.trim()}
//                       >
//                         <TbDeviceFloppy size={16} /> Save
//                       </button>

//                       <button
//                         onClick={copyToClipboard}
//                         className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm disabled:opacity-50"
//                         disabled={!latexCode.trim()}
//                       >
//                         <TbCopy size={16} /> Copy
//                       </button>

//                       <button
//                         onClick={() => handleCompile()}
//                         disabled={isCompiling || !latexCode.trim()}
//                         className="flex items-center gap-1 px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
//                       >
//                         <TbPlayerPlay size={16} />
//                         {isCompiling ? "Compiling..." : "Compile"}
//                       </button>
//                     </div>
//                   </div>

//                   {isAiMode ? (
//                     <div className="relative h-32 w-full">
//                       <textarea
//                         value={aiPrompt}
//                         onChange={(e) => setAiPrompt(e.target.value)}
//                         onKeyDown={(e) => {
//                           if (e.key === "Enter" && !e.shiftKey) {
//                             e.preventDefault();
//                             handleAiGenerate();
//                           }
//                         }}
//                         className="h-full w-full p-3 border border-purple-300 rounded resize-none font-sans text-sm leading-relaxed focus:ring-2 focus:ring-purple-100 outline-none pr-12"
//                         placeholder="e.g., 'Schrodinger equation for a free particle' or 'Determinant of a 3x3 matrix'"
//                         autoFocus
//                       />
//                       <button
//                         onClick={handleAiGenerate}
//                         disabled={isGenerating || !aiPrompt.trim()}
//                         className="absolute bottom-3 right-3 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 disabled:bg-purple-300 transition-colors shadow-sm"
//                         title="Generate Equation"
//                       >
//                         {isGenerating ? (
//                           <TbLoader className="animate-spin" />
//                         ) : (
//                           <TbArrowUp size={20} />
//                         )}
//                       </button>
//                     </div>
//                   ) : (
//                     <textarea
//                       value={latexCode}
//                       onChange={(e) => setLatexCode(e.target.value)}
//                       className="h-32 w-full p-3 border border-gray-300 rounded resize-none font-mono text-sm leading-relaxed focus:ring-2 focus:ring-blue-100 outline-none"
//                       placeholder="Type LaTeX here or click symbols to insert..."
//                     />
//                   )}
//                 </div>

//                 <div className="flex-1 flex flex-col">
//                   <label className="font-semibold text-gray-700 mb-2">
//                     Preview
//                   </label>
//                   <div className="flex-1 border border-gray-300 rounded bg-white overflow-hidden flex items-center justify-center p-4">
//                     {isCompiling || isGenerating ? (
//                       <div className="flex flex-col items-center text-gray-500 animate-pulse">
//                         <TbLoader size={32} className="animate-spin mb-2" />
//                         <p>{isGenerating ? "Generating..." : "Compiling..."}</p>
//                       </div>
//                     ) : previewUrl ? (
//                       previewUrl.toLowerCase().endsWith(".pdf") ? (
//                         <iframe
//                           src={previewUrl}
//                           className="w-full h-full border-none"
//                           title="PDF Preview"
//                         />
//                       ) : (
//                         <img
//                           src={previewUrl}
//                           className="max-w-full max-h-full object-contain"
//                           alt="LaTeX Preview"
//                         />
//                       )
//                     ) : (
//                       <div className="text-center text-gray-400">
//                         <TbPlayerPlay
//                           size={48}
//                           className="mx-auto mb-2 opacity-50"
//                         />
//                         <p>Click "Compile" or generate via AI to preview</p>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </div>

//               {/* RIGHT PANEL: Search & Library */}
//               <div className="w-1/4 border-l border-gray-200 p-4 flex flex-col bg-gray-50/30">
//                 <div className="relative mb-3">
//                   <div className="flex items-center border border-gray-300 rounded bg-white">
//                     <TbSearch
//                       className="absolute left-2 text-gray-400"
//                       size={20}
//                     />
//                     <input
//                       type="text"
//                       value={searchTerm}
//                       onChange={(e) => setSearchTerm(e.target.value)}
//                       onFocus={() => setShowDropdown(true)}
//                       placeholder="Search..."
//                       className="w-full pl-9 pr-3 py-2 outline-none rounded bg-transparent"
//                     />
//                   </div>
//                   {showDropdown && searchTerm && (
//                     <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto z-10">
//                       {filteredSymbols.slice(0, 50).map((symbol, index) => (
//                         <button
//                           key={index}
//                           onClick={() => insertSymbol(symbol.latex)}
//                           className="w-full p-2 text-left hover:bg-gray-100 flex items-center gap-3 border-b border-gray-100"
//                         >
//                           <span className="text-lg w-8 text-center">
//                             {symbol.symbol}
//                           </span>
//                           <div className="flex-1 min-w-0">
//                             <div className="text-xs text-gray-600 truncate">
//                               {symbol.name}
//                             </div>
//                           </div>
//                         </button>
//                       ))}
//                     </div>
//                   )}
//                 </div>

//                 <div className="mb-3 flex gap-2">
//                   <button
//                     onClick={() => setExpandedCategories(new Set(categories))}
//                     className="flex-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
//                   >
//                     Expand All
//                   </button>
//                   <button
//                     onClick={() => setExpandedCategories(new Set())}
//                     className="flex-1 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
//                   >
//                     Collapse All
//                   </button>
//                 </div>

//                 <div className="overflow-y-auto flex-1 pr-1">
//                   {categories.map((category) => {
//                     const categorySymbols = mathSymbols.filter(
//                       (s) => s.category === category,
//                     );
//                     const isExpanded = expandedCategories.has(category);
//                     const showButton = categorySymbols.length > 12;
//                     const symbolsToShow = isExpanded
//                       ? categorySymbols
//                       : categorySymbols.slice(0, 12);

//                     return (
//                       <div key={category} className="mb-4">
//                         <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-2 sticky top-0 bg-gray-50 py-1 border-b border-gray-200">
//                           {category}
//                         </h4>
//                         <div className="grid grid-cols-4 gap-1">
//                           {symbolsToShow.map((symbol, index) => (
//                             <button
//                               key={index}
//                               onClick={() => insertSymbol(symbol.latex)}
//                               className="p-1 border border-gray-200 bg-white rounded hover:bg-blue-50 hover:border-blue-300 text-center transition-all h-10 flex items-center justify-center shadow-sm"
//                               title={`${symbol.name}`}
//                             >
//                               <span className="text-base text-gray-800">
//                                 {symbol.symbol}
//                               </span>
//                             </button>
//                           ))}
//                         </div>
//                         {showButton && (
//                           <button
//                             onClick={() => toggleCategoryExpansion(category)}
//                             className="w-full mt-1 py-1 text-[10px] text-blue-600 hover:bg-blue-50 rounded"
//                           >
//                             {isExpanded
//                               ? "Show Less"
//                               : `Show All (${categorySymbols.length})`}
//                           </button>
//                         )}
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
//             </div>
//           </>
//         )}

//         {/* SAVED TAB (Kept mostly same structure) */}
//         {activeTab === "saved" && (
//           <div className="flex-1 flex flex-col p-4 overflow-hidden">
//             <div className="mb-4 flex-shrink-0">
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Search Saved Equations
//               </label>
//               <div className="relative">
//                 <div className="flex items-center border border-gray-300 rounded">
//                   <TbSearch
//                     className="absolute left-2 text-gray-400"
//                     size={20}
//                   />
//                   <input
//                     type="text"
//                     value={savedEquationSearch}
//                     onChange={(e) => setSavedEquationSearch(e.target.value)}
//                     onFocus={() => setShowSavedDropdown(true)}
//                     placeholder="Search saved files..."
//                     className="w-full pl-9 pr-10 py-2 outline-none"
//                   />
//                 </div>
//                 {/* Saved Dropdown Logic... */}
//                 {showSavedDropdown && (
//                   <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto z-10">
//                     {/* ... (Existing dropdown mapping) ... */}
//                     {filteredSavedEquations.map((eq) => (
//                       <button
//                         key={eq.fileName}
//                         onClick={() => {
//                           setSavedEquationSearch(eq.fileName);
//                           setShowSavedDropdown(false);
//                         }}
//                         className="w-full p-2 text-left hover:bg-gray-100 border-b border-gray-100"
//                       >
//                         {eq.fileName}
//                       </button>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             </div>

//             <div className="flex-1 overflow-auto border border-gray-300 rounded">
//               <table className="w-full border-collapse">
//                 <thead className="sticky top-0 bg-gray-50 z-10">
//                   <tr>
//                     <th className="border border-gray-300 px-4 py-2 text-left w-1/6">
//                       File Name
//                     </th>
//                     <th className="border border-gray-300 px-4 py-2 text-left w-2/6">
//                       LaTeX
//                     </th>
//                     <th className="border border-gray-300 px-4 py-2 text-left w-1/6">
//                       Actions
//                     </th>
//                     <th className="border border-gray-300 px-4 py-2 text-left w-2/6">
//                       Preview
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {filteredSavedEquations.map((equation) => (
//                     <SavedEquationRow
//                       key={equation.fileName}
//                       equation={equation}
//                       onCopy={copyToClipboard} // Fixed this prop to use local wrapper if needed or direct
//                       onLoad={loadSavedEquation}
//                       onCompile={(name, tex) => compileLatex(tex, false, name)}
//                     />
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         )}

//         {/* Save Dialog */}
//         {showSaveDialog && (
//           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//             <div className="bg-white rounded-lg p-6 w-96 shadow-2xl">
//               <h3 className="text-lg font-semibold mb-4">Save Equation</h3>
//               <input
//                 type="text"
//                 value={saveFileName}
//                 onChange={(e) => setSaveFileName(e.target.value)}
//                 className="w-full p-2 border border-gray-300 rounded mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
//                 placeholder="Filename (e.g. quadratic_eq)"
//                 autoFocus
//               />
//               <div className="flex justify-end gap-2">
//                 <button
//                   onClick={() => setShowSaveDialog(false)}
//                   className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   onClick={handleSaveEquation}
//                   className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
//                 >
//                   Save
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// const SavedEquationRow = ({ equation, onCopy, onLoad, onCompile }) => {
//   const [previewUrl, setPreviewUrl] = useState("");
//   const [isCompiling, setIsCompiling] = useState(false);

//   const handleCompile = async () => {
//     setIsCompiling(true);
//     const url = await onCompile(equation.fileName, equation.latex);
//     if (url) setPreviewUrl(url);
//     setIsCompiling(false);
//   };

//   return (
//     <tr>
//       <td className="border border-gray-300 px-4 py-2 font-medium">
//         {equation.fileName}
//       </td>
//       <td className="border border-gray-300 px-4 py-2">
//         <div className="font-mono text-sm bg-gray-50 p-2 rounded max-w-xs overflow-x-auto whitespace-nowrap">
//           {equation.latex}
//         </div>
//       </td>
//       <td className="border border-gray-300 px-4 py-2">
//         <div className="flex gap-2">
//           <button
//             onClick={() => navigator.clipboard.writeText(equation.latex)}
//             className="p-1 text-blue-600 hover:bg-blue-50 rounded"
//             title="Copy"
//           >
//             <TbCopy size={16} />
//           </button>
//           <button
//             onClick={() => onLoad(equation.fileName)}
//             className="p-1 text-green-600 hover:bg-green-50 rounded"
//             title="Load"
//           >
//             <TbFolder size={16} />
//           </button>
//         </div>
//       </td>
//       <td className="border border-gray-300 px-4 py-2">
//         <div className="flex items-center gap-2">
//           <button
//             onClick={handleCompile}
//             disabled={isCompiling}
//             className="p-1 text-orange-600 hover:bg-orange-50 rounded disabled:opacity-50"
//           >
//             <TbPlayerPlay size={16} />
//           </button>
//           {previewUrl && (
//             <img
//               src={previewUrl}
//               alt="Preview"
//               className="h-12 object-contain border bg-white rounded"
//             />
//           )}
//         </div>
//       </td>
//     </tr>
//   );
// };

// export default EasyMathInput;
import React, { useState, useEffect, useRef } from "react";
import {
  TbX,
  TbCopy,
  TbSearch,
  TbPlayerPlay,
  TbDeviceFloppy,
  TbFolder,
  TbChevronDown,
  TbRobot,
  TbArrowUp,
  TbLoader,
  TbCheck,
  TbArrowBackUp,
  TbPencil,
} from "react-icons/tb";

const API_BASE_URL = "http://localhost:5000";

// --- UTILS ---

// 1. Helper to extract placeholders like ⟨num⟩ from string
const extractPlaceholders = (latex) => {
  const regex = /⟨([^⟩]+)⟩/g;
  const matches = [];
  let match;
  while ((match = regex.exec(latex)) !== null) {
    matches.push(match[1]); // returns "num", "den", etc.
  }
  return matches;
};

// 2. Helper to visually wrap placeholders in the text area (fallback view)
const wrapPlaceholder = (latex) => latex.replace(/⟨([^⟩]+)⟩/g, "‹$1›");

const EasyMathInput = ({ onClose }) => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState("editor");
  const [leftPanelMode, setLeftPanelMode] = useState("symbols");

  // Content State
  const [latexCode, setLatexCode] = useState("");

  // AI Mode State
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiMode, setIsAiMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // BUILDER MODE STATE (New Feature)
  const [builderMode, setBuilderMode] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState("");
  const [templateFields, setTemplateFields] = useState([]); // e.g. ["num", "den"]
  const [templateValues, setTemplateValues] = useState({}); // e.g. { num: "1", den: "2" }

  // General UI State
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);

  // Saved Equations State
  const [savedEquations, setSavedEquations] = useState([]);
  const [savedEquationSearch, setSavedEquationSearch] = useState("");
  const [selectedSavedEquation, setSelectedSavedEquation] = useState("");
  const [showSavedDropdown, setShowSavedDropdown] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFileName, setSaveFileName] = useState("");

  // Category Expansion
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  // Refs for UX
  const firstInputRef = useRef(null);

  // --- EFFECTS ---
  useEffect(() => {
    loadSavedEquations();
  }, []);

  useEffect(() => {
    // Auto-focus the first input when Builder Mode opens
    if (builderMode && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [builderMode]);

  useEffect(() => {
    if (activeTab !== "editor") setPreviewUrl("");
  }, [activeTab]);

  // --- API HANDLERS ---

  const loadSavedEquations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/equations/list`);
      if (response.ok) {
        setSavedEquations(await response.json());
      }
    } catch (error) {
      console.error(error);
    }
  };

  const compileLatex = async (latex, isTemp = true, fileName = "temp") => {
    setIsCompiling(true);
    try {
      // Strip placeholders before sending to server
      const cleanLatex = latex.replace(/[‹›]/g, "").replace(/⟨[^⟩]+⟩/g, "");

      const response = await fetch(`${API_BASE_URL}/api/latex/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latex: cleanLatex,
          isTemp,
          fileName,
          format: "image",
        }),
      });

      if (!response.ok) throw new Error(await response.text());
      const result = await response.json();

      if (result.success && result.pdfUrl) {
        return `${API_BASE_URL}${result.pdfUrl}`;
      }
      throw new Error("No URL returned");
    } catch (error) {
      console.error(error);
      alert(`Compilation failed: ${error.message}`);
      return null;
    } finally {
      setIsCompiling(false);
    }
  };

  const handleCompile = async (codeOverride) => {
    const code = codeOverride || latexCode;
    if (!code.trim()) return alert("Enter LaTeX first");

    setPreviewUrl("");
    const url = await compileLatex(code);
    if (url) setPreviewUrl(`${url}?t=${Date.now()}`);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-equation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await response.json();
      if (data.success) {
        setLatexCode(data.latexEquation);
        setIsAiMode(false);
        setAiPrompt("");
        handleCompile(data.latexEquation);
      } else {
        alert("AI Error: " + data.error);
      }
    } catch (error) {
      alert("AI Connection Error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveEquation = async () => {
    if (!saveFileName.trim()) return alert("Enter filename");
    try {
      const response = await fetch(`${API_BASE_URL}/api/equations/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: saveFileName, latex: latexCode }),
      });
      if (response.ok) {
        alert("Saved!");
        setShowSaveDialog(false);
        setSaveFileName("");
        loadSavedEquations();
      } else throw new Error(await response.text());
    } catch (error) {
      alert(`Save failed: ${error.message}`);
    }
  };

  // --- EDITOR / BUILDER LOGIC ---

  const handleSymbolClick = (latex) => {
    const placeholders = extractPlaceholders(latex);

    if (placeholders.length > 0) {
      // 1. Enter Builder Mode
      setCurrentTemplate(latex);
      setTemplateFields(placeholders);

      // Reset values
      const initVals = {};
      placeholders.forEach((p) => (initVals[p] = ""));
      setTemplateValues(initVals);

      setBuilderMode(true);
      setIsAiMode(false); // Ensure we aren't in AI mode
    } else {
      // 2. Direct Insert
      setLatexCode((prev) => prev + latex + " ");
    }

    setShowDropdown(false);
    setSearchTerm("");
  };

  const confirmBuilder = () => {
    let finalString = currentTemplate;

    // Replace ⟨key⟩ with user value
    templateFields.forEach((field) => {
      const val = templateValues[field] || "";
      finalString = finalString.replace(`⟨${field}⟩`, val);
    });

    setLatexCode((prev) => prev + finalString + " ");
    setBuilderMode(false);
    setTemplateValues({});
  };

  const cancelBuilder = () => {
    setBuilderMode(false);
    setTemplateValues({});
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(latexCode);
    alert("Copied!");
  };

  const toggleCategoryExpansion = (category) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  // --- DATA ---
  const commonEquations = [
    {
      name: "Quadratic Formula",
      latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
      symbol: "x=...",
    },
    { name: "Pythagorean Thm", latex: "a^2 + b^2 = c^2", symbol: "a²+b²" },
    { name: "Area of Circle", latex: "A = \\pi r^2", symbol: "πr²" },
    {
      name: "Calculus Limit",
      latex: "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1",
      symbol: "lim",
    },
    { name: "Newton's 2nd Law", latex: "F = ma", symbol: "F=ma" },
    { name: "Mass-Energy", latex: "E = mc^2", symbol: "E=mc²" },
    { name: "Ohm's Law", latex: "V = IR", symbol: "V=IR" },
    { name: "Ideal Gas Law", latex: "PV = nRT", symbol: "PV=nRT" },
    { name: "Euler's Identity", latex: "e^{i\\pi} + 1 = 0", symbol: "eⁱπ" },
    {
      name: "Wave Equation",
      latex: "\\frac{\\partial^2 u}{\\partial t^2} = c^2 \\nabla^2 u",
      symbol: "∇²u",
    },
    {
      name: "Schrödinger Eq",
      latex: "i\\hbar\\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi",
      symbol: "Ψ",
    },
    {
      name: "Maxwell (Gauss)",
      latex: "\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\epsilon_0}",
      symbol: "∇·E",
    },
    {
      name: "Bayes' Theorem",
      latex: "P(A|B) = \\frac{P(B|A)P(A)}{P(B)}",
      symbol: "P(A|B)",
    },
    {
      name: "Standard Deviation",
      latex: "\\sigma = \\sqrt{\\frac{\\sum(x_i - \\mu)^2}{N}}",
      symbol: "σ",
    },
    {
      name: "Photosynthesis",
      latex: "6CO_2 + 6H_2O \\xrightarrow{h\\nu} C_6H_{12}O_6 + 6O_2",
      symbol: "Bio",
    },
    {
      name: "Thermodynamics",
      latex: "\\Delta G = \\Delta H - T\\Delta S",
      symbol: "ΔG",
    },
    {
      name: "Complex Number",
      latex: "z = a + bi = re^{i\\theta}",
      symbol: "a+bi",
    },
    {
      name: "Definition of e",
      latex: "e = \\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n",
      symbol: "e",
    },
    {
      name: "Log Change Base",
      latex: "\\log_b x = \\frac{\\ln x}{\\ln b}",
      symbol: "log",
    },
    {
      name: "Chem Equilibrium",
      latex: "K_c = \\frac{[C]^c[D]^d}{[A]^a[B]^b}",
      symbol: "K_c",
    },
  ];

  const commonSymbols = [
    {
      symbol: "∫",
      latex: "\\int ⟨integrand⟩ \\, \\mathrm{d}⟨variable⟩",
      name: "Integral",
    },
    { symbol: "∑", latex: "\\sum_{⟨start⟩}^{⟨end⟩}", name: "Summation" },
    { symbol: "√", latex: "\\sqrt{⟨arg⟩}", name: "Square Root" },
    { symbol: "a/b", latex: "\\frac{⟨num⟩}{⟨den⟩}", name: "Fraction" },
    { symbol: "x²", latex: "^{⟨exp⟩}", name: "Power" },
    { symbol: "x₁", latex: "_{⟨sub⟩}", name: "Subscript" },
    { symbol: "lim", latex: "\\lim_{⟨x⟩ \\to ⟨val⟩}", name: "Limit" },
    { symbol: "α", latex: "\\alpha", name: "Alpha" },
    { symbol: "π", latex: "\\pi", name: "Pi" },
    { symbol: "∞", latex: "\\infty", name: "Infinity" },
    { symbol: "≠", latex: "\\neq", name: "Not Equal" },
    { symbol: "≤", latex: "\\leq", name: "Less or Equal" },
    { symbol: "→", latex: "\\to", name: "Right Arrow" },
    { symbol: "±", latex: "\\pm", name: "Plus Minus" },
  ];

  const mathSymbols = [
    // --- BASIC ARITHMETIC ---
    { symbol: "+", latex: "+", name: "Plus", category: "Basic" },
    { symbol: "-", latex: "-", name: "Minus", category: "Basic" },
    {
      symbol: "×",
      latex: "\\times",
      name: "Multiplication",
      category: "Basic",
    },
    { symbol: "⋅", latex: "\\cdot", name: "Dot Product", category: "Basic" },
    { symbol: "÷", latex: "\\div", name: "Division", category: "Basic" },
    { symbol: "=", latex: "=", name: "Equals", category: "Basic" },
    { symbol: "≠", latex: "\\neq", name: "Not Equal", category: "Basic" },
    { symbol: "±", latex: "\\pm", name: "Plus-Minus", category: "Basic" },
    { symbol: "∓", latex: "\\mp", name: "Minus-Plus", category: "Basic" },

    // --- FRACTIONS & ROOTS ---
    {
      symbol: "a/b",
      latex: "\\frac{⟨num⟩}{⟨den⟩}",
      name: "Fraction",
      category: "Fractions",
    },
    {
      symbol: "∂f/∂x",
      latex: "\\frac{\\partial ⟨f⟩}{\\partial ⟨x⟩}",
      name: "Partial Frac",
      category: "Fractions",
    },
    {
      symbol: "df/dx",
      latex: "\\frac{d ⟨f⟩}{d ⟨x⟩}",
      name: "Derivative",
      category: "Fractions",
    },
    {
      symbol: "√",
      latex: "\\sqrt{⟨arg⟩}",
      name: "Square Root",
      category: "Roots",
    },
    {
      symbol: "∛",
      latex: "\\sqrt[3]{⟨arg⟩}",
      name: "Cube Root",
      category: "Roots",
    },
    {
      symbol: "ⁿ√",
      latex: "\\sqrt[⟨n⟩]{⟨arg⟩}",
      name: "Nth Root",
      category: "Roots",
    },

    // --- PHYSICS & CHEMISTRY ---
    { symbol: "ℏ", latex: "\\hbar", name: "H-bar", category: "Physics" },
    { symbol: "Å", latex: "\\AA", name: "Angstrom", category: "Physics" },
    {
      symbol: "vec",
      latex: "\\vec{⟨v⟩}",
      name: "Vector Arrow",
      category: "Physics",
    },
    {
      symbol: "hat",
      latex: "\\hat{⟨x⟩}",
      name: "Unit Vector",
      category: "Physics",
    },
    { symbol: "∇", latex: "\\nabla", name: "Nabla/Del", category: "Physics" },
    {
      symbol: "Δ",
      latex: "\\Delta",
      name: "Delta (Change)",
      category: "Physics",
    },
    { symbol: "Ω", latex: "\\Omega", name: "Ohm", category: "Physics" },
    {
      symbol: "μ₀",
      latex: "\\mu_0",
      name: "Permeability",
      category: "Physics",
    },
    {
      symbol: "ε₀",
      latex: "\\epsilon_0",
      name: "Permittivity",
      category: "Physics",
    },
    { symbol: "°", latex: "^{\\circ}", name: "Degree", category: "Physics" },

    {
      symbol: "→",
      latex: "\\rightarrow",
      name: "Reaction",
      category: "Chemistry",
    },
    {
      symbol: "⇌",
      latex: "\\rightleftharpoons",
      name: "Equilibrium",
      category: "Chemistry",
    },
    {
      symbol: "↑",
      latex: "\\uparrow",
      name: "Gas Evolved",
      category: "Chemistry",
    },
    {
      symbol: "↓",
      latex: "\\downarrow",
      name: "Precipitate",
      category: "Chemistry",
    },
    {
      symbol: "Δ",
      latex: "\\Delta",
      name: "Heat/Change",
      category: "Chemistry",
    },
    {
      symbol: "Iso",
      latex: "^{⟨A⟩}_{⟨Z⟩}\\text{⟨El⟩}",
      name: "Isotope",
      category: "Chemistry",
    },
    {
      symbol: "⦵",
      latex: "^{\\ominus}",
      name: "Standard State",
      category: "Chemistry",
    },
    { symbol: "M", latex: "\\text{M}", name: "Molar", category: "Chemistry" },

    // --- BIOLOGY & STATISTICS ---
    {
      symbol: "χ²",
      latex: "\\chi^2",
      name: "Chi-Squared",
      category: "Stats/Bio",
    },
    { symbol: "μ", latex: "\\mu", name: "Mean", category: "Stats/Bio" },
    { symbol: "σ", latex: "\\sigma", name: "Std Dev", category: "Stats/Bio" },
    {
      symbol: "x̄",
      latex: "\\bar{x}",
      name: "Sample Mean",
      category: "Stats/Bio",
    },
    { symbol: "p̂", latex: "\\hat{p}", name: "P-hat", category: "Stats/Bio" },
    { symbol: "H₀", latex: "H_0", name: "Null Hyp", category: "Stats/Bio" },
    { symbol: "H₁", latex: "H_1", name: "Alt Hyp", category: "Stats/Bio" },
    { symbol: "♂", latex: "\\mars", name: "Male", category: "Stats/Bio" }, // Requires wasysym package usually, using text fallback often better or standard symbol
    { symbol: "♀", latex: "\\venus", name: "Female", category: "Stats/Bio" },

    // --- GREEK ---
    { symbol: "α", latex: "\\alpha", name: "Alpha", category: "Greek" },
    { symbol: "β", latex: "\\beta", name: "Beta", category: "Greek" },
    { symbol: "γ", latex: "\\gamma", name: "Gamma", category: "Greek" },
    { symbol: "δ", latex: "\\delta", name: "Delta", category: "Greek" },
    { symbol: "ε", latex: "\\epsilon", name: "Epsilon", category: "Greek" },
    { symbol: "θ", latex: "\\theta", name: "Theta", category: "Greek" },
    { symbol: "λ", latex: "\\lambda", name: "Lambda", category: "Greek" },
    { symbol: "μ", latex: "\\mu", name: "Mu", category: "Greek" },
    { symbol: "π", latex: "\\pi", name: "Pi", category: "Greek" },
    { symbol: "ρ", latex: "\\rho", name: "Rho", category: "Greek" },
    { symbol: "σ", latex: "\\sigma", name: "Sigma", category: "Greek" },
    { symbol: "φ", latex: "\\phi", name: "Phi", category: "Greek" },
    { symbol: "ω", latex: "\\omega", name: "Omega", category: "Greek" },
    { symbol: "Γ", latex: "\\Gamma", name: "Gamma (U)", category: "Greek" },
    { symbol: "Δ", latex: "\\Delta", name: "Delta (U)", category: "Greek" },
    { symbol: "Θ", latex: "\\Theta", name: "Theta (U)", category: "Greek" },
    { symbol: "Λ", latex: "\\Lambda", name: "Lambda (U)", category: "Greek" },
    { symbol: "Σ", latex: "\\Sigma", name: "Sigma (U)", category: "Greek" },
    { symbol: "Φ", latex: "\\Phi", name: "Phi (U)", category: "Greek" },
    { symbol: "Ω", latex: "\\Omega", name: "Omega (U)", category: "Greek" },

    // --- CALCULUS ---
    {
      symbol: "∫",
      latex: "\\int_{⟨a⟩}^{⟨b⟩}",
      name: "Definite Int",
      category: "Calculus",
    },
    { symbol: "∫", latex: "\\int", name: "Integral", category: "Calculus" },
    { symbol: "∮", latex: "\\oint", name: "Contour Int", category: "Calculus" },
    { symbol: "∂", latex: "\\partial", name: "Partial", category: "Calculus" },
    {
      symbol: "lim",
      latex: "\\lim_{⟨x⟩ \\to ⟨a⟩}",
      name: "Limit",
      category: "Calculus",
    },
    {
      symbol: "∑",
      latex: "\\sum_{⟨i⟩=⟨0⟩}^{⟨n⟩}",
      name: "Summation",
      category: "Calculus",
    },
    {
      symbol: "∏",
      latex: "\\prod_{⟨i⟩=⟨0⟩}^{⟨n⟩}",
      name: "Product",
      category: "Calculus",
    },
    { symbol: "′", latex: "'", name: "Prime", category: "Calculus" },
    { symbol: "∞", latex: "\\infty", name: "Infinity", category: "Calculus" },

    // --- LOGIC & SETS ---
    { symbol: "∀", latex: "\\forall", name: "For All", category: "Logic/Sets" },
    { symbol: "∃", latex: "\\exists", name: "Exists", category: "Logic/Sets" },
    { symbol: "∈", latex: "\\in", name: "Element Of", category: "Logic/Sets" },
    {
      symbol: "∉",
      latex: "\\notin",
      name: "Not Element",
      category: "Logic/Sets",
    },
    { symbol: "⊂", latex: "\\subset", name: "Subset", category: "Logic/Sets" },
    { symbol: "∪", latex: "\\cup", name: "Union", category: "Logic/Sets" },
    {
      symbol: "∩",
      latex: "\\cap",
      name: "Intersection",
      category: "Logic/Sets",
    },
    {
      symbol: "∅",
      latex: "\\emptyset",
      name: "Empty Set",
      category: "Logic/Sets",
    },
    {
      symbol: "⇒",
      latex: "\\implies",
      name: "Implies",
      category: "Logic/Sets",
    },
    {
      symbol: "⇔",
      latex: "\\iff",
      name: "If and only if",
      category: "Logic/Sets",
    },
    {
      symbol: "ℝ",
      latex: "\\mathbb{R}",
      name: "Reals",
      category: "Logic/Sets",
    },
    {
      symbol: "ℤ",
      latex: "\\mathbb{Z}",
      name: "Integers",
      category: "Logic/Sets",
    },
    {
      symbol: "ℕ",
      latex: "\\mathbb{N}",
      name: "Naturals",
      category: "Logic/Sets",
    },

    // --- MATRICES ---
    {
      symbol: "[ ]",
      latex: "\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}",
      name: "B-Matrix",
      category: "Matrices",
    },
    {
      symbol: "( )",
      latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
      name: "P-Matrix",
      category: "Matrices",
    },
    {
      symbol: "| |",
      latex: "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}",
      name: "Determinant",
      category: "Matrices",
    },
    {
      symbol: "vec",
      latex: "\\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}",
      name: "Col Vector",
      category: "Matrices",
    },

    // --- FUNCTIONS ---
    { symbol: "sin", latex: "\\sin(⟨x⟩)", name: "Sine", category: "Functions" },
    {
      symbol: "cos",
      latex: "\\cos(⟨x⟩)",
      name: "Cosine",
      category: "Functions",
    },
    {
      symbol: "tan",
      latex: "\\tan(⟨x⟩)",
      name: "Tangent",
      category: "Functions",
    },
    { symbol: "ln", latex: "\\ln(⟨x⟩)", name: "Ln", category: "Functions" },
    {
      symbol: "log",
      latex: "\\log_{⟨b⟩}(⟨x⟩)",
      name: "Log",
      category: "Functions",
    },
    { symbol: "exp", latex: "\\exp(⟨x⟩)", name: "Exp", category: "Functions" },

    // --- LAYOUT ---
    {
      symbol: "txt",
      latex: "\\text{⟨text⟩}",
      name: "Text",
      category: "Layout",
    },
    { symbol: "spc", latex: "\\quad", name: "Space", category: "Layout" },
    {
      symbol: "{ }",
      latex: "\\{ ⟨content⟩ \\}",
      name: "Braces",
      category: "Layout",
    },
    {
      symbol: "cases",
      latex: "\\begin{cases} ⟨expr⟩ & \\text{if } ⟨cond⟩ \\end{cases}",
      name: "Cases",
      category: "Layout",
    },
  ];

  const filteredSymbols = mathSymbols.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.latex.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const categories = [...new Set(mathSymbols.map((s) => s.category))];

  const filteredSavedEquations = savedEquations.filter((eq) => {
    if (!savedEquationSearch) return true;
    return eq.fileName
      .toLowerCase()
      .includes(savedEquationSearch.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl border border-gray-300 w-[95vw] max-w-7xl h-[90vh] flex flex-col">
        {/* HEADER */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Easy Math Input
            </h2>
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("editor")}
                className={`px-4 py-2 font-medium text-sm ${activeTab === "editor" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
              >
                Editor
              </button>
              <button
                onClick={() => setActiveTab("saved")}
                className={`px-4 py-2 font-medium text-sm ${activeTab === "saved" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"}`}
              >
                Saved Equations
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <TbX size={24} />
          </button>
        </div>

        {/* --- EDITOR TAB --- */}
        {activeTab === "editor" && (
          <div className="flex flex-1 overflow-hidden">
            {/* LEFT PANEL: Quick Insert */}
            <div className="w-1/5 border-r border-gray-200 p-4 bg-gray-50/30 flex flex-col">
              <div className="relative mb-3">
                <select
                  value={leftPanelMode}
                  onChange={(e) => setLeftPanelMode(e.target.value)}
                  className="w-full bg-white border border-gray-300 py-2 px-3 rounded font-semibold cursor-pointer outline-none focus:border-blue-500"
                >
                  <option value="symbols">Common Symbols</option>
                  <option value="equations">Common Equations</option>
                </select>
              </div>
              <div className="overflow-y-auto flex-1 grid grid-cols-2 gap-2 content-start">
                {(leftPanelMode === "symbols"
                  ? commonSymbols
                  : commonEquations
                ).map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSymbolClick(item.latex)}
                    className="p-2 border border-gray-300 bg-white rounded hover:bg-gray-100 flex flex-col items-center justify-center min-h-[50px] shadow-sm text-sm transition-colors"
                    title={item.name}
                  >
                    <span className="text-lg mb-1">{item.symbol}</span>
                    <span className="text-xs text-gray-600 truncate w-full text-center">
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* CENTER PANEL: Workspace */}
            <div className="flex-1 flex flex-col p-4 relative">
              {/* TOOLBAR */}
              <div className="flex justify-between items-center mb-2">
                <label className="font-semibold text-gray-700 flex items-center gap-2">
                  {builderMode && <TbPencil className="text-blue-500" />}
                  {builderMode
                    ? "Fill in the Blanks"
                    : isAiMode
                      ? "Describe Equation (AI)"
                      : "LaTeX Code"}
                </label>
                <div className="flex gap-2">
                  {!builderMode && (
                    <button
                      onClick={() => setIsAiMode(!isAiMode)}
                      className={`flex items-center gap-1 px-3 py-1 rounded text-sm border transition-colors ${isAiMode ? "bg-purple-100 text-purple-700 border-purple-300" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
                    >
                      <TbRobot size={16} />{" "}
                      {isAiMode ? "Manual Mode" : "AI Mode"}
                    </button>
                  )}
                  <button
                    onClick={() => setShowSaveDialog(true)}
                    className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm transition-colors"
                  >
                    <TbDeviceFloppy size={16} /> Save
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm transition-colors"
                  >
                    <TbCopy size={16} /> Copy
                  </button>
                  {!isAiMode && !builderMode && (
                    <button
                      onClick={() => handleCompile()}
                      disabled={isCompiling}
                      className="flex items-center gap-1 px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm disabled:opacity-50 transition-colors"
                    >
                      <TbPlayerPlay size={16} /> Compile
                    </button>
                  )}
                </div>
              </div>

              {/* INPUT AREA CONTAINER */}
              <div className="h-48 w-full border border-gray-300 rounded overflow-hidden relative bg-white shadow-inner">
                {/* MODE 1: BUILDER MODE */}
                {builderMode ? (
                  <div className="absolute inset-0 bg-blue-50/90 flex flex-col p-4 z-20 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4 border-b border-blue-200 pb-2">
                      <span className="text-sm font-bold text-blue-800 font-mono bg-blue-100 px-2 py-1 rounded">
                        {currentTemplate}
                      </span>
                      <button
                        onClick={cancelBuilder}
                        className="text-gray-500 hover:text-gray-700 text-xs flex items-center gap-1 font-bold"
                      >
                        <TbArrowBackUp /> Cancel
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto flex flex-wrap gap-4 items-start content-start">
                      {templateFields.map((field, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col flex-grow min-w-[120px] max-w-[200px]"
                        >
                          <label className="text-[10px] font-bold text-blue-600 mb-1 uppercase tracking-wider">
                            {field}
                          </label>
                          <input
                            ref={idx === 0 ? firstInputRef : null}
                            value={templateValues[field] || ""}
                            onChange={(e) =>
                              setTemplateValues({
                                ...templateValues,
                                [field]: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") confirmBuilder();
                              if (e.key === "Escape") cancelBuilder();
                            }}
                            className="p-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono bg-white shadow-sm"
                            placeholder="..."
                            autoComplete="off"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={confirmBuilder}
                        className="bg-blue-600 text-white px-5 py-2 rounded shadow hover:bg-blue-700 flex items-center gap-2 font-medium transition-transform active:scale-95"
                      >
                        <TbCheck /> Insert Equation
                      </button>
                    </div>
                  </div>
                ) : isAiMode ? (
                  // MODE 2: AI PROMPT
                  <div className="h-full w-full relative">
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="h-full w-full p-3 border border-purple-300 rounded resize-none font-sans text-sm leading-relaxed focus:ring-2 focus:ring-purple-100 outline-none pr-12"
                      placeholder="e.g., 'Schrodinger equation for a free particle' or 'Determinant of a 3x3 matrix'..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAiGenerate();
                        }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={handleAiGenerate}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="absolute bottom-3 right-3 bg-purple-600 text-white p-2 rounded-full shadow-lg hover:bg-purple-700 disabled:opacity-50 transition-all hover:scale-110"
                    >
                      {isGenerating ? (
                        <TbLoader className="animate-spin" />
                      ) : (
                        <TbArrowUp size={20} />
                      )}
                    </button>
                  </div>
                ) : (
                  // MODE 3: STANDARD EDITOR
                  <textarea
                    value={latexCode}
                    onChange={(e) => setLatexCode(e.target.value)}
                    className="h-full w-full p-4 resize-none outline-none font-mono text-sm leading-relaxed"
                    placeholder="Type LaTeX here or click symbols to insert..."
                  />
                )}
              </div>

              {/* PREVIEW AREA */}
              <div className="flex-1 flex flex-col mt-4">
                <label className="font-semibold text-gray-700 mb-2">
                  Preview
                </label>
                <div className="flex-1 border border-gray-300 rounded bg-white overflow-hidden flex items-center justify-center p-4 relative shadow-sm">
                  {isCompiling || isGenerating ? (
                    <div className="flex flex-col items-center text-gray-500 animate-pulse">
                      <TbLoader
                        size={32}
                        className="animate-spin mb-2 text-blue-500"
                      />
                      <p className="text-sm font-medium">
                        {isGenerating
                          ? "AI Generating..."
                          : "Compiling LaTeX..."}
                      </p>
                    </div>
                  ) : previewUrl ? (
                    // Smart handling of PDF vs Image
                    previewUrl.toLowerCase().includes(".pdf") ? (
                      <iframe
                        src={previewUrl}
                        className="w-full h-full border-none"
                        title="Preview"
                      />
                    ) : (
                      <img
                        src={previewUrl}
                        className="max-w-full max-h-full object-contain"
                        alt="Preview"
                      />
                    )
                  ) : (
                    <div className="text-center text-gray-400">
                      <TbPlayerPlay
                        size={48}
                        className="mx-auto mb-2 opacity-50"
                      />
                      <p>Click "Compile" or generate via AI to preview</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: Search & Library */}
            <div className="w-1/4 border-l border-gray-200 p-4 bg-gray-50/30 flex flex-col">
              <div className="relative mb-3">
                <div className="flex items-center border border-gray-300 rounded bg-white px-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <TbSearch className="text-gray-400" size={20} />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search symbols..."
                    className="w-full pl-2 pr-2 py-2 outline-none rounded bg-transparent text-sm"
                  />
                </div>

                {/* Dropdown Results */}
                {showDropdown && searchTerm && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto z-10 mt-1">
                    {filteredSymbols.slice(0, 30).map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSymbolClick(s.latex)}
                        className="w-full p-2 text-left hover:bg-gray-100 flex items-center gap-2 border-b last:border-0"
                      >
                        <span className="w-8 text-center text-lg">
                          {s.symbol}
                        </span>
                        <span className="text-xs truncate text-gray-600">
                          {s.name}
                        </span>
                      </button>
                    ))}
                    {filteredSymbols.length === 0 && (
                      <div className="p-2 text-center text-gray-500 text-xs">
                        No results
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-3 flex gap-2">
                <button
                  onClick={() => setExpandedCategories(new Set(categories))}
                  className="flex-1 px-2 py-1 text-[10px] uppercase font-bold bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Expand All
                </button>
                <button
                  onClick={() => setExpandedCategories(new Set())}
                  className="flex-1 px-2 py-1 text-[10px] uppercase font-bold bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Collapse
                </button>
              </div>

              <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {categories.map((category) => {
                  const syms = mathSymbols.filter(
                    (s) => s.category === category,
                  );
                  const isExpanded = expandedCategories.has(category);
                  return (
                    <div
                      key={category}
                      className="mb-3 bg-white rounded border border-gray-200 overflow-hidden"
                    >
                      <button
                        onClick={() => toggleCategoryExpansion(category)}
                        className="w-full flex justify-between items-center px-3 py-2 bg-gray-50 hover:bg-gray-100 text-xs font-bold text-gray-600 uppercase border-b border-gray-100"
                      >
                        {category}
                        <TbChevronDown
                          className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="grid grid-cols-4 gap-1 p-2 bg-white">
                          {syms.map((s, i) => (
                            <button
                              key={i}
                              onClick={() => handleSymbolClick(s.latex)}
                              className="p-1 border border-gray-100 bg-white hover:bg-blue-50 hover:border-blue-300 text-center rounded h-9 flex items-center justify-center transition-colors"
                              title={s.name}
                            >
                              <span className="text-base">{s.symbol}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* --- SAVED TAB --- */}
        {activeTab === "saved" && (
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            <div className="mb-4">
              <div className="relative">
                <div className="flex items-center border border-gray-300 rounded bg-white px-3 py-2">
                  <TbSearch className="text-gray-400" />
                  <input
                    className="ml-2 w-full outline-none text-sm"
                    placeholder="Search saved equations..."
                    value={savedEquationSearch}
                    onChange={(e) => setSavedEquationSearch(e.target.value)}
                    onFocus={() => setShowSavedDropdown(true)}
                  />
                </div>
                {showSavedDropdown && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto z-10 mt-1">
                    {filteredSavedEquations.map((eq) => (
                      <button
                        key={eq.fileName}
                        onClick={() => {
                          setSavedEquationSearch(eq.fileName);
                          setShowSavedDropdown(false);
                        }}
                        className="w-full p-2 text-left hover:bg-gray-100 text-sm border-b"
                      >
                        {eq.fileName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto border border-gray-300 rounded">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 sticky top-0 shadow-sm">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase border-b">
                      File Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase border-b w-1/3">
                      LaTeX
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase border-b">
                      Actions
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase border-b">
                      Preview
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSavedEquations.map((eq) => (
                    <tr key={eq.fileName} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {eq.fileName}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-500 truncate max-w-xs">
                        {eq.latex}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(eq.latex);
                              alert("Copied");
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Copy"
                          >
                            <TbCopy />
                          </button>
                          <button
                            onClick={() => {
                              setLatexCode(eq.latex);
                              setActiveTab("editor");
                              setIsAiMode(false);
                            }}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                            title="Load"
                          >
                            <TbFolder />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleCompile(eq.latex)}
                          className="p-1.5 text-orange-500 hover:bg-orange-50 rounded"
                        >
                          <TbPlayerPlay />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSavedEquations.length === 0 && (
                    <tr>
                      <td
                        colSpan="4"
                        className="text-center py-8 text-gray-400"
                      >
                        No equations found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- SAVE DIALOG --- */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[60] backdrop-blur-sm">
            <div className="bg-white rounded-lg p-6 w-96 shadow-2xl animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                Save Equation
              </h3>
              <input
                value={saveFileName}
                onChange={(e) => setSaveFileName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded mb-4 focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="Enter filename..."
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEquation}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
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

export default EasyMathInput;
