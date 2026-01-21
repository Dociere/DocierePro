import React, { useEffect, useContext, useRef, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import { useYjsMonaco } from "../hooks/useYjsMonaco";
import { useSettings } from "../context/useSettings";

const MonacoEditorPanel = ({
  value = "",
  handleLatexChange = () => console.warn("handleLatexChange not provided"),
  monacoEditorRef = { current: null },
  projectId = null,
  token = null,
  isOnline = null,
  user = null,
}) => {
  const editorInstanceRef = useRef(null);
  const [editorReady, setEditorReady] = useState(false);
  const { settings } = useSettings();
  const isDark = settings.appearance.mode === "dark";

  // const { users, syncStatus } = useYjsMonaco(
  //   projectId,
  //   token,
  //   isOnline,
  //   editorInstanceRef.current,
  // );

  useEffect(() => {
    if (editorInstanceRef.current && value !== undefined) {
      const currentValue = editorInstanceRef.current.getValue();
      if (currentValue !== value) {
        console.log("📝 Updating Monaco editor with new content");
        editorInstanceRef.current.setValue(value);
      }
    }
  }, [value]);

  // Update editor font size when settings change
  useEffect(() => {
    if (editorInstanceRef.current) {
      editorInstanceRef.current.updateOptions({
        fontSize: settings.editor.fontSize,
      });
    }
  }, [settings.editor.fontSize]);

  const handleEditorMount = (editor, monaco) => {
    monacoEditorRef.current = editor;
    editorInstanceRef.current = editor;

    monaco.editor.defineTheme("customLight", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editorLineNumber.foreground": "#888888",
        "editorLineNumber.activeForeground": "#000000",
      },
    });

    // Apply the theme from settings
    monaco.editor.setTheme(settings.editor.theme);

    // Mark editor as ready AFTER mount
    console.log("✅ Monaco editor mounted and ready");
    setEditorReady(true);
  };

  // Only initialize Yjs AFTER editor is ready
  const { users, syncStatus } = useYjsMonaco(
    projectId,
    token,
    isOnline,
    editorReady ? editorInstanceRef.current : null, // Pass null until ready
    user
  );

  console.log("Monaco render:", {
    projectId,
    token: !!token,
    editorReady,
    isOnline,
  });

  return (
    <div className="h-full w-full flex-1 flex flex-col">
      {/* Active Users Bar */}
      {users.length > 0 && (
        <div className={`px-4 py-2 border-b flex items-center gap-3 transition-colors duration-300 ${isDark ? "bg-[#1e1e1e] border-[#333]" : "bg-gray-50 border-gray-200"
          }`}>
          <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Active:</span>
          {users.map((user, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
              style={{
                backgroundColor: user.user.color + (isDark ? "40" : "20"),
                color: isDark ? "#e0e0e0" : "#333"
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: user.user.color }}
              />
              <span>{user.user.name}</span>
              {user.user.isGuest && (
                <span className={isDark ? "text-gray-500" : "text-gray-400"}>(Guest)</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sync Status Indicator */}
      <div className={`px-4 py-1 border-b text-xs transition-colors duration-300 ${isDark ? "bg-[#252525] border-[#333] text-gray-400" : "bg-gray-100 border-gray-200"
        }`}>
        Status:{" "}
        <span
          className={
            syncStatus === "synced"
              ? (isDark ? "text-green-400" : "text-green-600")
              : (isDark ? "text-orange-400" : "text-orange-600")
          }
        >
          {syncStatus}
        </span>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 h-full">
        <MonacoEditor
          height="100%"
          defaultLanguage="latex"
          value={value}
          onChange={handleLatexChange}
          theme={settings.editor.theme}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: true },
            fontSize: settings.editor.fontSize,
            wordWrap: "on",
            automaticLayout: true,
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            renderLineHighlight: "all",
            tabSize: 2,
            insertSpaces: true,
            autoIndent: "full",
            formatOnType: true,
            formatOnPaste: true,
            suggestOnTriggerCharacters: true,
            wordBasedSuggestions: true,
            folding: true,
            brackets: "always",
          }}
        />
      </div>
    </div>
  );
};

// Do not uncomment this below code. This was removed since the new version of Monaco Editor does not support defaultProps

// MonacoEditorPanel.defaultProps = {
//   value: "",
//   handleLatexChange: () => console.warn("handleLatexChange not provided"),
//   monacoEditorRef: { current: null },
//   projectId: null,
//   token: null,
//   isOnline: true,
// };

export default MonacoEditorPanel;
