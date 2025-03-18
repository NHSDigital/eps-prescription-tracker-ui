import React, { useEffect, useState } from "react"

import { Row } from "nhsuk-react-components"

import { STRINGS } from "@/constants/ui-strings/PatientDetailsBannerStrings"
import { useAccess } from "@/context/AccessProvider"

export default function PatientDetailsBanner() {
    const [bannerText, setBannerText] = useState<string>("")
    const { patientDetails } = useAccess()

    useEffect(() => {
        if (!patientDetails) {
            console.log("No patient details - hiding patient detail banner.")
            setBannerText("")
            return
        }
        console.log("Patient details are present.", patientDetails)

        setBannerText(
            STRINGS.PLACEHOLDER
        )
    }, [patientDetails])

    /**
    * Hide the banner if the patient details are missing.
    */
    if (!patientDetails) {
        return null
    }

    return (
        <div className="nhsuk-banner" data-testid="patient-detail-banner-div">
            <Row>
                <p style={{ paddingLeft: "60px", margin: "8px" }} data-testid="patient-detail-banner-text">
                    {bannerText}
                </p>
            </Row>
        </div>
    )
}
