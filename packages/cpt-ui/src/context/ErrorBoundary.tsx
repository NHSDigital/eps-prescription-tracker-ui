import React, {Component, ReactNode} from "react"
import {AwsRum} from "aws-rum-web"
import {AwsRumContext} from "./AwsRumProvider"
import {logger} from "@/helpers/logger"

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorTraceId: string | null;
}

function generateTimestampedString(): string {
  const now = new Date()

  const pad = (num: number) => num.toString().padStart(2, "0")

  const timestamp =
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())

  const randomString = Math.random().toString(36).substring(2, 6).toUpperCase()

  return `${timestamp}_${randomString}`
}
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Declare the context type
  declare context: React.ContextType<typeof AwsRumContext>

  // Prevent multiple cleanup attempts
  private isCleaningUp = false

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      errorTraceId: null
    }
  }

  // Specify the contextType
  static contextType = AwsRumContext

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // we use a vaguely readable trace id to cope with
    // when somebody sends a screen shot rather than the reference as text
    const errorTraceId = generateTimestampedString()
    return {
      hasError: true,
      errorTraceId
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Correctly access the context value
    if (this.context) {
      const rumInstance: AwsRum = this.context

      // Enhanced detection for authentication errors
      const isAuthError =
        error.name === "UserAlreadyAuthenticatedException" ||
        error.message?.includes("already a signed in user") ||
        error.message?.includes("User already authenticated") ||
        (error as unknown as {code?: string})?.code === "UserAlreadyAuthenticatedException"

      // modify the error we send to rum to include the trace id we show to user
      // we use record event rather than record error so that session attributes are included
      const customError = {
        errorTraceId: this.state.errorTraceId,
        message: error.message,
        stack: error.stack,
        errorInfo: errorInfo,
        errorType: error.name,
        isUserAlreadyAuthenticatedException: isAuthError
      }
      rumInstance.recordEvent("errorBoundaryCatch", customError)
      // but we also record an error to try and get get the real line numbers
      rumInstance.recordError(error)

      // Handle authentication errors with thorough cleanup
      if (isAuthError && !this.isCleaningUp) {
        this.isCleaningUp = true
        logger.warn("UserAlreadyAuthenticatedException reached error boundary - clearing session")

        try {
          // Check if we're in a browser environment and clear localStorage
          if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
            const cognitoKeys = Object.keys(localStorage).filter(
              key => key.includes("CognitoIdentityServiceProvider") ||
                     key.includes("amplify")
            )
            cognitoKeys.forEach(key => localStorage.removeItem(key))

            rumInstance.recordEvent("errorBoundary_clearedCognitoSession", {
              clearedKeys: cognitoKeys.length,
              timestamp: new Date().toISOString()
            })
          }

          // Clear sessionStorage
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.clear()
          }

          // Redirect to login after cleanup
          setTimeout(() => {
            if (typeof window !== "undefined") {
              window.location.href = window.location.origin + "/login"
            }
          }, 1000)

        } catch (storageError) {
          logger.error("Error clearing storage in error boundary", storageError)
          rumInstance.recordError(storageError as Error)
        }

        // Reset cleanup flag after a delay
        setTimeout(() => {
          this.isCleaningUp = false
        }, 5000)
      }
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Something has gone wrong so we return some really simple HTML with the error reference on it
      const template = `
          <h1>Sorry, there is a problem</h1>
          <p>
          Contact our Live Services team at ssd.nationalservicedesk@nhs.net with the reference <<EPS_TRACE_ID>>
          </p>
          <p>
          <a href="/">Search for a prescription</a>
          </p>
      `
      if (this.state.errorTraceId) {
        let renderedTemplate = template.replace("<<EPS_TRACE_ID>>", this.state.errorTraceId)
        return (
          <div className="Container" dangerouslySetInnerHTML={{__html: renderedTemplate}}></div>
        )
      } else {
        const renderedTemplate = template.replace(" <<EPS_TRACE_ID>>", "UNKNOWN")
        return (
          <div className="Container" dangerouslySetInnerHTML={{__html: renderedTemplate}}></div>
        )
      }
    }
    return this.props.children
  }
}

export default ErrorBoundary
