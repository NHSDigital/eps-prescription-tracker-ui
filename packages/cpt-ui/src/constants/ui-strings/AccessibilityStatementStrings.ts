import type {RichTextNode} from "@/components/EpsRichText"

export const AccessibilityStatementStrings = {
  pageTitle: "Accessibility statement – Prescription tracker",
  home: "Home",
  header: "Accessibility statement for the Prescription Tracker",
  openingSection: {
    p1: [
      "This accessibility statement applies to the ",
      {text: "Prescription Tracker", href: "/site"} satisfies RichTextNode,
      "."
    ] satisfies Array<RichTextNode>,
    p2: "This website is run by NHS England. We want as many people as possible to be able to use this website. "
    + "For example, that means you should be able to:",
    listItems: [
      "change colours, contrast levels and fonts using browser or device settings",
      "zoom in up to 400% without the text spilling off the screen",
      "navigate most of the website using a keyboard or speech recognition software",
      "listen to most of the website using a screen reader (including the most recent versions of JAWS, "
      + "NVDA and VoiceOver)"
    ],
    p3: "We’ve also made the website text as simple as possible to understand.",
    p4: [
      {
        text: "AbilityNet (opens in new tab)",
        href: "https://www.abilitynet.org.uk/",
        external: true
      } satisfies RichTextNode,
      " has advice on making your device easier to use if you have a disability."
    ] satisfies Array<RichTextNode>
  },
  knownIssues: {
    header: "How accessible this website is",
    p1: "We know some parts of this website are not fully accessible:",
    listItems: [
      "screenreaders do not continue to read content when you select a new tab on the ‘Search for a prescription’ page",
      "using the tab key does not focus the ‘Skip to main content’ link after a page is loaded",
      "if you click into a page after it is loaded, using the tab key does not focus the next element of the page",
      "the hint text is not associated with the search field on the prescription ID tab on the "
      + "‘Search for a prescription’ page",
      "the cards on the ‘Select your role’ page should stay white when focused or hovered over",
      "on smaller screens, there is no aria-expanded attribute on the menu icon",
      "when you enter information into a field on the ‘Search for a prescription’ page and search, the "
      + "page refreshes and focus is moved to the footer if you are navigating using arrow keys",
      "the tabs on the ‘Prescription List’ page are separate URLs with the same headings and page titles, "
      + "instead of the same URL with different fragment identifiers",
      "selecting the tabs on the ‘Search for a prescription’ page should show you unique headings and page "
      + "titles because each tab is a separate URL"
    ]
  },
  feedbackContactInformation: {
    header: "Feedback and contact information",
    p1: [
      "If you find any problems not listed on this page or think we're not meeting accessibility requirements, email ",
      {text: "epssupport@nhs.net", href: "mailto:epssupport@nhs.net"} satisfies RichTextNode,
      "."
    ] satisfies Array<RichTextNode>,
    p2: [
      "If you need information on this website in a different format, email ",
      {text: "epssupport@nhs.net", href: "mailto:epssupport@nhs.net"} satisfies RichTextNode,
      "."
    ] satisfies Array<RichTextNode>,
    p3: "We’ll consider your request and get back to you within 5 working days."
  },
  enforcementProcedure: {
    header: "Enforcement procedure",
    p1: [
      "The Equality and Human Rights Commission (EHRC) is responsible for enforcing the Public Sector Bodies "
      + "(Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018 "
      + "(the 'accessibility regulations'). If you're not happy with how we respond to your complaint, contact the ",
      {
        text: "Equality Advisory and Support Service (opens in new tab)",
        href: "https://www.equalityadvisoryservice.com/",
        external: true
      } satisfies RichTextNode,
      "."
    ] satisfies Array<RichTextNode>
  },
  technicalInformation: {
    header: "Technical information about this website’s accessibility",
    p1: "NHS England is committed to making its website accessible, in accordance with the Public Sector Bodies "
    + "(Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018."
  },
  complianceStatus: {
    header: "Compliance status",
    p1: "The website has been tested against the Web Content Accessibility Guidelines (WCAG) 2.2 AA standard.",
    p2: "This website is partially compliant with the Web Content Accessibility Guidelines version 2.2 AA standard, "
    + "due to the non-compliances listed below."
  },
  nonaccessibleContent: {
    header: "Non-accessible content",
    p1: "The content listed in the ‘Non-compliance with the accessibility regulations’ section explains the WCAG 2.2"
    + " criteria that the Prescription Tracker is not compliant with and why.",
    subheader: "Non-compliance with the accessibility regulations",
    subListItems: [
      "Screenreaders do not continue to read content when you select a new tab on the ‘Search for a prescription’ "
      + "page. This fails WCAG 2.2 success criterion 2.4.3 (focus order).",
      "Using the tab key does not focus the ‘Skip to main content’ link after a page is loaded. This fails "
      + "WCAG 2.2 success criterion 2.4.3 (focus order).",
      "If you click into a page after it is loaded, using the tab key does not focus the next element of the page. "
      + "This fails WCAG 2.2 success criterion 2.4.3 (focus order).",
      "The hint text is not associated with the search field on the prescription ID tab on the "
      + "‘Search for a prescription’ page. This fails WCAG 2.2 success criterion 3.3.1 (error identification). ",
      "The cards on the ‘Select your role’ page should stay white when focused or hovered over. This fails WCAG 2.2 "
      + "success criteria 1.4.11 (minimum contrast and non-text contrast).",
      "On smaller screens, there is no aria-expanded attribute on the menu icon. This fails WCAG 2.2 success "
      + "criterion 4.1.2 (name, role, value).",
      "When you enter information into a field on the ‘Search for a prescription’ page and search, the page refreshes "
      + "and focus is moved to the footer if you are navigating using arrow keys. "
      + "This fails WCAG 2.2 success criterion 3.2.2 (on input).",
      "The tabs on the ‘Prescription List’ page are separate URLs with the same headings and page titles, instead of "
      + "the same URL with different fragment identifiers. "
      + "This fails WCAG 2.2 success criterion 2.4.2 (page titled).",
      "Selecting the tabs on the ‘Search for a prescription’ page should show you unique headings and page titles "
      + "because each tab is a separate URL. "
      + "This fails WCAG 2.2 success criterion 2.4.2 (page titled)."
    ],
    p2: "We plan on fixing these issues before the Prescription Tracker is available to use nationally."
  },
  improvingAccessibility: {
    header: "What we’re doing to improve accessibility",
    p1: "An external company will audit the Prescription Tracker’s accessibility again in the next few months. "
    + "We plan on fixing all accessibility issues before the Prescription Tracker is available to use nationally.",
    subheader: "Preparation of this accessibility statement",
    subheaderP1: "This statement was prepared on 9 March 2026. It was last reviewed on 9 March 2026.",
    subheaderP2: "This website was last tested on 11 February 2026 against the WCAG 2.2 AA standard.",
    subheaderP3: "The test was carried out by Dig Inclusion and the Prescription Tracker team also do their own "
    + "accessibility testing of new features. This is done with a mixture of automated and manual testing.",
    subheaderP4: "We are planning another external audit of the Prescription Tracker against the WCAG 2.2 AA standard."
  }
}
