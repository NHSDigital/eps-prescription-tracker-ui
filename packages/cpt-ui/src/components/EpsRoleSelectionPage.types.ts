import {RoleDetails} from "@cpt-ui-common/common-types"
import {AuthContextType} from "@/context/AuthProvider"
import React from "react"

export type RolesWithAccessProps = {
  role: RoleDetails
  link: string
  uuid: string
}

export type RolesWithoutAccessProps = {
  uuid: string
  orgName: string
  odsCode: string
  roleName: string
}

export interface LocationType {
  pathname: string
}

export interface RoleCardProps {
  readonly roleCardProps: RolesWithAccessProps
  readonly isThisCardSelected: boolean
  readonly isOtherCardDisabled: boolean
  readonly onCardClick: (e: React.MouseEvent, roleCardProps: RolesWithAccessProps) => void
  readonly onCardKeyDown: (e: React.KeyboardEvent, roleCardProps: RolesWithAccessProps) => void
  readonly noOrgName: string
  readonly noODSCode: string
  readonly noRoleName: string
}

export interface RoleCardLinkProps {
  readonly roleCardProps: RolesWithAccessProps
  readonly isOtherCardDisabled: boolean
  readonly onCardClick: (e: React.MouseEvent, roleCardProps: RolesWithAccessProps) => void
  readonly onCardKeyDown: (e: React.KeyboardEvent, roleCardProps: RolesWithAccessProps) => void
  readonly linkStyle: React.CSSProperties
  readonly linkClassName: string
  readonly noOrgName: string
  readonly noODSCode: string
}

export interface RoleCardAddressProps {
  readonly address?: string
}

export interface RoleCardsSectionProps {
  readonly rolesWithAccess: Array<RolesWithAccessProps>
  readonly selectedCardId: string | null
  readonly isSelectingRole: boolean
  readonly onCardClick: (e: React.MouseEvent, roleCardProps: RolesWithAccessProps) => void
  readonly onCardKeyDown: (e: React.KeyboardEvent, roleCardProps: RolesWithAccessProps) => void
  readonly noOrgName: string
  readonly noODSCode: string
  readonly noRoleName: string
}

export interface RolesWithoutAccessSectionProps {
  readonly rolesWithoutAccess: Array<RolesWithoutAccessProps>
  readonly rolesWithoutAccessHeader: string
  readonly roles_without_access_table_title: string
  readonly organisation: string
  readonly role: string
}

export interface RoleComponentProps {
  readonly rolesWithAccess: Array<RolesWithAccessProps>
  readonly rolesWithoutAccess: Array<RolesWithoutAccessProps>
}

export interface RoleSelectionPageProps {
  readonly contentText: {
    readonly pageTitle: string
    readonly title: string
    readonly caption: string
    readonly titleNoAccess: string
    readonly captionNoAccess: string
    readonly insetText: {
      readonly visuallyHidden: string
      readonly message: string
      readonly loggedInTemplate: string
    }
    readonly confirmButton: {
      readonly link: string
      readonly text: string
    }
    readonly alternativeMessage: string
    readonly organisation: string
    readonly role: string
    readonly roles_without_access_table_title: string
    readonly noOrgName: string
    readonly rolesWithoutAccessHeader: string
    readonly noODSCode: string
    readonly noRoleName: string
    readonly noAddress: string
    readonly errorDuringRoleSelection: string
  }
}

export interface ErrorStateProps {
  readonly error: string
  readonly errorDuringRoleSelection: string
}

export interface UserInfoSectionProps {
  readonly auth: AuthContextType
  readonly title: string
  readonly titleNoAccess: string
  readonly caption: string
  readonly captionNoAccess: string
  readonly insetText: {
    readonly loggedInTemplate: string
  }
  readonly confirmButton: {
    readonly link: string
    readonly text: string
  }
  readonly alternativeMessage: string
  readonly isSelectingRole: boolean
  readonly onConfirmRole: () => void
  readonly noOrgName: string
  readonly noODSCode: string
  readonly noRoleName: string
}

export interface MainLayoutProps {
  readonly children: React.ReactNode
}
