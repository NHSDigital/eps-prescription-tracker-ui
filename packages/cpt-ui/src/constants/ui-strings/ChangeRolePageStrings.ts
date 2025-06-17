import {FRONTEND_PATHS} from "@/constants/environment"

export const CHANGE_YOUR_ROLE_PAGE_TEXT = {
  title: "Change your role",
  caption: "Select the role you wish to use to access the service.",
  titleNoAccess: "No access to the Prescription Tracker",
  captionNoAccess:
    "None of the roles on your Smartcard or other authenticators allow you to access the " +
    "Prescription Tracker. Contact your Registration Authority representative to obtain the correct code.",
  insetText: {
    visuallyHidden: "Information: ",
    message:
      "You are currently logged in at GREENE'S PHARMACY (ODS: FG419) with Health Professional Access Role."
  },
  confirmButton: {
    text: "Continue to find a prescription",
    link: FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID
  },
  alternativeMessage: "Alternatively, you can choose a new role below.",
  organisation: "Organisation",
  role: "Role",
  roles_without_access_table_title:
    "View your roles without access to the Prescription Tracker",
  noOrgName: "NO ORG NAME",
  rolesWithoutAccessHeader: "Your roles without access",
  noODSCode: "No ODS code",
  noRoleName: "No role name",
  noAddress: "Address not found",
  errorDuringRoleSelection: "Error during role selection"
}
