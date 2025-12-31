import {jest} from "@jest/globals"
import React from "react"

import "@testing-library/jest-dom"
import {render, screen, waitFor} from "@testing-library/react"

import PatientDetailsBanner from "@/components/PatientDetailsBanner"

import {PatientDetails, PatientDetailsAddress} from "@cpt-ui-common/common-types"

import {STRINGS} from "@/constants/ui-strings/PatientDetailsBannerStrings"

import {MockPatientDetailsProvider} from "../__mocks__/MockPatientDetailsProvider"

// Shared address mocks
const fullAddress: PatientDetailsAddress = {
  line1: "55 Oak Street",
  line2: "OAK LANE",
  city: "Leeds",
  postcode: "LS1 1XX"
}

const partialAddress: PatientDetailsAddress = {
  line1: "55 Oak Street",
  city: "Leeds"
}

// Base patient template
const basePatient: PatientDetails = {
  nhsNumber: "5900009890",
  prefix: "Mr",
  suffix: "",
  given: "William",
  family: "Wolderton",
  gender: "male",
  dateOfBirth: "01-Nov-1988",
  address: fullAddress
}

const completeDetails = basePatient

const minimumDetails = {
  ...basePatient,
  gender: null,
  dateOfBirth: null,
  address: null
}

const partialAddressDetails = {
  ...basePatient,
  address: partialAddress
}

