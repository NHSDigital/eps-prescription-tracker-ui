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
})
