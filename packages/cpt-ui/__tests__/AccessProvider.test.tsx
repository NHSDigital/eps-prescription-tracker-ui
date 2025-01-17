import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"

import { TrackerUserInfo } from "@/types/TrackerUserInfoTypes"

import { AccessProvider, useAccess } from "@/context/AccessProvider"
import { AuthContext } from "@/context/AuthProvider"

function TestConsumer() {
    const { noAccess, singleAccess, selectedRole, clear } = useAccess()

    return (
        <div>
            <div data-testid="noAccess">{noAccess ? "true" : "false"}</div>
            <div data-testid="singleAccess">{singleAccess ? "true" : "false"}</div>
            <div data-testid="selectedRole">{selectedRole ? selectedRole?.role_id : "(none)"}</div>
            <button data-testid="clear-button" onClick={clear}>
                Clear
            </button>
        </div>
    )
}

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe("AccessProvider", () => {
    const defaultAuthContext = {
        error: null,
        user: null,
        isSignedIn: false,
        idToken: null,
        accessToken: null,
        cognitoSignIn: jest.fn(),
        cognitoSignOut: jest.fn(),
    }

    const renderWithContext = (authOverrides = {}) => {
        const authValue = { ...defaultAuthContext, ...authOverrides }
        return render(
            <AuthContext.Provider value={authValue}>
                <AccessProvider>
                    <TestConsumer />
                </AccessProvider>
            </AuthContext.Provider>
        )
    }

    beforeEach(() => {
        jest.restoreAllMocks()
        jest.clearAllMocks()
        // Reset local storage between tests so each test starts fresh
        localStorage.clear()
    })

    it("does not fetch roles when user is not signed in", () => {
        renderWithContext({ isSignedIn: false, idToken: null })

        expect(mockFetch).not.toHaveBeenCalled()

        // Default values:
        expect(screen.getByTestId("noAccess")).toHaveTextContent("false")
        expect(screen.getByTestId("singleAccess")).toHaveTextContent("false")
        expect(screen.getByTestId("selectedRole")).toHaveTextContent("(none)")
    })

    it("fetches roles when user is signed in and has an idToken", async () => {
        const mockUserInfo: TrackerUserInfo = {
            roles_with_access: [
                {
                    role_id: "ROLE123",
                    role_name: "Pharmacist",
                    org_name: "Test Pharmacy Org",
                    org_code: "ORG123",
                    site_address: "1 Fake Street",
                },
            ],
            roles_without_access: [],
            currently_selected_role: {
                role_id: "ROLE123",
                role_name: "Pharmacist",
            },
        }

        mockFetch.mockResolvedValueOnce({
            status: 200,
            json: async () => ({ userInfo: mockUserInfo }),
        })

        renderWithContext({ isSignedIn: true, idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } })

        // Wait for state updates triggered by fetch
        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledTimes(1)
            expect(screen.getByTestId("noAccess")).toHaveTextContent("false")
            expect(screen.getByTestId("singleAccess")).toHaveTextContent("true")
            expect(screen.getByTestId("selectedRole")).toHaveTextContent("ROLE123")
        })
    })

    it("sets noAccess = true if roles_with_access is empty", async () => {
        const mockUserInfo: TrackerUserInfo = {
            roles_with_access: [],
            roles_without_access: [],
        }

        mockFetch.mockResolvedValueOnce({
            status: 200,
            json: async () => ({ userInfo: mockUserInfo }),
        })

        renderWithContext({ isSignedIn: true, idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } })

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledTimes(1)
            expect(screen.getByTestId("noAccess")).toHaveTextContent("true")
            expect(screen.getByTestId("singleAccess")).toHaveTextContent("false")
            expect(screen.getByTestId("selectedRole")).toHaveTextContent("(none)")
        })
    })

    it("sets noAccess = false and singleAccess = false if multiple roles exist", async () => {
        const mockUserInfo: TrackerUserInfo = {
            roles_with_access: [
                { role_id: "ROLE1" },
                { role_id: "ROLE2" },
            ],
            roles_without_access: [],
        }

        mockFetch.mockResolvedValueOnce({
            status: 200,
            json: async () => ({ userInfo: mockUserInfo }),
        })

        renderWithContext({ isSignedIn: true, idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } })

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledTimes(1)
            expect(screen.getByTestId("noAccess")).toHaveTextContent("false")
            expect(screen.getByTestId("singleAccess")).toHaveTextContent("false")
            expect(screen.getByTestId("selectedRole")).toHaveTextContent("(none)")
        })
    })

    it("does not update state if fetch returns a non-200 status", async () => {
        // Force fetch to return 500 error
        mockFetch.mockResolvedValueOnce({
            status: 500,
            json: async () => ({}),
        })

        renderWithContext({ isSignedIn: true, idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } })

        // The provider will log an error but should skip updates
        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledTimes(1)
            expect(screen.getByTestId("noAccess")).toHaveTextContent("false")
            expect(screen.getByTestId("singleAccess")).toHaveTextContent("false")
            expect(screen.getByTestId("selectedRole")).toHaveTextContent("(none)")
        })
    })

    it("calling clear resets the context values to their defaults", async () => {
        // Provide a single role so singleAccess = true
        const mockUserInfo: TrackerUserInfo = {
            roles_with_access: [
                {
                    role_id: "ROLE_SINGLE",
                    role_name: "SingleRole",
                },
            ],
            roles_without_access: [],
            currently_selected_role: {
                role_id: "ROLE_SINGLE",
                role_name: "SingleRole",
            },
        }

        mockFetch.mockResolvedValueOnce({
            status: 200,
            json: async () => ({ userInfo: mockUserInfo }),
        })

        renderWithContext({ isSignedIn: true, idToken: { toString: jest.fn().mockReturnValue("mock-id-token") } })

        // Confirm everything is updated
        await waitFor(() => {
            expect(screen.getByTestId("noAccess")).toHaveTextContent("false")
            expect(screen.getByTestId("singleAccess")).toHaveTextContent("true")
            expect(screen.getByTestId("selectedRole")).toHaveTextContent("ROLE_SINGLE")
        })

        // Click the "clear" button, which calls the `clear` function on the AccessContext
        screen.getByTestId("clear-button").click()

        // Expect defaults again
        await waitFor(() => {
            expect(screen.getByTestId("noAccess")).toHaveTextContent("false")
            expect(screen.getByTestId("selectedRole")).toHaveTextContent("(none)")
            expect(screen.getByTestId("singleAccess")).toHaveTextContent("false")
        })
    })
})
