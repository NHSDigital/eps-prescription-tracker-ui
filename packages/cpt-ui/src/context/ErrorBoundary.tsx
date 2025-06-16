import React, {Component, ReactNode} from "react"
import {AwsRum} from "aws-rum-web"
import {AwsRumContext} from "./AwsRumProvider"

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Declare the context type
  declare context: React.ContextType<typeof AwsRumContext>

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {hasError: false}
  }

  // Specify the contextType
  static contextType = AwsRumContext

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {hasError: true}
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Correctly access the context value
    if (this.context) {
      const cptAwsRum = this.context as AwsRum
      cptAwsRum.recordError(error)
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div>
          <h1>Something went wrong.</h1>
          <button onClick={() => (window.location.href = "/")}>
            Clear Error
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
