import React from "react"
import {render, screen} from "@testing-library/react"
import "@testing-library/jest-dom"

export const STRINGS = {
  HISTORY_HEADER: "History",
  ORGANISATION: "Organisation:",
  NEW_STATUS: "New status:",
  ODS_TEXT: "ODS:",
  DISPENSE_NOTIFICATION_INFO: "Dispense notification information",
  DISPENSE_NOTIFICATION_ID: "Dispense notification id:",
  PRESCRIPTION_ITEMS: "Prescription items:",
  QUANTITY: "Quantity:",
  INSTRUCTIONS: "Instructions:"
}

jest.mock("@/constants/ui-strings/MessageHistoryCardStrings")
jest.mock("@/helpers/statusMetadata", () => ({
  getStatusDisplayText: (code: string) => `Mock status ${code}`,
  getStatusTagColour: () => "blue",
  getItemStatusTagColour: () => "green",
  getItemStatusDisplayText: (code: string) => `Item status ${code}`,
  getMessageHistoryHeader: (text: string) => `Mapped: ${text}`
}))

import {MessageHistoryCard} from "@/components/prescriptionDetails/MessageHistoryCard"
import {MessageHistory} from "@cpt-ui-common/common-types"

describe("MessageHistoryCard", () => {
  const baseMessages: Array<MessageHistory> = [
    {
      messageCode: "Dispense claim successful",
      sentDateTime: "23-Feb-2025 13:35:33",
      organisationName: "Test Pharmacy",
      organisationODS: "XYZ123",
      newStatusCode: "0006",
      dispenseNotification: [
        {
          id: "abc123",
          medicationName: "Medication 1",
          quantity: "10 tablets",
          dosageInstruction: "Take once daily"
        },
        {
          id: "abc123",
          medicationName: "Medication 2",
          quantity: "20 tablets",
          dosageInstruction: "Take twice daily"
        }
      ]
    },
    {
      messageCode: "Release Request successful",
      sentDateTime: "22-Feb-2025 10:15:00",
      organisationName: "LongNamePharmacyWhichShouldWrapProperlyWithoutBreakingUI",
      organisationODS: "LONG123",
      newStatusCode: "0001"
    },
    {
      messageCode: "Prescription upload successful",
      sentDateTime: "21-Feb-2025 09:00:00",
      organisationName: "",
      organisationODS: "EMPTY123",
      newStatusCode: undefined
    }
  ]

  it("renders correctly with full message history", () => {
    render(<MessageHistoryCard messageHistory={baseMessages} />)

    // Check main header
    expect(screen.getByText("History")).toBeInTheDocument()

    // Timeline items
    expect(screen.getByText(/Mapped: Dispense claim successful/)).toBeInTheDocument()
    expect(screen.getByText(/Mapped: Release Request successful/)).toBeInTheDocument()
    expect(screen.getByText(/Mapped: Prescription upload successful/)).toBeInTheDocument()

    // Organisation names and fallback text
    expect(screen.getByText(/Test Pharmacy/)).toBeInTheDocument()
    expect(screen.getByText(/LongNamePharmacyWhichShouldWrapProperlyWithoutBreakingUI/)).toBeInTheDocument()
    expect(screen.getByText(/Organisation name not available/)).toBeInTheDocument()

    // New status tags
    expect(screen.getAllByText(/Mock status/)).toHaveLength(2)

    // Dispense Notification Details
    expect(screen.getByText("Dispense notification information")).toBeInTheDocument()
    const elements = screen.getAllByText((_content, element) => {
      const textContent = element?.textContent || ""
      return textContent.includes("Dispense notification ID:") &&
             textContent.includes("abc123")
    })
    expect(elements.length).toBeGreaterThan(0)
    expect(screen.getByText("Prescription items:")).toBeInTheDocument()

    // Items inside the dispense notification
    expect(screen.getByText((content) => content.includes("Medication 1"))).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes("Medication 2"))).toBeInTheDocument()
    expect(screen.getAllByText(/Item status/)).toHaveLength(2)

    // Quantity and instructions (multiple times)
    expect(screen.getAllByText(/Quantity/)).toHaveLength(2)
    expect(screen.getByText(/10 tablets/)).toBeInTheDocument()
    expect(screen.getByText(/20 tablets/)).toBeInTheDocument()

    /* Temporary remove dosage instructions from card until spine fix
    expect(screen.getAllByText(/Instructions/)).toHaveLength(2)
    expect(screen.getByText(/Take once daily/)).toBeInTheDocument()
    expect(screen.getByText(/Take twice daily/)).toBeInTheDocument()
    */
  })

  it("renders nothing if empty messageHistory", () => {
    const {container} = render(<MessageHistoryCard messageHistory={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders fallback org name when organisationName is missing", () => {
    render(
      <MessageHistoryCard messageHistory={[{
        messageCode: "Some status",
        sentDateTime: "01-Jan-2025",
        organisationName: "",
        organisationODS: "XYZ123"
      }]} />
    )
    expect(screen.getByText(/Organisation name not available/)).toBeInTheDocument()
  })

  it("does not render new status tag if newStatusCode is missing", () => {
    render(
      <MessageHistoryCard messageHistory={[{
        messageCode: "No Status",
        sentDateTime: "01-Jan-2025",
        organisationName: "Test",
        organisationODS: "ABC123"
      }]} />
    )
    expect(screen.queryByText(/New status:/)).not.toBeInTheDocument()
  })

  it("does not render dispense notification if status !== '0006'", () => {
    render(
      <MessageHistoryCard messageHistory={[{
        messageCode: "Not Dispensed",
        sentDateTime: "01-Jan-2025",
        organisationName: "Test",
        organisationODS: "ABC123",
        newStatusCode: "0002",
        dispenseNotification: [{
          id: "abc",
          medicationName: "Something",
          quantity: "1",
          dosageInstruction: "Take it"
        }]
      }]} />
    )
    expect(screen.queryByText(/Dispense notification information/)).not.toBeInTheDocument()
  })

  it("does not render dispense notification if list is empty", () => {
    render(
      <MessageHistoryCard messageHistory={[{
        messageCode: "Empty Notif",
        sentDateTime: "01-Jan-2025",
        organisationName: "Test",
        organisationODS: "ABC123",
        newStatusCode: "0006",
        dispenseNotification: []
      }]} />
    )
    expect(screen.queryByText(/Dispense notification information/)).not.toBeInTheDocument()
  })
})
