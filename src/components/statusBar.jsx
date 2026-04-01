import React from "react";
import CloudOnIcon from "../assets/icons/cloudOn.svg?react";
import CloudOffIcon from "../assets/icons/cloudOff.svg?react";
import SyncIcon from "../assets/icons/syncIcon.svg?react";
import HelpIcon from "../assets/icons/helpIcon.svg?react";
import LayoutIcon from "../assets/icons/layoutIcon.svg?react";
import { useAuth } from "../context/useAuth";
import { useSettings } from "../context/useSettings";
import { useState, useEffect, useContext } from "react";
import { projectContext } from "../context/useProject";

const StatusBar = () => {
  const { isServerConnected } = useAuth();
  const { projectDetails, updateProjectDetails } = useContext(projectContext);
  const { settings } = useSettings();
  const [progress, setProgress] = useState("");
  const [updateBadge, setUpdateBadge] = useState(false); // true if update available / downloading / ready

  const theme = settings.appearance.customThemes[settings.appearance.theme];

  React.useEffect(() => {
    const removeListener = window.electronAPI?.onSetupProgress((message) => {
      setProgress(message);
      if (message === "LaTeX Setup Complete!") {
        setTimeout(() => setProgress(""), 3000);
      }
    });

    return () => {
      if (typeof removeListener === "function") removeListener();
    };
  }, []);

  // Listen for update status to toggle the badge dot
  useEffect(() => {
    if (!window.electronAPI) return;

    const cleanupAvailable = window.electronAPI.onUpdateAvailable(() =>
      setUpdateBadge(true),
    );
    const cleanupDownloaded = window.electronAPI.onUpdateDownloaded(() =>
      setUpdateBadge(true),
    );
    const cleanupNotAvailable = window.electronAPI.onUpdateNotAvailable(() =>
      setUpdateBadge(false),
    );

    return () => {
      cleanupAvailable?.();
      cleanupDownloaded?.();
      cleanupNotAvailable?.();
    };
  }, []);

  const handleCheckForUpdates = () => {
    window.electronAPI?.checkForUpdates();
  };

  return (
    <>
      <div
        className="w-screen z-30 h-5 fixed bottom-0 border-[1.5px]"
        style={{
          background: theme.background,
          borderColor: theme.border,
        }}
      >
        <div className="flex flex-row justify-between text-gray-500 mx-5 text-[13px]">
          <div className="flex flex-row gap-5" style={{ color: theme.text3 }}>
            {isServerConnected ? (
              <div className="flex flex-row gap-5">
                <CloudOnIcon style={{ fill: "#296623" }} className="w-4 h-4" />
                <p>Connected to the Server</p>
              </div>
            ) : (
              <div className="flex flex-row gap-5">
                <CloudOffIcon style={{ fill: "#FF0004" }} className="w-4 h-4" />
                <p>Not Connected to the Server</p>
              </div>
            )}
          </div>
          <div className="-ml-20">{progress}</div>
          <div className="flex flex-row gap-5 items-center">
            {/* Bell icon for update checks */}
            <button
              onClick={handleCheckForUpdates}
              className="relative flex items-center justify-center"
              title="Check for updates"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke={theme.text3}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-[14px] h-[14px]"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {updateBadge && (
                <span
                  style={{
                    position: "absolute",
                    top: -1,
                    right: -1,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#AB2D2D",
                  }}
                />
              )}
            </button>

            {projectDetails?.currentProject?.id && (
              <LayoutIcon
                style={{ fill: theme.text3 }}
                className="w-4 h-4"
                onClick={() => {
                  const evt = new KeyboardEvent("keydown", {
                    key: "p",
                    ctrlKey: true,
                    bubbles: true,
                  });
                  window.dispatchEvent(evt);
                }}
              />
            )}
            <HelpIcon style={{ fill: theme.text3 }} className="w-4 h-4" />
          </div>
        </div>
      </div>
    </>
  );
};

export default StatusBar;
