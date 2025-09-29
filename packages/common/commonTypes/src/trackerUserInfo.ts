export type RoleDetails = {
  role_name?: string;
  role_id?: string;
  org_code?: string;
  org_name?: string;
  site_name?: string;
  site_address?: string;
};

export type UserDetails = {
  family_name: string;
  given_name: string;
  sub?: string;
  name?: string;
};

export type TrackerUserInfo = {
  roles_with_access: Array<RoleDetails>;
  roles_without_access: Array<RoleDetails>;
  currently_selected_role?: RoleDetails;
  user_details: UserDetails;
  multiple_sessions?: boolean;
  is_concurrent_session?: boolean;
  sessionId?: string;
  error?: string | null;
};

export type TrackerUserInfoResult = {
  rolesWithAccess: Array<RoleDetails>,
  rolesWithoutAccess: Array<RoleDetails>,
  hasNoAccess: boolean
  selectedRole: RoleDetails | undefined,
  userDetails: UserDetails | undefined,
  hasSingleRoleAccess: boolean,
  isConcurrentSession: boolean,
  invalidSessionCause: string | undefined,
  sessionId: string | undefined,
  error: string | null
}
