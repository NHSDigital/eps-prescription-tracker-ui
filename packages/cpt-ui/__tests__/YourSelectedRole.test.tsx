import "@testing-library/jest-dom"
import {render, screen, fireEvent} from "@testing-library/react"
import {useRouter} from "next/navigation"
import React from "react"
import YourSelectedRolePage from "@/app/yourselectedrole/page"
import {JWT} from "aws-amplify/auth"
import {AuthContext} from "@/context/AuthProvider"

// Mock the module and directly reference the variable
jest.mock("@/constants/ui-strings/YourSelectedRoleStrings", () => {
    const YOUR_SELECTED_ROLE_STRINGS = {
        heading: "Your selected role",
        subheading: "The following role is now active.",
        tableTitle: "Current role Details",
        roleLabel: "Role",
        orgLabel: "Organisation",
        changeLinkText: "Change",
        confirmButtonText: "Confirm and continue to find a prescription",
        noODSCode: "NO ODS CODE",
        noRoleName: "NO ROLE NAME",
        noOrgName: "NO ORG NAME"
    }

    return {YOUR_SELECTED_ROLE_STRINGS}
})

const {YOUR_SELECTED_ROLE_STRINGS} = require("@/constants/ui-strings/YourSelectedRoleStrings")

// Mock `next/navigation`
jest.mock("next/navigation", () => ({
    usePathname: jest.fn(),
    useRouter: jest.fn(),
}))

// Create a global mock for `fetch` to simulate API requests
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock AccessProvider
jest.mock("@/context/AccessProvider", () => {
    const React = require("react")

    let mockContextValue = {
        noAccess: false,
        singleAccess: false,
        selectedRole: {
            role_name: "Role Name",
            role_id: "role-id",
            org_code: "deadbeef",
            org_name: "org name"
        },
        setNoAccess: jest.fn(),
        setSingleAccess: jest.fn(),
        setSelectedRole: jest.fn(),
    }

    const MockAccessContext = React.createContext(mockContextValue)
    const useAccess = () => React.useContext(MockAccessContext)

    const __setMockContextValue = (newValue: any) => {
        mockContextValue = {...mockContextValue, ...newValue}
        // Reassign the context’s defaultValue so subsequent consumers get new values
        MockAccessContext._currentValue = mockContextValue
        MockAccessContext._currentValue2 = mockContextValue
    }

    return {
        __esModule: true,
        AccessContext: MockAccessContext,
        useAccess,
        __setMockContextValue
    }
})
const {__setMockContextValue} = require("@/context/AccessProvider")

// Default mock values for the `AuthContext` to simulate authentication state
const defaultAuthContext = {
    error: null,
    user: null,
    isSignedIn: true,
    idToken: {
        toString: jest.fn().mockReturnValue("mock-id-token"),
        payload: {}
    } as JWT,
    accessToken: null,
    cognitoSignIn: jest.fn(),
    cognitoSignOut: jest.fn(),
}

export const renderWithAuth = (authOverrides = {}) => {
    const authValue = {...defaultAuthContext, ...authOverrides}

    return render(
        <AuthContext.Provider value={authValue}>
            <YourSelectedRolePage />
        </AuthContext.Provider>
    )
}

describe("YourSelectedRolePage", () => {
    let mockRouterPush: jest.Mock

    beforeEach(() => {
        jest.clearAllMocks()
        __setMockContextValue({
            selectedRole: {
                role_name: "Role Name",
                role_id: "role-id",
                org_code: "deadbeef",
                org_name: "org name",
            }
        })
        mockRouterPush = jest.fn()
            ; (useRouter as jest.Mock).mockReturnValue({
                push: mockRouterPush,
            })
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({message: "Success"})
        })
    })

    it("renders the heading and subheading correctly", () => {
        renderWithAuth()
        const heading = screen.getByRole("heading", {level: 1, name: /Your selected role/i})
        const subheading = screen.getByText(/The following role is now active/i)

        expect(heading).toBeInTheDocument()
        expect(subheading).toBeInTheDocument()
    })

    it("renders the table with the correct role and organization data", () => {
        renderWithAuth()
        // Role row
        expect(screen.getByTestId("role-label")).toHaveTextContent("Role")
        expect(screen.getByTestId("role-text")).toHaveTextContent("Role Name")

        // Org row
        expect(screen.getByTestId("org-label")).toHaveTextContent("Organisation")
        expect(screen.getByTestId("org-text")).toHaveTextContent("org name (ODS: deadbeef)")
    })

    it("has valid Change links for role and organization", () => {
        renderWithAuth()

        const changeLinks = screen.getAllByRole("link", {name: /Change/i})
        expect(changeLinks).toHaveLength(2) // one for role, one for org

        changeLinks.forEach(link => {
            expect(link).toHaveAttribute("href", "/changerole")
        })
    })

    it("navigates to /searchforaprescription when the confirm button is clicked", async () => {
        renderWithAuth()
        const button = screen.getByTestId("confirm-and-continue")
        await fireEvent.click(button)
        expect(mockRouterPush).toHaveBeenCalledWith("/searchforaprescription")
    })

    it("does not crash if selectedRole is undefined", () => {
        __setMockContextValue({
            selectedRole: null
        })
        renderWithAuth()

        const heading = screen.queryByText("Your selected role")
        expect(heading).toBeInTheDocument()

        const roleTextCell = screen.getByTestId("role-text")
        expect(roleTextCell).toHaveTextContent(YOUR_SELECTED_ROLE_STRINGS.noRoleName)

        const orgTextCell = screen.getByTestId("org-text")
        expect(orgTextCell).toHaveTextContent(YOUR_SELECTED_ROLE_STRINGS.noODSCode)
        expect(orgTextCell).toHaveTextContent(YOUR_SELECTED_ROLE_STRINGS.noOrgName)
    })
})
