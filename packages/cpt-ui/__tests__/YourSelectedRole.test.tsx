import "@testing-library/jest-dom"
import { render, screen, waitFor } from "@testing-library/react"
import { useRouter } from 'next/navigation'
import React from "react"
import YourSelectedRolePage from "@/app/yourselectedrole/page"
import { JWT } from 'aws-amplify/auth';
import { AuthContext } from "@/context/AuthProvider"

// Mock the module and directly reference the variable
jest.mock("@/constants/ui-strings/YourSelectedRoleStrings", () => {
    const YOUR_SELECTED_ROLE_STRINGS = {
        heading: "Your selected role",
        subheading: "The following role is now active.",
        tableTitle: "Current role Details",
        roleLabel: "Role",
        orgLabel: "Organisation",
        changeLinkText: "Change",
        confirmButtonText: "Confirm and continue to find a prescription"
    }

    return { YOUR_SELECTED_ROLE_STRINGS }
})

// Mock `next/navigation` to prevent errors during component rendering in test
jest.mock("next/navigation", () => ({
    usePathname: jest.fn(),
    useRouter: jest.fn(),
}))

// Create a global mock for `fetch` to simulate API requests
const mockFetch = jest.fn()
global.fetch = mockFetch

jest.mock("@/context/AccessProvider", () => {
    const React = require("react")

    var mockContextValue = {
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
        mockContextValue = { ...mockContextValue, ...newValue }
        // Reassign the context’s defaultValue so subsequent consumers get the new values
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
// import the setter
const { __setMockContextValue } = require("@/context/AccessProvider");

// Default mock values for the `AuthContext` to simulate authentication state
const defaultAuthContext = {
    error: null, // No errors by default
    user: null, // User not needed
    isSignedIn: true, // Default state is signed in
    idToken: { toString: jest.fn().mockReturnValue("mock-id-token"), payload: {} } as JWT, // A valid ID token
    accessToken: null, // No access token
    cognitoSignIn: jest.fn(),
    cognitoSignOut: jest.fn(),
}

export const renderWithAuth = (authOverrides = {}) => {
    const authValue = { ...defaultAuthContext, ...authOverrides }

    return render(
        <AuthContext.Provider value={authValue}>
            <YourSelectedRolePage />
        </AuthContext.Provider>
    )
}

describe("YourSelectedRolePage", () => {
    // Clear all mock calls before each test to avoid state leaks
    beforeEach(() => {
        jest.clearAllMocks()
        __setMockContextValue({
            noAccess: false,
        });
    })

    it("Dummy test", async () => {
        console.log("OK")
    })
});
