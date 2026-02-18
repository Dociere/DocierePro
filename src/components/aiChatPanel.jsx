import React, { useState, useRef, useEffect, useContext } from "react";
import {
  editDocumentWithAI,
  saveChatMessage,
  loadChatHistory,
} from "../api/projectHandling";
import { projectContext } from "../context/useProject";
import GoBack from "../assets/icons/goBack.svg?react";

const AIChatPanel = ({ projectDetails, sections, onApplyChanges, onClose }) => {
  const { updateProjectDetails } = useContext(projectContext);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);        // API request in-flight
  const [streamingMsgId, setStreamingMsgId] = useState(null); // Which msg is doing typewriter
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const projectId = projectDetails.currentProject?.id;

  // Derived: input should be disabled when loading or streaming
  const isBusy = isLoading || streamingMsgId !== null;

  // ---- Typewriter effect component ----
  const TypewriterText = ({ text, onComplete }) => {
    const [displayedText, setDisplayedText] = useState("");
    const indexRef = useRef(0);

    useEffect(() => {
      indexRef.current = 0;
      setDisplayedText("");

      const interval = setInterval(() => {
        if (indexRef.current < text.length) {
          setDisplayedText((prev) => prev + text.charAt(indexRef.current));
          indexRef.current++;
          scrollToBottom();
        } else {
          clearInterval(interval);
          if (onComplete) onComplete();
        }
      }, 15);

      return () => clearInterval(interval);
    }, [text]);

    return <p className="whitespace-pre-wrap">{displayedText}</p>;
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Track which files were resolved so we can reconstruct even if AI strips markers
  const resolvedFilesRef = useRef([]);

  // ---- Resolve \input{} directives: inline file contents with markers ----
  const resolveInputs = (latexContent) => {
    const files = projectDetails.currentProject?.files || {};
    const resolved = [];

    const result = latexContent.replace(/\\input\{([^}]+)\}/g, (match, inputName) => {
      const fileName = inputName.endsWith(".tex") ? inputName : inputName + ".tex";
      const fileEntry = files[fileName];
      if (fileEntry && fileEntry.content !== undefined) {
        resolved.push({ fileName, inputName, originalContent: (fileEntry.content || "").trim() });
        return `%% BEGIN_INPUT{${fileName}} %%\n${(fileEntry.content || "").trim()}\n%% END_INPUT{${fileName}} %%`;
      }
      return match; // Leave as-is if file not found
    });

    resolvedFilesRef.current = resolved;
    return result;
  };

  // ---- Reconstruct \input{} from AI response ----
  // Strategy: try markers first, then fallback to content-matching for stripped markers
  const reconstructInputs = (aiLatex) => {
    const fileUpdates = {};
    const MARKER_REGEX = /%% BEGIN_INPUT\{([^}]+)\} %%\n([\s\S]*?)\n%% END_INPUT\{\1\} %%/g;

    // 1. Check if any markers survive
    let hasMarkers = MARKER_REGEX.test(aiLatex);
    MARKER_REGEX.lastIndex = 0; // reset regex state

    if (hasMarkers) {
      // Markers preserved — extract as before
      const reconstructed = aiLatex.replace(MARKER_REGEX, (match, fileName, content) => {
        fileUpdates[fileName] = content.trim();
        const inputName = fileName.replace(/\.tex$/, "");
        return `\\input{${inputName}}`;
      });
      return { latex: reconstructed, fileUpdates };
    }

    // 2. Fallback: AI stripped the markers. Check if \input{} directives still exist.
    //    If they do, the AI didn't change those sections — no fileUpdates needed.
    const inputDirRegex = /\\input\{([^}]+)\}/g;
    let inputMatch;
    const remainingInputs = new Set();
    while ((inputMatch = inputDirRegex.exec(aiLatex)) !== null) {
      const fn = inputMatch[1].endsWith(".tex") ? inputMatch[1] : inputMatch[1] + ".tex";
      remainingInputs.add(fn);
    }

    // For each resolved file, check if its \input{} is still in the AI output
    let latex = aiLatex;
    for (const { fileName, inputName, originalContent } of resolvedFilesRef.current) {
      if (remainingInputs.has(fileName)) {
        // \input{} still present — AI left it alone, no update needed
        continue;
      }

      // The \input{} was removed and content was inlined by the AI.
      // Try to find the inlined content and extract it back.
      // Use the original content as an anchor — look for a region that
      // either matches or is near the original content's location.
      
      // Strategy: search for the original content (or a prefix of it) in the AI output.
      // If found, replace it with \input{} and save the new content.
      // If the content was modified by the AI, we try to find any content between
      // the surrounding \input{} or structural markers.
      
      // Simple approach: if the original content appears verbatim, restore \input
      if (originalContent && latex.includes(originalContent)) {
        fileUpdates[fileName] = originalContent;
        latex = latex.replace(originalContent, `\\input{${inputName}}`);
      } else {
        // Content was modified by AI. We need to find it.
        // Look for the AI's version of this section by searching for content
        // that appeared where the original was (using surrounding context).
        // For now, don't try to extract — just let the inline change go through
        // but warn. The user can reject the change.
        console.warn(`AI inlined and modified content from ${fileName}. Content will be applied to main document.`);
      }
    }

    return { latex, fileUpdates };
  };


  // ---- Build context from sections ----
  const buildContext = () => {
    if (!sections || sections.length === 0) return null;

    // Extract title from preamble
    const preambleBlock = sections.find((s) => s.type === "preamble");
    let title = "";
    if (preambleBlock?.content) {
      const titleMatch = preambleBlock.content.match(/\\title\{([^}]+)\}/);
      if (titleMatch) title = titleMatch[1];
    }

    // Extract abstract
    const abstractBlock = sections.find(
      (s) => s.subtype === "env" && (s.envTag === "abstract" || s.name?.toLowerCase() === "abstract")
    );
    const abstractText = abstractBlock?.content?.substring(0, 500) || "";

    // Build section outline
    const outline = sections
      .filter((s) => s.type === "section" && s.name)
      .map((s) => s.name);

    return { title, abstractText, outline };
  };

  // 1. Load History on Mount
  useEffect(() => {
    if (projectId) {
      loadChatHistory(projectId).then((history) => {
        if (history.length > 0) {
          setMessages(history);
        } else {
          const welcomeMsg = {
            id: Date.now(),
            sender: "ai",
            text: "I have analyzed your document. Tell me what you'd like to change.",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
          setMessages([welcomeMsg]);
          saveChatMessage(projectId, welcomeMsg);
        }
      });
    }
  }, [projectId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => scrollToBottom(), [messages, isLoading]);

  // Helper to add message to state AND save to backend
  const addMessage = (msg) => {
    setMessages((prev) => [...prev, msg]);
    saveChatMessage(projectId, msg);
  };

  const handleSend = async (e) => {
    e.preventDefault();

    // STOP BUTTON: abort if busy
    if (isBusy) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setIsLoading(false);
      setStreamingMsgId(null);

      const abortedMsg = {
        id: Date.now(),
        sender: "system",
        text: "Request stopped by user.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      addMessage(abortedMsg);
      return;
    }

    if (!input.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: input,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    addMessage(userMsg);
    setInput("");
    setIsLoading(true); // Show thinking bubble

    abortControllerRef.current = new AbortController();

    try {
      // Build context from sections
      const context = buildContext();

      // Resolve \input{} directives so AI can see file contents
      const resolvedLatex = resolveInputs(projectDetails.latexContent);

      const result = await editDocumentWithAI(
        userMsg.text,
        resolvedLatex,
        abortControllerRef.current.signal,
        context
      );

      abortControllerRef.current = null;
      setIsLoading(false); // Hide thinking bubble

      if (result.success) {
        const aiMsgId = Date.now() + 1;
        const aiMsg = {
          id: aiMsgId,
          sender: "ai",
          text: result.aiMessage || "Here is a preview of the changes:",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isAction: true,
          snippet: result.changedSnippet || "Changes applied globally.",
          newContent: result.latexContent,
          isStreaming: true,
        };
        setMessages((prev) => [...prev, aiMsg]);
        setStreamingMsgId(aiMsgId); // Start typewriter
        saveChatMessage(projectId, { ...aiMsg, isStreaming: false });
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("AI Request aborted");
        return;
      }

      setIsLoading(false);
      setStreamingMsgId(null);
      abortControllerRef.current = null;

      const errorMsg = {
        id: Date.now(),
        sender: "ai",
        text: "Sorry, I couldn't process that edit.",
        isError: true,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      addMessage(errorMsg);
    }
  };

  // Called when typewriter finishes
  const handleStreamingComplete = (msgId) => {
    setStreamingMsgId(null);
    // Clear isStreaming from state so copy button shows
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isStreaming: false } : m))
    );
  };

  const handleApplyChanges = (msgId, newContent) => {
    // Reconstruct \input{} from markers and extract file updates
    const { latex, fileUpdates } = reconstructInputs(newContent);

    if (onApplyChanges) {
      onApplyChanges(latex, fileUpdates);
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isAction: false } : m))
    );

    const sysMsg = {
      id: Date.now(),
      sender: "system",
      text: "✓ Changes applied successfully",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    addMessage(sysMsg);
  };

  const handleRejectChanges = (msgId) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isAction: false } : m))
    );

    const rejectMsg = {
      id: Date.now(),
      sender: "ai",
      text: "Changes discarded. Let me know if you want to try a different edit.",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    addMessage(rejectMsg);
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] font-inter">
      <button
        onClick={onClose}
        className="font-inter w-32 ml-4 pl-3 pb-1 mt-1 h-6 pt-1 mb-1 rounded-full text-sm hover:bg-gray-100 sticky text-gray-800 flex cursor-pointer font-medium"
      >
        <GoBack style={{ fill: "#0a0a0a" }} className="w-5 h-5 mr-4" />
        Go Back
      </button>
      <hr />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
          >
            {/* Message bubble — relative + group for copy button hover */}
            <div
              className={`relative group max-w-[90%] rounded-lg px-4 py-3 text-sm shadow-sm ${
                msg.sender === "user"
                  ? "bg-[#343434] text-white rounded-br-none"
                  : msg.sender === "system"
                    ? "bg-purple-100 text-purple-700 border border-purple-200 text-center font-medium"
                    : "bg-white border border-[#CFCFCF] text-[#343434] rounded-bl-none"
              }`}
            >
              {msg.sender === "ai" && msg.isStreaming && streamingMsgId === msg.id ? (
                <TypewriterText
                  text={msg.text}
                  onComplete={() => handleStreamingComplete(msg.id)}
                />
              ) : (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              )}

              {/* Copy Button — shows on AI messages after streaming completes */}
              {msg.sender === "ai" && !msg.isStreaming && (
                <button
                  onClick={() => handleCopy(msg.snippet || msg.newContent || msg.text)}
                  className="absolute -top-2 -right-2 p-1.5 text-gray-400 hover:text-gray-600 bg-white border border-gray-200 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Copy"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              )}

              {msg.snippet && (
                <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono text-gray-700 overflow-x-auto max-h-40">
                  {msg.snippet}
                </div>
              )}

              {/* Action Buttons */}
              {msg.isAction && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={() => handleApplyChanges(msg.id, msg.newContent)}
                    className="flex-1 bg-[#343434] hover:bg-black text-white text-xs font-semibold py-2 px-3 rounded transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Apply
                  </button>
                  <button
                    onClick={() => handleRejectChanges(msg.id)}
                    className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold py-2 px-3 rounded transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    Reject
                  </button>
                </div>
              )}
            </div>

            {msg.sender !== "system" && (
              <span className="text-[10px] text-gray-400 mt-1 mx-1">
                {msg.sender === "ai" ? "Docière AI" : "You"} • {msg.timestamp}
              </span>
            )}
          </div>
        ))}

        {/* Thinking bubble: only when loading AND no streaming message yet */}
        {isLoading && !streamingMsgId && (
          <div className="flex items-start">
            <div className="bg-white border border-[#CFCFCF] px-4 py-3 rounded-lg rounded-bl-none shadow-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-[#CFCFCF]">
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 border border-[#CFCFCF] rounded-lg p-1 bg-[#F9F9F9] focus-within:border-[#5F5F5F] transition-colors"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your edit..."
            disabled={isBusy}
            className={`flex-1 bg-transparent px-3 py-2 text-sm text-[#343434] outline-none placeholder:text-gray-400 ${isBusy ? "opacity-50 cursor-not-allowed" : ""}`}
          />
          <button
            type="submit"
            disabled={!input.trim() && !isBusy}
            className={`p-2 rounded-md transition-colors ${
              isBusy
                ? "bg-red-500 text-white hover:bg-red-600"
                : input.trim()
                  ? "bg-[#343434] text-white hover:bg-black"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isBusy ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIChatPanel;

