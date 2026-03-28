import {logger} from "@/helpers/logger"
import {RoleDetails} from "@cpt-ui-common/common-types"
import {FRONTEND_PATHS} from "@/constants/environment"
import {AuthContextType} from "@/context/AuthProvider"
import {
  RolesWithAccessProps,
  RolesWithoutAccessProps,
  LocationType,
  RoleComponentProps
} from "./EpsRoleSelectionPage.types"
import React from "react"

// Helper functions to reduce cognitive complexity
export function createCardClassName(isOtherCardDisabled: boolean, isThisCardSelected: boolean): string {
  let className = "nhsuk-card nhsuk-card--primary nhsuk-u-margin-bottom-4"
  if (isOtherCardDisabled) className += " nhsuk-card--disabled"
  if (isThisCardSelected) className += " nhsuk-card--selected"
  return className
}

export function createHandleKeyDown(
  isOtherCardDisabled: boolean,
  onCardKeyDown: (e: React.KeyboardEvent, roleCardProps: RolesWithAccessProps) => void,
  roleCardProps: RolesWithAccessProps
) {
  return (e: React.KeyboardEvent) => {
    if (!isOtherCardDisabled) {
      onCardKeyDown(e, roleCardProps)
    }
  }
}

export function createCardStyle(isOtherCardDisabled: boolean) {
  return {
    cursor: isOtherCardDisabled ? "not-allowed" : "pointer",
    opacity: isOtherCardDisabled ? 0.5 : 1,
    pointerEvents: isOtherCardDisabled ? "none" as const : "auto" as const
  }
}

export function createLinkStyle(isOtherCardDisabled: boolean) {
  return {
    textDecoration: "none",
    color: "inherit",
    pointerEvents: isOtherCardDisabled ? "none" as const : "auto" as const,
    cursor: isOtherCardDisabled ? "not-allowed" : "pointer"
  }
}

export function createLinkClassName(isOtherCardDisabled: boolean, isThisCardSelected: boolean): string {
  let className = ""
  if (isOtherCardDisabled) className += "disabled-card-link "
  if (isThisCardSelected) className += "selected-card-link"
  return className.trim()
}

// Helper function to transform roles data for display
export function transformRolesData(
  rolesWithAccess: Array<RoleDetails>,
  rolesWithoutAccess: Array<RoleDetails>,
  selectedRole: RoleDetails | null | undefined,
  noRoleName: string,
  noOrgName: string,
  noODSCode: string
): RoleComponentProps {
  const rolesWithAccessComponentProps = rolesWithAccess.length === 0
    ? []
    : rolesWithAccess.map((role: RoleDetails, index) => ({
      uuid: `role_with_access_${index}`,
      role,
      link: FRONTEND_PATHS.YOUR_SELECTED_ROLE
    })).filter((duplicateRole) => duplicateRole.role.role_id !== selectedRole?.role_id)

  const rolesWithoutAccessComponentProps = rolesWithoutAccess.map((role, index) => ({
    uuid: `role_without_access_${index}`,
    roleName: role.role_name || noRoleName,
    orgName: role.org_name || noOrgName,
    odsCode: role.org_code || noODSCode
  }))

  return {
    rolesWithAccess: rolesWithAccessComponentProps,
    rolesWithoutAccess: rolesWithoutAccessComponentProps
  }
}

// Helper function to log role chunks for RUM
export function logRoleChunks(
  auth: AuthContextType,
  rolesWithAccessComponentProps: Array<RolesWithAccessProps>,
  rolesWithoutAccessComponentProps: Array<RolesWithoutAccessProps>,
  location: LocationType
) {
  if (!auth.userDetails?.sub) return

  const logId = crypto.randomUUID()

  logger.debug("Counts of roles returned vs rendered", {
    logId,
    sessionId: auth.sessionId,
    userId: auth.userDetails.sub,
    pageName: location.pathname,
    currentlySelectedRole: !!auth.selectedRole,
    returnedRolesWithAccessCount: auth.rolesWithAccess.length,
    returnedRolesWithoutAccessCount: auth.rolesWithoutAccess.length,
    renderedRolesWithAccessCount: rolesWithAccessComponentProps.length,
    renderedRolesWithoutAccessCount: rolesWithoutAccessComponentProps.length
  }, true)

  logger.debug("Auth context for rendered roles", {
    logId,
    sessionId: auth.sessionId,
    userId: auth.userDetails.sub,
    pageName: location.pathname,
    authContext: {
      cognitoUsername: auth.user,
      name: auth.userDetails.name,
      currentlySelectedRole: auth.selectedRole,
      isSignedIn: auth.isSignedIn,
      isSigningIn: auth.isSigningIn,
      isSigningOut: auth.isSigningOut,
      isConcurrentSession: auth.isConcurrentSession,
      error: auth.error,
      invalidSessionCause: auth.invalidSessionCause
    }
  }, true)

  const chunkRolesForRumLogs = (
    roles: Array<unknown>, logMessage: string, logId: string, fieldToPopulate: string) => {
    const chunkSize = 4
    const chunks = []
    for (let index = 0; index < roles.length; index += chunkSize) {
      const chunk = roles.slice(index, index + chunkSize)
      chunks.push(chunk)
    }

    for (const [index, chunk] of chunks.entries()){
      logger.debug(logMessage, {
        logId,
        sessionId: auth.sessionId,
        userId: auth.userDetails?.sub,
        pageName: location.pathname,
        totalChunks: chunks.length,
        chunkNo: index+1,
        [fieldToPopulate]: chunk
      }, true)
    }
  }

  chunkRolesForRumLogs(auth.rolesWithAccess, "Returned roles with access", logId, "returnedRolesWithAccess")
  chunkRolesForRumLogs(auth.rolesWithoutAccess, "Returned roles without access", logId, "returnedRolesWithoutAccess")
  chunkRolesForRumLogs(rolesWithAccessComponentProps, "Rendered roles with access", logId, "renderedRolesWithAccess")
  chunkRolesForRumLogs(rolesWithoutAccessComponentProps,
    "Rendered roles without access", logId, "renderedRolesWithoutAccess")
}
