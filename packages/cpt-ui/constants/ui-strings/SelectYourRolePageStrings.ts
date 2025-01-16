export const SELECT_YOUR_ROLE_PAGE_TEXT = {
  title: "Select your role",
  caption: "Select the role you wish to use to access the service.",
  titleNoAccess: "No access to the clinical prescription tracking service",
  captionNoAccess:
    "None of the roles on your Smartcard or other authenticators allow you to access the clinical prescription " +
    "tracking service. Contact your Registration Authority representative to obtain the correct code.",
  captionNoRoles:
    "You are currently logged in with no role selected and no roles available",
  loginInfoText: {
    visuallyHidden: "Information: ",
    message: (orgName: string, odsCode: string, roleName: string) =>
      `You are currently logged in at <b>${orgName} (${odsCode})</b> with <b>${roleName}</b>.`
  },
  confirmButton: {
    text: "Continue to find a prescription",
    link: "tracker-presc-no"
  },
  alternativeMessage: "Alternatively, you can choose a new role below.",
  organisation: "Organisation",
  role: "Role",
  roles_without_access_table_title:
      "View your roles without access to the clinical prescription tracking service.",
  noOrgName: "NO ORG NAME",
  rolesWithoutAccessHeader: "Your roles without access",
  noODSCode: "No ODS code",
  noRoleName: "No role name",
  noAddress: "Address not found",
  errorDuringRoleSelection: "Error during role selection",
  loadingMessage: "Loading..."
}
