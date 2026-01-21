import React, { useState, useContext } from "react";
import axios from "axios";
import { useAuth } from "../context/useAuth";
import { projectContext } from "../context/useProject.jsx";
import { saveProject } from "../api/projectHandling.jsx";

const ShareProject = ({ onClose, projectId, isOwner }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [collaboratorEmail, setCollaboratorEmail] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [joinToken, setJoinToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const { user } = useAuth();
  const { projectDetails, updateProjectDetails } = useContext(projectContext);

  const handleShare = async () => {
    console.log("Project ID:", projectId);
    console.log("User:", user);
    console.log("All cookies:", document.cookie);

    //Below code to be deleted
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("uid="))
      ?.split("=")[1];
    console.log("UID token:", token);

    if (!collaboratorEmail) {
      setMessage("Please enter collaborator email");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post(
        `http://localhost:5025/api/projects/${projectId}/share`,
        { collaboratorEmail, permissions: "edit" },
        { withCredentials: true },
      );

      setShareLink(response.data.shareLink);
      setMessage("Share link generated!");
    } catch (error) {
      setMessage(
        error.response?.data?.error || "Failed to generate share link",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinToken) {
      setMessage("Please enter join token");
      return;
    }

    setLoading(true);

    try {
      let token = joinToken.trim();
      if (token.includes("/join/")) {
        token = token.split("/join/")[1];
      }

      const tokenParts = token.split(".");
      const base64 = tokenParts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(
        base64.length + ((4 - (base64.length % 4)) % 4),
        "=",
      );
      const payload = JSON.parse(atob(padded));

      const serverUrl = payload.serverUrl;
      const wsUrl = payload.wsUrl;

      console.log("Connecting to:", serverUrl);

      const response = await axios.post(
        `${serverUrl}/api/projects/join/${token}`,
        {},
        { withCredentials: true },
      );

      const data = response.data;
      const projectId = data.project.projectId;

      // Save server info
      localStorage.setItem(`project_${projectId}_server`, serverUrl);
      localStorage.setItem(`project_${projectId}_ws`, wsUrl);

      // Save guest token if guest user
      if (data.userType === "guest") {
        localStorage.setItem(
          `project_${projectId}_guest_token`,
          data.guestToken,
        );
        localStorage.setItem(`project_${projectId}_guest`, "true");
        setMessage("Joined as guest!");
      }
      //For Authenticated Users
      else {
        localStorage.setItem(`project_${projectId}_guest`, "false");
        setMessage("Successfully joined project!");
      }

      setTimeout(() => {
        window.location.href = `/canvas?project=${projectId}`;
      }, 1000);
    } catch (error) {
      console.error("Error from handleJoin", error);
      setMessage(
        error.response?.data?.error ||
          error.message ||
          "Failed to join project",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOwnership = async (e) => {
    e.preventDefault();
    console.log(user?.emailId);
    const updatedProject = {
      ...projectDetails.currentProject,
      owner: user?.emailId,
    };

    updateProjectDetails({ currentProject: updatedProject });
    console.log("projectDetails from ownership", updatedProject);
    await saveProject(updatedProject, projectDetails.activeFile);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[600px] min-h-[50vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-inter font-medium text-gray-800">
            Share Project
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            X
          </button>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 ml-20 mt-20"
        >
          {isOwner ? "Share Project" : "Join Project"}
        </button>

        {!isOwner && (
          <div className="mt-10 ml-20">
            {" "}
            <button
              onClick={handleOwnership}
              className="bg-red-500 px-4 py-2 rounded-sm font-inter text-white"
            >
              Become Owner
            </button>
          </div>
        )}

        {isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {isOwner ? "Share Project" : "Join Project"}
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {isOwner ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Collaborator Email
                    </label>
                    <input
                      type="email"
                      value={collaboratorEmail}
                      onChange={(e) => setCollaboratorEmail(e.target.value)}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="collaborator@example.com"
                    />
                  </div>

                  <button
                    onClick={handleShare}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                  >
                    {loading ? "Generating..." : "Generate Share Link"}
                  </button>

                  {shareLink && (
                    <div className="mt-4 p-3 bg-gray-100 rounded">
                      <p className="text-sm font-medium mb-2">Share Link:</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={shareLink}
                          readOnly
                          className="flex-1 px-2 py-1 text-sm border rounded bg-white"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(shareLink);
                            setMessage("Copied to clipboard!");
                          }}
                          className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Enter Join Token
                    </label>
                    <input
                      type="text"
                      value={joinToken}
                      onChange={(e) => setJoinToken(e.target.value)}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Paste token here"
                    />
                  </div>

                  <button
                    onClick={handleJoin}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                  >
                    {loading ? "Joining..." : "Join Project"}
                  </button>
                </div>
              )}

              {message && (
                <div
                  className={`mt-4 p-3 rounded text-sm ${
                    message.includes("Success") || message.includes("generated")
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {message}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareProject;
