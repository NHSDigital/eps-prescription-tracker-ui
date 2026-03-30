import {jest} from "@jest/globals"
import {AuthContextType} from "@/context/AuthProvider"
import {SearchProviderContextType} from "@/context/SearchProvider"

/**
 * Default mock AuthContextType for testing.
 * Use spread syntax to override specific values in your tests:
 *
 * @example
 * const authState = {
 *   ...mockAuthState,
 *   isSignedIn: true,
 *   rolesWithAccess: [myRole]
 * }
 * mockUseAuth.mockReturnValue(authState)
 */
export const mockAuthState = {
  // State values
  error: null,
  user: null,
  isSignedIn: false,
  isSigningIn: false,
  isSigningOut: false,
  isConcurrentSession: false,
  invalidSessionCause: undefined,
  sessionId: "test-session-id",
  deviceId: "test-device-id",
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  selectedRole: undefined,
  userDetails: undefined,
  sessionTimeoutModalInfo: {showModal: false, timeLeft: 0, action: undefined, buttonDisabled: false},
  logoutModalType: undefined,

  // Mock functions with sensible defaults
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn(),
  clearAuthState: jest.fn(),
  hasSingleRoleAccess: jest.fn().mockReturnValue(false),
  updateSelectedRole: jest.fn(),
  updateTrackerUserInfo: jest.fn(),
  updateInvalidSessionCause: jest.fn(),
  setIsSigningOut: jest.fn(),
  setStateForSignOut: jest.fn().mockImplementation(() => Promise.resolve()),
  setStateForSignIn: jest.fn().mockImplementation(() => Promise.resolve()),
  setSessionTimeoutModalInfo: jest.fn(),
  setLogoutModalType: jest.fn(),
  setSentRumRoleLogs: jest.fn(),
  remainingSessionTime: undefined
} as unknown as AuthContextType

/**
 * Default mock SearchProviderContextType for testing.
 * Use spread syntax to override specific values in your tests:
 *
 * @example
 * const searchState = {
 *   ...mockSearchState,
 *   nhsNumber: "9735652587",
 *   searchType: "nhs"
 * }
 */
export const mockSearchState = {
  // State values
  prescriptionId: undefined,
  issueNumber: undefined,
  nhsNumber: undefined,
  firstName: undefined,
  lastName: undefined,
  dobDay: undefined,
  dobMonth: undefined,
  dobYear: undefined,
  postcode: undefined,
  searchType: undefined,

  // Mock functions with sensible defaults
  clearSearchParameters: jest.fn(),
  setPrescriptionId: jest.fn(),
  setIssueNumber: jest.fn(),
  setFirstName: jest.fn(),
  setLastName: jest.fn(),
  setDobDay: jest.fn(),
  setDobMonth: jest.fn(),
  setDobYear: jest.fn(),
  setPostcode: jest.fn(),
  setNhsNumber: jest.fn(),
  setSearchType: jest.fn(),
  getAllSearchParameters: jest.fn(),
  setAllSearchParameters: jest.fn()
} as unknown as SearchProviderContextType
