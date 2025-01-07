import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EpsModal } from "@/components/EpsModal";

describe("EpsModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("does not render the modal when isOpen is false", () => {
    render(
      <EpsModal isOpen={false} onClose={jest.fn()}>
        <div>Modal Content</div>
      </EpsModal>
    );
    // The content should not be in the document
    expect(screen.queryByText(/Modal Content/i)).not.toBeInTheDocument();
  });

  test("renders the modal when isOpen is true", () => {
    render(
      <EpsModal isOpen={true} onClose={jest.fn()}>
        <div>Modal Content</div>
      </EpsModal>
    );
    // The content should appear in the document
    expect(screen.getByText(/Modal Content/i)).toBeInTheDocument();
  });

  test("calls onClose when user clicks outside modal content", () => {
    const onCloseMock = jest.fn();
    render(
      <EpsModal isOpen={true} onClose={onCloseMock}>
        <div data-testid="modal-content">Modal Content</div>
      </EpsModal>
    );

    const overlay = screen.getByTestId("eps-modal-overlay");
    const modalContent = screen.getByTestId("modal-content");

    // Clicking directly on the content should NOT trigger onClose
    fireEvent.click(modalContent);
    expect(onCloseMock).not.toHaveBeenCalled();

    // Clicking on the overlay (outside the content) should trigger onClose
    fireEvent.click(overlay);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  test("calls onClose when user clicks the close button", () => {
    const onCloseMock = jest.fn();
    render(
      <EpsModal isOpen={true} onClose={onCloseMock}>
        <div>Modal Content</div>
      </EpsModal>
    );

    const closeButton = screen.getByRole("button", { name: /Close modal/i });
    fireEvent.click(closeButton);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  test("calls onClose when user presses Escape", () => {
    const onCloseMock = jest.fn();
    render(
      <EpsModal isOpen={true} onClose={onCloseMock}>
        <div>Modal Content</div>
      </EpsModal>
    );

    // Fire 'Escape' keydown event on window
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  test("calls onClose when user presses Enter or Space on the backdrop", () => {
    const onCloseMock = jest.fn();
    render(
      <EpsModal isOpen={true} onClose={onCloseMock}>
        <div>Modal Content</div>
      </EpsModal>
    );

    const overlay = screen.getByTestId("eps-modal-overlay");

    fireEvent.keyDown(overlay, { key: "Enter" });
    expect(onCloseMock).toHaveBeenCalledTimes(1);

    // Fire again with ' '
    fireEvent.keyDown(overlay, { key: " " });
    expect(onCloseMock).toHaveBeenCalledTimes(2);
  });
});
