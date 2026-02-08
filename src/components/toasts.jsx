import { useEffect } from "react";
import TickIcon from "../assets/icons/tickIcon.svg?react";

const Toast = ({ type, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!message) return null;

  let bgColor;
  let icon;
  switch (type) {
    case "success":
      bgColor = "bg-white";
      icon = (
        <TickIcon
          style={{ fill: "#296623", WebkitAppRegion: "no-drag" }}
          className="w-4 h-4 ml-2"
        />
      );
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
      className={`fixed bottom-5 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pl-4 pr-7 text-[12px] py-2 rounded-md text-gray-700 border-2 border-gray-200 transition-opacity duration-300 z-[9999] font-inter uppercase ${bgColor}`}
    >
      <div className="flex items-center justify-center">
        <div className="mr-2">{icon}</div>
        <span>{message}</span>
        {/* <button className="ml-2" onClick={onClose}>
          &times;
        </button> */}
      </div>
    </div>
  );
};

export { Toast }; // Export the component, and we will create a hook below
export default Toast;
