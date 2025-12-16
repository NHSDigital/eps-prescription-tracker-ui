import React, {useEffect, useState} from "react"

import {STRINGS} from "@/constants/ui-strings/PatientDetailsBannerStrings"
import {usePatientDetails} from "@/context/PatientDetailsProvider"
import {logger} from "@/helpers/logger"
import {NOT_AVAILABLE, PatientAddressUse, PatientNameUse} from "@cpt-ui-common/common-types"
import {format} from "date-fns"
import {DOB_FORMAT, NHS_NUMBER_FORMAT_REGEX} from "@/constants/misc"

export default function PatientDetailsBanner() {
  const emptyPatientDetailsText = {
    name: STRINGS.UNKNOWN,
    gender: STRINGS.UNKNOWN,
    nhsNumber: "",
    dob: STRINGS.UNKNOWN,
    address: STRINGS.UNKNOWN
  }

  const [patientDetailsText, setPatientDetailsText] = useState(emptyPatientDetailsText)
  const {patientDetails, patientFallback} = usePatientDetails()

  useEffect(() => {
    if (!patientDetails) {
      logger.info("No patient details - hiding patient detail banner.")
      setPatientDetailsText(emptyPatientDetailsText)
      return
    }

    logger.info("Patient details are present.", patientDetails)

    const patientDetailsText = structuredClone(emptyPatientDetailsText)
    if (patientDetails.givenName && patientDetails.familyName) {
      if (patientDetails.givenName === NOT_AVAILABLE || patientDetails.familyName === NOT_AVAILABLE) {
        patientDetailsText.name = STRINGS.NAME_NOT_AVAILABLE
      } else {
        patientDetailsText.name =
          `${patientDetails.givenName.filter(Boolean).join(" ")} ${patientDetails.familyName.toLocaleUpperCase()}${
            patientDetails.nameUse === PatientNameUse.TEMP ? STRINGS.TEMPORARY : ""}`
      }
    }

    if (patientDetails.gender) {
      patientDetailsText.gender = patientDetails.gender === NOT_AVAILABLE ? STRINGS.NOT_AVAILABLE :
        `${patientDetails.gender.charAt(0).toUpperCase()}${patientDetails.gender.slice(1)}`
    }

    patientDetailsText.nhsNumber = patientDetails.nhsNumber.replace(NHS_NUMBER_FORMAT_REGEX, "$1 $2 $3")

    if (patientDetails.dateOfBirth) {
      patientDetailsText.dob = patientDetails.dateOfBirth === NOT_AVAILABLE ? STRINGS.NOT_AVAILABLE :
        format(new Date(patientDetails.dateOfBirth), DOB_FORMAT)
    }

    if (patientDetails.address && patientDetails.postcode) {
      if (patientDetails.address === NOT_AVAILABLE && patientDetails.postcode === NOT_AVAILABLE) {
        patientDetailsText.address = STRINGS.NOT_AVAILABLE
      } else {
        const addressParts: Array<string> = []
        if (patientDetails.address !== NOT_AVAILABLE){
          addressParts.push(...patientDetails.address)
        }
        if(patientDetails.postcode !== NOT_AVAILABLE){
          addressParts.push(patientDetails.postcode)
        }
        patientDetailsText.address = `${addressParts.filter(Boolean).join(", ")}${
          patientDetails.addressUse === PatientAddressUse.TEMP ? STRINGS.TEMPORARY : ""}`
      }
    }
    setPatientDetailsText(patientDetailsText)
  }, [patientDetails, patientFallback])

  /**
    * Hide the banner if the patient details are missing.
    */
  if (!patientDetails) {
    return null
  }

  return (
    <div
      className={`patient-details-banner ${patientFallback ? "patient-details-partial-data" : ""}`}
      data-testid="patient-details-banner">
      <div className={"patient-detail-banner-row"}>
        <div
          className="patient-detail-name"
          data-testid="patient-details-banner-name">
          {patientDetailsText.name}
        </div>
        <div data-testid="patient-details-banner-gender">{STRINGS.GENDER}: {patientDetailsText.gender}</div>
        <div data-testid="patient-details-banner-nhsNumber">{STRINGS.NHS_NUMBER}: {patientDetailsText.nhsNumber}</div>
        <div data-testid="patient-details-banner-dob">{STRINGS.DOB}: {patientDetailsText.dob}</div>
        <div data-testid="patient-details-banner-address">{STRINGS.ADDRESS}: {patientDetailsText.address}</div>
      </div>
      {
        // Places the missing data message on the next line
        patientFallback && (
          <div
            className="patient-detail-banner-row"
            data-testid="patient-detail-banner-incomplete">
            <div>{STRINGS.MISSING_DATA}</div>
          </div>
        )
      }
    </div >
  )
}
