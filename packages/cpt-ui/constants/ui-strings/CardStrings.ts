// Constants for role cards
export const ROLE_CARDS = [
  {
    name: "JONES SURGERY",
    odsCode: "RCD60",
    address: "4 Sardinia street\nHolborn\nLondon\nSE4 6ER",
    specialty: "General Medical Practitioner",
    link: "tracker-selectrole-confirm"
  },
  {
    name: "COHEN'S CHEMIST",
    odsCode: "FV519",
    address: "22 Rue lane\nChiswick\nLondon\nKT19 D12",
    specialty: "Health Professional Access Role",
    link: "tracker-selectrole-confirm"
  },
  {
    name: "LOCUM PHARMACY",
    odsCode: "FFFFF",
    address: "",
    specialty: "Health Professional Access Role",
    link: "tracker-selectrole-locum"
  }
]

// Constants for select role page text
export const SELECT_ROLE_PAGE_TEXT = {
  title: "Select your role",
  caption: "Select the role you wish to use to access the service.",
  insetText: {
    visuallyHidden: "Information: ",
    message:
      "You are currently logged in at GREENE'S PHARMACY (ODS: FG419) with Health Professional Access Role."
  },
  confirmButton: {
    text: "Confirm and continue to find a prescription",
    link: "tracker-presc-no"
  },
  alternativeMessage: "Alternatively, you can choose a new role below.",
  organisation: "Organisation",
  role: "Role",
  roles_without_access_table_title: "View your roles without access to the clinical prescription tracking service."
}
