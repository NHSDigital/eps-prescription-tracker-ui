export const FOOTER_COPYRIGHT = "© NHS England"
export const COMMIT_ID = import.meta.env.VITE_COMMIT_ID

export const FOOTER_LINKS = [
  {
    text: "Privacy notice",
    // eslint-disable-next-line max-len
    href: "https://digital.nhs.uk/services/care-identity-service/registration-authority-users/registration-authority-help/privacy-notice",
    external: true
  },
  {
    text: "Terms and conditions (opens in new tab)",
    href: "https://www.nhs.uk/terms-and-conditions",
    external: false
  },
  {
    text: "Cookie policy",
    href: "cookies",
    external: false
  }
]
