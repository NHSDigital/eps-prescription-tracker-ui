import React from 'react';
import { Button } from '../ReactRouterButton';

// TODO:
// When this search does not return a prescription (either invalid, or non-existent), redirect to 
// /prescription-not-found
// That page takes a query string, which is set to the original search tab label. In this case,
// be sure to redirect the user to prescription-not-found?searchType=PrescriptionIdSearch
export default function PrescriptionIdSearch() {
    return (
        <>
            <h1 data-testid="prescription-id-search-heading">Prescription ID Search</h1>
            <div className="eps-modal-button-group" data-testid="prescription-id-search-button-group">
                <Button
                    className="nhsuk-button eps-modal-button"
                    to="/prescription-results?prescriptionId=123456"
                    data-testid="find-prescription-button"
                >
                    Find a prescription
                </Button>
                <Button
                    className="nhsuk-button eps-modal-button"
                    to="/prescription-not-found?searchType=PrescriptionIdSearch"
                    data-testid="fail-find-prescription-button"
                >
                    Fail to find a prescription
                </Button>
            </div>
        </>
    )
}
