import "@testing-library/jest-dom"
import {HEADER_STRINGS} from "@/constants/ui-strings/HeaderStrings"

describe("HeaderStrings", () => {
  it("exports all header string constants", () => {
    expect(HEADER_STRINGS.SERVICE).toBe("Prescription Tracker (private beta)")
    expect(HEADER_STRINGS.CHANGE_ROLE_BUTTON).toBe("Change role")
    expect(HEADER_STRINGS.SELECT_YOUR_ROLE_BUTTON).toBe("Select Your Role")
    expect(HEADER_STRINGS.PRESCRIPTION_SEARCH_BUTTON).toBe("Search for a prescription")
    expect(HEADER_STRINGS.EXIT_BUTTON).toBe("Exit")
    expect(HEADER_STRINGS.FEEDBACK_BUTTON).toBe("Give feedback (opens in new tab)")
    expect(HEADER_STRINGS.LOG_OUT_BUTTON).toBe("Log out")
    expect(HEADER_STRINGS.SKIP_TO_MAIN_CONTENT).toBe("Skip to main content")
  })

  it("has the correct feedback URL", () => {
    expect(HEADER_STRINGS.FEEDBACK_TARGET).toBe(
      "https://feedback.digital.nhs.uk/jfe/form/SV_ahG2dymAdr0oRz8"
    )
  })

  it("has the correct target paths", () => {
    expect(HEADER_STRINGS.EXIT_TARGET).toBe("/")
    expect(HEADER_STRINGS.CHANGE_ROLE_TARGET).toBe("/change-your-role")
    expect(HEADER_STRINGS.SELECT_YOUR_ROLE_TARGET).toBe("/select-your-role")
    expect(HEADER_STRINGS.PRESCRIPTION_SEARCH_TARGET).toBe("/search-by-prescription-id")
  })
})
