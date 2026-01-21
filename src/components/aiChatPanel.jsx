import React, { useState, useRef, useEffect } from "react";

const AIChatPanel = ({ projectDetails }) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "ai",
      text: "Hello! I am Docière AI. I have analyzed your document context. How can I assist you with writing or editing today?",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    {
      id: 2,
      sender: "user",
      text: "Can you help me rephrase the introduction to be more formal?",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    {
      id: 3,
      sender: "ai",
      text: "Certainly. I can generate a more academic version of your introduction. Would you like me to focus on the methodology or the problem statement specifically?",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage = {
      id: Date.now(),
      sender: "user",
      text: input,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI Latency
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        sender: "ai",
        text: "I've received your request. I will process the current LaTeX content and provide a suggestion shortly. (AI Integration coming soon)",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] font-inter">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-3 text-sm shadow-sm ${
                msg.sender === "user"
                  ? "bg-[#343434] text-white rounded-br-none"
                  : "bg-white border border-[#CFCFCF] text-[#343434] rounded-bl-none"
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[10px] text-gray-400 mt-1 mx-1">
              {msg.sender === "ai" ? "Docière AI" : "You"} • {msg.timestamp}
            </span>
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

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-[#CFCFCF]">
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 border border-[#CFCFCF] rounded-lg p-1 bg-[#F9F9F9] focus-within:border-[#5F5F5F] transition-colors"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Docière AI to edit or generate..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-[#343434] outline-none placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className={`p-2 rounded-md transition-colors ${
              input.trim()
                ? "bg-[#343434] text-white hover:bg-black"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
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
        <p className="text-[10px] text-center text-gray-400 mt-2">
          AI generated content may be inaccurate.
        </p>
      </div>
    </div>
  );
};

export default AIChatPanel;
