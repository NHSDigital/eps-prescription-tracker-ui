import {AuthContextType} from "@/context/AuthProvider"

export function returnLocalState(auth: AuthContextType) {
  const stateValues = {
    error: auth.error,
    user: auth.user,
    isSignedIn: auth.isSignedIn,
    isSigningIn: auth.isSigningIn,
    isSigningOut: auth.isSigningOut,
    isConcurrentSession: auth.isConcurrentSession,
    invalidSessionCause: auth.invalidSessionCause,
    sessionId: auth.sessionId,
    rolesWithAccess: auth.rolesWithAccess,
    rolesWithoutAccess: auth.rolesWithoutAccess,
    selectedRole: auth.selectedRole
  }
  return stateValues
}
