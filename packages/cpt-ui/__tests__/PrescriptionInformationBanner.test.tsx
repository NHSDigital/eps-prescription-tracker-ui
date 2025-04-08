import {jest} from "@jest/globals"
import React from "react"
import "@testing-library/jest-dom"
import {render, screen, fireEvent} from "@testing-library/react"

import PrescriptionInformationBanner from "@/components/PrescriptionInformationBanner"
import {STRINGS} from "@/constants/ui-strings/PrescriptionInformationBannerStrings"
import {PrescriptionInformationContext, PrescriptionInformation} from "@/context/PrescriptionInformationProvider"

const renderWithContext = (prescriptionInformation: PrescriptionInformation | undefined) => {
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
    const data = {
      id: "C0C757-A83008-C2D93O",
      issueDate: "18-Jan-2024",
      status: "All items dispensed",
      type: "Acute"
    } // as const or as any if needed

    renderWithContext(data)

    const banner = screen.getByTestId("prescription-information-banner")
    expect(banner).toBeInTheDocument()
    expect(banner.querySelector("#prescription-id")).toHaveTextContent(`${STRINGS.PRESCRIPTION_ID}: ${data.id}`)
    expect(banner.querySelector("#summary-issue-date")).toHaveTextContent(`${STRINGS.ISSUE_DATE}: ${data.issueDate}`)
    expect(banner.querySelector("#summary-status")).toHaveTextContent(`${STRINGS.STATUS}: ${data.status}`)
    expect(banner.querySelector("#summary-type")).toHaveTextContent(`${STRINGS.TYPE}: ${data.type}`)
  })

  it("renders eRD prescription information with repeat and days supply", () => {
    const data = {
      id: "EC5ACF-A83008-733FD3",
      issueDate: "22-Jan-2025",
      status: "All items dispensed",
      type: "eRD",
      isERD: true,
      instanceNumber: 2,
      maxRepeats: 6,
      daysSupply: 28
    }
    renderWithContext(data)
    expect(screen.getByTestId("prescription-information-banner")).toBeInTheDocument()
    expect(
      screen.getByText(
        `${STRINGS.TYPE}: ${data.type} ${data.instanceNumber} of ${data.maxRepeats}`
      )
    ).toBeInTheDocument()
    expect(screen.getByText(`${STRINGS.DAYS_SUPPLY}: ${data.daysSupply} days`)).toBeInTheDocument()
  })

  it("copies the prescription ID to clipboard when copy button is clicked", async () => {
    const data = {
      id: "COPYME123",
      issueDate: "01-Apr-2024",
      status: "Pending",
      type: "Repeat"
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

    expect(mockWriteText).toHaveBeenCalledWith(data.id)
  })
})
