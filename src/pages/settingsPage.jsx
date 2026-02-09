import React, { useState } from "react";
import { useSettings } from "../context/useSettings";
import { useAuth } from "../context/useAuth";
import { useOutletContext, useNavigate, Link } from "react-router-dom";
import GoBack from "../assets/icons/goBack.svg?react";

const SettingsPage = () => {
  const { isSectionSpaceOpen } = useOutletContext();
  const { settings, updateSetting, resetSettings } = useSettings();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("editor");
  const [showToken, setShowToken] = useState(false);

  const tabs = [
    { id: "editor", label: "Editor" },
    { id: "configuration", label: "Configuration" },
    { id: "appearance", label: "Appearance" },
    { id: "account", label: "Account" },
  ];

  const monacoThemes = [
    { value: "customLight", label: "Custom Light" },
    { value: "vs", label: "Visual Studio" },
    { value: "vs-dark", label: "Dark" },
    { value: "hc-black", label: "High Contrast" },
  ];

  const handleSettingChange = (section, key, value) => {
    updateSetting(section, key, value);
  };

  const handleResetSettings = () => {
    if (
      window.confirm("Are you sure you want to reset all settings to defaults?")
    ) {
      resetSettings();
    }
  };

  const isDark = settings.appearance.mode === "dark";

  return (
    <div
      className={`h-screen overflow-y-auto scrollbar-hide flex flex-col ml-12 pb-10 mt-11 ${isDark ? "bg-[#1a1a1a]" : "bg-[#eaeaea]"} ${
        isSectionSpaceOpen ? "ml-96" : "ml-0"
      }`}
    >
      <div className="max-w-6xl mx-auto w-full px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center gap-2 mb-6 px-4 py-2 rounded-md font-inter text-sm transition-colors ${
            isDark
              ? "text-[#e5e5e5] hover:bg-[#2d2d2d]"
              : "text-gray-700 hover:bg-[#F9F9F9] hover:text-[#212121]"
          }`}
        >
          <GoBack style={{ fill: "#374151" }} className="w-5 h-5 mr-1" /> Go
          Back
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1
            className={`text-4xl font-playfair font-bold mb-2 ${isDark ? "text-[#e5e5e5]" : "text-[#212121]"}`}
          >
            Settings
          </h1>
          <p
            className={`text-base font-inter ${isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"}`}
          >
            Customize your DocierePro experience
          </p>
        </div>

        {/* Tabs Navigation */}
        <div
          className={`flex gap-2 border-b mb-6 ${isDark ? "border-[#404040]" : "border-[#CFCFCF]"}`}
        >
          {tabs.map((tab) => (
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
          className={`rounded-lg border p-8 ${isDark ? "bg-[#252525] border-[#404040]" : "bg-white border-[#CFCFCF]"}`}
        >
          {/* Editor Tab */}
          {activeTab === "editor" && (
            <div className="space-y-6">
              <h2
                className={`text-2xl font-playfair font-semibold mb-4 ${isDark ? "text-[#e5e5e5]" : "text-[#212121]"}`}
              >
                Editor Settings
              </h2>

              {/* Monaco Theme */}
              <div className="space-y-2">
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
              </div>

              {/* Font Size */}
              <div className="space-y-2">
                <label
                  className={`block text-sm font-inter font-medium ${isDark ? "text-[#e5e5e5]" : "text-[#212121]"}`}
                >
                  Font Size: {settings.editor.fontSize}px
                </label>
                <p
                  className={`text-xs mb-2 ${isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"}`}
                >
                  Adjust the editor font size for better readability
                </p>
                <div className="flex items-center gap-4 max-w-md">
                  <span
                    className={`text-xs ${isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"}`}
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
                    className={`text-xs ${isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"}`}
                  >
                    24px
                  </span>
                </div>
              </div>

              {/* Preview */}
              <div
                className={`mt-6 p-4 rounded-md border ${isDark ? "bg-[#1a1a1a] border-[#404040]" : "bg-[#F9F9F9] border-[#CFCFCF]"}`}
              >
                <p
                  className={`text-xs mb-2 font-inter ${isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"}`}
                >
                  Preview:
                </p>
                <div
                  className={`font-mono p-3 rounded border ${isDark ? "bg-[#2d2d2d] border-[#404040] text-[#e5e5e5]" : "bg-white border-[#CFCFCF] text-[#212121]"}`}
                  style={{ fontSize: `${settings.editor.fontSize}px` }}
                >
                  \documentclass{"{article}"}
                  <br />
                  \begin{"{document}"}
                  <br />
                  &nbsp;&nbsp;Hello, LaTeX!
                  <br />
                  \end{"{document}"}
                </div>
              </div>
            </div>
          )}

          {/* Configuration Tab */}
          {activeTab === "configuration" && (
            <div className="space-y-6">
              <h2
                className={`text-2xl font-playfair font-semibold mb-4 ${isDark ? "text-[#e5e5e5]" : "text-[#212121]"}`}
              >
                Configuration
              </h2>

              {/* LLM API Token */}
              <div className="space-y-2">
                <label
                  className={`block text-sm font-inter font-medium ${isDark ? "text-[#e5e5e5]" : "text-[#212121]"}`}
                >
                  LLM API Token
                </label>
                <p
                  className={`text-xs mb-2 ${isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"}`}
                >
                  Enter your API token for AI-powered features
                </p>
                <div className="flex">
                  <div className="relative max-w-md">
                    <input
                      type={showToken ? "text" : "password"}
                      value={settings.configuration.llmApiToken}
                      onChange={(e) =>
                        handleSettingChange(
                          "configuration",
                          "llmApiToken",
                          e.target.value,
                        )
                      }
                      placeholder="Enter your API token"
                      className={`w-full px-4 py-2 pr-24 border rounded-md font-inter text-sm focus:outline-none focus:ring-2 focus:ring-[#AB2D2D] focus:border-transparent ${
                        isDark
                          ? "bg-[#2d2d2d] border-[#404040] text-[#e5e5e5] placeholder-[#666]"
                          : "bg-white border-[#CFCFCF] text-[#212121] placeholder-gray-400"
                      }`}
                    />
                    <button
                      onClick={() => setShowToken(!showToken)}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-inter ${
                        isDark
                          ? "text-[#a0a0a0] hover:text-[#e5e5e5]"
                          : "text-[#7D7D7D] hover:text-[#212121]"
                      }`}
                    >
                      {showToken ? "Hide" : "Show"}
                    </button>
                  </div>
                  <div>
                    <select
                      name="aiProvider"
                      defaultValue=""
                      class="w-full border rounded-md ml-5 border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 font-inter select-none
         focus:ring-2 focus:ring-[#AB2D2D] outline-none focus:border-transparent"
                    >
                      <option value="" disabled>
                        Select AI Provider
                      </option>
                      <option value="openai">OpenAI</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="claude">Anthropic Claude</option>
                      <option value="mistral">Mistral</option>
                      <option value="deepseek">DeepSeek</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Hosting Method */}
              <div className="space-y-2">
                <label
                  className={`block text-sm font-inter font-medium ${isDark ? "text-[#e5e5e5]" : "text-[#212121]"}`}
                >
                  Hosting Method
                </label>
                <p
                  className={`text-xs mb-2 ${isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"}`}
                >
                  Choose how you want to host your documents
                </p>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="hostingMethod"
                      value="self-hosted"
                      checked={
                        settings.configuration.hostingMethod === "self-hosted"
                      }
                      onChange={(e) =>
                        handleSettingChange(
                          "configuration",
                          "hostingMethod",
                          e.target.value,
                        )
                      }
                      className="w-4 h-4 text-[#AB2D2D] focus:ring-[#AB2D2D]"
                    />
                    <div>
                      <span
                        className={`text-sm font-inter ${isDark ? "text-[#e5e5e5]" : "text-[#212121]"}`}
                      >
                        Self-hosted
                      </span>
                      <p
                        className={`text-xs ${isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"}`}
                      >
                        Run locally on your machine
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="hostingMethod"
                      value="cloud"
                      checked={settings.configuration.hostingMethod === "cloud"}
                      onChange={(e) =>
                        handleSettingChange(
                          "configuration",
                          "hostingMethod",
                          e.target.value,
                        )
                      }
                      className="w-4 h-4 text-[#AB2D2D] focus:ring-[#AB2D2D]"
                    />
                    <div>
                      <span
                        className={`text-sm font-inter ${isDark ? "text-[#e5e5e5]" : "text-[#212121]"}`}
                      >
                        Cloud-based hosting
                      </span>
                      <p
                        className={`text-xs ${isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"}`}
                      >
                        Use cloud servers for compilation
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === "appearance" && (
            <div className="space-y-6">
              <h2
                className={`text-2xl font-playfair font-semibold mb-4 ${isDark ? "text-[#e5e5e5]" : "text-[#212121]"}`}
              >
                Appearance
              </h2>

              {/* Theme Mode */}
              <div className="space-y-2">
                <label
                  className={`block text-sm font-inter font-medium ${isDark ? "text-[#e5e5e5]" : "text-[#212121]"}`}
                >
                  Theme Mode
                </label>
                <p
                  className={`text-xs mb-4 ${isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"}`}
                >
                  Choose between light and dark mode
                </p>
                <div className="flex gap-4">
                  {/* Light Mode Card */}
                  <div
                    onClick={() =>
                      handleSettingChange("appearance", "mode", "light")
                    }
                    className={`flex-1 max-w-xs p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      settings.appearance.mode === "light"
                        ? "border-[#AB2D2D] bg-red-50"
                        : isDark
                          ? "border-[#404040] hover:border-[#666] bg-[#2d2d2d]"
                          : "border-[#CFCFCF] hover:border-[#7D7D7D]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-4xl">☀️</span>
                      {settings.appearance.mode === "light" && (
                        <span className="text-[#AB2D2D] text-xl">✓</span>
                      )}
                    </div>
                    <h3
                      className={`font-inter font-semibold mb-1 ${settings.appearance.mode === "light" ? "text-[#212121]" : isDark ? "text-[#e5e5e5]" : "text-[#212121]"}`}
                    >
                      Light Mode
                    </h3>
                    <p
                      className={`text-xs ${settings.appearance.mode === "light" ? "text-[#7D7D7D]" : isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"}`}
                    >
                      Clean and bright interface
                    </p>
                  </div>

                  {/* Dark Mode Card */}
                  <div
                    onClick={() =>
                      handleSettingChange("appearance", "mode", "dark")
                    }
                    className={`flex-1 max-w-xs p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      settings.appearance.mode === "dark"
                        ? "border-[#AB2D2D] bg-[#3d2d2d]"
                        : isDark
                          ? "border-[#404040] hover:border-[#666] bg-[#2d2d2d]"
                          : "border-[#CFCFCF] hover:border-[#7D7D7D]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-4xl">🌙</span>
                      {settings.appearance.mode === "dark" && (
                        <span className="text-[#AB2D2D] text-xl">✓</span>
                      )}
                    </div>
                    <h3
                      className={`font-inter font-semibold mb-1 ${isDark ? "text-[#e5e5e5]" : "text-[#212121]"}`}
                    >
                      Dark Mode
                    </h3>
                    <p
                      className={`text-xs ${isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"}`}
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
                className={`text-2xl font-playfair font-semibold mb-4 ${isDark ? "text-[#e5e5e5]" : "text-[#212121]"}`}
              >
                Account Settings
              </h2>

              {isAuthenticated && user ? (
                <div className="space-y-6">
                  {/* User Info */}
                  <div
                    className={`p-4 rounded-md border ${isDark ? "bg-[#1a1a1a] border-[#404040]" : "bg-[#F9F9F9] border-[#CFCFCF]"}`}
                  >
                    <h3
                      className={`font-inter font-medium mb-3 ${isDark ? "text-[#e5e5e5]" : "text-[#212121]"}`}
                    >
                      Profile Information
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm ${isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"}`}
                        >
                          Name:
                        </span>
                        <span
                          className={`text-sm font-medium ${isDark ? "text-[#e5e5e5]" : "text-[#212121]"}`}
                        >
                          {user.userName || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm ${isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"}`}
                        >
                          Email:
                        </span>
                        <span
                          className={`text-sm font-medium ${isDark ? "text-[#e5e5e5]" : "text-[#212121]"}`}
                        >
                          {user.emailId || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm ${isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"}`}
                        >
                          User ID:
                        </span>
                        <span
                          className={`text-sm font-medium ${isDark ? "text-[#e5e5e5]" : "text-[#212121]"}`}
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
                      className="px-6 py-2 bg-[#256081] text-white rounded-md font-inter text-sm hover:bg-[#1d4a63] transition-colors"
                    >
                      Change Password
                    </button>
                  </div>

                  {/* Session Info */}
                  <div
                    className={`p-4 rounded-md border ${isDark ? "bg-[#1a1a1a] border-[#404040]" : "bg-[#F9F9F9] border-[#CFCFCF]"}`}
                  >
                    <h3
                      className={`font-inter font-medium mb-2 ${isDark ? "text-[#e5e5e5]" : "text-[#212121]"}`}
                    >
                      Session Information
                    </h3>
                    <p
                      className={`text-xs ${isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"}`}
                    >
                      You are currently logged in. Your session is active.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👤</div>
                  <h3
                    className={`font-inter font-semibold mb-2 ${isDark ? "text-[#e5e5e5]" : "text-[#212121]"}`}
                  >
                    Not Signed In
                  </h3>
                  <p
                    className={`text-sm mb-6 ${isDark ? "text-[#a0a0a0]" : "text-[#7D7D7D]"}`}
                  >
                    Sign in to access account settings and sync your preferences
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
          className={`mt-8 pt-6 border-t ${isDark ? "border-[#404040]" : "border-[#CFCFCF]"}`}
        >
          <button
            onClick={handleResetSettings}
            className={`px-6 py-2 border rounded-md font-inter text-sm transition-colors ${
              isDark
                ? "border-[#404040] text-[#a0a0a0] hover:bg-[#2d2d2d] hover:text-[#e5e5e5]"
                : "border-[#CFCFCF] text-[#7D7D7D] hover:bg-[#F9F9F9] hover:text-[#212121]"
            }`}
          >
            Reset All Settings to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
