import React, {useEffect, useState} from "react"

import {STRINGS} from "@/constants/ui-strings/PatientDetailsBannerStrings"
import {usePatientDetails} from "@/context/PatientDetailsProvider"

import {PatientDetailsAddress} from "@cpt-ui-common/common-types/src/prescriptionList"

export default function PatientDetailsBanner() {
  const [nameText, setNameText] = useState("")
  const [genderText, setGenderText] = useState("")
  const [nhsNumberText, setNhsNumberText] = useState("")
  const [dobText, setDobText] = useState("")
  const [addressText, setAddressText] = useState("")

  const [successfulDetails, setSuccessfulDetails] = useState(true)

  const {patientDetails} = usePatientDetails()

  const capitalize = (input: string) => {
    return input[0].toLocaleUpperCase() + input.slice(1)
  }

  const formatNhsNumber = (input: string) => {
    // Convert from whatever format, to `XXX XXX XXXX`. remove whitespace first
    const cleaned = input.replace(/\s+/g, "")
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
  }

  const constructAddress = (address: PatientDetailsAddress) => {
    const units = [address.line1, address.line2, address.city, address.postcode]
    return units
      .filter((x) => {
        return !!x
      })
      .join(", ")
      .toLocaleUpperCase()
  }

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

    let allDetailsPresent = true

    setNameText(`${patientDetails.given} ${patientDetails.family.toLocaleUpperCase()}`)

    setNhsNumberText(formatNhsNumber(patientDetails.nhsNumber))

    if (patientDetails.gender) {
      setGenderText(capitalize(patientDetails.gender))
    } else {
      setGenderText(STRINGS.UNKNOWN)
      allDetailsPresent = false
    }

    if (patientDetails.dateOfBirth) {
      setDobText(patientDetails.dateOfBirth)
    } else {
      setDobText(STRINGS.UNKNOWN)
      allDetailsPresent = false
    }

    if (patientDetails.address) {
      setAddressText(constructAddress(patientDetails.address))
    } else {
      setAddressText(STRINGS.UNKNOWN)
      allDetailsPresent = false
    }

    setSuccessfulDetails(allDetailsPresent)
  }, [patientDetails])

  /**
    * Hide the banner if the patient details are missing.
    */
  if (!patientDetails) {
    return null
  }

  return (
    <div
      className={`nhsuk-banner patient-details-banner ${!successfulDetails ? "patient-details-partial-data" : ""}`}
      data-testid="patient-details-banner"
    >
      <div
        className={"patient-detail-banner-row"}
      >
        <div style={{fontWeight: "bold", fontSize: "1.1rem"}}>{nameText}</div>
        <div>{STRINGS.GENDER}: {genderText}</div>
        <div>{STRINGS.NHS_NUMBER}: {nhsNumberText}</div>
        <div>{STRINGS.DOB}: {dobText}</div>
        <div>{STRINGS.ADDRESS}: {addressText}</div>
      </div>
      {
        // Places the missing data message on the next line
        !successfulDetails && (
          <div
            className="patient-detail-banner-row"
            data-testid="patient-detail-banner-incomplete"
          >
            <div>{STRINGS.MISSING_DATA}</div>
          </div>
        )
      }
    </div >
  )
}
