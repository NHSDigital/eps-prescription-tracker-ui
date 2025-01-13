// mockUserInfo.ts
import {TrackerUserInfo, RoleDetails} from "./userInfoTypes"

export const mockUserInfo = (): TrackerUserInfo => {
  const rolesWithAccess: Array<RoleDetails> = [
    {
      role_name: "General Medical Practitioner",
      role_id: "555043304334",
      org_code: "N82668"
    },
    {
      role_name: "General Medical Practitioner",
      role_id: "555043304334",
      org_code: "A21293"
    },
    {
      role_name: "General Medical Practitioner",
      role_id: "555043304334",
      org_code: "B84610"
    }
  ]

  const rolesWithoutAccess: Array<RoleDetails> = [
    {
      role_name: "Registration Authority Agent",
      role_id: "555043304334",
      org_code: "X09"
    },
    {
      role_name: "General Medical Practitioner",
      role_id: "555043304334",
      org_code: "A22279"
    },
    {
      role_name: "Consultant",
      role_id: "555043304334",
      org_code: "RCD"
    },
    {
      role_name: "Registration Authority Manager",
      role_id: "555043304334",
      org_code: "5BR"
    },
    {
      role_name: "Demographic Supervisor",
      role_id: "555043304334",
      org_code: "8JD29"
    },
    {
      role_name: "General Medical Practitioner",
      role_id: "555043304334",
      org_code: "P84009"
    }
  ]

  const currentlySelectedRole: RoleDetails = {
    role_name: "Health Professional Access Role",
    role_id: "555043304334",
    org_code: "FG419",
    org_name: "GREENE'S PHARMACY"
  }

  return {
    roles_with_access: rolesWithAccess,
    roles_without_access: rolesWithoutAccess,
    currently_selected_role: currentlySelectedRole
  }
}
