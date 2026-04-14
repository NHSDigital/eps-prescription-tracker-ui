import {logFormValidationError, formatValidationErrorsForLogging} from "@/helpers/formValidationLogger"
import {logger} from "@/helpers/logger"
import {mockAuthState} from "@tests/mocks/AuthStateMock"

// Mock the logger
jest.mock("@/helpers/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}))

const mockLogger = logger as jest.Mocked<typeof logger>

describe("formValidationLogger", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockAuthContext = {
    ...mockAuthState,
    userDetails: {
      sub: "user123",
      family_name: "Smith",
      given_name: "John"
    },
    sessionId: "session456",
    selectedRole: {
      org_name: "Test Health Centre",
      org_code: "THC001",
      role_name: "Pharmacist"
    },
    user: "user123",
    deviceId: "device789",
    isSignedIn: true
  }

  describe("logFormValidationError", () => {
    it("should log prescription ID validation errors correctly", () => {
      logFormValidationError(
        "prescriptionId",
        ["Enter a prescription ID"],
        ["Enter a prescription ID"],
        mockAuthContext
      )

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Form validation error",
        expect.objectContaining({
          event: "form_validation_error",
          userId: "user123",
          sessionId: "session456",
          selectedOrg: "Test Health Centre",
          searchType: "prescriptionId",
          errorMessage1: "Enter a prescription ID",
          errorSummary1: "Enter a prescription ID"
        }),
        true
      )
    })

    it("should log NHS number validation errors correctly", () => {
      logFormValidationError(
        "nhsNumber",
        ["Enter a valid NHS number"],
        ["Enter a valid NHS number"],
        mockAuthContext
      )

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Form validation error",
        expect.objectContaining({
          event: "form_validation_error",
          searchType: "nhsNumber",
          errorMessage1: "Enter a valid NHS number",
          errorSummary1: "Enter a valid NHS number"
        }),
        true
      )
    })

    it("should log basic details validation errors with multiple errors", () => {
      const multipleErrors = [
        "Enter the patient's last name",
        "Enter the patient's date of birth"
      ]

      logFormValidationError(
        "basicDetails",
        multipleErrors,
        ["Enter the patient's last name", "Enter the patient's date of birth"],
        mockAuthContext
      )

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Form validation error",
        expect.objectContaining({
          event: "form_validation_error",
          searchType: "basicDetails",
          errorMessage1: "Enter the patient's last name",
          errorMessage2: "Enter the patient's date of birth",
          errorSummary1: "Enter the patient's last name",
          errorSummary2: "Enter the patient's date of birth"
        }),
        true
      )
    })

    it("should handle null auth context gracefully", () => {
      logFormValidationError(
        "prescriptionId",
        ["Enter a prescription ID"],
        ["Enter a prescription ID"],
        null
      )

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Form validation error",
        expect.objectContaining({
          userId: "unknown",
          sessionId: "unknown",
          selectedOrg: "unknown",
          errorMessage1: "Enter a prescription ID",
          errorSummary1: "Enter a prescription ID"
        }),
        true
      )
    })

    it("should handle logging errors gracefully", () => {
      mockLogger.info.mockImplementation(() => {
        throw new Error("Logging failed")
      })

      expect(() => {
        logFormValidationError(
          "prescriptionId",
          ["Enter a prescription ID"],
          ["Enter a prescription ID"],
          mockAuthContext
        )
      }).not.toThrow()

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to log form validation error",
        expect.objectContaining({
          originalSearchType: "prescriptionId",
          originalErrorCount: 1,
          loggingError: "Logging failed"
        })
      )
    })
  })

  describe("formatValidationErrorsForLogging", () => {
    it("should format prescription ID errors correctly", () => {
      const result = formatValidationErrorsForLogging(
        "empty",
        "prescriptionId",
        {empty: "Enter a prescription ID"}
      )

      expect(result).toEqual({
        errorMessages: ["Enter a prescription ID"],
        errorSummary: ["Enter a prescription ID"]
      })
    })

    it("should format NHS number errors correctly", () => {
      const result = formatValidationErrorsForLogging(
        "length",
        "nhsNumber",
        {length: "NHS number must be 10 digits long"}
      )

      expect(result).toEqual({
        errorMessages: ["NHS number must be 10 digits long"],
        errorSummary: ["NHS number must be 10 digits long"]
      })
    })

    it("should format basic details errors correctly", () => {
      const errors = ["LAST_NAME_REQUIRED", "DOB_DAY_REQUIRED"]
      const result = formatValidationErrorsForLogging(
        errors,
        "basicDetails",
        {
          LAST_NAME_REQUIRED: "Enter the patient's last name",
          DOB_DAY_REQUIRED: "Enter day"
        }
      )

      expect(result).toEqual({
        errorMessages: [
          "Enter the patient's last name",
          "Enter day"
        ],
        errorSummary: [
          "Enter the patient's last name",
          "Enter day"
        ]
      })
    })

    it("should handle unknown error keys gracefully", () => {
      const result = formatValidationErrorsForLogging(
        "unknownError",
        "prescriptionId",
        {}
      )

      expect(result).toEqual({
        errorMessages: ["Unknown error: unknownError"],
        errorSummary: ["Unknown error: unknownError"]
      })
    })

    it("should handle empty basic details errors", () => {
      const result = formatValidationErrorsForLogging(
        [],
        "basicDetails",
        {}
      )

      expect(result).toEqual({
        errorMessages: [],
        errorSummary: []
      })
    })
  })
})
