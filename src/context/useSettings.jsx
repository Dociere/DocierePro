import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { saveSettings, loadSettings } from "../api/projectHandling";

const SettingsContext = createContext();

const DEFAULT_SETTINGS = {
  appearance: {
    theme: "dark",
    customThemes: {
      dark: {
        background: "#000000",
        surface: "#1a1a1a",
        primary: "#1E90FF",
        secondary: "#FF69B4",
        text: "#FFFFFF",
        accent: "#FFD700",
        custom1: "#FFD700",
        custom2: "#FFD700",
      },
      light: {
        background: "#F9F9F9",
        surface: "#eaeaea",
        primary: "#1E90FF",
        secondary: "#FF69B4",
        text: "#000000",
        accent: "#FFD700",
        custom1: "#FFD700",
        custom2: "#FFD700",
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
  },
  recentFiles: [],
  shortcuts: {
    save: "Ctrl+S",
    compile: "Ctrl+Shift+B",
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
  const updateSetting = (section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
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
