import React, { useState, useRef, useEffect, useContext } from "react";
import {
  editDocumentWithAI,
  saveChatMessage,
  loadChatHistory,
} from "../api/projectHandling";
import { projectContext } from "../context/useProject";

const AIChatPanel = ({ projectDetails, onApplyChanges }) => {
  const { updateProjectDetails } = useContext(projectContext);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const projectId = projectDetails.currentProject?.id;

  // 1. Load History on Mount
  useEffect(() => {
    if (projectId) {
      loadChatHistory(projectId).then((history) => {
        if (history.length > 0) {
          setMessages(history);
        } else {
          // Default Welcome Message if no history
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

  useEffect(() => scrollToBottom(), [messages, isTyping]);

  // Helper to add message to state AND save to backend
  const addMessage = (msg) => {
    setMessages((prev) => [...prev, msg]);
    // Only save persistent fields (remove large payloads like 'newContent' if you want to save space)
    saveChatMessage(projectId, msg);
  };

  const handleSend = async (e) => {
    e.preventDefault();
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
    setIsTyping(true);

    try {
      const result = await editDocumentWithAI(
        userMsg.text,
        projectDetails.latexContent,
      );
      setIsTyping(false);

      if (result.success) {
        const aiMsg = {
          id: Date.now() + 1,
          sender: "ai",
          text: "Here is a preview of the changes:",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          // These properties enable the interactive buttons for this session ONLY
          isAction: true,
          snippet: result.changedSnippet || "Changes applied globally.",
          newContent: result.latexContent,
        };
        // We add it to state with 'isAction' to show buttons
        setMessages((prev) => [...prev, aiMsg]);

        // But when saving to history, we might want to strip 'newContent' to save DB space
        // For simplicity here, we save everything.
        saveChatMessage(projectId, aiMsg);
      }
    } catch (error) {
      setIsTyping(false);
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

  const handleApplyChanges = (msgId, newContent) => {
    // updateProjectDetails({ latexContent: newContent });
    if (onApplyChanges) {
      onApplyChanges(newContent);
    }

    // Remove buttons from the message that was clicked
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isAction: false } : m)),
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
    // Remove buttons
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isAction: false } : m)),
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-lg px-4 py-3 text-sm shadow-sm ${
                msg.sender === "user"
                  ? "bg-[#343434] text-white rounded-br-none"
                  : msg.sender === "system"
                    ? "bg-purple-100 text-purple-700 border border-purple-200 text-center font-medium" // Apply Confirm
                    : "bg-white border border-[#CFCFCF] text-[#343434] rounded-bl-none"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>

              {msg.snippet && (
                <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono text-gray-700 overflow-x-auto max-h-40">
                  {msg.snippet}
                </div>
              )}

              {/* Action Buttons (Only show if isAction is true) */}
              {msg.isAction && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={() => handleApplyChanges(msg.id, msg.newContent)}
                    className="flex-1 bg-[#343434] hover:bg-black text-white text-xs font-semibold py-2 px-3 rounded transition-colors flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    Apply
                  </button>
                  <button
                    onClick={() => handleRejectChanges(msg.id)}
                    className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold py-2 px-3 rounded transition-colors flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      ></path>
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

        {isTyping && (
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
            className="flex-1 bg-transparent px-3 py-2 text-sm text-[#343434] outline-none placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className={`p-2 rounded-md transition-colors ${input.trim() ? "bg-[#343434] text-white hover:bg-black" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIChatPanel;
