import React, {useEffect, useState} from "react"

import {STRINGS} from "@/constants/ui-strings/PatientDetailsBannerStrings"
import {usePatientDetails} from "@/context/PatientDetailsProvider"
import {formatDobTextForDisplay} from "@/helpers/formatters"
import {logger} from "@/helpers/logger"

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

  useEffect(() => {
    if (!patientDetails) {
      logger.info("No patient details - hiding patient detail banner.")
      setNameText("")
      setGenderText("")
      setNhsNumberText("")
      setDobText("")
      setAddressText("")
      return
    }
    logger.info("Patient details are present.", patientDetails)

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
      if (typeof patientDetails.address === "string") {
        // If it's a string, use it directly
        setAddressText(patientDetails.address as string)
      } else {
        // If it's an object, build from fields
        const {line1, line2, city, postcode} = patientDetails.address
        const fullAddress = [line1, line2, city, postcode].filter(Boolean).join(", ")
        setAddressText(fullAddress)
      }
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
      className={`patient-details-banner ${!successfulDetails ? "patient-details-partial-data" : ""}`}
      data-testid="patient-details-banner"
      id="patient-details-banner"
    >
      <div
        className={"patient-detail-banner-row"}
      > {nameText ?
          <div className = "patient-detail-name"> {nameText}</div> : null }
        <div>{STRINGS.GENDER}: {genderText}</div>
        <div>{STRINGS.NHS_NUMBER}: {nhsNumberText}</div>
        <div>{STRINGS.DOB}: {formatDobTextForDisplay(dobText)}</div>
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
