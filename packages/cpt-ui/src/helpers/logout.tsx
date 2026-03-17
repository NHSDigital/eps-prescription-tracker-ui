import {AuthContextType} from "@/context/AuthProvider"
import {logger} from "./logger"
import {AUTH_CONFIG, FRONTEND_PATHS} from "@/constants/environment"
import {readItemGroupFromLocalStorage} from "@/helpers/useLocalStorageState"
import {getOrCreateTabId} from "@/helpers/tabHelpers"
import {
  LOGOUT_MARKER_STORAGE_KEY,
  LOGOUT_MARKER_STORAGE_GROUP,
  LOGOUT_MARKER_MAX_AGE_MS
} from "@/constants/environment"

export type LogoutMarker = {
  timestamp: number
  reason: "signOut"
  initiatedByTabId: string
}

export const handleSignoutEvent = async (
  auth: AuthContextType,
  navigate: (path: string) => void,
  cause?: string,
  invalidSessionCause?: string
) => {
  const invalidSessionReason = auth.invalidSessionCause ? auth.invalidSessionCause : invalidSessionCause

  logger.info(`Handling sign out event with cause: ${cause}`
    + (invalidSessionReason ? ` and invalid session reason: ${invalidSessionReason}` : ""))

  if (invalidSessionReason) {
    await auth.updateInvalidSessionCause(invalidSessionReason)
    await signOut(auth, navigate, AUTH_CONFIG.REDIRECT_SESSION_SIGN_OUT, false)
  } else {
    await signOut(auth, navigate, AUTH_CONFIG.REDIRECT_SIGN_OUT, false)
  }
}

/* signOut offers explicit control over the sign out process.
* For most use cases handleSignoutEvent should be used to ensure the invalid session cause is properly handled
* and passed through to the logout redirect page if needed.
*/
export const signOut = async (
  authParam: AuthContextType,
  navigate?: (path: string) => void,
  redirectUri?: string | undefined,
  duplicateSignout?: boolean
) => {
  if (!duplicateSignout && checkForRecentLogoutMarker()) {
    logger.info("Skipping duplicate signOut call due to in-progress marker")
    return
  }

  // Prepare state before actioning logout
  createOrUpdateLogoutMarker()
  authParam.setStateForSignOut()

  const location = window.location.pathname
  logger.info(`Called signOut helper from ${location}` +
    (redirectUri ? ` with redirect of ${redirectUri}` : "") +
    (duplicateSignout ? " allowing duplicate sign out" : ""),
  authParam)

  try {
    logger.info("Signing out with specified redirect path", redirectUri)
    await authParam?.cognitoSignOut(redirectUri)
  } catch (err) {
    logger.error(`Error during sign out` + (redirectUri ? ` with specified redirect path: ${redirectUri}` : ""), err)

    // Unwrap the full error cause chain so the root cause is visible in the console
    let current: unknown = err
    while (current instanceof Error) {
      // eslint-disable-next-line no-console
      console.error("[signOut] Error:", current.message, current)
      current = current.cause
    }

    navigate?.(FRONTEND_PATHS.LOGOUT)
  }
  // Status hub will clear auth state
}

const createOrUpdateLogoutMarker = (): LogoutMarker => {
  const existingMarker = checkForRecentLogoutMarker()
  if (existingMarker) {
    existingMarker.timestamp = Date.now()
    writeLogoutMarker(existingMarker)
    return existingMarker
  }

  const now = Date.now()
  const newMarker: LogoutMarker = {
    timestamp: now,
    reason: "signOut",
    initiatedByTabId: getOrCreateTabId()
  }
  writeLogoutMarker(newMarker)
  return newMarker
}

export const readLogoutMarker = () => {
  const markerGroup =
  readItemGroupFromLocalStorage(LOGOUT_MARKER_STORAGE_GROUP) as Record<string, LogoutMarker | undefined>
  return markerGroup[LOGOUT_MARKER_STORAGE_KEY]
}

const writeLogoutMarker = (marker: LogoutMarker) => {
  try {
    const markerGroup =
    readItemGroupFromLocalStorage(LOGOUT_MARKER_STORAGE_GROUP) as Record<string, LogoutMarker | undefined>
    markerGroup[LOGOUT_MARKER_STORAGE_KEY] = marker
    window.localStorage.setItem(LOGOUT_MARKER_STORAGE_GROUP, JSON.stringify(markerGroup))
  } catch (error) {
    logger.error("Unable to write logout marker to storage", error)
  }
}

/* Exported functions used within this helper, AuthProvider or AccessProvider */
export const checkForRecentLogoutMarker = () => {
  const existingMarker = readLogoutMarker()
  if (existingMarker) {
    logger.info("Found existing logout marker in storage", existingMarker)
    if (isRecentMarker(existingMarker)) {
      logger.info("Existing market is recent", existingMarker)
      return existingMarker
    }
  }
  logger.info("No recent logout marker found")
  return undefined
}

export const clearLogoutMarkerFromStorage = () => {
  if (typeof window === "undefined") return
  const markerGroup =
  readItemGroupFromLocalStorage(LOGOUT_MARKER_STORAGE_GROUP) as Record<string, LogoutMarker | undefined>
  delete markerGroup[LOGOUT_MARKER_STORAGE_KEY]
  window.localStorage.setItem(LOGOUT_MARKER_STORAGE_GROUP, JSON.stringify(markerGroup))
}

export const isRecentMarker = (marker: LogoutMarker | undefined) => {
  return !!marker && Date.now() - marker.timestamp <= LOGOUT_MARKER_MAX_AGE_MS
}
