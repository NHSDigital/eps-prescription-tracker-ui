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
  roles_with_access: Array<RoleDetails>
  currently_selected_role?: RoleDetails
}
