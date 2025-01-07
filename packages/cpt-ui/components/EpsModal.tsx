"use client";
import React, { useEffect } from "react";

import "@/assets/styles/EpsModal.scss";

interface EpsModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export function EpsModal({ children, isOpen, onClose }: EpsModalProps) {
  // Close modal on `Escape` key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  
  // Close if user clicks outside the modal content
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // Close if user activates on the background
  const handleBackdropActivate = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      onClose();
    }
  };

  // If the modal isn’t open, don’t render anything
  if (!isOpen) return null;
  
  return (
    <div
    className="eps-modal-overlay" 
    onClick={handleBackdropClick}
    role="button"
    tabIndex={0}
    onKeyDown={handleBackdropActivate}
    data-testid="eps-modal-overlay"
    >
        <div 
          className="eps-modal-content" 
          role="dialog" 
          aria-modal="true"
          data-testid="eps-modal-content"
        >
        <button className="eps-modal-close-button" onClick={onClose} aria-label="Close modal">
            ×
        </button>
        
            {children}

        </div>
    </div>
  )
}
