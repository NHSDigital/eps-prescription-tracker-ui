import {useEffect} from "react"
export function useFocusManagement() {

  useEffect(() => {
    let hasTabbed = false
    let mounted = true

    const handleUserInteraction = (event: Event) => {
      if (!mounted) return

      const target = event.target as HTMLElement
      if (target && target.id && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      )) {
        localStorage.setItem("lastFocusedInput", target.id)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!mounted || e.key !== "Tab" || hasTabbed || e.shiftKey) return

      hasTabbed = true
      e.preventDefault()

      const lastInputId = localStorage.getItem("lastFocusedInput")

      if (lastInputId) {
        const element = document.getElementById(lastInputId)
        if (element && element.offsetParent !== null) {
          element.focus()
          return
        }
      }

      const skipLink = document.querySelector("[data-testid=\"skip-link\"], .nhsuk-skip-link") as HTMLElement
      if (skipLink) {
        skipLink.focus()
      }
    }

    // Use a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      if (!mounted) return

      document.addEventListener("click", handleUserInteraction, true)
      document.addEventListener("focus", handleUserInteraction, true)
      document.addEventListener("input", handleUserInteraction, true)
      document.addEventListener("keydown", handleKeyDown)
    }, 50)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      document.removeEventListener("click", handleUserInteraction, true)
      document.removeEventListener("focus", handleUserInteraction, true)
      document.removeEventListener("input", handleUserInteraction, true)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const storedInputId = localStorage.getItem("lastFocusedInput")
  return {
    hasUserInteracted: !!storedInputId,
    lastFocusedElement: storedInputId ? `#${storedInputId}` : null,
    clearInteractionState: () => {
      localStorage.removeItem("lastFocusedInput")
    }
  }
}
