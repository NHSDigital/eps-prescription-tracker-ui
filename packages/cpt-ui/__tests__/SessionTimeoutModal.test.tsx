import "@testing-library/jest-dom"
import {
  render,
  screen,
  waitFor,
  act
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"
import {SessionTimeoutModal} from "@/components/SessionTimeoutModal"
import {SESSION_TIMEOUT_MODAL_STRINGS} from "@/constants/ui-strings/SessionTimeoutModalStrings"

// Mock useAuth
const mockSetSessionTimeoutModalInfo = jest.fn()
const mockAuthValue = {
  sessionTimeoutModalInfo: {
    showModal: false,
    timeLeft: 0,
    action: undefined as "extending" | "loggingOut" | undefined,
    buttonDisabled: false
  },
  setSessionTimeoutModalInfo: mockSetSessionTimeoutModalInfo
}

jest.mock("@/context/AuthProvider", () => ({
  useAuth: () => mockAuthValue
}))

// Mock logger
jest.mock("@/helpers/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}))

// Mock the EpsModal component
jest.mock("@/components/EpsModal", () => {
  return {
    EpsModal: ({
      children,
      isOpen,
      ariaLabelledBy,
      ariaDescribedBy
    }: {
      children: React.ReactNode
      isOpen: boolean
      ariaLabelledBy?: string
      ariaDescribedBy?: string
    }) =>
      isOpen ? (
        <div
          data-testid="eps-modal"
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
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
    className,
    "data-testid": testId
  }: {
    children: React.ReactNode
    onClick: () => void
    disabled?: boolean
    className?: string
    "data-testid"?: string
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid={testId}
    >
      {children}
    </button>
  )
}))

const defaultProps = {
  isOpen: true,
  timeLeft: 120,
  onStayLoggedIn: jest.fn(),
  onLogOut: jest.fn(),
  onTimeOut: jest.fn(),
  buttonDisabledState: false
}

describe("SessionTimeoutModal", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    // Reset auth mock to defaults
    mockAuthValue.sessionTimeoutModalInfo = {
      showModal: false,
      timeLeft: 0,
      action: undefined,
      buttonDisabled: false
    }
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe("Modal rendering and basic functionality", () => {
    it("renders the modal when isOpen is true", () => {
      render(<SessionTimeoutModal {...defaultProps} />)
      expect(screen.getByTestId("session-timeout-modal")).toBeInTheDocument()
      expect(screen.getByText(SESSION_TIMEOUT_MODAL_STRINGS.TITLE)).toBeInTheDocument()
    })

    it("does not render the modal when isOpen is false", () => {
      render(<SessionTimeoutModal {...defaultProps} isOpen={false} />)
      expect(screen.queryByTestId("session-timeout-modal")).not.toBeInTheDocument()
    })

    it("displays the correct time left", () => {
      render(<SessionTimeoutModal {...defaultProps} timeLeft={45} />)
      expect(screen.getByText("For your security, we will log you out in:", {exact: false})).toBeInTheDocument()
      expect(screen.getByText("45")).toBeInTheDocument()
    })

    it("renders both action buttons", () => {
      render(<SessionTimeoutModal {...defaultProps} />)
      expect(screen.getByTestId("stay-logged-in-button")).toBeInTheDocument()
      expect(screen.getByTestId("logout-button")).toBeInTheDocument()
    })
  })

  describe("Focus management", () => {
    it("focuses the stay logged in button when modal opens", async () => {
      render(<SessionTimeoutModal {...defaultProps} />)

      act(() => {
        jest.advanceTimersByTime(100)
      })

      await waitFor(() => {
        expect(screen.getByTestId("stay-logged-in-button")).toHaveFocus()
      })
    })

    it("does not focus when modal is closed", () => {
      render(<SessionTimeoutModal {...defaultProps} isOpen={false} />)

      act(() => {
        jest.advanceTimersByTime(100)
      })

      // No element should be focused since modal is closed
      expect(document.activeElement).toBe(document.body)
    })
  })

  describe("Button interactions", () => {
    it("calls onStayLoggedIn when stay logged in button is clicked", async () => {
      const mockStayLoggedIn = jest.fn()
      const user = userEvent.setup({advanceTimers: jest.advanceTimersByTime})

      render(
        <SessionTimeoutModal
          {...defaultProps}
          onStayLoggedIn={mockStayLoggedIn}
        />
      )

      await user.click(screen.getByTestId("stay-logged-in-button"))
      expect(mockStayLoggedIn).toHaveBeenCalledTimes(1)
    })

    it("calls onLogOut when logout button is clicked", async () => {
      const mockLogOut = jest.fn()
      const user = userEvent.setup({advanceTimers: jest.advanceTimersByTime})

      render(<SessionTimeoutModal {...defaultProps} onLogOut={mockLogOut} />)

      await user.click(screen.getByTestId("logout-button"))
      expect(mockLogOut).toHaveBeenCalledTimes(1)
    })

    it("disables both buttons when buttonDisabledState is true", () => {
      render(<SessionTimeoutModal {...defaultProps} buttonDisabledState={true} />)
      expect(screen.getByTestId("stay-logged-in-button")).toBeDisabled()
      expect(screen.getByTestId("logout-button")).toBeDisabled()
    })

    it("enables both buttons when buttonDisabledState is false", () => {
      render(<SessionTimeoutModal {...defaultProps} buttonDisabledState={false} />)
      expect(screen.getByTestId("stay-logged-in-button")).not.toBeDisabled()
      expect(screen.getByTestId("logout-button")).not.toBeDisabled()
    })

    it("shows 'Logging out...' text when auth action is loggingOut", () => {
      mockAuthValue.sessionTimeoutModalInfo = {
        ...mockAuthValue.sessionTimeoutModalInfo,
        action: "loggingOut"
      }
      render(<SessionTimeoutModal {...defaultProps} />)
      expect(screen.getByText("Logging out...")).toBeInTheDocument()
    })

    it("shows normal log out text when auth action is not loggingOut", () => {
      render(<SessionTimeoutModal {...defaultProps} />)
      expect(screen.getByText(SESSION_TIMEOUT_MODAL_STRINGS.LOG_OUT)).toBeInTheDocument()
    })
  })

  describe("Keyboard navigation", () => {
    it("calls onStayLoggedIn when escape key is pressed", () => {
      const mockStayLoggedIn = jest.fn()

      render(
        <SessionTimeoutModal
          {...defaultProps}
          onStayLoggedIn={mockStayLoggedIn}
        />
      )

      const buttonGroup = screen.getByRole("button", {name: SESSION_TIMEOUT_MODAL_STRINGS.STAY_LOGGED_IN})
        .closest(".eps-modal-button-group")

      // Simulate escape key press directly on the button group
      if (buttonGroup) {
        const escapeEvent = new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true
        })
        buttonGroup.dispatchEvent(escapeEvent)
      }

      expect(mockStayLoggedIn).toHaveBeenCalledTimes(1)
    })

    it("prevents default behavior on escape key", async () => {
      const mockPreventDefault = jest.fn()
      const mockStopPropagation = jest.fn()

      render(<SessionTimeoutModal {...defaultProps} />)

      const buttonGroup = screen.getByRole("button", {name: SESSION_TIMEOUT_MODAL_STRINGS.STAY_LOGGED_IN})
        .closest(".eps-modal-button-group")

      if (buttonGroup) {
        // Simulate keydown event directly
        const event = new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true
        })

        // Mock preventDefault and stopPropagation
        event.preventDefault = mockPreventDefault
        event.stopPropagation = mockStopPropagation

        buttonGroup.dispatchEvent(event)
      }

      expect(mockPreventDefault).toHaveBeenCalled()
      expect(mockStopPropagation).toHaveBeenCalled()
    })
  })

  describe("Countdown timer", () => {
    it("starts countdown when modal opens with time left", () => {
      render(<SessionTimeoutModal {...defaultProps} isOpen={true} timeLeft={120000} />)

      // Initial time should be set (120000ms = 120s)
      expect(mockSetSessionTimeoutModalInfo).toHaveBeenCalled()
    })

    it("decrements countdown every second", () => {
      render(<SessionTimeoutModal {...defaultProps} isOpen={true} timeLeft={5000} />)

      mockSetSessionTimeoutModalInfo.mockClear()

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      // Should have called setSessionTimeoutModalInfo to update timeLeft
      expect(mockSetSessionTimeoutModalInfo).toHaveBeenCalled()
    })

    it("calls onTimeOut when countdown reaches 0", () => {
      const mockOnTimeOut = jest.fn()
      render(
        <SessionTimeoutModal
          {...defaultProps}
          isOpen={true}
          timeLeft={2000}
          onTimeOut={mockOnTimeOut}
        />
      )

      // Advance past the countdown (2000ms = 2 seconds)
      act(() => {
        jest.advanceTimersByTime(3000)
      })

      expect(mockOnTimeOut).toHaveBeenCalled()
    })

    it("clears countdown when modal closes", () => {
      const {rerender} = render(
        <SessionTimeoutModal {...defaultProps} isOpen={true} timeLeft={60000} />
      )

      // Close modal
      rerender(<SessionTimeoutModal {...defaultProps} isOpen={false} timeLeft={60000} />)

      mockSetSessionTimeoutModalInfo.mockClear()

      // Advance timers — should not fire any updates
      act(() => {
        jest.advanceTimersByTime(5000)
      })

      expect(mockSetSessionTimeoutModalInfo).not.toHaveBeenCalled()
    })

    it("does not start countdown when timeLeft is 0", () => {
      render(<SessionTimeoutModal {...defaultProps} isOpen={true} timeLeft={0} />)

      // setSessionTimeoutModalInfo should not be called to set initial time
      // (the effect path for isOpen && timeLeft > 0 is not entered)
      const callsSettingTimeLeft = mockSetSessionTimeoutModalInfo.mock.calls.filter(call => {
        if (typeof call[0] === "function") {
          const result = call[0]({showModal: true, timeLeft: 60, action: undefined, buttonDisabled: false})
          return result.timeLeft !== undefined
        }
        return false
      })
      expect(callsSettingTimeLeft).toHaveLength(0)
    })
  })

  describe("Aria-live announcements", () => {
    it("creates initial announcement when modal opens", () => {
      render(<SessionTimeoutModal {...defaultProps} timeLeft={125} />)

      // Find the aria-live region
      const liveRegion = document.querySelector('[aria-live="assertive"]')
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion).toHaveTextContent("You will be logged out in 2 minutes and 5 seconds.")
    })

    it("announces time with minutes only when seconds are zero", () => {
      render(<SessionTimeoutModal {...defaultProps} timeLeft={120} />)

      const liveRegion = document.querySelector('[aria-live="assertive"]')
      expect(liveRegion).toHaveTextContent("You will be logged out in 2 minutes.")
    })

    it("announces time with seconds only when under 1 minute", () => {
      render(<SessionTimeoutModal {...defaultProps} timeLeft={45} />)

      const liveRegion = document.querySelector('[aria-live="assertive"]')
      expect(liveRegion).toHaveTextContent("You will be logged out in 45 seconds.")
    })

    it("uses singular form for 1 minute", () => {
      render(<SessionTimeoutModal {...defaultProps} timeLeft={60} />)

      const liveRegion = document.querySelector('[aria-live="assertive"]')
      expect(liveRegion).toHaveTextContent("You will be logged out in 1 minute.")
    })

    it("uses singular form for 1 second", () => {
      render(<SessionTimeoutModal {...defaultProps} timeLeft={1} />)

      const liveRegion = document.querySelector('[aria-live="assertive"]')
      expect(liveRegion).toHaveTextContent("You will be logged out in 1 second.")
    })
  })

  describe("Periodic announcements", () => {
    it("announces every 15 seconds when time is above 20 seconds", () => {
      const {rerender} = render(<SessionTimeoutModal {...defaultProps} timeLeft={300} />)

      const liveRegion = document.querySelector('[aria-live="assertive"]')

      // Should announce at 300 seconds (5 minutes)
      expect(liveRegion).toHaveTextContent("You will be logged out in 5 minutes.")

      // Update to 270 (should announce - 270 % 15 === 0)
      rerender(<SessionTimeoutModal {...defaultProps} timeLeft={270} />)
      expect(liveRegion).toHaveTextContent("You will be logged out in 4 minutes and 30 seconds.")

      // Update to 260 (shouldn't announce - not divisible by 15)
      rerender(<SessionTimeoutModal {...defaultProps} timeLeft={260} />)
      expect(liveRegion).toHaveTextContent("You will be logged out in 4 minutes and 30 seconds.")

      // Update to 255 (should announce - 255 % 15 === 0)
      rerender(<SessionTimeoutModal {...defaultProps} timeLeft={255} />)
      expect(liveRegion).toHaveTextContent("You will be logged out in 4 minutes and 15 seconds.")
    })

    it("announces at specific intervals when time is 20 seconds or less", () => {
      const {rerender} = render(<SessionTimeoutModal {...defaultProps} timeLeft={25} />)

      const liveRegion = document.querySelector('[aria-live="assertive"]')

      // Update to 20 (should announce)
      rerender(<SessionTimeoutModal {...defaultProps} timeLeft={20} />)
      expect(liveRegion).toHaveTextContent("You will be logged out in 20 seconds.")

      // Update to 15 (should announce)
      rerender(<SessionTimeoutModal {...defaultProps} timeLeft={15} />)
      expect(liveRegion).toHaveTextContent("You will be logged out in 15 seconds.")

      // Update to 10 (should announce)
      rerender(<SessionTimeoutModal {...defaultProps} timeLeft={10} />)
      expect(liveRegion).toHaveTextContent("You will be logged out in 10 seconds.")

      // Update to 5 (should announce)
      rerender(<SessionTimeoutModal {...defaultProps} timeLeft={5} />)
      expect(liveRegion).toHaveTextContent("You will be logged out in 5 seconds.")
    })

    it("does not announce at non-specified intervals", () => {
      const {rerender} = render(<SessionTimeoutModal {...defaultProps} timeLeft={25} />)

      const liveRegion = document.querySelector('[aria-live="assertive"]')
      const initialContent = liveRegion?.textContent

      // Update to 19 (should not announce)
      rerender(<SessionTimeoutModal {...defaultProps} timeLeft={19} />)
      expect(liveRegion).toHaveTextContent(initialContent || "")

      // Update to 7 (should not announce)
      rerender(<SessionTimeoutModal {...defaultProps} timeLeft={7} />)
      expect(liveRegion).toHaveTextContent(initialContent || "")
    })

    it("does not announce when modal is closed", () => {
      const {rerender} = render(<SessionTimeoutModal {...defaultProps} timeLeft={15} />)

      const liveRegion = document.querySelector('[aria-live="assertive"]')
      const initialContent = liveRegion?.textContent

      // Close modal and update time
      rerender(<SessionTimeoutModal {...defaultProps} isOpen={false} timeLeft={10} />)

      // Content should remain unchanged since modal is closed
      expect(liveRegion).toHaveTextContent(initialContent || "")
    })

    it("does not announce when timeLeft is 0 or negative", () => {
      const {rerender} = render(<SessionTimeoutModal {...defaultProps} timeLeft={15} />)

      const liveRegion = document.querySelector('[aria-live="assertive"]')
      const initialContent = liveRegion?.textContent

      // Update to 0 (should not announce)
      rerender(<SessionTimeoutModal {...defaultProps} timeLeft={0} />)
      expect(liveRegion).toHaveTextContent(initialContent || "")
    })
  })

  describe("Aria attributes", () => {
    it("sets correct aria-labelledby attribute", () => {
      render(<SessionTimeoutModal {...defaultProps} />)
      const modal = screen.getByTestId("eps-modal")
      expect(modal).toHaveAttribute("aria-labelledby", "session-timeout-title")
    })

    it("sets correct aria-describedby attribute", () => {
      render(<SessionTimeoutModal {...defaultProps} />)
      const modal = screen.getByTestId("eps-modal")
      expect(modal).toHaveAttribute("aria-describedby", "session-timeout-title")
    })

    it("positions aria-live region off screen", () => {
      render(<SessionTimeoutModal {...defaultProps} />)
      const liveRegion = document.querySelector('[aria-live="assertive"]')

      expect(liveRegion).toHaveStyle({
        position: "absolute",
        left: "-9999px",
        width: "1px",
        height: "1px",
        overflow: "hidden"
      })
    })
  })
})
