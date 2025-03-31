// Note that I mock the PatientDetails type here. The code will run anyway, but typescript will get grumpy
// about it since it'll try and grab the common-types version.
// I'll slap some ts-expect-error on them

import React from "react"
import {
  render,
  screen,
  fireEvent,
  waitFor
} from "@testing-library/react"
import {Link, MemoryRouter, useNavigate} from "react-router-dom"

interface PatientDetails {
  name: string
  age: number
}

import {PatientDetailsProvider, usePatientDetails} from "@/context/PatientDetailsProvider"

describe("PatientDetailsContext", () => {
  it("throws error when usePatientDetails is used outside of PatientDetailsProvider", () => {
    const DummyComponent = () => {
      // This hook should throw an error because the provider is missing
      usePatientDetails()
      return <div>Dummy</div>
    }

    // Rendering without the provider should throw the error.
    expect(() => render(<DummyComponent />)).toThrow(
      "usePatientDetails must be used within an PatientDetailsProvider"
    )
  })

  it("provides default context values", () => {
    const DummyComponent = () => {
      const {patientDetails} = usePatientDetails()
      return (
        <div data-testid="patient-details">
          {patientDetails ? "exists" : "none"}
        </div>
      )
    }

    render(
      <MemoryRouter>
        <PatientDetailsProvider>
          <DummyComponent />
        </PatientDetailsProvider>
      </MemoryRouter>
    )

    expect(screen.getByTestId("patient-details").textContent).toBe("none")
  })

  it("setPatientDetails updates the context", () => {
    const DummyComponent = () => {
      const {patientDetails, setPatientDetails} = usePatientDetails()
      return (
        <div>
          <div data-testid="patient-details">
            {/* @ts-expect-error This is trying to grab the wrong type */}
            {patientDetails ? patientDetails.name : "none"}
          </div>
          <button
            onClick={() => {
              const details: PatientDetails = {name: "John Doe", age: 30}
              // @ts-expect-error This is trying to grab the wrong type
              setPatientDetails(details)
            }
            }
          >
            Set Details
          </button>
        </div>
      )
    }

    render(
      <MemoryRouter>
        <PatientDetailsProvider>
          <DummyComponent />
        </PatientDetailsProvider>
      </MemoryRouter>
    )

    // Initially, no patient details should be set.
    expect(screen.getByTestId("patient-details").textContent).toBe("none")

    fireEvent.click(screen.getByText("Set Details"))
    expect(screen.getByTestId("patient-details").textContent).toBe("John Doe")
  })

  it("clear resets patientDetails", () => {
    const DummyComponent = () => {
      const {patientDetails, setPatientDetails, clear} = usePatientDetails()
      return (
        <div>
          <div data-testid="patient-details">
            {/* @ts-expect-error This is trying to grab the wrong type */}
            {patientDetails ? patientDetails.name : "none"}
          </div>
          <button
            onClick={() => {
              const details: PatientDetails = {name: "Jane Doe", age: 25}
              // @ts-expect-error This is trying to grab the wrong type
              setPatientDetails(details)
            }
            }
          >
            Set Details
          </button>
          <button onClick={() => clear()}>Clear</button>
        </div>
      )
    }

    render(
      <MemoryRouter>
        <PatientDetailsProvider>
          <DummyComponent />
        </PatientDetailsProvider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText("Set Details"))
    expect(screen.getByTestId("patient-details").textContent).toBe("Jane Doe")

    fireEvent.click(screen.getByText("Clear"))
    expect(screen.getByTestId("patient-details").textContent).toBe("none")
  })

  it("clears patient details when location changes to a disallowed path", async () => {
    const DummyComponent = () => {
      const navigate = useNavigate()
      const {patientDetails, setPatientDetails} = usePatientDetails()
      const handleNav = () => {
        navigate("/other")
      }
      return (
        <div>
          <div data-testid="patient-details">
            {/* @ts-expect-error This is trying to grab the wrong type */}
            {patientDetails ? patientDetails.name : "none"}
          </div>
          <button
            onClick={() => {
              const details: PatientDetails = {name: "Alice", age: 40}
              // @ts-expect-error This is trying to grab the wrong type
              setPatientDetails(details)
            }
            }
          >
            Set Details
          </button>
          <button
            data-testid="navigate-away"
            onClick={handleNav}
          />
        </div>
      )
    }

    render(
      <MemoryRouter initialEntries={["/prescription-results"]}>
        <PatientDetailsProvider>
          <DummyComponent />
        </PatientDetailsProvider>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText("Set Details"))
    expect(screen.getByTestId("patient-details").textContent).toBe("Alice")

    fireEvent.click(screen.getByTestId("navigate-away"))

    await waitFor(() => {
      // The effect inside the provider should have cleared the patient details.
      expect(screen.getByTestId("patient-details").textContent).toBe("none")
    })
  })

  it("does not clear patient details when location remains allowed", () => {
    const DummyComponent = () => {
      const {patientDetails, setPatientDetails} = usePatientDetails()
      return (
        <div>
          <div data-testid="patient-details">
            {/* @ts-expect-error This is trying to grab the wrong type */}
            {patientDetails ? patientDetails.name : "none"}
          </div>
          <button
            onClick={() => {
              const details: PatientDetails = {name: "Bob", age: 35}
              // @ts-expect-error This is trying to grab the wrong type
              setPatientDetails(details)
            }
            }
          >
            Set Details
          </button>
          <Link
            data-testid="navigate-away"
            to={"/prescription-results"}

          />
        </div>
      )
    }

    render(
      <MemoryRouter initialEntries={["/prescription-results"]}>
        <PatientDetailsProvider>
          <DummyComponent />
        </PatientDetailsProvider>
      </MemoryRouter>
    )

    // Set patient details on the allowed route.
    fireEvent.click(screen.getByText("Set Details"))
    expect(screen.getByTestId("patient-details").textContent).toBe("Bob")

    fireEvent.click(screen.getByTestId("navigate-away"))

    // Patient details should remain intact.
    expect(screen.getByTestId("patient-details").textContent).toBe("Bob")
  })
})
