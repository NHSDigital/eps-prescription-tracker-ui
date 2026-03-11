import {AuthContextType} from "@/context/AuthProvider"

export function returnLocalState(auth: AuthContextType) {
  const rolesWithAccess = Array.isArray(auth.rolesWithAccess) ? auth.rolesWithAccess : []
  const rolesWithoutAccess = Array.isArray(auth.rolesWithoutAccess) ? auth.rolesWithoutAccess : []

  const stateValues = {
    error: auth.error,
    userSub: auth.userDetails?.sub || null,
    user: auth.user,
    isSignedIn: auth.isSignedIn,
    isSigningIn: auth.isSigningIn,
    isSigningOut: auth.isSigningOut,
    isConcurrentSession: auth.isConcurrentSession,
    invalidSessionCause: auth.invalidSessionCause,
    sessionId: auth.sessionId,
    rolesWithAccessCount: rolesWithAccess.length,
    rolesWithoutAccessCount: rolesWithoutAccess.length,
    selectedRole: auth.selectedRole || null,
    deviceId: auth.deviceId
  }
  return stateValues
}
