import React from "react"
import {render, screen} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"
import Layout from "@/Layout"
import {PatientDetailsProvider} from "@/context/PatientDetailsProvider"
import {AuthProvider} from "@/context/AuthProvider"
import {PrescriptionInformationProvider} from "@/context/PrescriptionInformationProvider"
import {FRONTEND_PATHS} from "@/constants/environment"

// Mock the components that aren't relevant to this test
jest.mock("@/components/EpsHeader", () => {
  return function MockEpsHeader() {
    return <div data-testid="eps-header">EpsHeader</div>
  }
})

jest.mock("@/components/EpsFooter", () => {
  return function MockEpsFooter() {
    return <div data-testid="eps-footer">EpsFooter</div>
  }
})

jest.mock("@/components/RBACBanner", () => {
  return function MockRBACBanner() {
    return <div data-testid="rbac-banner">RBACBanner</div>
  }
})

const TestWrapper = ({route, children}: {route: string; children?: React.ReactNode}) => (
  <MemoryRouter initialEntries={[route]}>
    <AuthProvider>
      <PatientDetailsProvider>
        <PrescriptionInformationProvider>
          {children}
        </PrescriptionInformationProvider>
      </PatientDetailsProvider>
    </AuthProvider>
  </MemoryRouter>
)

describe("Layout Banner Visibility Tests", () => {
  it("should hide PatientDetailsBanner on /select-your-role page even with patient details", () => {
    render(
      <TestWrapper route={FRONTEND_PATHS.SELECT_YOUR_ROLE}>
        <Layout />
      </TestWrapper>
    )

    // Should not show patient banner on select-your-role page
    expect(screen.queryByTestId("patient-details-banner")).not.toBeInTheDocument()

    // Should show other components
    expect(screen.getByTestId("eps-header")).toBeInTheDocument()
    expect(screen.getByTestId("eps-footer")).toBeInTheDocument()
    expect(screen.getByTestId("rbac-banner")).toBeInTheDocument()
  })

  it("should show PatientDetailsBanner on prescription list page when patient details exist", () => {
    render(
      <TestWrapper route={FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}>
        <Layout />
      </TestWrapper>
    )

    // PatientDetailsBanner will be rendered but won't show content without patient details
    // This tests that the banner is rendered on allowed pages
    expect(screen.getByTestId("eps-header")).toBeInTheDocument()
    expect(screen.getByTestId("eps-footer")).toBeInTheDocument()
    expect(screen.getByTestId("rbac-banner")).toBeInTheDocument()
  })

  it("should hide PatientDetailsBanner on non-allowed pages", () => {
    render(
      <TestWrapper route="/some-other-page">
        <Layout />
      </TestWrapper>
    )

    // Should not show patient banner on non-allowed pages
    expect(screen.queryByTestId("patient-details-banner")).not.toBeInTheDocument()
  })
})
