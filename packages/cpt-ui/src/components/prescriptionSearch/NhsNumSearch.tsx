import React from 'react';
import { Button } from '../ReactRouterButton';

export default function NhsNumSearch() {
    return (
        <>
            <h1 data-testid="nhs-number-search-heading">NHS Number Search</h1>
            <div className="eps-modal-button-group" data-testid="nhs-number-search-button-group">
                <Button
                    className="nhsuk-button eps-modal-button"
                    to="/prescription-results?nhsNumber=123456"
                    data-testid="find-patient-button"
                >
                    Find a patient
                </Button>
            </div>
        </>
    )
}
