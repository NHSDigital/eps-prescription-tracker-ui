import "@testing-library/jest-dom"
import {render} from "@testing-library/react"
import React from "react"

import Tab from "@/components/tab-set/components/Tab"

describe("Tab Component", () => {
  it("renders basic tab", () => {
    const {container} = render(<Tab>Test Tab</Tab>)

    const button = container.querySelector("button")
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent("Test Tab")
    expect(button).toHaveClass("nhsuk-tab-set__tab")
    expect(button).toHaveAttribute("type", "button")
    expect(button).toHaveAttribute("role", "tab")
  })

  it("renders active tab", () => {
    const {container} = render(<Tab active>Active Tab</Tab>)

    const button = container.querySelector("button")
    expect(button).toHaveClass("nhsuk-tab-set__tab--active")
    expect(button).toHaveAttribute("aria-selected", "true")
    expect(button).toHaveAttribute("tabindex", "0")
  })

  it("renders inactive tab", () => {
    const {container} = render(<Tab active={false}>Inactive Tab</Tab>)

    const button = container.querySelector("button")
    expect(button).not.toHaveClass("nhsuk-tab-set__tab--active")
    expect(button).toHaveAttribute("aria-selected", "false")
    expect(button).toHaveAttribute("tabindex", "-1")
  })

  it("renders disabled tab", () => {
    const {container} = render(<Tab disabled>Disabled Tab</Tab>)

    const button = container.querySelector("button")
    expect(button).toHaveClass("nhsuk-tab-set__tab--disabled")
    expect(button).toBeDisabled()
  })

  it("renders empty tab", () => {
    const {container} = render(<Tab empty>Empty Tab</Tab>)

    const button = container.querySelector("button")
    expect(button).toHaveClass("nhsuk-tab-set__tab--empty")
  })

  it("renders with custom className", () => {
    const {container} = render(<Tab className="custom-class">Custom Tab</Tab>)

    const button = container.querySelector("button")
    expect(button).toHaveClass("nhsuk-tab-set__tab")
    expect(button).toHaveClass("custom-class")
  })

  it("renders with custom type", () => {
    const {container} = render(<Tab type="submit">Submit Tab</Tab>)

    const button = container.querySelector("button")
    expect(button).toHaveAttribute("type", "submit")
  })

  it("renders with controls attribute", () => {
    const {container} = render(<Tab controls="panel-1">Controlled Tab</Tab>)

    const button = container.querySelector("button")
    expect(button).toHaveAttribute("aria-controls", "panel-1")
  })

  it("renders with label attribute", () => {
    const {container} = render(<Tab label="Custom Label">Labeled Tab</Tab>)

    const button = container.querySelector("button")
    expect(button).toHaveAttribute("aria-label", "Custom Label")
  })

  it("handles disabled tab with undefined tabIndex", () => {
    const {container} = render(<Tab disabled>Disabled Tab</Tab>)

    const button = container.querySelector("button")
    expect(button).toHaveAttribute("tabindex", "-1")
  })

  it("handles disabled tab with explicit tabIndex", () => {
    const {container} = render(<Tab disabled tabIndex={5}>Disabled Tab with Custom TabIndex</Tab>)

    const button = container.querySelector("button")
    expect(button).toHaveAttribute("tabindex", "5")
  })

  it("renders active tab with custom tabIndex", () => {
    const {container} = render(<Tab active tabIndex={3}>Active Tab with Custom TabIndex</Tab>)

    const button = container.querySelector("button")
    expect(button).toHaveAttribute("tabindex", "0") // Should be 0 for active tab regardless of custom tabIndex
  })

  it("renders inactive tab with custom tabIndex", () => {
    const {container} = render(<Tab active={false} tabIndex={3}>Inactive Tab with Custom TabIndex</Tab>)

    const button = container.querySelector("button")
    expect(button).toHaveAttribute("tabindex", "-1") // Should be -1 for inactive tab regardless of custom tabIndex
  })

  it("passes through additional props", () => {
    const {container} = render(
      <Tab data-testid="test-tab" id="custom-id">
        Tab with Props
      </Tab>
    )

    const button = container.querySelector("button")
    expect(button).toHaveAttribute("data-testid", "test-tab")
    expect(button).toHaveAttribute("id", "custom-id")
  })

  it("handles all boolean props together", () => {
    const {container} = render(
      <Tab active disabled empty className="multi-class">
        Multi-State Tab
      </Tab>
    )

    const button = container.querySelector("button")
    expect(button).toHaveClass("nhsuk-tab-set__tab--active")
    expect(button).toHaveClass("nhsuk-tab-set__tab--disabled")
    expect(button).toHaveClass("nhsuk-tab-set__tab--empty")
    expect(button).toHaveClass("multi-class")
  })

  it("handles tabIndex logic when disabled is false", () => {
    const {container} = render(<Tab disabled={false} active={false}>Normal Tab</Tab>)

    const button = container.querySelector("button")
    expect(button).toHaveAttribute("tabindex", "-1") // inactive tab gets -1
  })

  it("handles tabIndex logic when disabled is true and tabIndex is defined", () => {
    const {container} = render(<Tab disabled={true} tabIndex={2}>Disabled with TabIndex</Tab>)

    const button = container.querySelector("button")
    // should use provided tabIndex when disabled=true but tabIndex is defined
    expect(button).toHaveAttribute("tabindex", "2")
  })

  it("renders without controls attribute when not provided", () => {
    const {container} = render(<Tab>No Controls Tab</Tab>)

    const button = container.querySelector("button")
    expect(button).not.toHaveAttribute("aria-controls")
  })

  it("renders without label attribute when not provided", () => {
    const {container} = render(<Tab>No Label Tab</Tab>)

    const button = container.querySelector("button")
    expect(button).not.toHaveAttribute("aria-label")
  })
})
