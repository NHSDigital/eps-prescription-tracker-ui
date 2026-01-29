// SessionTimeoutManager - centralized way to reset session timeout from anywhere
class SessionTimeoutManager {
  private resetFunction: (() => void) | null = null

  setResetFunction(resetFn: () => void) {
    this.resetFunction = resetFn
  }

  resetSessionTimeout() {
    if (this.resetFunction) {
      this.resetFunction()
    }
  }

  clearResetFunction() {
    this.resetFunction = null
  }
}

export const sessionTimeoutManager = new SessionTimeoutManager()
