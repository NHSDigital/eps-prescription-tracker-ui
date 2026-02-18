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
    rolesWithAccess: auth.rolesWithAccess.length > 0 ? auth.rolesWithAccess : null,
    rolesWithoutAccess: auth.rolesWithoutAccess.length > 0 ? auth.rolesWithoutAccess : null,
    selectedRole: auth.selectedRole
  }
  return stateValues
}
