import React from "react"
import {render} from "@testing-library/react"
import {EpsModal} from "../src/components/EpsModal"

const mockShowModal = jest.fn()
const mockClose = jest.fn()
const mockAddEventListener = jest.fn()
const mockRemoveEventListener = jest.fn()

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "showModal", {
    value: mockShowModal,
    writable: true,
    configurable: true
  })

  Object.defineProperty(HTMLElement.prototype, "close", {
    value: mockClose,
    writable: true,
    configurable: true
  })

  const originalAddEventListener = HTMLElement.prototype.addEventListener
  const originalRemoveEventListener = HTMLElement.prototype.removeEventListener

  HTMLElement.prototype.addEventListener = function(...args: Parameters<typeof originalAddEventListener>) {
    if (this.tagName === "DIALOG") {
      mockAddEventListener.apply(this, args)
    } else {
      originalAddEventListener.apply(this, args)
    }
  }

  HTMLElement.prototype.removeEventListener = function(...args: Parameters<typeof originalRemoveEventListener>) {
    if (this.tagName === "DIALOG") {
      mockRemoveEventListener.apply(this, args)
    } else {
      originalRemoveEventListener.apply(this, args)
    }
  }
})

describe("EpsModal", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("does not render the modal when isOpen is false", () => {
    const {container} = render(
      <EpsModal isOpen={false} onClose={jest.fn()}>
        <div>Modal Content</div>
      </EpsModal>
    )

    expect(container.firstChild).toBeNull()
  })

  test("renders the modal when isOpen is true", () => {
    const {container} = render(
      <EpsModal isOpen={true} onClose={jest.fn()}>
        <div>Modal Content</div>
      </EpsModal>
    )

    expect(container.querySelector("dialog")).toBeInTheDocument()
    expect(mockShowModal).toHaveBeenCalledTimes(1)
  })

  test("calls showModal when modal opens", () => {
    render(
      <EpsModal isOpen={true} onClose={jest.fn()}>
        <div>Modal Content</div>
      </EpsModal>
    )

    expect(mockShowModal).toHaveBeenCalledTimes(1)
  })

  test("calls onClose when cancel event is fired", () => {
    let cancelHandler: ((event: Event) => void) | null = null

    mockAddEventListener.mockImplementation((type, listener) => {
      if (type === "cancel" && typeof listener === "function") {
        cancelHandler = listener
      }
    })

    const mockOnClose = jest.fn()
    render(
      <EpsModal isOpen={true} onClose={mockOnClose}>
        <div>Modal Content</div>
      </EpsModal>
    )

    expect(cancelHandler).not.toBeNull()

    if (cancelHandler) {
      const mockEvent = {preventDefault: jest.fn()} as unknown as Event
      ;(cancelHandler as (event: Event) => void)(mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    }
  })

  test("handles null dialog ref gracefully", () => {
    const originalUseRef = React.useRef
    React.useRef = jest.fn().mockReturnValue({current: null})

    expect(() => {
      render(
        <EpsModal isOpen={true} onClose={jest.fn()}>
          <div>Modal Content</div>
        </EpsModal>
      )
    }).not.toThrow()

    React.useRef = originalUseRef
  })

  test("renders with aria-labelledby when provided", () => {
    const {container} = render(
      <EpsModal isOpen={true} onClose={jest.fn()} ariaLabelledBy="test-label">
        <div>Modal Content</div>
      </EpsModal>
    )

    const dialog = container.querySelector("dialog")
    expect(dialog).toHaveAttribute("aria-labelledby", "test-label")
  })

  test("does not have aria-labelledby attribute when not provided", () => {
    const {container} = render(
      <EpsModal isOpen={true} onClose={jest.fn()}>
        <div>Modal Content</div>
      </EpsModal>
    )

    const dialog = container.querySelector("dialog")
    expect(dialog).not.toHaveAttribute("aria-labelledby")
  })

  test("has correct CSS classes", () => {
    const {container} = render(
      <EpsModal isOpen={true} onClose={jest.fn()}>
        <div>Modal Content</div>
      </EpsModal>
    )

    const dialog = container.querySelector("dialog")
    expect(dialog).toHaveClass("eps-modal-overlay", "eps-modal-content")
  })

  test("cleans up event listener on unmount", () => {
    let cancelHandler: ((event: Event) => void) | null = null

    mockAddEventListener.mockImplementation((type, listener) => {
      if (type === "cancel" && typeof listener === "function") {
        cancelHandler = listener
      }
    })

    const {unmount} = render(
      <EpsModal isOpen={true} onClose={jest.fn()}>
        <div>Modal Content</div>
      </EpsModal>
    )

    expect(cancelHandler).not.toBeNull()

    unmount()

    expect(mockRemoveEventListener).toHaveBeenCalledWith("cancel", cancelHandler)
  })

  test("renders children correctly", () => {
    const {getByTestId} = render(
      <EpsModal isOpen={true} onClose={jest.fn()}>
        <div data-testid="child-content">
          <h1>Modal Title</h1>
          <p>Modal content text</p>
        </div>
      </EpsModal>
    )

    expect(getByTestId("child-content")).toBeInTheDocument()
  })
})
