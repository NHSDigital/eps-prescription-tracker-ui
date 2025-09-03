import React from "react"
import {render, screen} from "@testing-library/react"
import "@testing-library/jest-dom"

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
    orgName: "Test Org",
    orgODS: "ABC123",
    newStatusCode: "0001"
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
      orgName: ""
    }

    render(<MessageHistoryCard messageHistory={[messageWithoutOrgName]} />)

    expect(screen.getByTestId("no-org-name-message")).toBeInTheDocument()
    expect(screen.getByText(/Organisation name not available/)).toBeInTheDocument()
  })

  it("shows status tag", () => {
    render(<MessageHistoryCard messageHistory={[simpleMessage]} />)

    expect(screen.getByText(/New status:/)).toBeInTheDocument()
    expect(screen.getByTestId("new-status-code-tag")).toBeInTheDocument()
  })

  it("shows dispense notification when present", () => {
    const messageWithDispense = {
      ...simpleMessage,
      dispenseNotificationItems: [{
        statusCode: "0001",
        components: [{
          medicationName: "Test Med",
          quantity: "10",
          dosageInstruction: "Once daily"
        }]
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
      dispenseNotificationItems: []
    }

    render(<MessageHistoryCard messageHistory={[messageWithEmptyDispense]} />)

    expect(screen.queryByText("Dispense notification information")).not.toBeInTheDocument()
  })

  it("renders multiple messages", () => {
    const messages = [simpleMessage, {...simpleMessage, orgODS: "DEF456"}]

    render(<MessageHistoryCard messageHistory={messages} />)

    expect(screen.getAllByTestId("prescription-message")).toHaveLength(2)
  })

  it("renders dispense notification items details", () => {
    const messageWithDispenseItems = {
      ...simpleMessage,
      dispenseNotificationItems: [
        {
          statusCode: "0001",
          components: [{
            medicationName: "Medicine A",
            quantity: "30 tablets",
            dosageInstruction: "Take daily"
          }]
        },
        {
          statusCode: "0003",
          components: [{
            medicationName: "Medicine B",
            quantity: "60 capsules",
            dosageInstruction: "Take twice daily"
          }]
        }
      ]
    }

    render(<MessageHistoryCard messageHistory={[messageWithDispenseItems]} />)

    expect(screen.getByText(/Medicine A/)).toBeInTheDocument()
    expect(screen.getByText(/Medicine B/)).toBeInTheDocument()
  })
})
