import React from "react"
import {render, screen} from "@testing-library/react"
import "@testing-library/jest-dom"

// Mock the constants
jest.mock("@/constants/ui-strings/MessageHistoryCardStrings", () => ({
  STRINGS: {
    HISTORY_HEADER: "History",
    ORGANISATION: "Organisation:",
    NEW_STATUS: "New status:",
    ODS_TEXT: "ODS:",
    NO_ORG_NAME: "Organisation name not available",
    DISPENSE_NOTIFICATION_INFO: "Dispense notification information",
    DISPENSE_NOTIFICATION_ID: "Dispense notification ID:",
    PRESCRIPTION_ITEMS: "Prescription items:",
    QUANTITY: "Quantity:",
    INSTRUCTIONS: "Instructions:"
  }
}))

// Mock the helper functions
jest.mock("@/helpers/statusMetadata", () => ({
  getStatusDisplayText: jest.fn(() => "Mocked Status"),
  getStatusTagColour: jest.fn(() => "blue"),
  getItemStatusTagColour: jest.fn(() => "green"),
  getItemStatusDisplayText: jest.fn(() => "Mocked Item Status"),
  getMessageHistoryHeader: jest.fn(() => "Mocked Header")
}))

jest.mock("@/helpers/formatters", () => ({
  formatMessageDateTime: jest.fn(() => "Mocked Date")
}))

import {MessageHistoryCard} from "@/components/prescriptionDetails/MessageHistoryCard"
import {MessageHistory} from "@cpt-ui-common/common-types"

describe("MessageHistoryCard", () => {
  const simpleMessage: MessageHistory = {
    messageCode: "Test message",
    sentDateTime: "2025-01-01",
    organisationName: "Test Org",
    organisationODS: "ABC123"
  }

  it("renders nothing when messageHistory is empty", () => {
    const {container: emptyContainer} = render(<MessageHistoryCard messageHistory={[]} />)
    expect(emptyContainer).toBeEmptyDOMElement()
  })

  it("renders basic message history", () => {
    render(<MessageHistoryCard messageHistory={[simpleMessage]} />)

    expect(screen.getByText("History")).toBeInTheDocument()
    expect(screen.getByTestId("message-history-timeline")).toBeInTheDocument()
    expect(screen.getByTestId("prescription-message")).toBeInTheDocument()
  })

  it("shows organisation name when provided", () => {
    render(<MessageHistoryCard messageHistory={[simpleMessage]} />)

    expect(screen.getByText(/Test Org/)).toBeInTheDocument()
    expect(screen.getByText(/ABC123/)).toBeInTheDocument()
  })

  it("shows fallback text when organisation name is missing", () => {
    const messageWithoutOrgName = {
      ...simpleMessage,
      organisationName: ""
    }

    render(<MessageHistoryCard messageHistory={[messageWithoutOrgName]} />)

    expect(screen.getByTestId("no-org-name-message")).toBeInTheDocument()
    expect(screen.getByText(/Organisation name not available/)).toBeInTheDocument()
  })

  it("shows status tag when newStatusCode is provided", () => {
    const messageWithStatus = {
      ...simpleMessage,
      newStatusCode: "0001"
    }

    render(<MessageHistoryCard messageHistory={[messageWithStatus]} />)

    expect(screen.getByText(/New status:/)).toBeInTheDocument()
    expect(screen.getByTestId("new-status-code-tag")).toBeInTheDocument()
  })

  it("hides status tag when newStatusCode is missing", () => {
    render(<MessageHistoryCard messageHistory={[simpleMessage]} />)

    expect(screen.queryByText(/New status:/)).not.toBeInTheDocument()
    expect(screen.queryByTestId("new-status-code-tag")).not.toBeInTheDocument()
  })

  it("shows dispense notification when present", () => {
    const messageWithDispense = {
      ...simpleMessage,
      dispenseNotification: [{
        id: "test-id",
        medicationName: "Test Med",
        quantity: "10",
        dosageInstruction: "Once daily",
        statusCode: "DISPENSED"
      }]
    }

    render(<MessageHistoryCard messageHistory={[messageWithDispense]} />)

    expect(screen.getByText("Dispense notification information")).toBeInTheDocument()
    expect(screen.getByTestId("message-history-dropdown")).toBeInTheDocument()
  })

  it("hides dispense notification when not present", () => {
    render(<MessageHistoryCard messageHistory={[simpleMessage]} />)

    expect(screen.queryByText("Dispense notification information")).not.toBeInTheDocument()
    expect(screen.queryByTestId("message-history-dropdown")).not.toBeInTheDocument()
  })

  it("hides dispense notification when array is empty", () => {
    const messageWithEmptyDispense = {
      ...simpleMessage,
      dispenseNotification: []
    }

    render(<MessageHistoryCard messageHistory={[messageWithEmptyDispense]} />)

    expect(screen.queryByText("Dispense notification information")).not.toBeInTheDocument()
  })

  it("renders multiple messages", () => {
    const messages = [simpleMessage, {...simpleMessage, organisationODS: "DEF456"}]

    render(<MessageHistoryCard messageHistory={messages} />)

    expect(screen.getAllByTestId("prescription-message")).toHaveLength(2)
  })

  it("renders dispense notification items details", () => {
    const messageWithDispenseItems = {
      ...simpleMessage,
      dispenseNotification: [
        {
          id: "item-1",
          medicationName: "Medicine A",
          quantity: "30 tablets",
          dosageInstruction: "Take daily",
          statusCode: "DISPENSED"
        },
        {
          id: "item-2",
          medicationName: "Medicine B",
          quantity: "60 capsules",
          dosageInstruction: "Take twice daily",
          statusCode: "PARTIAL"
        }
      ]
    }

    render(<MessageHistoryCard messageHistory={[messageWithDispenseItems]} />)

    expect(screen.getByText(/item-1/)).toBeInTheDocument()
  })

})
