import {FRONTEND_PATHS} from "@/constants/environment"

export const CookieStrings = {
  banner : {
    cookie_title: "Cookies on the Clinical prescription tracking service",
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
  essential: {
    name1: "cpts-cookie-consent",
    purpose1: "Saves your cookie consent settings",
    expiry1: "When you close the browser (if you do not use the banner) or 1 ar (if you use the banner)",

    name2: "CognitoIdentityServiceProvider.[unique ID].LastAuthUser",
    purpose2:
    "A security cookie used by Amazon Web Services (AWS). " +
    "Stores authentication information about the user that has logged in for security purposes",
    expiry2: "1 year",

    name3: "CognitoIdentityServiceProvider.[unique ID].accessToken",
    purpose3:
    "A security cookie used by AWS. Makes the service work by allowing the user" +
    " to access all parts of the service for security purposes",
    expiry3: "1 year",

    name4: "CognitoIdentityServiceProvider.[unique ID].clockDrift",
    purpose4:
    "A security cookie used by AWS. Makes the service to work by helping all parts " +
    "of the service to stay in sync for security purposes",
    expiry4: "1 year",

    name5: "CognitoIdentityServiceProvider.[unique ID].idToken",
    purpose5: "A security cookie used by AWS. Stores information about the er that has logged in for security purposes",
    expiry5: "1 year",

    name6: "CognitoIdentityServiceProvider.[unique ID].oauthMetadata",
    purpose6: "A security cookie used by AWS. Stores authentication formation about the user for security purposes",
    expiry6: "1 year",

    name7: "CognitoIdentityServiceProvider.[unique ID].refreshToken",
    purpose7: "A security cookie used by AWS. Keeps the user's session active r security purposes",
    expiry7: "1 year"
  },

  analytics: {
    name1: "cwr_s",
    purpose1:
    "Used by Amazon CloudWatch RUM. Tells us how you use our website by ading the previous page you visited",
    expiry1: "When you close the browser",

    name2: "cwr_u",
    purpose2: "Used by Amazon CloudWatch RUM. Tells us if you've used our bsite before",
    expiry2: "When you close the browser"
  },
  cookie_policy: "Cookie policy",

  intro: {
    paragraph1:
    "NHS England uses cookies on the Clinical Prescription Tracking Service (CPTS). " +
     "For information about how we store your data, check our privacy policy for this service.",
    privacyPolicyText: "privacy policy"
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
    "check the Amazon CloudWatch RUM privacy policy (opens in new tab).",
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
    "CPTS might not work properly if all cookies are turned off, because it needs the essential cookies to work.",
    paragraph3:
    "You can also delete any cookies that are already on your device or browser by visiting their cookie settings. "
  },

  policyChanges: {
    heading: "Changes to this cookie policy",
    paragraph1:
    "If this cookie policy changes, you will see the cookie banner again next time you visit CPTS. " +
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
  cptCookies: "Cookies on the Clinical Prescription Tracking Service ",
  detailsSummaryText: (type: string) => `See the ${type.toLowerCase()} cookies we use`,
  cookieBannerLink: "Link to cookie policy",
  breadcrumbBack: {
    visuallyHidden: "Back to",
    label: "Home"
  },
  cookieName: "Cookie name",
  cookiePurpose: "Purpose",
  cookieExpiry: "Expiry"
}
