import React from "react";
import axios from "axios";

const LeaveSession = ({ projectId }) => {
  const isGuest = localStorage.getItem(`project_${projectId}_guest`) === "true";
  const serverUrl = localStorage.getItem(`project_${projectId}_server`);

  if (!isGuest) return null;

  const handleLeave = async () => {
    if (
      !confirm(
        "Are you sure you want to leave? You won't be able to access this project again from this device."
      )
    ) {
      return;
    }

    try {
      await axios.post(
        `${serverUrl}/api/projects/${projectId}/leave-session`,
        {},
        { withCredentials: true }
      );

      // Clear local data
      localStorage.removeItem(`project_${projectId}_server`);
      localStorage.removeItem(`project_${projectId}_ws`);
      localStorage.removeItem(`project_${projectId}_guest`);

      alert("Session ended. Redirecting...");
      window.location.href = "/";
    } catch (error) {
      console.error("Leave error:", error);
      alert("Failed to leave session");
    }
  };

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-yellow-700">
            <strong>Guest Session</strong> - You're viewing as a guest. Session
            ends when you close the tab.
          </p>
        </div>
        <button
          onClick={handleLeave}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
        >
          Leave Session
        </button>
      </div>
    </div>
  );
};

export default LeaveSession;
