import {jest} from "@jest/globals"
import "@testing-library/jest-dom"
import {render, screen, waitFor} from "@testing-library/react"
import React from "react"
import {PatientDetails} from "@cpt-ui-common/common-types"
import {STRINGS} from "@/constants/ui-strings/PatientDetailsBannerStrings"

// Example patient data
const completeDetails = {
  nhsNumber: "5900009890",
  prefix: "Mr",
  suffix: "",
  given: "William",
  family: "Wolderton",
  gender: "male",
  dateOfBirth: "01-Nov-1988",
  address: {
    line1: "55 OAK STREET",
    line2: "OAK LANE",
    city: "Leeds",
    postcode: "LS1 1XX"
  }
}

const minimumDetails = {
  nhsNumber: "5900009890",
  prefix: "Mr",
  suffix: "",
  given: "William",
  family: "Wolderton",
  gender: null,
  dateOfBirth: null,
  address: null
}

jest.unstable_mockModule("@/context/AccessProvider", () => {
  interface AccessContextType {
    patientDetails: PatientDetails | null;
    setPatientDetails: React.Dispatch<React.SetStateAction<null | PatientDetails>>;
  }

  const AccessContext = React.createContext<AccessContextType>({
    patientDetails: null,
    setPatientDetails: () => {}
  })

  const AccessProvider = ({children}: { children: React.ReactNode }) => {
    const [patientDetails, setPatientDetails] = React.useState(null)
    const value = {patientDetails, setPatientDetails}
    return (
      <AccessContext.Provider value={value}>
        {children}
      </AccessContext.Provider>
    )
  }

  const useAccess = () => React.useContext(AccessContext)

  return {
    AccessContext,
    AccessProvider,
    useAccess
  }
})

import {AccessContext} from "@/context/AccessProvider"
import PatientDetailsBanner from "@/components/PatientDetailsBanner"

// Helper to render the component with a custom AccessProvider value
const renderWithAccess = (patientDetails: PatientDetails) => {
  return render(
    // @ts-expect-error The following value is sufficient for these tests. Fully defining the type would be excessive
    <AccessContext.Provider value={{patientDetails} as unknown}>
      <PatientDetailsBanner />
    </AccessContext.Provider>
  )
}

describe("PatientDetailsBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("does not render the banner when patientDetails is null", () => {
    renderWithAccess(null)
    expect(screen.queryByTestId("patient-details-banner")).toBeNull()
  })

  it("renders complete patient details correctly", async () => {
    renderWithAccess(completeDetails)
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
    renderWithAccess(minimumDetails)

    await waitFor(() => {
      expect(screen.getByTestId("patient-details-banner")).toBeInTheDocument()
    })

    // When details are missing, gender, date of birth, and address should show STRINGS.UNKNOWN.
    expect(
      screen.getByText(new RegExp(`${STRINGS.GENDER}:\\s*${STRINGS.UNKNOWN}`, "i"))
    ).toBeInTheDocument()
    expect(
      screen.getByText(new RegExp(`${STRINGS.DOB}:\\s*${STRINGS.UNKNOWN}`, "i"))
    ).toBeInTheDocument()
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
    const partialAddressDetails = {
      nhsNumber: "5900009890",
      prefix: "Mr",
      suffix: "",
      given: "William",
      family: "Wolderton",
      gender: "male",
      dateOfBirth: "01-Nov-1988",
      // Only line1 and city are provided; line2 and postcode are missing.
      address: {
        line1: "55 Oak Street",
        // line2 is omitted
        city: "Leeds"
        // postcode is omitted
      }
    }

    renderWithAccess(partialAddressDetails)

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
})
