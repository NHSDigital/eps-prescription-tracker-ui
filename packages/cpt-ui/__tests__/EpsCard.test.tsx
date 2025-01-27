import "@testing-library/jest-dom"
import {render, screen, fireEvent} from "@testing-library/react"
import EpsCard from "@/components/EpsCard"
import {useRouter} from "next/navigation"
import {AuthContext} from "@/context/AuthProvider"
import {useAccess} from "@/context/AccessProvider"

// Mock `next/navigation`
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}))

// Mock `useAccess` hook
jest.mock("@/context/AccessProvider", () => ({
  useAccess: jest.fn(),
}))

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch as jest.Mock

const mockRole = {
  role_id: "123",
  org_name: "Test Organization",
  org_code: "XYZ123",
  role_name: "Pharmacist",
  site_address: "123 Test Street\nTest City",
}

const mockLink = "/role-detail"

describe("EpsCard Component", () => {
  let mockRouterPush: jest.Mock
  let mockSetSelectedRole: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockRouterPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({push: mockRouterPush})

    mockSetSelectedRole = jest.fn();
    (useAccess as jest.Mock).mockReturnValue({setSelectedRole: mockSetSelectedRole})
  })

  it("renders role details correctly", () => {
    render(<EpsCard role={mockRole} link={mockLink} />)

    expect(screen.getByText((content) => content.includes("Test Organization"))).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes("ODS: XYZ123"))).toBeInTheDocument()
    expect(screen.getByText("Pharmacist")).toBeInTheDocument()
    expect(screen.getByText("123 Test Street", {exact: false})).toBeInTheDocument()
    expect(screen.getByText("Test City", {exact: false})).toBeInTheDocument()
  })

  it("handles missing role data gracefully", () => {
    render(<EpsCard role={{} as any} link={mockLink} />)

    expect(screen.getByText((content) => content.includes("NO ORG NAME"))).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes("ODS: No ODS code"))).toBeInTheDocument()
    expect(screen.getByText("No role name")).toBeInTheDocument()
    expect(screen.getByText("Address not found", {exact: false})).toBeInTheDocument()
  })

  it("calls API and navigates on card click", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({message: "Success"}),
    })

    render(<EpsCard role={mockRole} link={mockLink} />)

    const cardLink = screen.getByRole("link", {name: /test organization/i})
    await fireEvent.click(cardLink)

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/selected-role",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "Authorization": expect.any(String),
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          currently_selected_role: {
            role_id: "123",
            org_name: "Test Organization",
            org_code: "XYZ123",
            role_name: "Pharmacist",
          },
        }),
      })
    )

    expect(mockSetSelectedRole).toHaveBeenCalledWith(
      expect.objectContaining({
        role_id: "123",
        org_name: "Test Organization",
        org_code: "XYZ123",
        role_name: "Pharmacist",
      })
    )

    expect(mockRouterPush).toHaveBeenCalledWith(mockLink)
  })

  it("shows an alert when API call fails", async () => {
    mockFetch.mockResolvedValueOnce({ok: false})
    jest.spyOn(window, "alert").mockImplementation(() => {})

    render(<EpsCard role={mockRole} link={mockLink} />)

    const cardLink = screen.getByRole("link", {name: /test organization/i})
    await fireEvent.click(cardLink)

    expect(window.alert).toHaveBeenCalledWith("There was an issue selecting your role. Please try again.")

    jest.restoreAllMocks()
  })
})
