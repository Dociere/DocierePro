import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { saveSettings, loadSettings, api } from "../api/projectHandling";

const SettingsContext = createContext();

const DEFAULT_SETTINGS = {
  appearance: {
    theme: "light",
    customThemes: {
      dark: {
        background: "#232323",
        surface: "#1a1a1a",
        primary: "#161616",
        secondary: "#FF69B4",
        border: "#313131",
        text1: "#ffffff",
        text2: "#E4E4E4",
        text3: "#BDBDBD",
        icon1: "#ffffff",
        custom1: "#FFD700",
        custom2: "#FFD700",
        monacoEditor: "vs-dark",
      },
      light: {
        background: "#F9F9F9",
        surface: "#eaeaea",
        primary: "#ffffff",
        secondary: "#f9fafb",
        border: "#CFCFCF",
        text1: "#000000",
        text2: "#212121",
        text3: "#6b7280",
        icon1: "#585858",
        custom1: "#FFD700", //Didn't set any value
        custom2: "#FFD700", //Didn't set any value
        monacoEditor: "latex-light",
      },
    },
  },
  editor: {
    fontFamily: "Inter",
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    lineNumbers: "on",
    autoIndent: "full",
  },
  app: {
    autoSave: true,
    showLineHighlight: "all",
    minimap: false,
    aiConfigs: [],
  },
  recentFiles: [],
  shortcuts: {
    save: "Ctrl+S",
    compile: "Ctrl+Shift+B",
  },
  server: {
    mode: "selfHosting",
    methods: {
      selfHosting: { backendServer: "", webSocketServer: "" },
      cloudHosting: {
        backendServer: "server.dociere.com",
        webSocketServer: "ws.dociere.com",
      },
    },
  },
  updates: {
    autoCheck: true,
    lastCheckedAt: null,
    pendingVersion: null,
    pendingReleaseNotes: null,
  },
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage on mount
  // This is how to use them in frontend:
  // style={{ fontSize: settings.editor.fontSize }}
  useEffect(() => {
    const loadSetting = async () => {
      try {
        const response = await loadSettings();
        console.log("settings from config", response.settings);

        if (response && response.success) {
          setSettings({ ...DEFAULT_SETTINGS, ...response.settings });
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSetting();
  }, []);

  //Load the base URL where the server is
  useEffect(() => {
    const mode = settings.server?.mode;
    const serverUrl = settings.server?.methods[mode]?.backendServer;

    if (!serverUrl) return;

    // Add the interceptor to inject the baseURL dynamically
    const interceptor = api.interceptors.request.use((config) => {
      const formattedUrl = serverUrl.startsWith("http")
        ? serverUrl
        : `https://${serverUrl}`;
      config.baseURL = formattedUrl;
      return config;
    });

    // Cleanup the interceptor if settings change to avoid memory leaks/duplicates
    return () => api.interceptors.request.eject(interceptor);
  }, [settings.server]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      const save = async () => {
        try {
          console.log("settings", settings);
          await saveSettings(settings);
        } catch (error) {
          console.error("Failed to save settings:", error);
        }
      };
      save();
    }
  }, [settings, isLoading]);

  // Apply dark mode class to document (in Tailwind simply use dark:style for theme related changes, example: dark:bg-black)
  useEffect(() => {
    if (settings.appearance.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.appearance.theme]);

  // Update individual setting
  // const updateSetting = (section, key, value) => {
  //   setSettings((prev) => ({
  //     ...prev,
  //     [section]: {
  //       ...prev[section],
  //       [key]: value,
  //     },
  //   }));
  // };

  const updateSetting = (a, b, c) => {
    if (c !== undefined) {
      // old usage
      return setSettings((prev) => ({
        ...prev,
        [a]: {
          ...prev[a],
          [b]: c,
        },
      }));
    }

    // new deep path usage
    const path = a;
    const value = b;

    setSettings((prev) => {
      const keys = path.split(".");
      const newState = { ...prev };
      let curr = newState;

      keys.forEach((key, i) => {
        if (i === keys.length - 1) curr[key] = value;
        else {
          curr[key] = { ...curr[key] };
          curr = curr[key];
        }
      });

      return newState;
    });
  };

  // Update entire section
  const updateSection = (section, values) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...values,
      },
    }));
  };

  // Reset to defaults
  const resetSettings = () => {
    saveSettings(DEFAULT_SETTINGS);
  };

  const value = {
    settings,
    updateSetting,
    updateSection,
    resetSettings,
    isLoading,
  };

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

//Logic:
// - There will be a default theme (set to light mode)
// - useSettings will populate colorTheme = {} with colors from config.json
// - Frontend classes will import colorTheme and use it as
// <div className={`${currentColors.primary} ${currentColors.text} h-20 w-32`}></div>
