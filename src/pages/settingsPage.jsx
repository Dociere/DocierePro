import React, { useState, useEffect } from "react";
import { useSettings } from "../context/useSettings";
import { useAuth } from "../context/useAuth";
import { useOutletContext, useNavigate, Link } from "react-router-dom";
import GoBack from "../assets/icons/goBack.svg?react";
import ConfirmModal from "../components/confirmModal";
import {
  saveAIConfigsToCloud,
  fetchAIConfigsFromCloud,
  fetchDecryptedSecret,
} from "../api/projectHandling";
import { MdOutlineDarkMode, MdOutlineLightMode } from "react-icons/md";

const SettingsPage = () => {
  const { isSectionSpaceOpen } = useOutletContext();
  const { settings, updateSetting, resetSettings } = useSettings();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("editor");
  const [visibleConfigId, setVisibleConfigId] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isAddingConfig, setIsAddingConfig] = useState(false);
  const [hostingMethod, setHostingMethod] = useState("self-hosted");
  const [newConfig, setNewConfig] = useState({
    id: "",
    name: "",
    provider: "gemini", // "gemini" or "ollama"
    model: "gemini-2.5-flash",
    apiKey: "", // For gemini
    url: "http://localhost:11434/api/generate", // For ollama
    active: false,
  });

  const tabs = [
    { id: "editor", label: "Editor" },
    { id: "configuration", label: "Configuration" },
    { id: "appearance", label: "Appearance" },
    { id: "account", label: "Account" },
  ];

  // const monacoThemes = [
  //   { value: "customLight", label: "Custom Light" },
  //   { value: "vs", label: "Visual Studio" },
  //   { value: "vs-dark", label: "Dark" },
  //   { value: "hc-black", label: "High Contrast" },
  // ];

  useEffect(() => {
    const loadCloudConfigs = async () => {
      if (isAuthenticated) {
        try {
          console.log("Fetching AI configs from CouchDB...");
          const cloudConfigs = await fetchAIConfigsFromCloud();

          if (cloudConfigs) {
            handleSettingChange("app", "aiConfigs", cloudConfigs);
          }
        } catch (error) {
          console.error("Failed to load configs from cloud:", error);
        }
      } else {
        console.log("User signed out, clearing AI configs from UI...");
        handleSettingChange("app", "aiConfigs", []);
      }
    };

    loadCloudConfigs();
  }, [isAuthenticated]);

  const handleSettingChange = (section, key, value) => {
    updateSetting(section, key, value);
  };

  const handleResetSettings = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    resetSettings();
    setShowResetConfirm(false);
  };

  const handleSaveConfig = async () => {
    const currentConfigs = settings.app?.aiConfigs || [];
    let updatedConfigs = [];

    if (newConfig.id) {
      // Update existing config
      updatedConfigs = currentConfigs.map((c) =>
        c.id === newConfig.id ? newConfig : c,
      );
    } else {
      // Add new config
      const configId = Date.now().toString();
      updatedConfigs = [
        ...currentConfigs,
        { ...newConfig, id: configId, active: currentConfigs.length === 0 },
      ];
    }

    // 1. Update local React state (and triggers the intercepted server.js save)
    handleSettingChange("app", "aiConfigs", updatedConfigs);

    // 2. THE MISSING CLOUD SAVE
    if (isAuthenticated) {
      try {
        await saveAIConfigsToCloud(updatedConfigs);
        console.log("Configs successfully saved to CouchDB");
      } catch (err) {
        console.error("Cloud sync failed:", err);
      }
    }

    // 3. Reset form
    setIsAddingConfig(false);
    setNewConfig({
      id: "",
      name: "",
      provider: "gemini",
      model: "gemini-2.5-flash",
      apiKey: "",
      url: "http://localhost:11434/api/generate",
      active: false,
    });
  };

  const handleEditConfig = (config) => {
    setNewConfig(config);
    setIsAddingConfig(true);
  };

  const handleDeleteConfig = async (id) => {
    const currentConfigs = settings.app?.aiConfigs || [];
    const updatedConfigs = currentConfigs.filter((c) => c.id !== id);
    if (
      updatedConfigs.length > 0 &&
      currentConfigs.find((c) => c.id === id)?.active
    ) {
      updatedConfigs[0].active = true;
    }

    handleSettingChange("app", "aiConfigs", updatedConfigs);

    // Sync deletion to cloud
    if (isAuthenticated) {
      await saveAIConfigsToCloud(updatedConfigs);
    }
  };

  // Replace your existing handleToggleVisibility with this:
  const handleToggleVisibility = async (configId, isForm = false) => {
    // 1. If we are hiding the key
    if ((!isForm && visibleConfigId === configId) || (isForm && showToken)) {
      if (isForm) {
        setShowToken(false);
      } else {
        // For the list: Replace the real key with the mask in UI state
        const maskedConfigs = settings.app.aiConfigs.map((c) =>
          c.id === configId ? { ...c, apiKey: "********" } : c,
        );
        handleSettingChange("app", "aiConfigs", maskedConfigs);
        setVisibleConfigId(null);
      }
      return;
    }

    // 2. If we are showing the key (Fetch and Decrypt)
    try {
      const realKey = await fetchDecryptedSecret(
        configId,
        settings.server.methods[mode].backendServer,
      );

      if (isForm) {
        // Update only the form's local state
        setNewConfig((prev) => ({ ...prev, apiKey: realKey }));
        setShowToken(true);
      } else {
        // Update the global list state
        const updatedConfigs = settings.app.aiConfigs.map((c) =>
          c.id === configId ? { ...c, apiKey: realKey } : c,
        );
        handleSettingChange("app", "aiConfigs", updatedConfigs);
        setVisibleConfigId(configId);
      }
    } catch (err) {
      console.error("Failed to fetch secure key:", err);
    }
  };

  const handleToggleActive = async (id) => {
    const currentConfigs = settings.app?.aiConfigs || [];
    const updatedConfigs = currentConfigs?.map((c) => ({
      ...c,
      active: c.id === id,
    }));

    handleSettingChange("app", "aiConfigs", updatedConfigs);

    // Sync active toggle to cloud
    if (isAuthenticated) {
      await saveAIConfigsToCloud(updatedConfigs);
    }
  };

  const isDark = settings.appearance.theme === "dark";

  return (
    <div
      className={`h-screen overflow-y-auto scrollbar-hide flex flex-col ml-12 pb-10 mt-11 ${
        isSectionSpaceOpen ? "ml-96" : "ml-0"
      }`}
    >
      <div className="flex w-full px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className={`flex gap-2 pl-4 mt-2 pt-2 py-2 w-32 h-9 rounded-xl font-inter text-sm transition-colors`}
          style={{
            color:
              settings.appearance.customThemes[settings.appearance.theme].text1,
          }}
        >
          <GoBack
            style={{
              fill: settings.appearance.customThemes[settings.appearance.theme]
                .text1,
            }}
            className="w-5 h-5"
          />
          <p className="ml-1">Go Back</p>
        </button>
        <div className="flex flex-1 flex-col ml-10 mr-10">
          {/* Header */}
          <div className="mb-5">
            <h1
              className={`text-5xl font-playfair font-bold mb-2`}
              style={{
                color:
                  settings.appearance.customThemes[settings.appearance.theme]
                    .text1,
              }}
            >
              Settings
            </h1>
            <p
              className={`text-base font-normal font-inter ml-1 ${
                isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"
              }`}
            >
              Customize your DocierePro experience
            </p>
          </div>

          {/* Tabs Navigation */}
          <div
            className={`flex gap-2 border-b mb-6 ${
              isDark ? "border-[#404040]" : "border-gray-500"
            }`}
          >
            {tabs?.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-inter font-medium transition-all duration-200 border-b-2 ${
                  activeTab === tab.id
                    ? "border-[#AB2D2D] text-[#AB2D2D]"
                    : isDark
                    ? "border-transparent text-[#a0a0a0] hover:text-[#e5e5e5]"
                    : "border-transparent text-[#7D7D7D] hover:text-[#212121]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div
            className={`rounded-lg border p-8 ${
              isDark ? "bg-[#252525] border-[#404040]" : "border-gray-500"
            }`}
          >
            {/* Editor Tab */}
            {activeTab === "editor" && (
              <div className="space-y-6">
                <h2
                  className={`text-2xl font-playfair font-semibold mb-4 ${
                    isDark ? "text-[#e5e5e5]" : "text-[#212121]"
                  }`}
                >
                  Editor Settings
                </h2>

                {/* Monaco Theme */}
                {/* <div className="space-y-2">
                  <label
                    className={`block text-sm font-inter font-medium ${isDark ? "text-[#e5e5e5]" : "text-[#212121]"}`}
                  >
                    Monaco Editor Theme
                  </label>
                  <p
                    className={`text-xs mb-2 ${isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"}`}
                  >
                    Choose your preferred editor color scheme
                  </p>
                  <select
                    value={settings.editor.theme}
                    onChange={(e) =>
                      handleSettingChange("editor", "theme", e.target.value)
                    }
                    className={`w-full max-w-md px-4 py-2 border rounded-md font-inter text-sm focus:outline-none focus:ring-2 focus:ring-[#AB2D2D] focus:border-transparent ${
                      isDark
                        ? "bg-[#2d2d2d] border-[#404040] text-[#e5e5e5]"
                        : "bg-white border-[#CFCFCF] text-[#212121]"
                    }`}
                  >
                    {monacoThemes.map((theme) => (
                      <option key={theme.value} value={theme.value}>
                        {theme.label}
                      </option>
                    ))}
                  </select>
                </div> */}

                {/* Font Size */}
                <div className="space-y-2">
                  <label
                    className={`block text-sm font-inter font-medium ${
                      isDark ? "text-[#e5e5e5]" : "text-[#212121]"
                    }`}
                  >
                    Font Size: {settings.editor.fontSize}px
                  </label>
                  <p
                    className={`text-xs mb-2 ${
                      isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"
                    }`}
                  >
                    Adjust the editor font size for better readability
                  </p>
                  <div className="flex items-center gap-4 max-w-md">
                    <span
                      className={`text-xs ${
                        isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"
                      }`}
                    >
                      10px
                    </span>
                    <input
                      type="range"
                      min="10"
                      max="24"
                      value={settings.editor.fontSize}
                      onChange={(e) =>
                        handleSettingChange(
                          "editor",
                          "fontSize",
                          parseInt(e.target.value),
                        )
                      }
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#AB2D2D]"
                    />
                    <span
                      className={`text-xs ${
                        isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"
                      }`}
                    >
                      24px
                    </span>
                  </div>
                </div>

                {/* Preview */}
                <div
                  className={`mt-6 p-4 rounded-md border ${
                    isDark
                      ? "bg-[#1a1a1a] border-[#404040]"
                      : "bg-[#F9F9F9] border-[#CFCFCF]"
                  }`}
                >
                  <p
                    className={`text-xs mb-2 font-inter ${
                      isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"
                    }`}
                  >
                    Preview:
                  </p>
                  <div
                    className={`font-mono p-3 rounded border ${
                      isDark
                        ? "bg-[#2d2d2d] border-[#404040] text-[#e5e5e5]"
                        : "bg-white border-[#CFCFCF] text-[#212121]"
                    }`}
                    style={{ fontSize: `${settings.editor.fontSize}px` }}
                  >
                    <span className="text-yellow-800">\documentclass</span>
                    {"{article}"}
                    <br />
                    <span className="text-fuchsia-800">\begin</span>
                    {"{document}"}
                    <br />
                    &nbsp;&nbsp;Hello, LaTeX!
                    <br />
                    <span className="text-fuchsia-800">\end</span>
                    {"{document}"}
                  </div>
                </div>
              </div>
            )}

            {/* Configuration Tab */}
            {activeTab === "configuration" && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <h2
                    className={`text-2xl font-playfair font-semibold ${
                      isDark ? "text-[#e5e5e5]" : "text-[#212121]"
                    }`}
                  >
                    Configurations
                  </h2>
                  <button
                    onClick={() => setIsAddingConfig(true)}
                    className="px-4 py-2 bg-[#AB2D2D] text-white rounded-md font-inter text-sm hover:bg-[#8a2424] transition-colors flex items-center gap-2"
                  >
                    <span>+</span> Add Model
                  </button>
                </div>

                {/* Config Form Modal-like inline section */}
                {isAddingConfig && (
                  <div
                    className={`p-6 rounded-lg border-2 border-dashed ${
                      isDark
                        ? "bg-[#1a1a1a] border-[#404040]"
                        : "bg-[#f9f9f9] border-[#CFCFCF]"
                    }`}
                  >
                    <h3
                      className={`text-lg font-inter font-semibold mb-4 ${
                        isDark ? "text-[#e5e5e5]" : "text-[#212121]"
                      }`}
                    >
                      New AI Configuration
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label
                          className={`block text-xs font-inter font-bold uppercase ${
                            isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"
                          }`}
                        >
                          Config Name
                        </label>
                        <input
                          type="text"
                          value={newConfig.name}
                          onChange={(e) =>
                            setNewConfig({ ...newConfig, name: e.target.value })
                          }
                          placeholder="e.g. My Gemini Pro"
                          className={`w-full px-4 py-2 border rounded-md font-inter text-sm focus:outline-none focus:ring-2 focus:ring-[#AB2D2D] ${
                            isDark
                              ? "bg-[#2d2d2d] border-[#404040] text-[#e5e5e5]"
                              : "bg-white border-[#CFCFCF] text-[#212121]"
                          }`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          className={`block text-xs font-inter font-bold uppercase ${
                            isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"
                          }`}
                        >
                          AI Provider
                        </label>
                        <select
                          value={newConfig.provider}
                          onChange={(e) => {
                            const provider = e.target.value;
                            setNewConfig({
                              ...newConfig,
                              provider,
                              model:
                                provider === "gemini"
                                  ? "gemini-2.0-flash"
                                  : "qwen2.5-coder:7b",
                              url:
                                provider === "ollama"
                                  ? "http://localhost:11434/api/generate"
                                  : "",
                            });
                          }}
                          className={`w-full px-4 py-2 border rounded-md font-inter text-sm focus:outline-none focus:ring-2 focus:ring-[#AB2D2D] ${
                            isDark
                              ? "bg-[#2d2d2d] border-[#404040] text-[#e5e5e5]"
                              : "bg-white border-[#CFCFCF] text-[#212121]"
                          }`}
                        >
                          <option value="gemini">Google Gemini</option>
                          <option value="ollama">Ollama Local LLM</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label
                          className={`block text-xs font-inter font-bold uppercase ${
                            isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"
                          }`}
                        >
                          Model Name
                        </label>
                        <input
                          type="text"
                          value={newConfig.model}
                          onChange={(e) =>
                            setNewConfig({
                              ...newConfig,
                              model: e.target.value,
                            })
                          }
                          placeholder={
                            newConfig.provider === "gemini"
                              ? "gemini-2.0-flash"
                              : "qwen2.5-coder:7b"
                          }
                          className={`w-full px-4 py-2 border rounded-md font-inter text-sm focus:outline-none focus:ring-2 focus:ring-[#AB2D2D] ${
                            isDark
                              ? "bg-[#2d2d2d] border-[#404040] text-[#e5e5e5]"
                              : "bg-white border-[#CFCFCF] text-[#212121]"
                          }`}
                        />
                      </div>

                      {newConfig.provider === "gemini" ? (
                        <div className="space-y-2">
                          <label
                            className={`block text-xs font-inter font-bold uppercase ${
                              isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"
                            }`}
                          >
                            API Token
                          </label>
                          <div className="relative">
                            <input
                              type={showToken ? "text" : "password"}
                              value={newConfig.apiKey}
                              onChange={(e) =>
                                setNewConfig({
                                  ...newConfig,
                                  apiKey: e.target.value,
                                })
                              }
                              placeholder="Enter Gemini API Key"
                              className={`w-full px-4 py-2 pr-16 border rounded-md font-inter text-sm focus:outline-none focus:ring-2 focus:ring-[#AB2D2D] ${
                                isDark
                                  ? "bg-[#2d2d2d] border-[#404040] text-[#e5e5e5]"
                                  : "bg-white border-[#CFCFCF] text-[#212121]"
                              }`}
                            />
                            {isAuthenticated && (
                              <button
                                type="button" // Ensure it doesn't trigger form submit
                                onClick={() => {
                                  // If we have an ID, we are editing; fetch from cloud.
                                  // If no ID, it's a new entry, just toggle local visibility.
                                  if (newConfig.id) {
                                    handleToggleVisibility(newConfig.id, true);
                                  } else {
                                    setShowToken(!showToken);
                                  }
                                }}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-bold uppercase ${
                                  isDark
                                    ? "text-[#a0a0a0] hover:text-[#e5e5e5]"
                                    : "text-[#7D7D7D] hover:text-[#212121]"
                                }`}
                              >
                                {showToken ? "Hide" : "Show"}
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label
                            className={`block text-xs font-inter font-bold uppercase ${
                              isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"
                            }`}
                          >
                            Ollama URL
                          </label>
                          <input
                            type="text"
                            value={newConfig.url}
                            onChange={(e) =>
                              setNewConfig({
                                ...newConfig,
                                url: e.target.value,
                              })
                            }
                            placeholder="http://localhost:11434/api/generate"
                            className={`w-full px-4 py-2 border rounded-md font-inter text-sm focus:outline-none focus:ring-2 focus:ring-[#AB2D2D] ${
                              isDark
                                ? "bg-[#2d2d2d] border-[#404040] text-[#e5e5e5]"
                                : "bg-white border-[#CFCFCF] text-[#212121]"
                            }`}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={handleSaveConfig}
                        disabled={!newConfig.name}
                        className={`px-6 py-2 bg-gray-800 text-white rounded-md font-inter text-sm hover:bg-black transition-colors `}
                      >
                        {newConfig.id
                          ? "Update Configuration"
                          : "Save Configuration"}{" "}
                      </button>
                      <button
                        onClick={() => setIsAddingConfig(false)}
                        className={`px-6 py-2 border rounded-md font-inter text-sm ${
                          isDark
                            ? "border-[#404040] text-[#a0a0a0] hover:bg-[#2d2d2d]"
                            : "border-[#CFCFCF] text-[#7D7D7D] hover:bg-[#f3f4f6]"
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Config List */}
                <div className="space-y-4">
                  {(settings.app?.aiConfigs || []).length === 0 ? (
                    <div
                      className={`p-12 text-center border-2 border-dashed rounded-lg ${
                        isDark
                          ? "border-[#404040] text-[#a0a0a0]"
                          : "border-[#CFCFCF] text-[#7D7D7D]"
                      }`}
                    >
                      <p className="text-sm">
                        No AI configurations found. Add one to get started!
                      </p>
                    </div>
                  ) : (
                    settings.app.aiConfigs?.map((config) => (
                      <div
                        key={config.id}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                          config.active
                            ? "border-[#AB2D2D] bg-[#AB2D2D]/5"
                            : isDark
                            ? "border-[#404040] bg-[#1a1a1a]"
                            : "border-[#CFCFCF] bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          checked={config.active}
                          onChange={() => handleToggleActive(config.id)}
                          className="w-5 h-5 accent-[#AB2D2D] cursor-pointer"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-sm font-bold truncate ${
                                isDark ? "text-[#e5e5e5]" : "text-[#212121]"
                              }`}
                            >
                              {config.name}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                config.provider === "gemini"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              {config.provider === "gemini"
                                ? "Google Gemini"
                                : "Ollama"}
                            </span>
                          </div>
                          <div
                            className={`text-xs font-mono flex items-center gap-2 mt-1 ${
                              isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"
                            }`}
                          >
                            <span>{config.model}</span>
                            <span className="opacity-30">|</span>

                            {config.provider === "gemini" ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type={
                                    visibleConfigId === config.id
                                      ? "text"
                                      : "password"
                                  }
                                  value={
                                    visibleConfigId === config.id
                                      ? config.apiKey
                                      : "********"
                                  }
                                  readOnly
                                  className={`bg-transparent border-none p-0 w-24 focus:ring-0 text-xs font-mono ${
                                    isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"
                                  }`}
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleVisibility(config.id);
                                  }}
                                  className="text-[10px] font-bold uppercase hover:underline text-blue-500"
                                >
                                  {visibleConfigId === config.id
                                    ? "Hide"
                                    : "Show"}
                                </button>
                              </div>
                            ) : (
                              <span className="truncate">{config.url}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditConfig(config)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDark
                                ? "hover:bg-[#333] text-[#a0a0a0] hover:text-blue-400"
                                : "hover:bg-blue-50 text-[#7D7D7D] hover:text-blue-600"
                            }`}
                            title="Edit Configuration"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
                              />
                            </svg>
                          </button>

                          <button
                            onClick={() => handleDeleteConfig(config.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDark
                                ? "hover:bg-[#333] text-[#a0a0a0] hover:text-red-400"
                                : "hover:bg-red-50 text-[#7D7D7D] hover:text-red-600"
                            }`}
                            title="Delete Configuration"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Separator */}
                <div
                  className={`border-t pt-6 ${
                    isDark ? "border-[#404040]" : "border-[#CFCFCF]"
                  }`}
                >
                  {/* Hosting Method */}
                  <div className="space-y-2">
                    <label
                      className={`block text-sm font-inter font-medium ${
                        isDark ? "text-[#e5e5e5]" : "text-[#212121]"
                      }`}
                    >
                      Hosting Method
                    </label>
                    <p
                      className={`text-xs mb-2 ${
                        isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"
                      }`}
                    >
                      Choose how you want to host your documents
                    </p>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="hostingMethod"
                          value="selfHosting"
                          checked={hostingMethod === "selfHosting"}
                          onChange={(e) => {
                            setHostingMethod(e.target.value);
                            updateSetting("server.mode", e.target.value);
                          }}
                        />
                        <div>
                          <span
                            className={`text-sm font-inter ${
                              isDark ? "text-[#e5e5e5]" : "text-[#212121]"
                            }`}
                          >
                            Self-hosted
                          </span>
                        </div>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="hostingMethod"
                          value="cloudHosting"
                          checked={hostingMethod === "cloudHosting"}
                          onChange={(e) => {
                            setHostingMethod(e.target.value);
                            updateSetting("server.mode", e.target.value);
                          }}
                        />
                        <div>
                          <span
                            className={`text-sm font-inter ${
                              isDark ? "text-[#e5e5e5]" : "text-[#212121]"
                            }`}
                          >
                            Cloud-based Hosting
                          </span>
                        </div>
                      </label>
                    </div>
                    {hostingMethod === "selfHosting" && (
                      <div className="pt-5 space-y-5 font-inter text-sm">
                        <div>
                          <p className="font-medium mb-2">Backend Server</p>
                          <input
                            type="text"
                            placeholder="eg, http://192.168.1.100:5025"
                            value={
                              settings.server.methods[settings.server.mode]
                                .backendServer
                            }
                            onChange={(e) =>
                              updateSetting(
                                `server.methods.${settings.server.mode}.backendServer`,
                                e.target.value,
                              )
                            }
                            className="w-96 px-3 py-1 border rounded-md"
                          />
                        </div>

                        <div>
                          <p className="font-medium mb-2">WebSocket Server</p>
                          <input
                            type="text"
                            placeholder="eg, ws://192.168.1.100:5001"
                            value={
                              settings.server.methods[settings.server.mode]
                                .webSocketServer
                            }
                            onChange={(e) =>
                              updateSetting(
                                `server.methods.${settings.server.mode}.webSocketServer`,
                                e.target.value,
                              )
                            }
                            className="w-96 px-3 py-1 border rounded-md"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <div className="space-y-6">
                <h2
                  className={`text-2xl font-playfair font-semibold mb-4 ${
                    isDark ? "text-[#e5e5e5]" : "text-[#212121]"
                  }`}
                >
                  Appearance
                </h2>

                {/* Theme Mode */}
                <div className="space-y-2">
                  <label
                    className={`block text-sm font-inter font-medium ${
                      isDark ? "text-[#e5e5e5]" : "text-[#212121]"
                    }`}
                  >
                    Theme Mode
                  </label>
                  <p
                    className={`text-xs mb-4 ${
                      isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"
                    }`}
                  >
                    Choose between light and dark mode
                  </p>
                  <div className="flex gap-4">
                    {/* Light Mode Card */}
                    <div
                      onClick={() =>
                        handleSettingChange("appearance", "theme", "light")
                      }
                      className={`flex-1 max-w-xs p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        settings.appearance.theme === "light"
                          ? "border-[#AB2D2D] bg-red-50"
                          : isDark
                          ? "border-[#404040] hover:border-[#666] bg-[#2d2d2d]"
                          : "border-[#CFCFCF] hover:border-[#7D7D7D]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-4xl">
                          {<MdOutlineLightMode />}
                        </span>
                        {settings.appearance.theme === "light" && (
                          <span className="text-[#AB2D2D] text-xl">✓</span>
                        )}
                      </div>
                      <h3
                        className={`font-inter font-semibold mb-1 ${
                          settings.appearance.theme === "light"
                            ? "text-[#212121]"
                            : isDark
                            ? "text-[#e5e5e5]"
                            : "text-[#212121]"
                        }`}
                      >
                        Light Mode
                      </h3>
                      <p
                        className={`text-xs ${
                          settings.appearance.theme === "light"
                            ? "text-[#7D7D7D]"
                            : isDark
                            ? "text-[#a0a0a0]"
                            : "text-[#7D7D7D]"
                        }`}
                      >
                        Clean and bright interface
                      </p>
                    </div>

                    {/* Dark Mode Card */}
                    <div
                      onClick={() =>
                        handleSettingChange("appearance", "theme", "dark")
                      }
                      className={`flex-1 max-w-xs p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        settings.appearance.theme === "dark"
                          ? "border-[#AB2D2D] bg-[#3d2d2d]"
                          : isDark
                          ? "border-[#404040] hover:border-[#666] bg-[#2d2d2d]"
                          : "border-[#CFCFCF] hover:border-[#7D7D7D]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-4xl">
                          {<MdOutlineDarkMode />}
                        </span>
                        {settings.appearance.theme === "dark" && (
                          <span className="text-[#AB2D2D] text-xl">✓</span>
                        )}
                      </div>
                      <h3
                        className={`font-inter font-semibold mb-1 ${
                          isDark ? "text-[#e5e5e5]" : "text-[#212121]"
                        }`}
                      >
                        Dark Mode
                      </h3>
                      <p
                        className={`text-xs ${
                          isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"
                        }`}
                      >
                        Easier on the eyes
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === "account" && (
              <div className="space-y-6">
                <h2
                  className={`text-2xl font-playfair font-semibold mb-4 ${
                    isDark ? "text-[#e5e5e5]" : "text-[#212121]"
                  }`}
                >
                  Account Settings
                </h2>

                {isAuthenticated && user ? (
                  <div className="space-y-6">
                    {/* User Info */}
                    <div
                      className={`p-4 rounded-md border ${
                        isDark
                          ? "bg-[#1a1a1a] border-[#404040]"
                          : "bg-[#F9F9F9] border-[#CFCFCF]"
                      }`}
                    >
                      <h3
                        className={`font-inter font-medium mb-3 ${
                          isDark ? "text-[#e5e5e5]" : "text-[#212121]"
                        }`}
                      >
                        Profile Information
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-sm ${
                              isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"
                            }`}
                          >
                            Name:
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              isDark ? "text-[#e5e5e5]" : "text-[#212121]"
                            }`}
                          >
                            {user.userName || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-sm ${
                              isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"
                            }`}
                          >
                            Email:
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              isDark ? "text-[#e5e5e5]" : "text-[#212121]"
                            }`}
                          >
                            {user.emailId || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-sm ${
                              isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"
                            }`}
                          >
                            User ID:
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              isDark ? "text-[#e5e5e5]" : "text-[#212121]"
                            }`}
                          >
                            {user.userId || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Change Password */}
                    <div>
                      <button
                        onClick={() => navigate("/change-password")}
                        className="px-6 py-2 bg-[#812525] text-white rounded-md font-inter text-sm hover:bg-[#631d1d] transition-colors"
                      >
                        Change Password
                      </button>
                    </div>

                    {/* Session Info */}
                    <div
                      className={`p-4 rounded-md border ${
                        isDark
                          ? "bg-[#1a1a1a] border-[#404040]"
                          : "bg-[#F9F9F9] border-[#CFCFCF]"
                      }`}
                    >
                      <h3
                        className={`font-inter font-medium mb-2 ${
                          isDark ? "text-[#e5e5e5]" : "text-[#212121]"
                        }`}
                      >
                        Session Information
                      </h3>
                      <p
                        className={`text-xs ${
                          isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"
                        }`}
                      >
                        You are currently logged in. Your session is active.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">👤</div>
                    <h3
                      className={`font-inter font-semibold mb-2 ${
                        isDark ? "text-[#e5e5e5]" : "text-[#212121]"
                      }`}
                    >
                      Not Signed In
                    </h3>
                    <p
                      className={`text-sm mb-6 ${
                        isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"
                      }`}
                    >
                      Sign in to access account settings and sync your
                      preferences
                    </p>
                    <div className="flex gap-4 justify-center">
                      <button
                        onClick={() => navigate("/login")}
                        className="px-6 py-2 bg-[#AB2D2D] text-white rounded-md font-inter text-sm hover:bg-[#8a2424] transition-colors"
                      >
                        Sign In
                      </button>
                      <button
                        onClick={() => navigate("/signup")}
                        className={`px-6 py-2 border rounded-md font-inter text-sm transition-colors ${
                          isDark
                            ? "border-[#404040] text-[#e5e5e5] hover:bg-[#2d2d2d]"
                            : "border-[#CFCFCF] text-[#212121] hover:bg-[#F9F9F9]"
                        }`}
                      >
                        Create Account
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reset Button */}
          <div
            className={`mt-8 pt-6 border-t ${
              isDark ? "border-[#404040]" : "border-gray-500"
            }`}
          >
            <button
              onClick={handleResetSettings}
              className={`px-6 py-2 border rounded-md font-inter text-sm transition-colors ${
                isDark
                  ? "border-[#404040] text-[#a0a0a0] hover:bg-[#2d2d2d] hover:text-[#e5e5e5]"
                  : "border-gray-500 text-gray-700 hover:bg-[#F9F9F9] hover:text-[#212121]"
              }`}
            >
              Reset All Settings to Defaults
            </button>
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={showResetConfirm}
        onConfirm={confirmReset}
        onCancel={() => setShowResetConfirm(false)}
        title="Reset All Settings"
        message="Are you sure you want to reset all settings to their default values? This action cannot be undone."
        confirmText="Reset to Defaults"
        isDanger={true}
      />
    </div>
  );
};

export default SettingsPage;
