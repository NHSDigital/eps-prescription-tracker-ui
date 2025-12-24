import React from "react"
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation
} from "react-router-dom"
import {render, screen, waitFor} from "@testing-library/react"
import "@testing-library/jest-dom"

import EpsTabs, {TabHeader} from "@/components/EpsTabs"

function LocationIndicator() {
  const location = useLocation()
  return <div data-testid="current-path">{location.pathname}</div>
}

type HarnessProps = { variant?: "default" | "large" }
function Harness({variant = "default"}: HarnessProps) {
  const location = useLocation()
  const tabHeaderArray: Array<TabHeader> = [
    {title: "(1)", link: "/prescription-list-current"},
    {title: "(2)", link: "/prescription-list-future"},
    {title: "(3)", link: "/prescription-list-past"}
  ]

  return (
    <EpsTabs
      activeTabPath={location.pathname}
      tabHeaderArray={tabHeaderArray}
      variant={variant}
    >
      <div>
        <input data-testid="dummy-input" />
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
    window.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowRight"}))
    await waitFor(() => {
      expect(screen.getByTestId("current-path")).toHaveTextContent("/prescription-list-future")
    })

    // ArrowRight to past
    window.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowRight"}))
    await waitFor(() => {
      expect(screen.getByTestId("current-path")).toHaveTextContent("/prescription-list-past")
    })

    // ArrowRight at last stays on past
    window.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowRight"}))
    await waitFor(() => {
      expect(screen.getByTestId("current-path")).toHaveTextContent("/prescription-list-past")
    })

    // ArrowLeft goes back to future
    window.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowLeft"}))
    await waitFor(() => {
      expect(screen.getByTestId("current-path")).toHaveTextContent("/prescription-list-future")
    })
  })

  it("does not navigate when focus is inside an input", () => {
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
    window.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowRight"}))
    expect(screen.getByTestId("current-path")).toHaveTextContent("/prescription-list-current")
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
