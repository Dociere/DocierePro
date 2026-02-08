import { useEffect } from "react";

const Toast = ({ type, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!message) return null;

  let bgColor;
  switch (type) {
    case "success":
      bgColor = "bg-green-500";
      break;
    case "error":
      bgColor = "bg-red-500";
      break;
    case "warning":
      bgColor = "bg-yellow-500";
      break;
    default:
      bgColor = "bg-gray-500";
  }

  return (
    <div
      className={`fixed right-5 top-5 px-4 py-2 rounded-md text-white transition-opacity duration-300 z-[9999] ${bgColor}`}
    >
      <div className="flex items-center justify-between">
        <span>{message}</span>
        <button className="ml-2" onClick={onClose}>
          &times;
        </button>
      </div>
    </div>
  );
};

export { Toast }; // Export the component, and we will create a hook below
export default Toast;
