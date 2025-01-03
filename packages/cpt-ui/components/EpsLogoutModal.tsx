"use client";
import React, { useEffect } from "react";
import { Button } from "nhsuk-react-components"

import "@/assets/styles/EpsLogoutModal.scss";
import { EpsLogoutModalStrings } from "@/constants/ui-strings/EpsLogoutModalStrings";

interface EpsLogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function EpsLogoutModal({ isOpen, onClose, onConfirm }: EpsLogoutModalProps) {
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
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  

  // If the modal isn’t open, don’t render anything
  if (!isOpen) return null;
  
  return (
    <div
      className="EpsLogoutModalOverlay" 
      onClick={handleBackdropClick}
      role="button"
      tabIndex={0}
    >
      <div className="EpsLogoutModalContent" role="dialog" aria-modal="true">
        <button className="EpsLogoutModalCloseButton" onClick={onClose} aria-label="Close modal">
          ×
        </button>
        
        <h2>{EpsLogoutModalStrings.title}</h2>
        <p>{EpsLogoutModalStrings.caption}</p>
        
        {/* TODO: style appropriately */}
        <div className="EpsLogoutModalButtonGroup">
          <Button 
            className="nhsuk-button EpsLogoutModalButton" 
            onClick={onConfirm}
          >
            {EpsLogoutModalStrings.confirmButtonText}
          </Button>
          
          <Button 
            className="nhsuk-button nhsuk-button--secondary EpsLogoutModalButton" 
            onClick={onClose}
          >
            {EpsLogoutModalStrings.cancelButtonText}
          </Button>
        </div>
      </div>
    </div>
  );
}
