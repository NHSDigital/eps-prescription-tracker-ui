import React from "react"
import {render, screen} from "@testing-library/react"
import {SearchProvider, useSearchContext} from "@/context/SearchProvider"
import userEvent from "@testing-library/user-event"

// A test component to access and modify the context
const TestComponent = () => {
  const {
    prescriptionId,
    firstName,
    setPrescriptionId,
    setFirstName,
    clearSearchParameters
  } = useSearchContext()

  return (
    <div>
      <div>Prescription ID: {prescriptionId ?? "null"}</div>
      <div>First Name: {firstName ?? "null"}</div>
      <button onClick={() => setPrescriptionId("RX123")}>Set Prescription ID</button>
      <button onClick={() => setFirstName("Alice")}>Set First Name</button>
      <button onClick={clearSearchParameters}>Clear</button>
    </div>
  )
}

describe("SearchProvider", () => {
  it("provides default values", () => {
    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    )

    expect(screen.getByText(/Prescription ID: null/)).toBeInTheDocument()
    expect(screen.getByText(/First Name: null/)).toBeInTheDocument()
  })

  it("sets values correctly", async () => {
    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    )

    const user = userEvent.setup()
    await user.click(screen.getByText("Set Prescription ID"))
    await user.click(screen.getByText("Set First Name"))

    expect(screen.getByText(/Prescription ID: RX123/)).toBeInTheDocument()
    expect(screen.getByText(/First Name: Alice/)).toBeInTheDocument()
  })

  it("clears values with clearSearchParameters", async () => {
    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    )

    const user = userEvent.setup()
    await user.click(screen.getByText("Set Prescription ID"))
    await user.click(screen.getByText("Set First Name"))

    expect(screen.getByText(/Prescription ID: RX123/)).toBeInTheDocument()
    expect(screen.getByText(/First Name: Alice/)).toBeInTheDocument()

    await user.click(screen.getByText("Clear"))

    expect(screen.getByText(/Prescription ID: null/)).toBeInTheDocument()
    expect(screen.getByText(/First Name: null/)).toBeInTheDocument()
  })

  it("throws error if used outside SearchProvider", () => {
    const BrokenComponent = () => {
      // should throw
      useSearchContext()
      return <div>Broken</div>
    }

    expect(() => render(<BrokenComponent />)).toThrow(
      "useSearchContext must be used within an SearchProvider"
    )
  })
})
