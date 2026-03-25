import React from "react";
import CloudOnIcon from "../assets/icons/cloudOn.svg?react";
import CloudOffIcon from "../assets/icons/cloudOff.svg?react";
import SyncIcon from "../assets/icons/syncIcon.svg?react";
import HelpIcon from "../assets/icons/helpIcon.svg?react";
import LayoutIcon from "../assets/icons/layoutIcon.svg?react";
import { useAuth } from "../context/useAuth";
import { useSettings } from "../context/useSettings";
import { useState, useContext } from "react";
import { projectContext } from "../context/useProject";

const StatusBar = () => {
  const { isServerConnected } = useAuth();
  const { projectDetails } = useContext(projectContext);
  const { settings } = useSettings();
  const [progress, setProgress] = useState("");
  React.useEffect(() => {
    const removeListener = window.electronAPI?.onSetupProgress((message) => {
      setProgress(message);
      // Clear message after completion
      if (message === "LaTeX Setup Complete!") {
        setTimeout(() => setProgress(""), 3000);
      }
    });

    return () => {
      if (typeof removeListener === "function") removeListener();
    };
  }, []);
  return (
    <>
      <div
        className="w-screen z-30 h-5 fixed bottom-0 border-[1.5px]"
        style={{
          background:
            settings.appearance.customThemes[settings.appearance.theme]
              .background,
          borderColor:
            settings.appearance.customThemes[settings.appearance.theme].border,
        }}
      >
        <div className="flex flex-row justify-between text-gray-500 mx-5 text-[13px]">
          <div
            className="flex flex-row gap-5"
            style={{
              color:
                settings.appearance.customThemes[settings.appearance.theme]
                  .text3,
            }}
          >
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
            {/* <SyncIcon style={{ fill: "#296623" }} className="w-4 h-4" />
            <SyncIcon style={{ fill: "#BD7E00" }} className="w-4 h-4" />
            <p>Sync</p> */}
          </div>
          <div className="-ml-20">{progress}</div>
          <div className="flex flex-row gap-5">
            {projectDetails?.currentProject?.id && (
              <LayoutIcon
                style={{
                  fill: settings.appearance.customThemes[
                    settings.appearance.theme
                  ].text3,
                }}
                className="w-4 h-4"
              />
            )}
            <HelpIcon
              style={{
                fill: settings.appearance.customThemes[
                  settings.appearance.theme
                ].text3,
              }}
              className="w-4 h-4"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default StatusBar;
