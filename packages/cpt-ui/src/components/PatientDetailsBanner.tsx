import React, { useEffect, useState } from "react"

import { Row, Col } from "nhsuk-react-components"

import { STRINGS } from "@/constants/ui-strings/PatientDetailsBannerStrings"
import { useAccess } from "@/context/AccessProvider"

export default function PatientDetailsBanner() {
    const [nameText, setNameText] = useState("")
    const [genderText, setGenderText] = useState("")
    const [nhsNumberText, setNhsNumberText] = useState("")
    const [dobText, setDobText] = useState("")
    const [addressText, setAddressText] = useState("")

    const { patientDetails } = useAccess()

    useEffect(() => {
        if (!patientDetails) {
            console.log("No patient details - hiding patient detail banner.")
            setNameText("")
            setGenderText("")
            setNhsNumberText("")
            setDobText("")
            setAddressText("")
            return
        }
        console.log("Patient details are present.", patientDetails)

        setNameText(`${patientDetails.name.given} ${patientDetails.name.family.toLocaleUpperCase()}`)
        setGenderText(patientDetails.gender)
        setNhsNumberText(patientDetails.identifier)
        setDobText(patientDetails.birthDate)
        setAddressText(patientDetails.address.text)
    }, [patientDetails])

    /**
    * Hide the banner if the patient details are missing.
    */
    if (!patientDetails) {
        return null
    }

    return (
        <div className="nhsuk-banner patient-details-banner" data-testid="patient-detail-banner-div">
            <div
                style={{
                    display: "flex",
                    justifyContent: "flex-start",
                    gap: "30px",
                    width: "100%"
                }}
            >
                <div />
                <div style={{ textAlign: "left", fontWeight: "bold", fontSize: "1.1rem" }}>{nameText}</div>
                <div style={{ textAlign: "left" }}>{STRINGS.GENDER}: {genderText}</div>
                <div style={{ textAlign: "left" }}>{STRINGS.NHS_NUMBER}: {nhsNumberText}</div>
                <div style={{ textAlign: "left" }}>{STRINGS.DOB}: {dobText}</div>
                <div style={{ textAlign: "left" }}>{STRINGS.ADDRESS}: {addressText}</div>
            </div>
        </div >
    )
}
