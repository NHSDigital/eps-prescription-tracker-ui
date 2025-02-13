export type RoleDetails = {
  role_name?: string;
  role_id?: string;
  org_code?: string;
  org_name?: string;
  site_name?: string;
  site_address?: string;
  uuid?: string;
};

export type UserDetails = {
  family_name: string;
  given_name: string;
};

export type TrackerUserInfo = {
  roles_with_access: Array<RoleDetails>;
  roles_without_access: Array<RoleDetails>;
  currently_selected_role?: RoleDetails;
  user_details: UserDetails;
};
