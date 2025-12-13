import React from 'react';

interface GlobalDragOverlayProps {
  isVisible: boolean;
  isValid: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
}

const GlobalDragOverlay: React.FC<GlobalDragOverlayProps> = ({ isVisible, isValid, onDrop, onDragLeave }) => {
  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col justify-center items-center transition-colors duration-200 ${
        isValid ? 'bg-[#00ff41]/90' : 'bg-[#ff2a00]/90'
      }`}
      onDragLeave={onDragLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div 
        className="text-[5rem] font-[900] text-black bg-white p-5 shadow-[10px_10px_0_#000] -rotate-2 text-center uppercase pointer-events-none"
      >
        {isValid ? 'DROP IT, MAN!! 🟢' : 'ERROR! 🛑'}
      </div>
    </div>
  );
};

export default GlobalDragOverlay;
