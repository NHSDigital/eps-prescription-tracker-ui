import {FRONTEND_PATHS} from "@/constants/environment"

export const CookieStrings = {
  pageTitle: "Cookie policy - Prescription Tracker",
  banner : {
    cookie_title: "Cookies on the Prescription Tracker",
    cookie_text_p1: "We've put some small files called cookies on your device to make our site work.",
    cookie_text_p2: "We’d also like to use analytics cookies. "
    + "These send anonymous information about how our site is used to a service "
    + "called Amazon CloudWatch RUM. We use this information to improve our site.",
    cookie_text_p3:"Let us know if this is OK. We'll use a cookie to save your choice. You can ",
    cookie_text_p4: "before you choose.",
    cookies_info_link_text: "read more about our cookies "
  },
  cookies_page_link: FRONTEND_PATHS.COOKIES,
  cookie_banner: "cookie banner",
  accept_cookies: "Accept analytics cookies",
  reject_cookies: "Reject analytics cookies",
  text_linking_to_info_page: "You can change your cookie settings at any time using our ",
  cookies_page: "cookies page",
  essential: [{
    name: "nhsuk-cookie-consent",
    purpose: "Saves your cookie consent settings",
    expiry: "When you close the browser (if you do not set a cookie preference) "
    + "or 3 months (if you do set a cookie preference)"
  }],

  analytics: [{
    name: "cwr_s",
    purpose:
    "Used by Amazon CloudWatch RUM. Tells us how you use our website by adding the previous page you visited",
    expiry: "1 hour"
  }, {
    name: "cwr_u",
    purpose: "Used by Amazon CloudWatch RUM. Tells us if you've used our website before",
    expiry: "1 hour"
  }],
  cookie_policy: "Cookie policy",

  intro: {
    paragraph1:
    "NHS England uses cookies on the Prescription Tracker. " +
     "For information about how we store your data, check our privacy notice for this service.",
    privacyPolicyText: "privacy notice"
  },

  whatAreCookies: {
    heading: "What are cookies?",
    paragraph1: "Cookies are small files that are put on your phone, tablet, " +
    "laptop or computer when you use a website or app.",
    paragraph2:
    "Some cookies make a website or app work and others store " +
    "information about how you use a service, such as the pages you visit.",
    paragraph3: "Cookies are not viruses or computer programs. They are very small so do not take up much space."
  },

  howWeUseCookies: {
    heading: "How we use cookies",
    paragraph1: "We use cookies to make our service work and keep it secure. These are known as essential cookies.",
    paragraph2:
     "We also use cookies to measure how you use our service, such as which links you click on. " +
     "These are analytics cookies and we will only use them if you say it's ok."
  },

  essentialCookies: {
    heading: "Essential cookies we use",
    tableTitle: "Essential cookies"
  },

  analyticsCookies: {
    heading: "Optional analytics cookies we use",
    paragraph1:
    "We use software called Amazon CloudWatch RUM to collect analytics data about how " +
    "you use the service so that we can make improvements. " +
    "For information about how Amazon stores your data, " +
    "check the Amazon CloudWatch RUM privacy policy.",
    tableTitle: "Analytics cookies",
    policyLinkText: "Amazon CloudWatch RUM privacy policy (opens in new tab)"
  },

  cookieSettings: {
    heading: "Choose if we can use cookies to measure your website use",
    acceptLabel: "Use cookies to measure my website use",
    rejectLabel: "Do not use cookies to measure my website use",
    saveButton: "Save my cookie settings"
  },

  changeSettings: {
    heading: "How to change your cookie settings",
    paragraph1: "You can visit this page at any time to change your cookie settings.",
    paragraph2: "You can also change your cookie settings in most devices and browsers. " +
    "Prescription Tracker might not work properly if all cookies are turned off," +
    " because it needs the essential cookies to work.",
    paragraph3:
    "You can also delete any cookies that are already on your device or browser by visiting their cookie settings. "
  },

  policyChanges: {
    heading: "Changes to this cookie policy",
    paragraph1:
    "If this cookie policy changes, you will see the cookie banner again next time you visit the" +
    " Prescription Tracker. " +
    "You can check this policy for any changes to the cookies that we use"
  },
  savedCookieSettings: "Your cookie settings have been saved",
  home: "Home",
  saveSettings: "We'll save your settings for a year.",
  questionSaveSettings: "We'll ask you if you're still OK with us using cookies when either:",
  oneYear: "it's been a year since you last saved your settings",
  newCookies: "we add any new cookies or change the cookies we use",
  also: "You can also ",
  cookieChoose: "choose which cookies we use",
  anyTime: " at any time.",
  pageLastReviewed: "Page last reviewed: 15 March 2025",
  pageNextReviewed: "Next review due: 15 March 2026",
  cptCookies: "Cookies on the Prescription Tracker ",
  detailsSummaryText: (type: string) => `See the ${type.toLowerCase()} we use`,
  cookieBannerLink: "Link to cookie policy",
  breadcrumbBack: {
    visuallyHidden: "Back to",
    label: "Home"
  },
  cookieName: "Cookie name",
  cookiePurpose: "Purpose",
  cookieExpiry: "Expiry"
}
