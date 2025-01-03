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
    <div className="modalOverlay" onClick={handleBackdropClick}>
      <div className="modalContent" role="dialog" aria-modal="true">
        <button className="closeButton" onClick={onClose} aria-label="Close modal">
          ×
        </button>
        
        <h2>{EpsLogoutModalStrings.title}</h2>
        <p>{EpsLogoutModalStrings.caption}</p>
        
        {/* TODO: style appropriately */}
        <div className="buttonGroup">
          <Button 
            className="nhsuk-button eps-logout-modal-button" 
            onClick={onConfirm}
          >
            {EpsLogoutModalStrings.confirmButtonText}
          </Button>
          
          <Button 
            className="nhsuk-button nhsuk-button--secondary eps-logout-modal-button" 
            onClick={onClose}
          >
            {EpsLogoutModalStrings.cancelButtonText}
          </Button>
        </div>
      </div>
    </div>
  );
}
