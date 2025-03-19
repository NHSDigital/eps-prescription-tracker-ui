import React from 'react';
import { Button } from '../ReactRouterButton';

export default function NhsNumSearch() {
    return (
        <>
            <h1>NHS Number Search</h1>
            <div className="eps-modal-button-group">
                <Button
                    className="nhsuk-button eps-modal-button"
                    to="/prescriptionresults?nhsNumber=123456"
                >
                    Find a patient
                </Button>
            </div>
        </>
    )
}
