import axios from "axios";
import ConfirmModal from "./confirmModal";

const LeaveSession = ({ projectId }) => {
  const isGuest = localStorage.getItem(`project_${projectId}_guest`) === "true";
  const serverUrl = localStorage.getItem(`project_${projectId}_server`);

  if (!isGuest) return null;

  const [modalState, setModalState] = React.useState({
    isOpen: false,
    type: "",
    title: "",
    message: "",
    onConfirm: null,
  });

  const handleLeave = () => {
    setModalState({
      isOpen: true,
      type: "confirm",
      title: "Leave Session",
      message:
        "Are you sure you want to leave? You won't be able to access this project again from this device.",
      onConfirm: performLeave,
    });
  };

  const performLeave = async () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    try {
      await axios.post(
        `${serverUrl}/api/projects/${projectId}/leave-session`,
        {},
        { withCredentials: true },
      );

      // Clear local data
      localStorage.removeItem(`project_${projectId}_server`);
      localStorage.removeItem(`project_${projectId}_ws`);
      localStorage.removeItem(`project_${projectId}_guest`);

      setModalState({
        isOpen: true,
        type: "alert",
        title: "Session Ended",
        message: "Session ended. Redirecting...",
        onConfirm: () => {
          window.location.href = "/";
        },
      });
    } catch (error) {
      console.error("Leave error:", error);
      setModalState({
        isOpen: true,
        type: "alert",
        title: "Error",
        message: "Failed to leave session",
        onConfirm: () => setModalState((prev) => ({ ...prev, isOpen: false })),
      });
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
      <ConfirmModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        confirmText="OK"
        cancelText={modalState.type === "confirm" ? "Cancel" : ""}
        onConfirm={() => {
          if (modalState.onConfirm) modalState.onConfirm();
          else setModalState((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default LeaveSession;
