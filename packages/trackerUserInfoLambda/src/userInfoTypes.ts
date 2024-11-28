// Types for outgoing data
export type RoleDetails = {
  roleName?: string;
  roleID?: string;
  orgCode?: string;
  orgName?: string;
  siteName?: string;
  siteAddress?: string;
};

export type UserDetails = {
  given_name?: string;
  family_name?: string;
  name?: string;
  display_name?: string;
  title?: string;
  initials?: string;
  middle_names?: string;
}

export type TrackerUserInfo = {
  user_details: UserDetails;
  roles_with_access: Array<RoleDetails>;
  roles_without_access: Array<RoleDetails>;
  currently_selected_role?: RoleDetails;
};

//*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-//

// Types for the incoming data
type AssuranceLevel = "0" | "1" | "2" | "3";

export interface UserInfoResponse {
  // Always included
  sub: string;

  // Claims from the "profile" scope
  name: string;
  family_name: string;
  given_name: string;
  uid: string;

  // Claims from the "email" scope
  email: string;

  // Claims from the "nhsperson" scope
  nhsid_useruid: string;
  title?: string;
  idassurancelevel?: AssuranceLevel;
  initials?: string;
  middle_names?: string;
  display_name?: string;

  // Claims from the "nationalrbacaccess" scope
  nhsid_nrbac_roles?: Array<NhsIdNRBACRole>;

  // Claims from the "associatedorgs" scope
  nhsid_user_orgs?: Array<NhsIdUserOrg>;
}

interface NhsIdNRBACRole {
  // Required fields
  org_code: string;
  person_orgid: string;
  person_roleid: string;
  role_code: string;
  role_name: string;

  // Optional fields
  activities?: Array<string>;
  activity_codes?: Array<string>;
  aow?: Array<string>;
  aow_codes?: Array<string>;
  workgroups?: Array<string>;
  workgroups_codes?: Array<string>;
}

interface NhsIdUserOrg {
  org_code: string;
  org_name: string;
}
