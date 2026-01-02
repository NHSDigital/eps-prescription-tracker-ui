import React from "react"
import {render, screen, fireEvent} from "@testing-library/react"
import "@testing-library/jest-dom"
import {EpsModal} from "@/components/EpsModal"

Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
  value: jest.fn(),
  writable: true
})

Object.defineProperty(HTMLDialogElement.prototype, "close", {
  value: jest.fn(),
  writable: true
})

describe("EpsModal", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("does not render the modal when isOpen is false", () => {
    render(
      <EpsModal isOpen={false} onClose={jest.fn()}>
        <div>Modal Content</div>
      </EpsModal>
    )
    expect(screen.queryByText(/Modal Content/i)).not.toBeInTheDocument()
  })

  test("renders the modal when isOpen is true", () => {
    render(
      <EpsModal isOpen={true} onClose={jest.fn()}>
        <div>Modal Content</div>
      </EpsModal>
    )
    expect(screen.getByText(/Modal Content/i)).toBeInTheDocument()
    expect(screen.getByTestId("eps-modal-overlay")).toBeInTheDocument()
  })

  test("calls onClose when cancel event is fired", () => {
    const onCloseMock = jest.fn()
    render(
      <EpsModal isOpen={true} onClose={onCloseMock}>
        <div>Modal Content</div>
      </EpsModal>
    )

    const dialog = screen.getByTestId("eps-modal-overlay")
    fireEvent(dialog, new Event("cancel"))
    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })

  test("renders with aria-labelledby when provided", () => {
    render(
      <EpsModal isOpen={true} onClose={jest.fn()} ariaLabelledBy="test-label">
        <div>Modal Content</div>
      </EpsModal>
    )

    const dialog = screen.getByTestId("eps-modal-overlay")
    expect(dialog).toHaveAttribute("aria-labelledby", "test-label")
  })

  test("calls showModal when isOpen becomes true", () => {
    const showModalMock = jest.fn()
    HTMLDialogElement.prototype.showModal = showModalMock

    const {rerender} = render(
      <EpsModal isOpen={false} onClose={jest.fn()}>
        <div>Modal Content</div>
      </EpsModal>
    )

    expect(showModalMock).not.toHaveBeenCalled()

    rerender(
      <EpsModal isOpen={true} onClose={jest.fn()}>
        <div>Modal Content</div>
      </EpsModal>
    )

    expect(showModalMock).toHaveBeenCalledTimes(1)
  })
})
