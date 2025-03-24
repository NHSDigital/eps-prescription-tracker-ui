import React from 'react';
import { Button } from '../ReactRouterButton';

// TODO:
// When this search does not return a prescription (either invalid, or non-existent), redirect to 
// /prescription-not-found
// That page takes a query string, which is set to the original search tab label. In this case,
// be sure to redirect the user to prescription-not-found?searchType=NhsNumSearch
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
