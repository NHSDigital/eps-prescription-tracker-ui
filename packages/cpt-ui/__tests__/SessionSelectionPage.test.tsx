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

jest.mock("@/constants/environment", () => ({
  FRONTEND_PATHS: {
    LOGOUT: "/logout",
    SEARCH_BY_PRESCRIPTION_ID: "/search-by-prescription-id"
  },
  API_ENDPOINTS: {
    SESSION_MANAGEMENT: "/api/session-management"
  }
}))

jest.mock("@/helpers/sessionManagement", () => ({
  postSessionManagementUpdate: jest.fn()
}))

const mockPostSessionManagementUpdate =
    postSessionManagementUpdate as jest.MockedFunction<typeof postSessionManagementUpdate>

const mockUpdateTrackerUserInfo = jest.fn()

const defaultAuthState: AuthContextType = {
  isSignedIn: true,
  isSigningIn: false,
  user: "testUser",
  error: null,
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  hasNoAccess: false,
  hasSingleRoleAccess: false,
  selectedRole: undefined,
  userDetails: undefined,
  isConcurrentSession: true,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn(),
  clearAuthState: jest.fn(),
  updateSelectedRole: jest.fn(),
  forceCognitoLogout: jest.fn(),
  updateTrackerUserInfo: mockUpdateTrackerUserInfo
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
  })

  it("displays the concurrent session warning message", () => {
    renderWithProviders(<SessionSelectionPage />)

    expect(screen.getByText(
      "There is a session using these login details in another browser, window or device."
    )).toBeInTheDocument()
    expect(screen.getByText(
      "You can continue to start a new session in this window, but this will end the other session."
    )).toBeInTheDocument()
  })

  it("displays both action buttons", () => {
    renderWithProviders(<SessionSelectionPage />)

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

    expect(mockNavigate).toHaveBeenCalledWith("/logout")
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
        }),
        expect.any(Function)
      )
    })
  })

  it("redirects to search page when session management succeeds", async () => {
    mockPostSessionManagementUpdate.mockImplementation(async (_auth: AuthContextType, redirectCallback: () => void) => {
      redirectCallback()
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
  })

  it("passes the correct redirect function to postSessionManagementUpdate", async () => {
    let capturedRedirectFunction: (() => void) | undefined

    mockPostSessionManagementUpdate.mockImplementation(async (_auth: AuthContextType, redirectCallback: () => void) => {
      capturedRedirectFunction = redirectCallback
      return true
    })

    renderWithProviders(<SessionSelectionPage />)

    const newSessionButton = screen.getByRole("button", {name: "Start a new session"})
    await userEvent.click(newSessionButton)

    await waitFor(() => {
      expect(mockPostSessionManagementUpdate).toHaveBeenCalled()
    })

    // Execute the captured redirect function
    expect(capturedRedirectFunction).toBeDefined()
    capturedRedirectFunction!()

    expect(mockNavigate).toHaveBeenCalledWith("/search-by-prescription-id")
  })

  it("has correct button IDs for accessibility", () => {
    renderWithProviders(<SessionSelectionPage />)

    expect(screen.getByRole("button", {name: "Start a new session"})).toHaveAttribute("id", "new-session")
    expect(screen.getByRole("button", {name: "Close this window"})).toHaveAttribute("id", "close-session")
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
