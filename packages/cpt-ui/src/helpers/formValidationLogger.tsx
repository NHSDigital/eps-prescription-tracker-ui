import {logger} from "./logger"
import {AuthContextType} from "@/context/AuthProvider"

export interface FormValidationLogData {
  timestamp: string
  userId?: string
  sessionId?: string
  selectedOrg?: string
  searchType: "prescriptionId" | "nhsNumber" | "basicDetails"
  [key: string]: string | undefined // Allow dynamic errorMessage1, errorMessage2, etc.
}

/**
 * Logs form validation errors, will be used to track commonly made UI/UX errors for evaluation of what weve made.
 *
 * @param searchType - which search form was used
 * @param errorMessages
 * @param errorSummary
 * @param authContextn
 */
export function logFormValidationError(
  searchType: "prescriptionId" | "nhsNumber" | "basicDetails",
  errorMessages: Array<string>,
  errorSummary: Array<string>,
  authContext: AuthContextType | null
): void {
  try {
    const logData: FormValidationLogData = {
      timestamp: new Date().toISOString(),
      userId: authContext?.userDetails?.sub || authContext?.user || "unknown",
      sessionId: authContext?.sessionId || "unknown",
      selectedOrg: authContext?.selectedRole?.org_name || "unknown",
      searchType
    }

    // Add error messages as individual fields: errorMessage1, errorMessage2, etc.
    errorMessages.forEach((message, index) => {
      logData[`errorMessage${index + 1}`] = message
    })

    // Add error summaries as individual fields: errorSummary1, errorSummary2, etc.
    errorSummary.forEach((summary, index) => {
      logData[`errorSummary${index + 1}`] = summary
    })

    // Log with structured data for analytics
    logger.info("Form validation error", {
      event: "form_validation_error",
      ...logData
    }, true)

  } catch (error) {
    // Ensure logging errors don't break the user experience
    logger.error("Failed to log form validation error", {
      originalSearchType: searchType,
      originalErrorCount: errorMessages.length,
      loggingError: error instanceof Error ? error.message : String(error)
    })
  }
}

/**
 * Helper function to format validation errors for consistent logging across form types.
 * Handles the different error structures used by each validation system.
 */
export function formatValidationErrorsForLogging(
  errors: string | Array<string> | null | undefined,
  searchType: "prescriptionId" | "nhsNumber" | "basicDetails",
  errorStrings: Record<string, string>
): {errorMessages: Array<string>, errorSummary: Array<string>} {
  let errorMessages: Array<string> = []
  let errorSummary: Array<string> = []

  if (!errors) {
    return {errorMessages: [], errorSummary: []}
  }

  try {
    switch (searchType) {
      case "prescriptionId": {
        const message = errorStrings[errors as string] || `Unknown error: ${errors}`
        errorMessages = [message]
        errorSummary = [message]
        break
      }

      case "nhsNumber": {
        const nhsMessage = errorStrings[errors as string] || `Unknown error: ${errors}`
        errorMessages = [nhsMessage]
        errorSummary = [nhsMessage]
        break
      }

      case "basicDetails": {
        if (Array.isArray(errors) && errors.length > 0) {
          errorMessages = errors.map(errorKey =>
            errorStrings[errorKey] || `Unknown error: ${errorKey}`
          )
          errorSummary = [...errorMessages]
        }
        break
      }

      default: {
        const unknownError = "Unknown validation error occurred"
        errorSummary = [unknownError]
        errorMessages = [unknownError]
      }
    }
  } catch {
    const fallbackError = "Error processing validation errors"
    errorMessages = [fallbackError]
    errorSummary = [fallbackError]
  }

  return {errorMessages, errorSummary}
}