describe("PatientDetailsBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("does not render the banner when patientDetails is null", () => {
    render(
      <MockPatientDetailsProvider patientDetails={undefined}>
        <PatientDetailsBanner />
      </MockPatientDetailsProvider>
    )
    expect(screen.queryByTestId("patient-details-banner")).toBeNull()
  })

  it("renders complete patient details correctly", async () => {
    render(
      <MockPatientDetailsProvider patientDetails={completeDetails}>
        <PatientDetailsBanner />
      </MockPatientDetailsProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId("patient-details-banner")).toBeInTheDocument()
    })

    // Check that the patient's name is displayed correctly.
    expect(screen.getByText("William WOLDERTON")).toBeInTheDocument()

    // Check that the gender is capitalized (from "male" to "Male")
    expect(
      screen.getByText(new RegExp(`${STRINGS.GENDER}:\\s*Male`, "i"))
    ).toBeInTheDocument()

    // Verify NHS number and date of birth are shown as expected. NHS number should be XXX XXX XXXX
    expect(
      screen.getByText(new RegExp(`${STRINGS.NHS_NUMBER}:\\s*590 000 9890`, "i"))
    ).toBeInTheDocument()
    expect(
      screen.getByText(new RegExp(`${STRINGS.DOB}:\\s*01-Nov-1988`, "i"))
    ).toBeInTheDocument()

    // Construct the expected address string
    const expectedAddress = "55 OAK STREET, OAK LANE, LEEDS, LS1 1XX"
    expect(
      screen.getByText(new RegExp(`${STRINGS.ADDRESS}:\\s*${expectedAddress}`, "i"))
    ).toBeInTheDocument()

    // Verify that the missing data message is not rendered
    expect(screen.queryByText(STRINGS.MISSING_DATA)).toBeNull()

    // Confirm the banner does not have the partial-data styling
    const bannerDiv = screen.getByTestId("patient-details-banner")
    expect(bannerDiv.className).not.toMatch(/patient-details-partial-data/)
  })

  it("renders partial patient details with missing data message", async () => {
    render(
      <MockPatientDetailsProvider patientDetails={minimumDetails}>
        <PatientDetailsBanner />
      </MockPatientDetailsProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("patient-details-banner")).toBeInTheDocument()
    })

    // When details are missing, gender, date of birth, and address should show STRINGS.UNKNOWN.
    expect(screen.getByText("Gender")).toBeInTheDocument()
    expect(screen.getByText("Unavailable")).toBeInTheDocument()
    expect(screen.getByText("Date of birth")).toBeInTheDocument()
    expect(
      screen.getByText(new RegExp(`${STRINGS.ADDRESS}:\\s*${STRINGS.UNKNOWN}`, "i"))
    ).toBeInTheDocument()

    // But the core details should still render
    expect(
      screen.getByText(new RegExp(`${STRINGS.NHS_NUMBER}:\\s*590 000 9890`, "i"))
    ).toBeInTheDocument()
    expect(screen.getByText("William WOLDERTON")).toBeInTheDocument()

    // The missing data message should be rendered.
    expect(screen.getByText(STRINGS.MISSING_DATA)).toBeInTheDocument()

    // The banner should now have the class for partial data.
    const bannerDiv = screen.getByTestId("patient-details-banner")
    expect(bannerDiv.className).toMatch(/patient-details-partial-data/)
  })

  it("renders patient details with a partially populated address", async () => {
    render(
      <MockPatientDetailsProvider patientDetails={partialAddressDetails}>
        <PatientDetailsBanner />
      </MockPatientDetailsProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("patient-details-banner")).toBeInTheDocument()
    })

    // Verify the patient's name is rendered correctly.
    expect(screen.getByText("William WOLDERTON")).toBeInTheDocument()

    // Verify that gender, NHS number and DOB are rendered as expected.
    expect(screen.getByText(new RegExp(`${STRINGS.GENDER}:\\s*Male`, "i"))).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`${STRINGS.NHS_NUMBER}:\\s*590 000 9890`, "i"))).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`${STRINGS.DOB}:\\s*01-Nov-1988`, "i"))).toBeInTheDocument()

    // Expected address: Only provided fields should be concatenated, in uppercase.
    // "55 Oak Street" becomes "55 OAK STREET" and "Leeds" becomes "LEEDS"
    const expectedAddress = "55 OAK STREET, LEEDS"
    expect(
      screen.getByText(new RegExp(`${STRINGS.ADDRESS}:\\s*${expectedAddress}`, "i"))
    ).toBeInTheDocument()

    // Ensure that the missing data message is not rendered.
    expect(screen.queryByText(STRINGS.MISSING_DATA)).toBeNull()

    // Verify that the banner does not have the partial-data styling.
    const bannerDiv = screen.getByTestId("patient-details-banner")
    expect(bannerDiv.className).not.toMatch(/patient-details-partial-data/)
  })

  it("renders complete patient details correctly when address is an object", async () => {
    render(
      <MockPatientDetailsProvider patientDetails={completeDetails}>
        <PatientDetailsBanner />
      </MockPatientDetailsProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId("patient-details-banner")).toBeInTheDocument()
    })

    // Check that the patient's name is displayed correctly.
    expect(screen.getByText("William WOLDERTON")).toBeInTheDocument()

    // Check that the gender is capitalized (from "male" to "Male")
    expect(
      screen.getByText(new RegExp(`${STRINGS.GENDER}:\\s*Male`, "i"))
    ).toBeInTheDocument()

    // Verify NHS number and date of birth are shown as expected. NHS number should be XXX XXX XXXX
    expect(
      screen.getByText(new RegExp(`${STRINGS.NHS_NUMBER}:\\s*590 000 9890`, "i"))
    ).toBeInTheDocument()
    expect(
      screen.getByText(new RegExp(`${STRINGS.DOB}:\\s*01-Nov-1988`, "i"))
    ).toBeInTheDocument()

    // Construct the expected address string
    const expectedAddress = "55 OAK STREET, OAK LANE, LEEDS, LS1 1XX"
    expect(
      screen.getByText(new RegExp(`${STRINGS.ADDRESS}:\\s*${expectedAddress}`, "i"))
    ).toBeInTheDocument()

    // Verify that the missing data message is not rendered
    expect(screen.queryByText(STRINGS.MISSING_DATA)).toBeNull()

    // Confirm the banner does not have the partial-data styling
    const bannerDiv = screen.getByTestId("patient-details-banner")
    expect(bannerDiv.className).not.toMatch(/patient-details-partial-data/)
  })

  it("renders patient details when address is a plain string", async () => {
    const patientWithStringAddress = {
      ...basePatient,
      address: "10 Heathfield, Leeds, LS12 3AB"
    }

    render(
      <MockPatientDetailsProvider patientDetails={patientWithStringAddress}>
        <PatientDetailsBanner />
      </MockPatientDetailsProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("patient-details-banner")).toBeInTheDocument()
    })

    // Basic field checks
    expect(screen.getByText("William WOLDERTON")).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`${STRINGS.GENDER}:\\s*Male`, "i"))).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`${STRINGS.NHS_NUMBER}:\\s*590 000 9890`, "i"))).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`${STRINGS.DOB}:\\s*01-Nov-1988`, "i"))).toBeInTheDocument()

    // Address string check
    expect(screen.getByText(new RegExp(`${STRINGS.ADDRESS}:\\s*10 Heathfield, Leeds, LS12 3AB`, "i")))
      .toBeInTheDocument()

    // Ensure no partial or missing data message
    expect(screen.queryByText(STRINGS.MISSING_DATA)).toBeNull()
    const bannerDiv = screen.getByTestId("patient-details-banner")
    expect(bannerDiv.className).not.toMatch(/patient-details-partial-data/)
  })
})
