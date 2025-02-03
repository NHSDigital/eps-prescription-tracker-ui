export type RoleDetails = {
  role_name?: string
  role_id?: string
  org_code?: string
  org_name?: string
  site_name?: string
  site_address?: string
  uuid?: string
}

export type SelectedRole = {
  rolesWithAccess: Array<RoleDetails>
  currentlySelectedRole?: RoleDetails
  selectedRoleId?: string
}
