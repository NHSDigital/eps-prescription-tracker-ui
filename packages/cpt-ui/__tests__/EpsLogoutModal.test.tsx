import "@testing-library/jest-dom"
import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"
import {EpsLogoutModal} from "@/components/EpsLogoutModal"
import {EpsLogoutModalStrings} from "@/constants/ui-strings/EpsLogoutModalStrings"

// Mock the EpsModal component
jest.mock("@/components/EpsModal", () => {
  return {
    EpsModal: ({
      children,
      isOpen,
      ariaLabelledBy
    }: {
      children: React.ReactNode
      isOpen: boolean
      ariaLabelledBy?: string
    }) =>
      isOpen ? (
        <div
          data-testid="eps-modal"
          aria-labelledby={ariaLabelledBy}
        >
          {children}
        </div>
      ) : null
  }
})

// Mock the Button component
jest.mock("@/components/ReactRouterButton", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className
  }: {
    children: React.ReactNode
    onClick: () => void
    disabled?: boolean
    className?: string
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid={children === EpsLogoutModalStrings.CONFIRM_BUTTON_TEXT ? "confirm-button" : "cancel-button"}
    >
      {children}
    </button>
  )
}))

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onConfirm: jest.fn(),
  buttonDisabled: false
}

describe("EpsLogoutModal", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Modal rendering", () => {
    it("renders the modal when isOpen is true", () => {
      render(<EpsLogoutModal {...defaultProps} />)

      expect(screen.getByTestId("eps-modal")).toBeInTheDocument()
      expect(screen.getByText(EpsLogoutModalStrings.TITLE)).toBeInTheDocument()
      expect(screen.getByText(EpsLogoutModalStrings.CAPTION)).toBeInTheDocument()
    })

    it("does not render the modal when isOpen is false", () => {
      render(<EpsLogoutModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByTestId("eps-modal")).not.toBeInTheDocument()
    })

    it("sets correct aria-labelledby attribute", () => {
      render(<EpsLogoutModal {...defaultProps} />)

      const modal = screen.getByTestId("eps-modal")
      expect(modal).toHaveAttribute("aria-labelledby", "logout-modal-title")
    })

    it("has correct heading id that matches aria-labelledby", () => {
      render(<EpsLogoutModal {...defaultProps} />)

      const heading = screen.getByRole("heading", {name: EpsLogoutModalStrings.TITLE})
      expect(heading).toHaveAttribute("id", "logout-modal-title")
    })
  })

  describe("Button interactions", () => {
    it("renders both action buttons with correct text", () => {
      render(<EpsLogoutModal {...defaultProps} />)

      expect(screen.getByTestId("confirm-button")).toHaveTextContent(EpsLogoutModalStrings.CONFIRM_BUTTON_TEXT)
      expect(screen.getByTestId("cancel-button")).toHaveTextContent(EpsLogoutModalStrings.CANCEL_BUTTON_TEXT)
    })

    it("calls onConfirm when confirm button is clicked", async () => {
      const mockOnConfirm = jest.fn()
      const user = userEvent.setup()

      render(<EpsLogoutModal {...defaultProps} onConfirm={mockOnConfirm} />)

      await user.click(screen.getByTestId("confirm-button"))
      expect(mockOnConfirm).toHaveBeenCalledTimes(1)
    })

    it("calls onClose when cancel button is clicked", async () => {
      const mockOnClose = jest.fn()
      const user = userEvent.setup()

      render(<EpsLogoutModal {...defaultProps} onClose={mockOnClose} />)
      await user.click(screen.getByTestId("cancel-button"))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it("disables confirm button when buttonDisabled is true", () => {
      render(<EpsLogoutModal {...defaultProps} buttonDisabled={true} />)
      expect(screen.getByTestId("confirm-button")).toBeDisabled()
    })

    it("does not disable cancel button when buttonDisabled is true", () => {
      render(<EpsLogoutModal {...defaultProps} buttonDisabled={true} />)
      expect(screen.getByTestId("cancel-button")).not.toBeDisabled()
    })

    it("enables confirm button when buttonDisabled is false", () => {
      render(<EpsLogoutModal {...defaultProps} buttonDisabled={false} />)
      expect(screen.getByTestId("confirm-button")).not.toBeDisabled()
    })

    it("still allows cancel when buttonDisabled is true", async () => {
      const mockOnClose = jest.fn()
      const user = userEvent.setup()

      render(<EpsLogoutModal {...defaultProps} onClose={mockOnClose} buttonDisabled={true} />)
      await user.click(screen.getByTestId("cancel-button"))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe("Styling and CSS classes", () => {
    it("applies correct CSS classes to buttons", () => {
      render(<EpsLogoutModal {...defaultProps} />)

      const confirmButton = screen.getByTestId("confirm-button")
      const cancelButton = screen.getByTestId("cancel-button")

      expect(confirmButton).toHaveClass("nhsuk-button", "eps-modal-button")
      expect(cancelButton).toHaveClass("nhsuk-button", "nhsuk-button--secondary", "eps-modal-button")
    })

    it("applies correct styling to the modal title", () => {
      render(<EpsLogoutModal {...defaultProps} />)

      const heading = screen.getByRole("heading", {name: EpsLogoutModalStrings.TITLE})
      expect(heading).toHaveStyle({paddingTop: "1rem"})
    })
  })

  describe("Content validation", () => {
    it("displays all expected text content from strings constants", () => {
      render(<EpsLogoutModal {...defaultProps} />)

      expect(screen.getByText(EpsLogoutModalStrings.TITLE)).toBeInTheDocument()
      expect(screen.getByText(EpsLogoutModalStrings.CAPTION)).toBeInTheDocument()
      expect(screen.getByText(EpsLogoutModalStrings.CONFIRM_BUTTON_TEXT)).toBeInTheDocument()
      expect(screen.getByText(EpsLogoutModalStrings.CANCEL_BUTTON_TEXT)).toBeInTheDocument()
    })
  })
})
