export const FOOTER_COPYRIGHT = "© NHS England"
export const COMMIT_ID = import.meta.env.VITE_COMMIT_ID
export const VERSION_NUMBER = import.meta.env.VITE_VERSION_NUMBER

export const FOOTER_LINKS = [
  {
    text: "Privacy notice",
    href: "/site/privacy-notice",
    external: false,
    testId: "eps_footer-link-privacy-notice"
  },
  {
    text: "Terms and conditions (opens in new tab)",
    // eslint-disable-next-line max-len
    href: "https://digital.nhs.uk/services/care-identity-service/registration-authority-users/registration-authority-help/privacy-notice",
    external: true,
    testId: "eps_footer-link-terms-and-conditions"
  },
  {
    text: "Cookie policy",
    href: "/site/cookies",
    external: false,
    testId: "eps_footer-link-cookie-policy"
  }
]
