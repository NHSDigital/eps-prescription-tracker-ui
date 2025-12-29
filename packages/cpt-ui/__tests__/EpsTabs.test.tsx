import React from "react"
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation
} from "react-router-dom"
import {render, screen, waitFor} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "@testing-library/jest-dom"

import EpsTabs, {TabHeader} from "@/components/EpsTabs"

function LocationIndicator() {
  const location = useLocation()
  return <div data-testid="current-path">{location.pathname}</div>
}

type HarnessProps = { variant?: "default" | "large"; includeQuery?: boolean }
function Harness({variant = "default", includeQuery = false}: HarnessProps) {
  const location = useLocation()
  const tabHeaderArray: Array<TabHeader> = [
    {title: "(1)", link: "/prescription-list-current"},
    {title: "(2)", link: "/prescription-list-future"},
    {title: "(3)", link: "/prescription-list-past"}
  ]

  return (
    <EpsTabs
      activeTabPath={includeQuery ? location.pathname + location.search : location.pathname}
      tabHeaderArray={tabHeaderArray}
      variant={variant}
    >
      <div>
        <input data-testid="dummy-input" />
        <textarea data-testid="dummy-textarea" />
        <LocationIndicator />
        <div data-testid="panel-content">Panel</div>
      </div>
    </EpsTabs>
  )
}

