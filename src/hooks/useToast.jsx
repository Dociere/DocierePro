// useToast.js

import React, { useState, useContext, createContext } from "react";
import Toast from "../components/toasts";

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({
    type: "",
    message: "",
    isVisible: false,
  });

  const showToast = (type, message) => {
    setToast({ type, message, isVisible: true });
  };

  const closeToast = () => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  };

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast.isVisible && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={closeToast}
        />
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  return useContext(ToastContext);
};
