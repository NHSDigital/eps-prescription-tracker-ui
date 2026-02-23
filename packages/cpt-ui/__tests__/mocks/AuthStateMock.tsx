import {jest} from "@jest/globals"
import {AuthContextType} from "@/context/AuthProvider"

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
  desktopId: "test-desktop-id",
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  selectedRole: undefined,
  userDetails: undefined,

  // Mock functions with sensible defaults
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn(),
  clearAuthState: jest.fn(),
  hasSingleRoleAccess: jest.fn().mockReturnValue(false),
  updateSelectedRole: jest.fn(),
  updateTrackerUserInfo: jest.fn(),
  updateInvalidSessionCause: jest.fn(),
  setIsSigningOut: jest.fn()
} as unknown as AuthContextType
