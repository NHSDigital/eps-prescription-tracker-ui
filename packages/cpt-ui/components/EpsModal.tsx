"use client";
import React, { useEffect } from "react";

import "@/assets/styles/EpsModal.scss";

interface EpsModalProps {
  readonly children: React.ReactNode;
  readonly isOpen: boolean;
  readonly onClose: () => void;
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
    // This should be a button for accessibility, but we can't have buttons be descendants of buttons,
    // and the modal children will have buttons in it.
    // (making this a button does actually work, so this might be a FIXME to solve the hydration error)
    <div
      role="button"
      className="eps-modal-overlay" 
      onClick={handleBackdropClick}
      tabIndex={0}
      onKeyDown={handleBackdropActivate}
      data-testid="eps-modal-overlay"
    >
        <dialog 
          className="eps-modal-content" 
          aria-modal="true"
          data-testid="eps-modal-content"
        >
        <button className="eps-modal-close-button" onClick={onClose} aria-label="Close modal">
            ×
        </button>
        
            {children}

        </dialog>
    </div>
  )
}
