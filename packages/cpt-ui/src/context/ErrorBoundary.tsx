import React, { Component, ReactNode } from "react"
import { AwsRum } from "aws-rum-web"
import { AwsRumContext, AwsRumContextType } from "./AwsRumProvider"

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Declare the context type
  declare context: React.ContextType<typeof AwsRumContext>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false }
  }

  // Specify the contextType
  static contextType = AwsRumContext;

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("recordingError:", error);
    
    // Correctly access the context value
    if (this.context) {
      (this.context as AwsRum).recordError(error);
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
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
