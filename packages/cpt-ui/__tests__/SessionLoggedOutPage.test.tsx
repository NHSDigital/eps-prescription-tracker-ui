import "@testing-library/jest-dom"
import {render, screen} from "@testing-library/react"
import React, {useState} from "react"
import {MemoryRouter} from "react-router-dom"
import {AuthContext, type AuthContextType} from "@/context/AuthProvider"
import SessionSelectionPage from "@/pages/SessionSelection"
import SessionLoggedOutPage from "@/pages/SessionLoggedOut"

jest.mock("@/helpers/awsRum")
jest.mock("@/context/configureAmplify")
jest.mock("@/helpers/logout", () => ({
  signOut: jest.fn()
}))

jest.mock("@/constants/environment", () => ({
  AUTH_CONFIG: {
    USER_POOL_ID: "test-pool-id",
    USER_POOL_CLIENT_ID: "test-client-id",
    HOSTED_LOGIN_DOMAIN: "test.domain",
    REDIRECT_SIGN_IN: "http://localhost:3000",
    REDIRECT_SIGN_OUT: "http://localhost:3000/logout",
    REDIRECT_SESSION_SIGN_OUT: "http://localhost:3000/site/session-signed-out"
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
  updateTrackerUserInfo: mockUpdateTrackerUserInfo,
  updateInvalidSessionCause: jest.fn(),
  updateSigningOutStatus: jest.fn(),
  isSigningOut: false,
  setIsSigningOut: jest.fn()
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

describe("SessionLoggedOutPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders without crashing with no invalidSessionCause state", () => {
    renderWithProviders(<SessionLoggedOutPage />)

    expect(screen.getByRole("main")).toBeInTheDocument()
    expect(screen.getByText("For your security, we have logged you out")).toBeInTheDocument()
    expect(screen.getByText(
      "We have logged you out because you did not do anything for 15 minutes."
    )).toBeInTheDocument()
    expect(screen.getByText(
      "This is to protect patient information."
    )).toBeInTheDocument()
  })

  it("renders without crashing with ConcurrentSession invalidSessionCause state", () => {
    let adjustedState = JSON.parse(JSON.stringify(defaultAuthState))
    adjustedState.invalidSessionCause = "ConcurrentSession"
    renderWithProviders(<SessionLoggedOutPage />, adjustedState)

    expect(screen.getByRole("main")).toBeInTheDocument()
    expect(screen.getByText("You have been logged out")).toBeInTheDocument()
    expect(screen.getByText(
      "We have logged you out because you started another session in a new window or browser."
    )).toBeInTheDocument()
    expect(
      screen.getByText((content, element) =>
        element?.textContent ===
        // eslint-disable-next-line max-len
        "Contact the NHS national service desk at ssd.nationalservicedesk@nhs.net if you did not start another session in another window or browser."
      )
    ).toBeInTheDocument()
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