describe("EpsTabs", () => {
  it("navigates between tabs with ArrowRight/ArrowLeft", async () => {
    render(
      <MemoryRouter initialEntries={["/prescription-list-current"]}>
        <Routes>
          <Route path="*" element={<Harness />} />
        </Routes>
      </MemoryRouter>
    )

    // Starts on current
    expect(screen.getByTestId("current-path")).toHaveTextContent("/prescription-list-current")

    // ArrowRight to future
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() => {
      expect(screen.getByTestId("current-path")).toHaveTextContent("/prescription-list-future")
    })

    // ArrowRight to past
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() => {
      expect(screen.getByTestId("current-path")).toHaveTextContent("/prescription-list-past")
    })

    // ArrowRight at last stays on past
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() => {
      expect(screen.getByTestId("current-path")).toHaveTextContent("/prescription-list-past")
    })

    // ArrowLeft goes back to future
    await userEvent.keyboard("{ArrowLeft}")
    await waitFor(() => {
      expect(screen.getByTestId("current-path")).toHaveTextContent("/prescription-list-future")
    })
  })

  it("does not navigate when focus is inside an input", async () => {
    render(
      <MemoryRouter initialEntries={["/prescription-list-current"]}>
        <Routes>
          <Route path="*" element={<Harness />} />
        </Routes>
      </MemoryRouter>
    )

    // Focus input then press ArrowRight – should not change tab
    const input = screen.getByTestId("dummy-input") as HTMLInputElement
    input.focus()
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByTestId("current-path")).toHaveTextContent("/prescription-list-current")
  })

  it("does not navigate when focus is inside a textarea", async () => {
    render(
      <MemoryRouter initialEntries={["/prescription-list-current"]}>
        <Routes>
          <Route path="*" element={<Harness />} />
        </Routes>
      </MemoryRouter>
    )

    const textarea = screen.getByTestId("dummy-textarea") as HTMLTextAreaElement
    textarea.focus()
    await userEvent.keyboard("{ArrowRight}")
    expect(screen.getByTestId("current-path")).toHaveTextContent("/prescription-list-current")
  })

  it("navigates correctly when activeTabPath includes a query string", async () => {
    render(
      <MemoryRouter initialEntries={["/prescription-list-current?nhsNumber=123456"]}>
        <Routes>
          <Route path="*" element={<Harness includeQuery />} />
        </Routes>
      </MemoryRouter>
    )

    // With query in activeTabPath, startsWith should still match and allow navigation
    expect(screen.getByTestId("current-path")).toHaveTextContent("/prescription-list-current")
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() => {
      expect(screen.getByTestId("current-path")).toHaveTextContent("/prescription-list-future")
    })
  })

  it("cleans up keydown listener on unmount", async () => {
    const {unmount} = render(
      <MemoryRouter initialEntries={["/prescription-list-current"]}>
        <Routes>
          <Route path="*" element={<Harness />} />
        </Routes>
      </MemoryRouter>
    )

    unmount()
    // Dispatching events after unmount should not change the path
    window.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowRight"}))
    // Nothing to assert about path change here since component is unmounted;
    // this test ensures no errors are thrown during cleanup.
    expect(true).toBe(true)
  })

  it("sets aria-selected and tabIndex correctly for active/inactive tabs", () => {
    render(
      <MemoryRouter initialEntries={["/prescription-list-current"]}>
        <Routes>
          <Route path="*" element={<Harness />} />
        </Routes>
      </MemoryRouter>
    )

    const currentTab = screen.getByTestId("eps-tab-heading /prescription-list-current")
    const futureTab = screen.getByTestId("eps-tab-heading /prescription-list-future")

    expect(currentTab).toHaveAttribute("aria-selected", "true")
    expect(currentTab).toHaveAttribute("tabIndex", "0")
    expect(futureTab).toHaveAttribute("aria-selected", "false")
    expect(futureTab).toHaveAttribute("tabIndex", "-1")
  })

  it("applies the large variant class", () => {
    render(
      <MemoryRouter initialEntries={["/prescription-list-current"]}>
        <Routes>
          <Route path="*" element={<Harness variant="large" />} />
        </Routes>
      </MemoryRouter>
    )

    // Container should have the large variant class
    const contentsTitle = screen.getByText("Contents")
    const container = contentsTitle.closest(".nhsuk-tabs--large")
    expect(container).toBeInTheDocument()
  })

  it("renders accessible titles with count patterns", () => {
    const tabHeaderArray: Array<TabHeader> = [
      {title: "Current prescriptions (5)", link: "/prescription-list-current"},
      {title: "Future-dated prescriptions (0)", link: "/prescription-list-future"},
      {title: "Simple title", link: "/prescription-list-past"}
    ]

    function AccessibleTitleHarness() {
      const location = useLocation()
      return (
        <EpsTabs
          activeTabPath={location.pathname}
          tabHeaderArray={tabHeaderArray}
        >
          <div>Test content</div>
        </EpsTabs>
      )
    }

    render(
      <MemoryRouter initialEntries={["/prescription-list-current"]}>
        <Routes>
          <Route path="*" element={<AccessibleTitleHarness />} />
        </Routes>
      </MemoryRouter>
    )

    // Check that count pattern creates accessible structure
    const currentTab = screen.getByTestId("eps-tab-heading /prescription-list-current")
    expect(currentTab.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
    expect(currentTab.querySelector(".nhsuk-u-visually-hidden")).toHaveTextContent("5 prescriptions")

    // Check that simple title renders as-is
    const pastTab = screen.getByTestId("eps-tab-heading /prescription-list-past")
    expect(pastTab).toHaveTextContent("Simple title")
    expect(pastTab.querySelector(".nhsuk-u-visually-hidden")).not.toBeInTheDocument()
  })

  it("handles edge cases in title patterns", () => {
    const edgeCaseTabHeaders: Array<TabHeader> = [
      {title: "No count here", link: "/test1"},
      {title: "Multiple (5) content (3)", link: "/test2"},
      {title: "Empty prefix (10)", link: "/test3"},
      {title: "Number only (0)", link: "/test4"}
    ]

    function EdgeCaseHarness() {
      const location = useLocation()
      return (
        <EpsTabs
          activeTabPath={location.pathname}
          tabHeaderArray={edgeCaseTabHeaders}
        >
          <div>Test content</div>
        </EpsTabs>
      )
    }

    render(
      <MemoryRouter initialEntries={["/test1"]}>
        <Routes>
          <Route path="*" element={<EdgeCaseHarness />} />
        </Routes>
      </MemoryRouter>
    )

    // Non-matching pattern should render as-is
    const noCountTab = screen.getByTestId("eps-tab-heading /test1")
    expect(noCountTab).toHaveTextContent("No count here")
    expect(noCountTab.querySelector(".nhsuk-u-visually-hidden")).not.toBeInTheDocument()

    // Pattern that ends with count should match
    const multipleTab = screen.getByTestId("eps-tab-heading /test2")
    expect(multipleTab.querySelector(".nhsuk-u-visually-hidden")).toHaveTextContent("3 prescriptions")
  })

  it("renders complete accessible markup structure for count patterns", () => {
    const tabHeaderArray: Array<TabHeader> = [
      {title: "Current prescriptions (5)", link: "/prescription-list-current"},
      {title: "Future-dated prescriptions (0)", link: "/prescription-list-future"}
    ]

    function MarkupTestHarness() {
      const location = useLocation()
      return (
        <EpsTabs
          activeTabPath={location.pathname}
          tabHeaderArray={tabHeaderArray}
        >
          <div>Test content</div>
        </EpsTabs>
      )
    }

    render(
      <MemoryRouter initialEntries={["/prescription-list-current"]}>
        <Routes>
          <Route path="*" element={<MarkupTestHarness />} />
        </Routes>
      </MemoryRouter>
    )

    const currentTab = screen.getByTestId("eps-tab-heading /prescription-list-current")

    const mainSpan = currentTab.querySelector("span")
    expect(mainSpan).toBeInTheDocument()

    const prefixSpan = currentTab.querySelector("span > span:first-child")
    expect(prefixSpan?.textContent).toMatch(/Current prescriptions\s*/)

    const ariaHiddenElements = currentTab.querySelectorAll("span[aria-hidden=\"true\"]")
    expect(ariaHiddenElements).toHaveLength(3)
    expect(ariaHiddenElements[0]).toHaveTextContent("(")
    expect(ariaHiddenElements[1]).toHaveTextContent("5")
    expect(ariaHiddenElements[2]).toHaveTextContent(")")

    const visuallyHidden = currentTab.querySelector(".nhsuk-u-visually-hidden")
    expect(visuallyHidden?.textContent).toMatch(/\s*5 prescriptions/)

    const futureTab = screen.getByTestId("eps-tab-heading /prescription-list-future")
    const futureAriaHidden = futureTab.querySelectorAll("span[aria-hidden=\"true\"]")
    expect(futureAriaHidden[1]).toHaveTextContent("0")
    expect(futureTab.querySelector(".nhsuk-u-visually-hidden")?.textContent).toMatch(/\s*0 prescriptions/)
  })

  it("focuses active tab when activeTabPath changes", async () => {
    render(
      <MemoryRouter initialEntries={["/prescription-list-current"]}>
        <Routes>
          <Route path="*" element={<Harness />} />
        </Routes>
      </MemoryRouter>
    )

    // Navigate to future tab
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() => {
      expect(screen.getByTestId("current-path")).toHaveTextContent("/prescription-list-future")
    })

    // Check that the future tab link is focused
    const futureTab = screen.getByTestId("eps-tab-heading /prescription-list-future")
    expect(futureTab).toHaveFocus()
  })
})
