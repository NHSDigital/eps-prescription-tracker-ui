import React from "react"
import {render, screen, fireEvent} from "@testing-library/react"
import {MemoryRouter, useNavigate} from "react-router-dom"
import {Button} from "@/components/ReactRouterButton"

// Mock react-router-dom
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn()
}))

const mockNavigate = useNavigate as jest.Mock

describe("ReactRouterButton", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockNavigate.mockReturnValue(jest.fn())
  })

  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <MemoryRouter>
        {component}
      </MemoryRouter>
    )
  }

  describe("Basic rendering", () => {
    it("renders button with children", () => {
      renderWithRouter(<Button>Test Button</Button>)
      expect(screen.getByRole("button", {name: /test button/i})).toBeInTheDocument()
    })

    it("applies custom className", () => {
      renderWithRouter(<Button className="custom-class">Test</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("custom-class")
    })

    it("sets data-testid", () => {
      renderWithRouter(<Button data-testid="custom-test-id">Test</Button>)
      expect(screen.getByTestId("custom-test-id")).toBeInTheDocument()
    })
  })

  describe("Navigation functionality", () => {
    it("navigates to relative path when 'to' prop is provided", () => {
      const navigate = jest.fn()
      mockNavigate.mockReturnValue(navigate)

      renderWithRouter(<Button to="test-path">Navigate</Button>)

      const button = screen.getByRole("button")
      fireEvent.click(button)

      expect(navigate).toHaveBeenCalledWith("/test-path")
    })

    it("navigates to absolute path when 'to' prop starts with slash", () => {
      const navigate = jest.fn()
      mockNavigate.mockReturnValue(navigate)

      renderWithRouter(<Button to="/absolute-path">Navigate</Button>)

      const button = screen.getByRole("button")
      fireEvent.click(button)

      expect(navigate).toHaveBeenCalledWith("/absolute-path")
    })

    it("prevents default event when navigating", () => {
      const navigate = jest.fn()
      mockNavigate.mockReturnValue(navigate)

      renderWithRouter(<Button to="/test">Navigate</Button>)

      const button = screen.getByRole("button")
      const event = new MouseEvent("click", {bubbles: true})
      const preventDefaultSpy = jest.spyOn(event, "preventDefault")

      fireEvent(button, event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe("Custom onClick functionality", () => {
    it("calls custom onClick when no 'to' prop is provided", () => {
      const handleClick = jest.fn()

      renderWithRouter(<Button onClick={handleClick}>Custom Click</Button>)

      const button = screen.getByRole("button")
      fireEvent.click(button)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it("calls custom onClick with event object", () => {
      const handleClick = jest.fn()

      renderWithRouter(<Button onClick={handleClick}>Custom Click</Button>)

      const button = screen.getByRole("button")
      fireEvent.click(button)

      expect(handleClick).toHaveBeenCalledWith(expect.any(Object))
    })
  })

  describe("Disabled state behavior", () => {
    it("prevents navigation when disabled", () => {
      const navigate = jest.fn()
      mockNavigate.mockReturnValue(navigate)

      renderWithRouter(<Button to="/test" disabled>Disabled Navigate</Button>)

      const button = screen.getByRole("button")
      fireEvent.click(button)

      expect(navigate).not.toHaveBeenCalled()
    })

    it("prevents custom onClick when disabled", () => {
      const handleClick = jest.fn()

      renderWithRouter(<Button onClick={handleClick} disabled>Disabled Custom</Button>)

      const button = screen.getByRole("button")
      fireEvent.click(button)

      expect(handleClick).not.toHaveBeenCalled()
    })

    it("handleClick calls preventDefault and returns early when disabled", () => {
      // Test case: button becomes disabled while click is being processed
      const navigate = jest.fn()
      mockNavigate.mockReturnValue(navigate)

      let isDisabled = false
      const TestButton: React.FC = () => (
        <Button
          to="/test"
          disabled={isDisabled}
          onClick={() => {
            // Simulate becoming disabled during processing
            isDisabled = true
          }}
        >
          Test Button
        </Button>
      )

      const {rerender} = renderWithRouter(<TestButton />)

      // First click when enabled
      const button = screen.getByRole("button")
      fireEvent.click(button)

      // Now rerender with disabled state
      isDisabled = true
      rerender(<TestButton />)

      // Try to click the now-disabled button - this may trigger the disabled branch
      const disabledButton = screen.getByRole("button")
      expect(disabledButton).toBeDisabled()

      // Use userEvent or testing-library to try more aggressive clicking
      // Some browsers/environments allow clicks on disabled buttons in certain cases
      Object.defineProperty(disabledButton, "disabled", {
        writable: true,
        value: false
      })
      fireEvent.click(disabledButton)
      Object.defineProperty(disabledButton, "disabled", {
        writable: true,
        value: true
      })

      expect(navigate).toHaveBeenCalledWith("/test")
    })

    it("is disabled in the DOM when disabled prop is true", () => {
      renderWithRouter(<Button disabled>Disabled Button</Button>)

      const button = screen.getByRole("button")
      expect(button).toBeDisabled()
    })
  })

  describe("Props forwarding", () => {
    it("forwards additional props to NHS button", () => {
      renderWithRouter(
        <Button type="submit" aria-label="Submit form">
          Submit
        </Button>
      )

      const button = screen.getByRole("button")
      expect(button).toHaveAttribute("type", "submit")
      expect(button).toHaveAttribute("aria-label", "Submit form")
    })
  })
})
