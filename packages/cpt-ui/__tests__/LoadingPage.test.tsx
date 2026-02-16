
import {useAuth as mockUseAuth} from "@/context/AuthProvider"
import {logger} from "@/helpers/logger"
import {mockAuthState} from "./mocks/AuthStateMock"
import {render} from "@testing-library/react"
import {normalizePath as mockNormalizePath} from "@/helpers/utils"
import {AccessProvider} from "@/context/AccessProvider"
import {useNavigate, useLocation, MemoryRouter} from "react-router-dom"
import Layout from "@/Layout"
import LoadingPage from "@/pages/LoadingPage"
import {ENV_CONFIG} from "@/constants/environment"
import {returnLocalState} from "@/helpers/appLocalStateOutput"

jest.mock("@/helpers/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
  useLocation: jest.fn()
}))

jest.mock("@/helpers/utils", () => ({
  normalizePath: jest.fn()
}))

jest.mock("@/components/EpsHeader", () => ({
  __esModule: true,
  default: jest.fn(() => null)
}))

jest.mock("@/context/AuthProvider", () => ({
  useAuth: jest.fn()
}))

let mockReturn = {
  ...mockAuthState,
  sessionId: "session-1234",
  isSignedIn: true,
  isSigningIn: false,
  isConcurrentSession: true
}

describe("LoadingPage", () => {
  const navigate = jest.fn()
  const mockNavigateHook = useNavigate as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockNavigateHook.mockReturnValue(navigate)
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it("renders if should block children true and sends rum log after timeout", () => {
    // Setup
    let mockReturnAdjusted = {
      ...mockReturn,
      isSignedIn: true,
      isSigningOut: true,
      updateTrackerUserInfo: jest.fn().mockResolvedValue({error: null})
    }
    ;(mockUseAuth as jest.Mock).mockReturnValue({...mockReturnAdjusted})

    const path = "/some-protected-path"
    ;(useLocation as jest.Mock).mockReturnValue({
      pathname: `${path}`
    })
    ;(mockNormalizePath as jest.Mock).mockReturnValue(path)

    const {container} = render(
      <MemoryRouter>
        <AccessProvider>
          <Layout>
            <LoadingPage />
          </Layout>
        </AccessProvider>
      </MemoryRouter>
    )

    // Should render nothing (children blocked) - show loading wheel
    expect(container).toBeInTheDocument()

    // Advance time to trigger useEffect
    jest.advanceTimersByTime(ENV_CONFIG.RUM_ERROR_TIMER_INTERVAL + 1000)

    // Verify
    const localState = returnLocalState(mockReturnAdjusted)
    expect(logger.debug)
      .toHaveBeenCalledWith("Redirection page error timer", {...localState, path}, true)
  })

  it("renders if should block children true and doesnt send rum log before timeout", () => {
    // Setup
    let mockReturnAdjusted = {
      ...mockReturn,
      isSignedIn: true,
      isSigningOut: true,
      updateTrackerUserInfo: jest.fn().mockResolvedValue({error: null})
    }
    ;(mockUseAuth as jest.Mock).mockReturnValue({...mockReturnAdjusted})

    const path = "/some-protected-path"
    ;(useLocation as jest.Mock).mockReturnValue({
      pathname: `${path}`
    })
    ;(mockNormalizePath as jest.Mock).mockReturnValue(path)

    const {container} = render(
      <MemoryRouter>
        <AccessProvider>
          <Layout>
            <LoadingPage />
          </Layout>
        </AccessProvider>
      </MemoryRouter>
    )

    // Should render nothing (children blocked) - show loading wheel
    expect(container).toBeInTheDocument()

    // Advance time to trigger useEffect
    jest.advanceTimersByTime(ENV_CONFIG.RUM_ERROR_TIMER_INTERVAL - 1000)

    // Verify
    const localState = returnLocalState(mockReturnAdjusted)
    expect(logger.debug).not.toHaveBeenCalledWith(`Redirection page error timer: ${path}`, localState, true)
  })
})
