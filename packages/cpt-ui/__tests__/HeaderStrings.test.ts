import "@testing-library/jest-dom"
import * as HeaderStrings from "@/constants/ui-strings/HeaderStrings"

describe("HeaderStrings", () => {
  it("exports all header string constants", () => {
    expect(HeaderStrings.HEADER_SERVICE).toBe("Prescription Tracker (pilot)")
    expect(HeaderStrings.HEADER_CHANGE_ROLE_BUTTON).toBe("Change role")
    expect(HeaderStrings.HEADER_SELECT_YOUR_ROLE_BUTTON).toBe("Select Your Role")
    expect(HeaderStrings.HEADER_PRESCRIPTION_SEARCH_BUTTON).toBe("Search for a prescription")
    expect(HeaderStrings.HEADER_EXIT_BUTTON).toBe("Exit")
    expect(HeaderStrings.HEADER_FEEDBACK_BUTTON).toBe("Give feedback (opens in new tab)")
    expect(HeaderStrings.HEADER_LOG_OUT_BUTTON).toBe("Log out")
    expect(HeaderStrings.HEADER_SKIP_TO_MAIN_CONTENT).toBe("Skip to main content")
  })

  it("has the correct feedback URL", () => {
    expect(HeaderStrings.HEADER_FEEDBACK_TARGET).toBe(
      "https://feedback.digital.nhs.uk/jfe/form/SV_ahG2dymAdr0oRz8"
    )
  })

  it("has the correct target paths", () => {
    expect(HeaderStrings.HEADER_EXIT_TARGET).toBe("/")
    expect(HeaderStrings.HEADER_CHANGE_ROLE_TARGET).toBe("/change-your-role")
    expect(HeaderStrings.HEADER_SELECT_YOUR_ROLE_TARGET).toBe("/select-your-role")
    expect(HeaderStrings.HEADER_PRESCRIPTION_SEARCH_TARGET).toBe("/search-by-prescription-id")
  })
})
