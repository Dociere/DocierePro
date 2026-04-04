import React, { useState, useCallback } from "react";
import { DEFAULT_REVIEW_OPTIONS } from "../hooks/useAIReviewer";

// ─── Icons (inline SVG to avoid new dependencies) ─────────────────────────────
const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconChevron = ({ down }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: down ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IconRefresh = ({ spinning }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    style={{ animation: spinning ? "ai-spin 1s linear infinite" : "none" }}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const IconSettings = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TYPE_META = {
  grammar:   { label: "Grammar",   color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  syntax:    { label: "Syntax",    color: "#c2410c", bg: "#fff7ed", border: "#fed7aa" },
  structure: { label: "Structure", color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd" },
  style:     { label: "Style",     color: "#16803c", bg: "#f0fdf4", border: "#bbf7d0" },
};

const CATEGORY_OPTIONS = Object.keys(TYPE_META);
const STRICTNESS_OPTIONS = ["light", "normal", "strict"];

const Badge = ({ type }) => {
  const meta = TYPE_META[type] || TYPE_META.grammar;
  return (
    <span style={{
      display: "inline-block",
      fontSize: "10px",
      fontWeight: 600,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      padding: "2px 7px",
      borderRadius: "999px",
      color: meta.color,
      background: meta.bg,
      border: `1px solid ${meta.border}`,
    }}>
      {meta.label}
    </span>
  );
};

// ─── Suggestion Card ──────────────────────────────────────────────────────────
const SuggestionCard = ({ sugg, index, onAccept, onDismiss, onJumpTo }) => {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[sugg.type] || TYPE_META.grammar;

  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${meta.border}`,
      borderLeft: `3px solid ${meta.color}`,
      borderRadius: "8px",
      marginBottom: "8px",
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      transition: "box-shadow 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 3px 8px rgba(0,0,0,0.11)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", padding: "8px 10px", gap: "8px", cursor: "pointer" }}
        onClick={() => setExpanded(v => !v)}>
        <Badge type={sugg.type} />
        <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", marginLeft: "auto" }}>
          Line {sugg.line}
        </span>
        <button
          title="Go to line"
          onClick={e => { e.stopPropagation(); onJumpTo(sugg.line); }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "#94a3b8", borderRadius: "4px" }}>
          ↗
        </button>
        <IconChevron down={expanded} />
      </div>

      {/* Diff preview */}
      <div style={{ padding: "0 10px 8px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center", fontSize: "11.5px", fontFamily: "Consolas, monospace" }}>
          <span style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "2px 6px", borderRadius: "4px", textDecoration: "line-through", maxWidth: "48%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {sugg.original_text}
          </span>
          <span style={{ color: "#94a3b8", fontFamily: "inherit" }}>→</span>
          <span style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", padding: "2px 6px", borderRadius: "4px", fontWeight: 600, maxWidth: "48%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {sugg.suggestion}
          </span>
        </div>
      </div>

      {/* Expanded reasoning */}
      {expanded && (
        <div style={{ padding: "0 10px 10px" }}>
          <p style={{ fontSize: "12px", color: "#475569", background: "#f8fafc", borderRadius: "6px", padding: "8px", margin: "0 0 8px" }}>
            {sugg.reasoning}
          </p>
          <div style={{ display: "flex", gap: "6px" }}>
            <button onClick={() => onAccept(index)} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
              padding: "5px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
              background: "#dcfce7", color: "#166534", border: "1px solid #86efac", cursor: "pointer",
              transition: "background 0.15s"
            }}
              onMouseEnter={e => e.currentTarget.style.background = "#bbf7d0"}
              onMouseLeave={e => e.currentTarget.style.background = "#dcfce7"}>
              <IconCheck /> Accept
            </button>
            <button onClick={() => onDismiss(index)} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
              padding: "5px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
              background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", cursor: "pointer",
              transition: "background 0.15s"
            }}
              onMouseEnter={e => e.currentTarget.style.background = "#e2e8f0"}
              onMouseLeave={e => e.currentTarget.style.background = "#f1f5f9"}>
              <IconClose /> Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Settings Panel ───────────────────────────────────────────────────────────
const SettingsPanel = ({ reviewOptions, setReviewOptions, autoReview, setAutoReview }) => {
  const toggleCat = (cat) => {
    setReviewOptions(prev => {
      const cats = prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat];
      // Always keep at least one category active
      return { ...prev, categories: cats.length > 0 ? cats : prev.categories };
    });
  };

  const allSelected = CATEGORY_OPTIONS.every(c => reviewOptions.categories.includes(c));

  return (
    <div style={{ padding: "12px 14px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#64748b", margin: 0 }}>
          Review Settings
        </p>
        <button
          onClick={() => setReviewOptions(prev => ({ ...prev, categories: [...CATEGORY_OPTIONS] }))}
          style={{
            fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "4px",
            cursor: "pointer", transition: "all 0.15s",
            background: allSelected ? "#f1f5f9" : "#4f46e5",
            color: allSelected ? "#94a3b8" : "#fff",
            border: `1px solid ${allSelected ? "#e2e8f0" : "#4338ca"}`,
          }}
        >
          Select All
        </button>
      </div>

      {/* Inline warning when syntax is not selected */}
      {!reviewOptions.categories.includes("syntax") && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "6px",
          background: "#fff7ed", border: "1px solid #fed7aa",
          borderRadius: "6px", padding: "7px 9px", marginBottom: "10px"
        }}>
          <span style={{ fontSize: "12px", flexShrink: 0 }}>⚠️</span>
          <span style={{ fontSize: "11px", color: "#92400e", lineHeight: 1.4 }}>
            <strong>Syntax</strong> is off — LaTeX errors like missing
            {" "}<code style={{ fontFamily: "Consolas,monospace", fontSize: "10px" }}>$...$</code>
            {" "}math delimiters won't be reported.
          </span>
        </div>
      )}

      {/* Categories */}
      <p style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "6px" }}>Focus Areas</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
        {CATEGORY_OPTIONS.map(cat => {
          const active = reviewOptions.categories.includes(cat);
          const meta = TYPE_META[cat];
          return (
            <button key={cat} onClick={() => toggleCat(cat)} style={{
              padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s",
              background: active ? meta.bg : "#fff",
              color: active ? meta.color : "#94a3b8",
              border: `1.5px solid ${active ? meta.border : "#e2e8f0"}`,
            }}>
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Strictness */}
      <p style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "6px" }}>Strictness</p>
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
        {STRICTNESS_OPTIONS.map(s => (
          <button key={s} onClick={() => setReviewOptions(prev => ({ ...prev, strictness: s }))} style={{
            flex: 1, padding: "4px 0", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
            textTransform: "capitalize", cursor: "pointer", transition: "all 0.15s",
            background: reviewOptions.strictness === s ? "#4f46e5" : "#fff",
            color: reviewOptions.strictness === s ? "#fff" : "#64748b",
            border: `1.5px solid ${reviewOptions.strictness === s ? "#4f46e5" : "#e2e8f0"}`,
          }}>
            {s}
          </button>
        ))}
      </div>

      {/* Auto-review toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Auto Review (60 s)</span>
        <button onClick={() => setAutoReview(v => !v)} style={{
          width: "36px", height: "20px", borderRadius: "999px", border: "none", cursor: "pointer",
          background: autoReview ? "#4f46e5" : "#cbd5e1",
          position: "relative", transition: "background 0.2s",
        }}>
          <span style={{
            position: "absolute", top: "2px",
            left: autoReview ? "18px" : "2px",
            width: "16px", height: "16px",
            borderRadius: "50%", background: "#fff",
            transition: "left 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)"
          }} />
        </button>
      </div>
    </div>
  );
};


// ─── Main Sidebar Component ───────────────────────────────────────────────────
/**
 * Props:
 *  isOpen          : boolean
 *  onClose         : () => void
 *  suggestions     : array
 *  isReviewing     : boolean
 *  autoReview      : boolean
 *  setAutoReview   : (v) => void
 *  reviewOptions   : object
 *  setReviewOptions: (opts) => void
 *  triggerReview   : () => void
 *  onAccept        : (index) => void
 *  onDismiss       : (index) => void
 *  onJumpToLine    : (lineNum) => void
 *  error           : string | null
 */
const AIReviewSidebar = ({
  isOpen,
  onClose,
  suggestions = [],
  isReviewing,
  autoReview,
  setAutoReview,
  reviewOptions,
  setReviewOptions,
  triggerReview,
  onAccept,
  onDismiss,
  onJumpToLine,
  error,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  // Group suggestions by type
  const grouped = CATEGORY_OPTIONS.reduce((acc, cat) => {
    const items = suggestions.filter(s => s.type === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  // Original index lookup
  const getOriginalIndex = useCallback((sugg) => {
    return suggestions.findIndex(s => s === sugg);
  }, [suggestions]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: "absolute",
      top: 0,
      right: 0,
      width: "320px",
      height: "100%",
      background: "#fff",
      borderLeft: "1px solid #e2e8f0",
      boxShadow: "-4px 0 20px rgba(0,0,0,0.08)",
      display: "flex",
      flexDirection: "column",
      zIndex: 50,
      fontFamily: "Inter, system-ui, sans-serif",
      transition: "transform 0.2s ease",
    }}>
      {/* Global animation keyframe */}
      <style>{`
        @keyframes ai-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ai-review-scroll::-webkit-scrollbar { width: 5px; }
        .ai-review-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", padding: "12px 14px",
        borderBottom: "1px solid #e2e8f0", background: "#fff",
        gap: "8px", flexShrink: 0,
      }}>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b", flex: 1 }}>
          AI Review
          {suggestions.length > 0 && (
            <span style={{
              marginLeft: "8px", fontSize: "11px", fontWeight: 700,
              background: "#4f46e5", color: "#fff",
              borderRadius: "999px", padding: "1px 7px"
            }}>
              {suggestions.length}
            </span>
          )}
        </span>

        <button
          title={showSettings ? "Hide settings" : "Settings"}
          onClick={() => setShowSettings(v => !v)}
          style={{ background: showSettings ? "#ede9fe" : "none", border: "none", cursor: "pointer", padding: "5px", borderRadius: "6px", color: showSettings ? "#4f46e5" : "#64748b" }}>
          <IconSettings />
        </button>

        <button
          id="ai-review-run-btn"
          title="Run Review"
          onClick={triggerReview}
          disabled={isReviewing}
          style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "5px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
            background: isReviewing ? "#e0e7ff" : "#4f46e5", color: isReviewing ? "#6366f1" : "#fff",
            border: "none", cursor: isReviewing ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}>
          <IconRefresh spinning={isReviewing} />
          {isReviewing ? "Analyzing…" : suggestions.length > 0 ? "Refresh" : "Run"}
        </button>

        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "5px", borderRadius: "6px", color: "#94a3b8" }}>
          <IconClose />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          reviewOptions={reviewOptions}
          setReviewOptions={setReviewOptions}
          autoReview={autoReview}
          setAutoReview={setAutoReview}
        />
      )}

      {/* Body */}
      <div className="ai-review-scroll" style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
        {/* Error */}
        {error && (
          <div style={{ background: "#fff1f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 12px", marginBottom: "12px", fontSize: "12px", color: "#be123c" }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Empty state */}
        {!isReviewing && suggestions.length === 0 && !error && (
          <div style={{ textAlign: "center", padding: "36px 20px" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔍</div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>No suggestions yet</p>
            <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "12px" }}>
              Click <strong>Run</strong> to have the AI review your document.
            </p>
            {/* Show active scope so users can diagnose missed errors */}
            <div style={{
              display: "inline-flex", flexWrap: "wrap", gap: "4px",
              justifyContent: "center",
              background: "#f8fafc", border: "1px solid #e2e8f0",
              borderRadius: "8px", padding: "8px 10px",
            }}>
              <span style={{ fontSize: "10px", color: "#94a3b8", width: "100%", marginBottom: "4px" }}>Active scope:</span>
              {reviewOptions && CATEGORY_OPTIONS.map(cat => {
                const active = reviewOptions.categories.includes(cat);
                const meta = TYPE_META[cat];
                return (
                  <span key={cat} style={{
                    fontSize: "10px", fontWeight: 600, padding: "1px 7px",
                    borderRadius: "999px",
                    background: active ? meta.bg : "#f1f5f9",
                    color: active ? meta.color : "#cbd5e1",
                    border: `1px solid ${active ? meta.border : "#e2e8f0"}`,
                    textDecoration: active ? "none" : "line-through",
                    opacity: active ? 1 : 0.5,
                  }}>
                    {meta.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading */}
        {isReviewing && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: "28px", marginBottom: "12px", animation: "ai-spin 1s linear infinite", display: "inline-block" }}>⚙️</div>
            <p style={{ fontSize: "13px", color: "#64748b" }}>Analyzing document…</p>
          </div>
        )}

        {/* Grouped suggestions */}
        {!isReviewing && Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <Badge type={cat} />
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>{items.length} suggestion{items.length !== 1 ? "s" : ""}</span>
            </div>
            {items.map(sugg => {
              const origIdx = getOriginalIndex(sugg);
              return (
                <SuggestionCard
                  key={origIdx}
                  sugg={sugg}
                  index={origIdx}
                  onAccept={onAccept}
                  onDismiss={onDismiss}
                  onJumpTo={onJumpToLine}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer stats */}
      {suggestions.length > 0 && (
        <div style={{
          padding: "8px 14px", borderTop: "1px solid #e2e8f0",
          background: "#f8fafc", flexShrink: 0,
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>
            {suggestions.length} open · {CATEGORY_OPTIONS.filter(c => grouped[c]).length} categories
          </span>
          <button
            onClick={() => { suggestions.forEach((_, i) => onDismiss(0)); }}
            style={{ fontSize: "11px", color: "#94a3b8", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
            Dismiss all
          </button>
        </div>
      )}
    </div>
  );
};

export default AIReviewSidebar;
