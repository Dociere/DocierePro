import { useState, useCallback, useRef, useEffect } from "react";
import { fetchAIReview } from "../api/projectHandling";

const DEBOUNCE_MS = 60_000; // 60 s inactivity before auto-review fires

export const DEFAULT_REVIEW_OPTIONS = {
  categories: ["grammar", "syntax", "structure", "style"],
  strictness: "normal",
};

/**
 * useAIReviewer
 *
 * Manages the full lifecycle of AI suggestions:
 *  - Manual / automatic triggering
 *  - Category + strictness configuration
 *  - Stale-suggestion invalidation (when the user edits a line that has a suggestion)
 */
export const useAIReviewer = ({ latexContent, aiConfig }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [autoReview, setAutoReview] = useState(false);
  const [reviewOptions, setReviewOptions] = useState(DEFAULT_REVIEW_OPTIONS);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);
  // Keep a ref to the last content snapshot so we can diff on changes
  const lastContentRef = useRef(latexContent);

  // ------------------------------------------------------------------
  // Stale-suggestion invalidation
  // When the user edits lines that contain active suggestions, remove
  // those suggestions automatically to prevent accepting stale edits.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!latexContent || suggestions.length === 0) {
      lastContentRef.current = latexContent;
      return;
    }

    const prev = lastContentRef.current || "";
    if (prev === latexContent) return;

    // Build a set of changed line numbers (1-indexed)
    const prevLines = prev.split("\n");
    const newLines = latexContent.split("\n");
    const changedLineNums = new Set();
    const maxLen = Math.max(prevLines.length, newLines.length);
    for (let i = 0; i < maxLen; i++) {
      if (prevLines[i] !== newLines[i]) {
        changedLineNums.add(i + 1); // 1-indexed
      }
    }

    // Also detect deleted/inserted lines above a suggestion's line number
    const lineDelta = newLines.length - prevLines.length;

    setSuggestions((prev) =>
      prev.filter((sugg) => {
        // If the suggestion's original text no longer exists in the doc → stale
        if (!latexContent.includes(sugg.original_text)) return false;
        // If the line itself changed → stale
        if (changedLineNums.has(sugg.line)) return false;
        return true;
      })
    );

    lastContentRef.current = latexContent;
  }, [latexContent]); // intentionally omits `suggestions` to avoid loop

  // ------------------------------------------------------------------
  // Manual trigger
  // ------------------------------------------------------------------
  const triggerReview = useCallback(async () => {
    if (!latexContent || !aiConfig) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    setError(null);
    setIsReviewing(true);

    try {
      const result = await fetchAIReview(
        latexContent,
        aiConfig,
        abortControllerRef.current.signal,
        reviewOptions
      );
      if (result.success && result.suggestions) {
        setSuggestions(result.suggestions);
        lastContentRef.current = latexContent; // reset stale baseline
      } else {
        setError(result.error || "Review returned no suggestions.");
      }
    } catch (err) {
      if (err.message !== "Request canceled") {
        console.error("AI Review failed", err);
        setError(err.message || "Review failed.");
      }
    } finally {
      setIsReviewing(false);
      abortControllerRef.current = null;
    }
  }, [latexContent, aiConfig, reviewOptions]);

  // ------------------------------------------------------------------
  // Auto-review (debounced on inactivity)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!autoReview || !latexContent) return;

    const timer = setTimeout(() => {
      triggerReview();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [latexContent, autoReview, triggerReview]);

  // ------------------------------------------------------------------
  // Mutation helpers
  // ------------------------------------------------------------------
  const dismissSuggestion = useCallback((index) => {
    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // acceptSuggestion just removes from list; the actual text edit is done
  // by monacoEditor.jsx via handleAcceptSuggestion which calls replaceRange first.
  const acceptSuggestion = useCallback(
    (index) => {
      dismissSuggestion(index);
    },
    [dismissSuggestion]
  );

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isReviewing,
    autoReview,
    setAutoReview,
    reviewOptions,
    setReviewOptions,
    triggerReview,
    dismissSuggestion,
    acceptSuggestion,
    clearSuggestions,
    error,
  };
};
