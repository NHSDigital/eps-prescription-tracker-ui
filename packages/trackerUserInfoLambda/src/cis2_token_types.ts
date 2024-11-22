// Types for outgoing data
export type RoleInfo = {
  roleName?: string;
  roleID?: string;
  ODS?: string;
  orgName?: string;
  siteName?: string;
  siteAddress?: string; // optional
};

export type UserInfoResponse = {
  rolesWithAccess: Array<RoleInfo>;
  rolesWithoutAccess: Array<RoleInfo>;
  currentlySelectedRole?: RoleInfo;
};

//*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-//

// Types for the incoming data [FIXME: Possibly incomplete? Based on some example requests, not a full schema]
export interface UserInfo {
  sub: string;
  uid?: string;
  nhsid_useruid?: string;
  nhsid_nrbac_roles?: Array<NRBACRole>;
  nhsid_user_orgs?: Array<UserOrg>;
  nhsid_org_roles?: Array<OrgRole>;
  nhsid_org_memberships?: Array<OrgMembership>;
  given_name?: string;
  family_name?: string;
  name?: string;
  display_name?: string;
  email?: string;
  title?: string;
  initials?: string;
  middle_names?: string;
  idassurancelevel?: string;
  gdc_id?: string;
  gmp_id?: string;
  consultant_id?: string;
  gmc_id?: string;
  rcn_id?: string;
  nmc_id?: string;
  gphc_id?: string;
  gdp_id?: string;
}

export interface NRBACRole {
  person_orgid: string;
  person_roleid: string;
  org_code: string;
  role_name: string;
  role_code: string;
  activities?: Array<string>;
  activity_codes?: Array<string>;
  workgroups?: Array<string>;
  workgroups_codes?: Array<string>;
  aow?: Array<string>;
  aow_codes?: Array<string>;
}

export interface UserOrg {
  org_name: string;
  org_code: string;
}

export interface OrgRole {
  person_orgid: string;
  org_name: string;
  org_code: string;
}

export interface OrgMembership {
  person_orgid: string;
  org_name: string;
  org_code: string;
  gnc?: string;
}
