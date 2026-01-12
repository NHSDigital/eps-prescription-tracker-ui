import {jest} from "@jest/globals"
import React from "react"

import "@testing-library/jest-dom"
import {render, screen, waitFor} from "@testing-library/react"

import PatientDetailsBanner from "@/components/PatientDetailsBanner"

import {PatientAddressUse, PatientNameUse, PatientSummary} from "@cpt-ui-common/common-types"

import {STRINGS} from "@/constants/ui-strings/PatientDetailsBannerStrings"

import {MockPatientDetailsProvider} from "../__mocks__/MockPatientDetailsProvider"

describe("PatientDetailsBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("does not render the banner when patientDetails is null", () => {
    render(
      <MockPatientDetailsProvider patientDetails={undefined} patientFallback={false}>
        <PatientDetailsBanner />
      </MockPatientDetailsProvider>
    )
    expect(screen.queryByTestId("patient-details-banner")).toBeNull()
  })

  it("renders complete patient details correctly", async () => {
    const mockPatientDetails: PatientSummary = {
      nhsNumber: "5900009890",
      givenName: ["William"],
      familyName: "Wolderton",
      gender: "male",
      dateOfBirth: "1988-11-01",
      address: ["55 Oak Street", "OAK LANE", "Leeds"],
      postcode: "LS1 1XX"
    }
    render(
      <MockPatientDetailsProvider patientDetails={mockPatientDetails} patientFallback={false}>
        <PatientDetailsBanner />
      </MockPatientDetailsProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId("patient-details-banner")).toBeInTheDocument()
    })

    // Check that the patient's name is displayed correctly.
    expect(screen.getByTestId("patient-details-banner-name")).toHaveTextContent("William WOLDERTON")
    // Check that the gender is correctly displayed and capitalized (from "male" to "Male")
    expect(screen.getByTestId("patient-details-banner-gender")).toHaveTextContent(`${STRINGS.GENDER}:`)
    expect(screen.getByTestId("patient-details-banner-gender-value")).toHaveTextContent("Male")
    // Check that NHS Number is correct displayed and formatted
    expect(screen.getByTestId("patient-details-banner-nhsNumber")).toHaveTextContent(`${STRINGS.NHS_NUMBER}:`)
    expect(screen.getByTestId("patient-details-banner-nhsNumber-value")).toHaveTextContent("590 000 9890")
    // Check that dob is correct displayed and formatted
    expect(screen.getByTestId("patient-details-banner-dob")).toHaveTextContent(`${STRINGS.DOB}:`)
    expect(screen.getByTestId("patient-details-banner-dob-value")).toHaveTextContent("1 Nov 1988")
    // Check that the address is correct displayed
    expect(screen.getByTestId("patient-details-banner-address")).toHaveTextContent(`${STRINGS.ADDRESS}:`)
    expect(screen.getByTestId("patient-details-banner-address-value")).toHaveTextContent(
      "55 Oak Street, OAK LANE, Leeds, LS1 1XX")

    // // Verify that the missing data message is not rendered
    expect(screen.queryByTestId("patient-detail-banner-incomplete")).not.toBeInTheDocument()

    // Confirm the banner has the correct styling
    expect(screen.getByTestId("patient-details-banner").className).not.toMatch(/patient-details-partial-data/)
  })

  it("renders partial patient details with missing data message when pds call fails", async () => {
    render(
      <MockPatientDetailsProvider patientDetails={{nhsNumber: "5900009890"}} patientFallback={true}>
        <PatientDetailsBanner />
      </MockPatientDetailsProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("patient-details-banner")).toBeInTheDocument()
    })

    // Minimum details returned is just NHS Number
    expect(screen.getByTestId("patient-details-banner-name")).toHaveTextContent(STRINGS.NOT_AVAILABLE)
    expect(screen.getByTestId("patient-details-banner-gender-value")).toHaveTextContent(`${STRINGS.NOT_AVAILABLE}`)
    expect(screen.getByTestId("patient-details-banner-nhsNumber-value")).toHaveTextContent("590 000 9890")
    expect(screen.getByTestId("patient-details-banner-dob-value")).toHaveTextContent(`${STRINGS.NOT_AVAILABLE}`)
    expect(screen.getByTestId("patient-details-banner-address-value")).toHaveTextContent(`${STRINGS.NOT_AVAILABLE}`)

    // The missing data message should be rendered.
    expect(screen.getByTestId("patient-detail-banner-incomplete")).toBeInTheDocument()
    expect(screen.getByTestId("patient-detail-banner-incomplete")).toHaveTextContent(STRINGS.MISSING_DATA)
  })

  // eslint-disable-next-line max-len
  it("does not render the missing data message when details are completed from prescription details after a pds failure", async () => {
    render(
      <MockPatientDetailsProvider
        patientDetails={{
          nhsNumber: "5900009890",
          givenName: ["William"],
          familyName: "Wolderton",
          gender: "male",
          dateOfBirth: "1988-11-01",
          address: ["55 Oak Street", "OAK LANE", "Leeds"],
          postcode: "LS1 1XX"
        }}
        patientFallback={true}>
        <PatientDetailsBanner />
      </MockPatientDetailsProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("patient-details-banner")).toBeInTheDocument()
    })

    expect(screen.queryByTestId("patient-detail-banner-incomplete")).not.toBeInTheDocument()
  })

  it("renders not available content for fields when pds record has missing data", async () => {
    const mockPatientDetails: PatientSummary = {
      nhsNumber: "5900009890",
      givenName: "n/a",
      familyName: "n/a",
      gender: "n/a",
      dateOfBirth: "n/a",
      address: "n/a",
      postcode: "n/a"
    }
    render(
      <MockPatientDetailsProvider patientDetails={mockPatientDetails} patientFallback={false}>
        <PatientDetailsBanner />
      </MockPatientDetailsProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId("patient-details-banner")).toBeInTheDocument()
    })

    expect(screen.getByTestId("patient-details-banner-name")).toHaveTextContent(STRINGS.NAME_NOT_ON_RECORD)
    expect(screen.getByTestId("patient-details-banner-gender-value")).toHaveTextContent(`${STRINGS.NOT_ON_RECORD}`)
    expect(screen.getByTestId("patient-details-banner-nhsNumber-value")).toHaveTextContent("590 000 9890")
    expect(screen.getByTestId("patient-details-banner-dob-value")).toHaveTextContent(`${STRINGS.NOT_ON_RECORD}`)
    expect(screen.getByTestId("patient-details-banner-address-value")).toHaveTextContent(`${STRINGS.NOT_ON_RECORD}`)

    // // Verify that the missing data message is not rendered
    expect(screen.queryByTestId("patient-detail-banner-incomplete")).not.toBeInTheDocument()

    // Confirm the banner has the correct styling
    expect(screen.getByTestId("patient-details-banner").className).not.toMatch(/patient-details-partial-data/)
  })

  it("renders patient details correctly when given name is missing from the pds record", async () => {
    const mockPatientDetails: PatientSummary = {
      nhsNumber: "5900009890",
      givenName: "n/a",
      familyName: "Wolderton",
      gender: "male",
      dateOfBirth: "01-Nov-1988",
      address: ["55 Oak Street", "OAK LANE", "Leeds"],
      postcode: "LS1 1XX"
    }
    render(
      <MockPatientDetailsProvider patientDetails={mockPatientDetails} patientFallback={false}>
        <PatientDetailsBanner />
      </MockPatientDetailsProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId("patient-details-banner")).toBeInTheDocument()
    })

    expect(screen.getByTestId("patient-details-banner-name")).toHaveTextContent(STRINGS.NAME_NOT_ON_RECORD)
  })

  it("renders patient details correctly when family name is missing from the pds record", async () => {
    const mockPatientDetails: PatientSummary = {
      nhsNumber: "5900009890",
      givenName: ["William"],
      familyName: "n/a",
      gender: "male",
      dateOfBirth: "01-Nov-1988",
      address: ["55 Oak Street", "OAK LANE", "Leeds"],
      postcode: "LS1 1XX"
    }
    render(
      <MockPatientDetailsProvider patientDetails={mockPatientDetails} patientFallback={false}>
        <PatientDetailsBanner />
      </MockPatientDetailsProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId("patient-details-banner")).toBeInTheDocument()
    })

    expect(screen.getByTestId("patient-details-banner-name")).toHaveTextContent(STRINGS.NAME_NOT_ON_RECORD)
  })

  it("renders patient details correctly when name is temporary", async () => {
    const mockPatientDetails: PatientSummary = {
      nhsNumber: "5900009890",
      givenName: ["William"],
      familyName: "Wolderton",
      nameUse: PatientNameUse.TEMP,
      gender: "male",
      dateOfBirth: "01-Nov-1988",
      address: ["55 Oak Street", "OAK LANE", "Leeds"],
      postcode: "LS1 1XX"
    }
    render(
      <MockPatientDetailsProvider patientDetails={mockPatientDetails} patientFallback={false}>
        <PatientDetailsBanner />
      </MockPatientDetailsProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId("patient-details-banner")).toBeInTheDocument()
    })

    expect(screen.getByTestId("patient-details-banner-name")).toHaveTextContent(
      `William WOLDERTON${STRINGS.TEMPORARY}`)
  })

  it("renders patient details correctly when address is missing from the pds record", async () => {
    const mockPatientDetails: PatientSummary = {
      nhsNumber: "5900009890",
      givenName: ["William"],
      familyName: "Wolderton",
      gender: "male",
      dateOfBirth: "01-Nov-1988",
      address: "n/a",
      postcode: "LS1 1XX"
    }
    render(
      <MockPatientDetailsProvider patientDetails={mockPatientDetails} patientFallback={false}>
        <PatientDetailsBanner />
      </MockPatientDetailsProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId("patient-details-banner")).toBeInTheDocument()
    })

    expect(screen.getByTestId("patient-details-banner-address-value")).toHaveTextContent("LS1 1XX")
  })

  it("renders patient details correctly when postcode is missing from the pds record", async () => {
    const mockPatientDetails: PatientSummary = {
      nhsNumber: "5900009890",
      givenName: ["William"],
      familyName: "Wolderton",
      gender: "male",
      dateOfBirth: "01-Nov-1988",
      address: ["55 Oak Street", "OAK LANE", "Leeds"],
      postcode: "n/a"
    }
    render(
      <MockPatientDetailsProvider patientDetails={mockPatientDetails} patientFallback={false}>
        <PatientDetailsBanner />
      </MockPatientDetailsProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId("patient-details-banner")).toBeInTheDocument()
    })

    expect(
      screen.getByTestId("patient-details-banner-address-value")).toHaveTextContent("55 Oak Street, OAK LANE, Leeds")
  })

  it("renders patient details correctly when address is temporary", async () => {
    const mockPatientDetails: PatientSummary = {
      nhsNumber: "5900009890",
      givenName: ["William"],
      familyName: "Wolderton",
      gender: "male",
      dateOfBirth: "01-Nov-1988",
      address: ["55 Oak Street", "OAK LANE", "Leeds"],
      postcode: "LS1 1XX",
      addressUse: PatientAddressUse.TEMP
    }
    render(
      <MockPatientDetailsProvider patientDetails={mockPatientDetails} patientFallback={false}>
        <PatientDetailsBanner />
      </MockPatientDetailsProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId("patient-details-banner")).toBeInTheDocument()
    })

    expect(screen.getByTestId("patient-details-banner-address-value")).toHaveTextContent(
      `55 Oak Street, OAK LANE, Leeds, LS1 1XX${STRINGS.TEMPORARY}`)
  })
})
