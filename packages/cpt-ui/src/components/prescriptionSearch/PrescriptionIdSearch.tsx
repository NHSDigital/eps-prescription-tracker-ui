import React from 'react';
import { Button } from '../ReactRouterButton';

export default function PrescriptionIdSearch() {
    return (
        <>
            <h1>Prescription ID Search</h1>
            <div className="eps-modal-button-group">
                <Button
                    className="nhsuk-button eps-modal-button"
                    to="/prescription-results?prescriptionId=123456"
                >
                    Find a prescription
                </Button>
            </div>
        </>
    )
}
