import "@testing-library/jest-dom"
import {render} from "@testing-library/react"
import {screen} from "@testing-library/dom"
import React from "react"

import Tab from "@/components/tab-set/components/Tab"

describe("Tab", () => {
  it("renders a button with default properties", () => {
    render(<Tab>Test Tab</Tab>)
    const button = screen.getByRole("button", {name: "Test Tab"})
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass("nhsuk-tab-set__tab")
    expect(button).toHaveAttribute("type", "button")
  })

  it("applies active class when active prop is true", () => {
    render(<Tab active>Active Tab</Tab>)
    const button = screen.getByRole("button", {name: "Active Tab"})
    expect(button).toHaveClass("nhsuk-tab-set__tab--active")
  })

  it("applies disabled class when disabled prop is true", () => {
    render(<Tab disabled>Disabled Tab</Tab>)
    const button = screen.getByRole("button", {name: "Disabled Tab"})
    expect(button).toHaveClass("nhsuk-tab-set__tab--disabled")
  })

  it("applies empty class when empty prop is true", () => {
    render(<Tab empty>Empty Tab</Tab>)
    const button = screen.getByRole("button", {name: "Empty Tab"})
    expect(button).toHaveClass("nhsuk-tab-set__tab--empty")
  })

  it("applies custom className", () => {
    render(<Tab className="custom-class">Custom Tab</Tab>)
    const button = screen.getByRole("button", {name: "Custom Tab"})
    expect(button).toHaveClass("nhsuk-tab-set__tab")
    expect(button).toHaveClass("custom-class")
  })

  it("sets custom type attribute", () => {
    render(<Tab type="submit">Submit Tab</Tab>)
    const button = screen.getByRole("button", {name: "Submit Tab"})
    expect(button).toHaveAttribute("type", "submit")
  })

  it("sets tabIndex to -1 when disabled is true and tabIndex is undefined", () => {
    render(<Tab disabled>Disabled Tab</Tab>)
    const button = screen.getByRole("button", {name: "Disabled Tab"})
    expect(button).toHaveAttribute("tabIndex", "-1")
  })

  it("preserves custom tabIndex when disabled is true but tabIndex is provided", () => {
    render(<Tab disabled tabIndex={5}>Disabled Tab with TabIndex</Tab>)
    const button = screen.getByRole("button", {name: "Disabled Tab with TabIndex"})
    expect(button).toHaveAttribute("tabIndex", "5")
  })

  it("preserves custom tabIndex when disabled is false", () => {
    render(<Tab tabIndex={3}>Tab with TabIndex</Tab>)
    const button = screen.getByRole("button", {name: "Tab with TabIndex"})
    expect(button).toHaveAttribute("tabIndex", "3")
  })

  it("handles undefined tabIndex when disabled is false", () => {
    render(<Tab>Normal Tab</Tab>)
    const button = screen.getByRole("button", {name: "Normal Tab"})
    // Should not have tabIndex attribute when undefined
    expect(button).not.toHaveAttribute("tabIndex")
  })

  it("forwards other HTML button attributes", () => {
    render(
      <Tab
        id="test-tab"
        data-testid="tab-element"
        aria-label="Test tab button"
      >
        Tab with Attributes
      </Tab>
    )
    const button = screen.getByTestId("tab-element")
    expect(button).toHaveAttribute("id", "test-tab")
    expect(button).toHaveAttribute("aria-label", "Test tab button")
  })
})
