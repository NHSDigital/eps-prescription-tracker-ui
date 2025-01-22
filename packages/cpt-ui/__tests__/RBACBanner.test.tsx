import "@testing-library/jest-dom"
import { render, screen, fireEvent } from "@testing-library/react"
import { useRouter } from "next/navigation"
import React from "react"
import { JWT } from "aws-amplify/auth"
import RBACBanner from "@/components/RBACBanner"

// Mock the module and directly reference the variable
jest.mock("@/constants/ui-strings/RBACBannerStrings", () => {
    const RBAC_BANNER_STRINGS = {
        CONFIDENTIAL_DATA:
            "CONFIDENTIAL: PERSONAL PATIENT DATA accessed by {lastName}, {firstName} - {roleName} - {orgName} (ODS: {odsCode})",
        NO_GIVEN_NAME: "NO_GIVEN_NAME",
        NO_FAMILY_NAME: "NO_FAMILY_NAME",
        NO_ROLE_NAME: "NO_ROLE_NAME",
        NO_ORG_NAME: "NO_ORG_NAME",
        NO_ODS_CODE: "NO_ODS_CODE",
        LOCUM_NAME: "Locum pharmacy"
    }

    return { RBAC_BANNER_STRINGS }
})

const { RBAC_BANNER_STRINGS } = require("@/constants/ui-strings/RBACBannerStrings")

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
        selectedRole: {
            role_name: "Role Name",
            role_id: "role-id",
            org_code: "deadbeef",
            org_name: "org name"
        },
        userDetails: {
            given_name: "Jane",
            family_name: "Doe"
        },
        setUserDetails: jest.fn(),
        setSelectedRole: jest.fn(),
    }

    const MockAccessContext = React.createContext(mockContextValue)
    const useAccess = () => React.useContext(MockAccessContext)

    const __setMockContextValue = (newValue: any) => {
        mockContextValue = { ...mockContextValue, ...newValue }
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
const { __setMockContextValue } = require("@/context/AccessProvider")

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
    const authValue = { ...defaultAuthContext, ...authOverrides }

    return render(
        <AuthContext.Provider value={authValue}>
            <RBACBanner />
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
            },
            userDetails: {
                family_name: "Doe",
                given_name: "Jane"
            }
        })
        mockRouterPush = jest.fn()
            ; (useRouter as jest.Mock).mockReturnValue({
                push: mockRouterPush,
            })
    })

    it("Dummy test", () => {
        console.error("dummy test")
    })
})
