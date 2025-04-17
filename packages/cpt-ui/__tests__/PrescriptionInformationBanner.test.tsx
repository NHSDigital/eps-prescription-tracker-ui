import {jest} from "@jest/globals"
import React from "react"
import "@testing-library/jest-dom"
import {render, screen, fireEvent} from "@testing-library/react"

import {mockPrescriptionDetailsResponse} from "../__mocks__/MockPrescriptionDetailsResponse"
import {PrescriptionDetailsResponse} from "@cpt-ui-common/common-types"

import PrescriptionInformationBanner from "@/components/PrescriptionInformationBanner"

import {STRINGS} from "@/constants/ui-strings/PrescriptionInformationBannerStrings"
import {PrescriptionInformationContext} from "@/context/PrescriptionInformationProvider"
import {getStatusTagColour, getStatusDisplayText} from "@/helpers/prescriptionFormatters"

const renderWithContext = (prescriptionInformation: PrescriptionDetailsResponse | undefined) => {
  return render(
    <PrescriptionInformationContext.Provider
      value={{
        prescriptionInformation,
        setPrescriptionInformation: jest.fn(),
        clear: jest.fn()
      }}
    >
      <PrescriptionInformationBanner />
    </PrescriptionInformationContext.Provider>
  )
}

describe("PrescriptionInformationBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("does not render when prescription information is undefined", () => {
    renderWithContext(undefined)
    expect(screen.queryByTestId("prescription-information-banner")).not.toBeInTheDocument()
  })

  it("renders Acute prescription information correctly", () => {
    const statusCode = "0006" // All items dispensed
    const data: PrescriptionDetailsResponse = {
      ...mockPrescriptionDetailsResponse,
      prescriptionId: "C0C757-A83008-C2D93O",
      issueDate: "18-Jan-2024",
      statusCode,
      typeCode: "Acute"
    }

    renderWithContext(data)

    const banner = screen.getByTestId("prescription-information-banner")
    expect(banner).toBeInTheDocument()

    expect(banner.querySelector("#prescription-id")).toHaveTextContent(`${STRINGS.PRESCRIPTION_ID}:`)
    expect(banner.querySelector("#copyText")).toHaveTextContent(data.prescriptionId)
    expect(banner.querySelector("#summary-issue-date"))
      .toHaveTextContent(`${STRINGS.ISSUE_DATE}: ${data.issueDate}`)
    expect(banner.querySelector("#summary-status"))
      .toHaveTextContent(`${STRINGS.STATUS}: ${getStatusDisplayText(statusCode)}`)
    expect(banner.querySelector("#summary-type"))
      .toHaveTextContent(`${STRINGS.TYPE}: ${data.typeCode}`)

    const tag = screen.getByText(getStatusDisplayText(statusCode))
    expect(tag).toHaveClass(`nhsuk-tag--${getStatusTagColour(statusCode)}`)
  })

  it("renders eRD prescription information with repeat and days supply", () => {
    const statusCode = "0006" // All items dispensed
    const data: PrescriptionDetailsResponse = {
      ...mockPrescriptionDetailsResponse,
      prescriptionId: "EC5ACF-A83008-733FD3",
      issueDate: "18-Jan-2024",
      statusCode,
      typeCode: "eRD",
      isERD: true,
      instanceNumber: 2,
      maxRepeats: 6,
      daysSupply: "28"
    }

    renderWithContext(data)

    expect(screen.getByTestId("prescription-information-banner")).toBeInTheDocument()
    expect(
      screen.getByText(
        `${STRINGS.TYPE}: ${data.typeCode} ${data.instanceNumber} of ${data.maxRepeats}`
      )
    ).toBeInTheDocument()
    expect(screen.getByText(`${STRINGS.DAYS_SUPPLY}: ${data.daysSupply} days`)).toBeInTheDocument()

    const tag = screen.getByText(getStatusDisplayText(statusCode))
    expect(tag).toHaveClass(`nhsuk-tag--${getStatusTagColour(statusCode)}`)
  })

  it("copies the prescription ID to clipboard when copy button is clicked", async () => {
    const data: PrescriptionDetailsResponse = {
      ...mockPrescriptionDetailsResponse,
      prescriptionId: "COPYME123",
      issueDate: "01-Apr-2024",
      statusCode: "0002", // Downloaded by dispenser
      typeCode: "Repeat"
    }

    const mockWriteText = jest.fn()
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText
      }
    })

    renderWithContext(data)

    const copyButton = screen.getByRole("button", {
      name: STRINGS.COPY_BUTTON_ARIA_LABEL
    })
    fireEvent.click(copyButton)

    expect(mockWriteText).toHaveBeenCalledWith(data.prescriptionId)
  })

  it("uses correct tag colour for prescription status", () => {
    const statusCode = "0006" // All items dispensed
    const data: PrescriptionDetailsResponse = {
      ...mockPrescriptionDetailsResponse,
      prescriptionId: "TAGCOLOURTEST",
      issueDate: "01-Apr-2024",
      statusCode,
      typeCode: "Acute"
    }

    renderWithContext(data)

    const tag = screen.getByText(getStatusDisplayText(statusCode))
    expect(tag).toBeInTheDocument()
    expect(tag).toHaveClass(`nhsuk-tag--${getStatusTagColour(statusCode)}`)
  })
})
