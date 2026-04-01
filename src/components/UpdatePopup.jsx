import React, { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { useSettings } from "../context/useSettings";

// ─── Helpers ──────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSpeed(bps) {
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(0)} KB/s`;
  return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
}

function formatReleaseNotes(notes) {
  if (typeof notes === "string") return notes;
  if (Array.isArray(notes)) {
    return notes.map((n) => `### ${n.version}\n${n.note}`).join("\n\n---\n\n");
  }
  return "";
}

function classifyError(err) {
  const msg = err?.message || err || "";
  if (
    msg.includes("net::ERR") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("ETIMEDOUT")
  ) {
    return {
      message:
        "Unable to reach the update server. Check your internet connection.",
      actionUrl: null,
    };
  }
  if (msg.includes("ENOSPC")) {
    return {
      message: "Not enough disk space to download the update.",
      actionUrl: null,
    };
  }
  if (
    msg.includes("signature") ||
    msg.includes("checksum") ||
    msg.includes("sha")
  ) {
    return {
      message:
        "This update could not be verified and was rejected for your safety.",
      actionUrl: "https://github.com/Dociere/DocierePro/releases/latest",
    };
  }
  return {
    message: "An unexpected error occurred while checking for updates.",
    actionUrl: null,
  };
}

// ─── States: idle | checking | latest | available | downloading | ready | error ───
const UpdatePopup = () => {
  const { settings } = useSettings();
  const [updateState, setUpdateState] = useState("idle");
  const [updateInfo, setUpdateInfo] = useState({});
  const [progress, setProgress] = useState({
    percent: 0,
    transferred: 0,
    total: 0,
    bytesPerSecond: 0,
  });
  const [error, setError] = useState({ message: "", actionUrl: null });
  const [showDetails, setShowDetails] = useState(false);

  const theme = settings.appearance.customThemes[settings.appearance.theme];
  const isDark = settings.appearance.theme === "dark";

  // ─── IPC Listeners ────────────────────────────────────────────
  useEffect(() => {
    if (!window.electronAPI) return;

    const cleanupChecking = window.electronAPI.onCheckingForUpdate(() => {
      setUpdateState("checking");
    });

    const cleanupAvailable = window.electronAPI.onUpdateAvailable((data) => {
      setUpdateInfo(data);
      setUpdateState("available");
    });

    const cleanupNotAvailable = window.electronAPI.onUpdateNotAvailable(
      (data) => {
        setUpdateInfo(data);
        setUpdateState("latest");
        // Auto-dissolve after 4 seconds
        setTimeout(() => setUpdateState("idle"), 4000);
      },
    );

    const cleanupProgress = window.electronAPI.onDownloadProgress((data) => {
      setProgress(data);
      setUpdateState("downloading");
    });

    const cleanupDownloaded = window.electronAPI.onUpdateDownloaded((data) => {
      setUpdateInfo(data);
      setUpdateState("ready");
    });

    const cleanupError = window.electronAPI.onUpdateError((err) => {
      setError(classifyError(err));
      setUpdateState("error");
    });

    return () => {
      cleanupChecking?.();
      cleanupAvailable?.();
      cleanupNotAvailable?.();
      cleanupProgress?.();
      cleanupDownloaded?.();
      cleanupError?.();
    };
  }, []);

  // ─── Actions ──────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    setUpdateState("downloading");
    setProgress({ percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 });
    window.electronAPI?.downloadUpdate();
  }, []);

  const handleInstall = useCallback(() => {
    window.electronAPI?.installUpdate();
  }, []);

  const handleDismiss = useCallback(() => {
    setUpdateState("idle");
    setShowDetails(false);
    window.electronAPI?.dismissUpdateBadge();
  }, []);

  const handleRetry = useCallback(() => {
    setUpdateState("checking");
    window.electronAPI?.checkForUpdates();
  }, []);

  // ─── Don't render when idle ───────────────────────────────────
  if (updateState === "idle") return null;

  const releaseNotes = formatReleaseNotes(updateInfo.releaseNotes);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 32,
        right: 24,
        zIndex: 9999,
        width: 380,
        borderRadius: 8,
        border: `1px solid ${theme.border}`,
        background: theme.background,
        boxShadow: isDark
          ? "0 8px 32px rgba(0,0,0,0.6)"
          : "0 8px 32px rgba(0,0,0,0.12)",
        fontFamily: "Inter, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 18px 10px",
          borderBottom: `1px solid ${theme.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: theme.text1,
            letterSpacing: "0.01em",
          }}
        >
          {updateState === "checking" && "Checking for Updates…"}
          {updateState === "latest" && "You're Up to Date"}
          {updateState === "available" && "Update Available"}
          {updateState === "downloading" && "Downloading Update…"}
          {updateState === "ready" && "Update Ready"}
          {updateState === "error" && "Update Error"}
        </span>
        {updateState !== "checking" && updateState !== "downloading" && (
          <button
            onClick={handleDismiss}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              color: theme.text3,
              padding: 0,
              lineHeight: 1,
            }}
            title="Dismiss"
          >
            ✕
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "14px 18px 16px" }}>
        {/* Checking */}
        {updateState === "checking" && (
          <p style={{ fontSize: 12, color: theme.text3, margin: 0 }}>
            Contacting update server…
          </p>
        )}

        {/* Latest */}
        {updateState === "latest" && (
          <p style={{ fontSize: 12, color: theme.text3, margin: 0 }}>
            DocierePro{" "}
            <strong style={{ color: theme.text2 }}>
              v{updateInfo.version}
            </strong>{" "}
            is the latest version.
          </p>
        )}

        {/* Available */}
        {updateState === "available" && (
          <>
            <p
              style={{ fontSize: 12, color: theme.text2, margin: "0 0 10px 0" }}
            >
              Version <strong>v{updateInfo.version}</strong> is now available.
            </p>

            {releaseNotes && (
              <>
                <button
                  onClick={() => setShowDetails((p) => !p)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                    color: theme.text3,
                    padding: 0,
                    marginBottom: showDetails ? 8 : 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {showDetails ? "▾ Hide Details" : "▸ More Details"}
                </button>

                {showDetails && (
                  <div
                    style={{
                      maxHeight: 180,
                      overflowY: "auto",
                      fontSize: 11,
                      lineHeight: 1.6,
                      padding: 10,
                      background: isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(0,0,0,0.03)",
                      borderRadius: 4,
                      color: theme.text2,
                      marginBottom: 12,
                    }}
                  >
                    <ReactMarkdown>{releaseNotes}</ReactMarkdown>
                  </div>
                )}
              </>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleDownload}
                style={{
                  flex: 1,
                  padding: "7px 0",
                  fontSize: 12,
                  fontWeight: 600,
                  border: "none",
                  borderRadius: 5,
                  cursor: "pointer",
                  background: isDark ? "#e5e5e5" : "#212121",
                  color: isDark ? "#1a1a1a" : "#ffffff",
                }}
              >
                Download in Background
              </button>
              <button
                onClick={handleDismiss}
                style={{
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 5,
                  cursor: "pointer",
                  background: "transparent",
                  color: theme.text3,
                }}
              >
                Dismiss
              </button>
            </div>
          </>
        )}

        {/* Downloading */}
        {updateState === "downloading" && (
          <>
            <div
              style={{
                width: "100%",
                height: 4,
                borderRadius: 4,
                background: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.08)",
                marginBottom: 8,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress.percent}%`,
                  borderRadius: 4,
                  background: isDark ? "#e5e5e5" : "#212121",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <p style={{ fontSize: 11, color: theme.text3, margin: 0 }}>
              {formatBytes(progress.transferred)} of{" "}
              {formatBytes(progress.total)}
              {progress.bytesPerSecond > 0 &&
                ` · ${formatSpeed(progress.bytesPerSecond)}`}
            </p>
          </>
        )}

        {/* Ready */}
        {updateState === "ready" && (
          <>
            <p
              style={{ fontSize: 12, color: theme.text2, margin: "0 0 12px 0" }}
            >
              Version <strong>v{updateInfo.version}</strong> has been downloaded
              and is ready to install.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleInstall}
                style={{
                  flex: 1,
                  padding: "7px 0",
                  fontSize: 12,
                  fontWeight: 600,
                  border: "none",
                  borderRadius: 5,
                  cursor: "pointer",
                  background: isDark ? "#e5e5e5" : "#212121",
                  color: isDark ? "#1a1a1a" : "#ffffff",
                }}
              >
                Install and Restart
              </button>
              <button
                onClick={handleDismiss}
                style={{
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 5,
                  cursor: "pointer",
                  background: "transparent",
                  color: theme.text3,
                }}
              >
                Later
              </button>
            </div>
          </>
        )}

        {/* Error */}
        {updateState === "error" && (
          <>
            <p
              style={{ fontSize: 12, color: theme.text2, margin: "0 0 10px 0" }}
            >
              {error.message}
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {error.actionUrl && (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(error.actionUrl, "_blank");
                  }}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: theme.text3,
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  Download Manually ↗
                </a>
              )}
              <div style={{ flex: 1 }} />
              <button
                onClick={handleRetry}
                style={{
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 600,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 5,
                  cursor: "pointer",
                  background: "transparent",
                  color: theme.text2,
                }}
              >
                Retry
              </button>
              <button
                onClick={handleDismiss}
                style={{
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 500,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 5,
                  cursor: "pointer",
                  background: "transparent",
                  color: theme.text3,
                }}
              >
                Dismiss
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdatePopup;
