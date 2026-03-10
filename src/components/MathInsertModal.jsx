import React from "react";
import EasyMathInput from "./easyMathInput";

const MathInsertModal = ({ isOpen, onClose, onInsert, showInsertButton = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm font-sans">
      <div
        className="bg-white rounded-xl shadow-2xl w-[900px] max-w-full flex flex-col h-[650px] max-h-[90vh] overflow-hidden border border-gray-100 relative"
      >
        {/* Wrap EasyMathInput which expects to be full height */}
        <div className="flex-1 overflow-hidden flex bg-gray-50">
          <EasyMathInput
            onClose={onClose}
            onInsert={showInsertButton ? (latex) => {
              onInsert(latex);
              onClose();
            } : undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default MathInsertModal;
