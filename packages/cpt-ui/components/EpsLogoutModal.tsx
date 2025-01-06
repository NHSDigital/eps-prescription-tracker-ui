"use client";
import React from "react";
import { Button } from "nhsuk-react-components"

import { EpsModal } from "@/components/EpsModal";
import { EpsLogoutModalStrings } from "@/constants/ui-strings/EpsLogoutModalStrings";

interface EpsLogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function EpsLogoutModal({ isOpen, onClose, onConfirm }: EpsLogoutModalProps) {
  
  return (
    <EpsModal isOpen={isOpen} onClose={onClose}>
        <h2>{EpsLogoutModalStrings.title}</h2>
        <p>{EpsLogoutModalStrings.caption}</p>
        
        {/* TODO: style appropriately */}
        <div className="eps-modal-button-group">
          <Button 
            className="nhsuk-button eps-modal-button" 
            onClick={onConfirm}
          >
            {EpsLogoutModalStrings.confirmButtonText}
          </Button>
          
          <Button 
            className="nhsuk-button nhsuk-button--secondary eps-modal-button" 
            onClick={onClose}
          >
            {EpsLogoutModalStrings.cancelButtonText}
          </Button>
        </div>
    </EpsModal>
  );
}
