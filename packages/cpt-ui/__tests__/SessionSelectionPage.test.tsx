import "@testing-library/jest-dom"
import {render, screen, waitFor} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React, {useState} from "react"
import {MemoryRouter} from "react-router-dom"
import {AuthContext, type AuthContextType} from "@/context/AuthProvider"
import SessionSelectionPage from "@/pages/SessionSelection"
import {postSessionManagementUpdate} from "@/helpers/sessionManagement"

const mockNavigate = jest.fn()

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom")
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

jest.mock("@/helpers/awsRum")
jest.mock("@/helpers/logger")
jest.mock("@/helpers/axios")
jest.mock("@/context/configureAmplify")
jest.mock("@/helpers/sessionManagement", () => ({
  postSessionManagementUpdate: jest.fn()
}))
const mockPostSessionManagementUpdate =
    postSessionManagementUpdate as jest.MockedFunction<typeof postSessionManagementUpdate>

jest.mock("@/constants/environment", () => ({
  AUTH_CONFIG: {
    USER_POOL_ID: "test-pool-id",
    USER_POOL_CLIENT_ID: "test-client-id",
    HOSTED_LOGIN_DOMAIN: "test.domain",
    REDIRECT_SIGN_IN: "http://localhost:3000",
    REDIRECT_SIGN_OUT: "http://localhost:3000/logout"
  },
  APP_CONFIG: {
    REACT_LOG_LEVEL: "debug"
  },
  FRONTEND_PATHS: {
    LOGOUT: "/logout",
    LOGIN: "/login",
    SEARCH_BY_PRESCRIPTION_ID: "/search-by-prescription-id"
  },
  API_ENDPOINTS: {
    SESSION_MANAGEMENT: "/api/session-management"
  }
}))

const mockUpdateTrackerUserInfo = jest.fn()

export const defaultAuthState: AuthContextType = {
  isSignedIn: true,
  isSigningIn: false,
  invalidSessionCause: undefined,
  user: "testUser",
  error: null,
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  selectedRole: undefined,
  userDetails: undefined,
  isConcurrentSession: true,
  sessionId: "test-session-id",
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn(),
  clearAuthState: jest.fn(),
  hasSingleRoleAccess: jest.fn().mockReturnValue(false),
  updateSelectedRole: jest.fn(),
  updateInvalidSessionCause: jest.fn(),
  updateTrackerUserInfo: mockUpdateTrackerUserInfo,
  isSigningOut: false,
  setIsSigningOut: jest.fn(),
  remainingSessionTime: undefined
}

const MockAuthProvider = ({
  children,
  initialState = defaultAuthState
}: {
  children: React.ReactNode;
  initialState?: AuthContextType;
}) => {
  const [authState] = useState<AuthContextType>(initialState)

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  )
}

const renderWithProviders = (
  component: React.ReactElement,
  initialState = defaultAuthState
) => {
  return render(
    <MockAuthProvider initialState={initialState}>
      <MemoryRouter>{component}</MemoryRouter>
    </MockAuthProvider>
  )
}

describe("SessionSelectionPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders without crashing", () => {
    renderWithProviders(<SessionSelectionPage />)

    expect(screen.getByRole("main")).toBeInTheDocument()
    expect(screen.getByText("You are already logged in to the Prescription Tracker")).toBeInTheDocument()
    expect(screen.getByText(
      "There is a session using these login details in another browser, window or device."
    )).toBeInTheDocument()
    expect(screen.getByText(
      "You can continue to start a new session in this window, but this will end the other session."
    )).toBeInTheDocument()

    const newSessionButton = screen.getByRole("button", {name: "Start a new session"})
    const closeSessionButton = screen.getByRole("button", {name: "Close this window"})

    expect(newSessionButton).toBeInTheDocument()
    expect(closeSessionButton).toBeInTheDocument()
    expect(newSessionButton).toHaveClass("nhsuk-button")
    expect(closeSessionButton).toHaveClass("nhsuk-button", "nhsuk-button--secondary")
  })

  it("calls signOut function and navigates to logout when 'Close this window' is clicked", async () => {
    renderWithProviders(<SessionSelectionPage />)

    const closeSessionButton = screen.getByRole("button", {name: "Close this window"})
    await userEvent.click(closeSessionButton)

    expect(defaultAuthState.cognitoSignOut).toHaveBeenCalled()
  })

  it("calls setSession function when 'Start a new session' is clicked", async () => {
    mockPostSessionManagementUpdate.mockResolvedValueOnce(true)

    renderWithProviders(<SessionSelectionPage />)

    const newSessionButton = screen.getByRole("button", {name: "Start a new session"})
    await userEvent.click(newSessionButton)

    await waitFor(() => {
      expect(mockPostSessionManagementUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          isSignedIn: true,
          user: "testUser",
          isConcurrentSession: true
        })
      )
    })
  })

  it("redirects to search page when session management succeeds", async () => {
    mockPostSessionManagementUpdate.mockImplementation(async () => {
      return true
    })

    renderWithProviders(<SessionSelectionPage />)

    const newSessionButton = screen.getByRole("button", {name: "Start a new session"})
    await userEvent.click(newSessionButton)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/search-by-prescription-id")
    })
  })

  it("handles session management failure gracefully", async () => {
    mockPostSessionManagementUpdate.mockResolvedValueOnce(false)

    renderWithProviders(<SessionSelectionPage />)

    const newSessionButton = screen.getByRole("button", {name: "Start a new session"})
    await userEvent.click(newSessionButton)

    await waitFor(() => {
      expect(mockPostSessionManagementUpdate).toHaveBeenCalled()
    })

    // Should not navigate if session management fails
    expect(mockNavigate).not.toHaveBeenCalledWith("/search-by-prescription-id")
    expect(defaultAuthState.cognitoSignOut).toHaveBeenCalled()
  })

  it("has correct button IDs for accessibility", () => {
    renderWithProviders(<SessionSelectionPage />)

    expect(screen.getByRole("button", {name: "Start a new session"})).toHaveAttribute("id", "create-a-new-session")
    expect(screen.getByRole("button", {name: "Close this window"})).toHaveAttribute("id", "close-this-window")
  })

  it("uses proper NHS UK styling and layout", () => {
    const {container} = renderWithProviders(<SessionSelectionPage />)

    const mainContent = container.querySelector("#main-content")
    expect(mainContent).toHaveClass("nhsuk-main-wrapper")

    const containerElement = container.querySelector(".nhsuk-width-container")
    expect(containerElement).toBeInTheDocument()

    const rowElements = container.querySelectorAll(".nhsuk-grid-row")
    expect(rowElements).toHaveLength(2)
  })
})
