Task: Refactor auth state from independent booleans (isSignedIn, isSigningOut, isSigningIn, selectedRole, etc.) into a discriminated union state machine to fix race conditions in routing logic.
Changes needed:

Define AuthState as a discriminated union with variants: signed_out, signing_in, signed_in (with selectedRole and isConcurrentSession), signing_out
Create an authReducer that enforces valid transitions only (e.g. SIGN_OUT_START only from signed_in, SIGN_OUT_COMPLETE only from signing_out)
Refactor routing/redirect logic from an if-chain over booleans to a switch on auth.status, with signing_in/signing_out as no-op/loading states that don't redirect

Bug being fixed: During sign-out, isSignedIn is still true while isSigningOut is also true, causing the router to match the "signed in but no role" branch and redirect to role selection instead of login.

--
Analysis of the Problem
The core issue is that your auth state is represented by independent booleans that can fall into contradictory combinations during transitions. For example, during sign-out there's a window where isSignedIn is still true while isSigningOut is also true, and if a render/navigation fires at the wrong moment, your routing logic hits the wrong branch.
Specific problems in the redirect logic:

loggedOut check is fragile: !auth.isSignedIn && !auth.isSigningOut — during the sign-out transition, neither this nor loggingOut may be true for a brief moment, leaving the user in limbo.
Order-dependent if-chain: The concurrent check happens before noRole, but loggedOut is checked last. A user mid-sign-out can match noRole (isSignedIn still true, no role) before they match loggedOut, which is exactly the bug you described.
No explicit "signing in" handling: A user mid-sign-in could match loggedOut and get bounced to login.

--

Proposed Solution: A State Machine
Replace the independent booleans with a single discriminated union representing mutually exclusive auth states:
typescripttype AuthState =
  | { status: "signed_out" }
  | { status: "signing_in" }
  | { status: "signed_in"; selectedRole: null; isConcurrentSession: boolean }
  | { status: "signed_in"; selectedRole: Role; isConcurrentSession: boolean }
  | { status: "signing_out" }

// Derive convenience checks if needed
const isFullyAuthenticated = (auth: AuthState): auth is Extract<AuthState, { status: "signed_in"; selectedRole: Role }> =>
  auth.status === "signed_in" && auth.selectedRole !== null
Then your routing becomes a clean, exhaustive switch:
typescriptreactconst ensureRoleSelected = () => {
  const path = normalizePath(location.pathname)
  const inNoRoleAllowed = ALLOWED_NO_ROLE_PATHS.includes(path)
  const isPublic = PUBLIC_PATHS.includes(path)
  const atRoot = path === "/"
  const atLogin = path === FRONTEND_PATHS.LOGIN

  switch (auth.status) {
    case "signing_in":
    case "signing_out":
      // During transitions, don't redirect — show a loading state or do nothing.
      // This prevents the "flash of wrong experience" entirely.
      return

    case "signed_out": {
      if (!isPublic && !inNoRoleAllowed) {
        return navigate(FRONTEND_PATHS.LOGIN)
      }
      // Already on a public/allowed page — do nothing
      return
    }

    case "signed_in": {
      // Signed-in user hitting login page
      if (atLogin) {
        return navigate(
          auth.selectedRole
            ? FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID
            : FRONTEND_PATHS.SELECT_YOUR_ROLE
        )
      }

      // Concurrent session takes priority
      if (auth.isConcurrentSession && !isPublic && path !== FRONTEND_PATHS.SESSION_SELECTION) {
        return navigate(FRONTEND_PATHS.SESSION_SELECTION)
      }

      // No role selected — force role selection
      if (!auth.selectedRole && (!inNoRoleAllowed || atRoot)) {
        return navigate(FRONTEND_PATHS.SELECT_YOUR_ROLE)
      }

      // Fully authed at root — send to default page
      if (auth.selectedRole && atRoot) {
        return navigate(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
      }

      return
    }
  }
}
Managing Transitions
In your auth provider / reducer, enforce the state machine:
typescripttype AuthAction =
  | { type: "SIGN_IN_START" }
  | { type: "SIGN_IN_SUCCESS"; isConcurrentSession: boolean }
  | { type: "SIGN_IN_FAILURE" }
  | { type: "SELECT_ROLE"; role: Role }
  | { type: "SIGN_OUT_START" }
  | { type: "SIGN_OUT_COMPLETE" }

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SIGN_IN_START":
      if (state.status !== "signed_out") return state // ignore invalid transitions
      return { status: "signing_in" }

    case "SIGN_IN_SUCCESS":
      if (state.status !== "signing_in") return state
      return { status: "signed_in", selectedRole: null, isConcurrentSession: action.isConcurrentSession }

    case "SIGN_IN_FAILURE":
      if (state.status !== "signing_in") return state
      return { status: "signed_out" }

    case "SELECT_ROLE":
      if (state.status !== "signed_in") return state
      return { ...state, selectedRole: action.role }

    case "SIGN_OUT_START":
      if (state.status !== "signed_in") return state
      return { status: "signing_out" }

    case "SIGN_OUT_COMPLETE":
      if (state.status !== "signing_out") return state
      return { status: "signed_out" }

    default:
      return state
  }
}
