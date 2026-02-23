import {useEffect, useRef} from "react"
import {useLocation} from "react-router-dom"

export function useFocusManagement() {
  const location = useLocation()
  const previousPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (previousPathRef.current !== null && previousPathRef.current !== location.pathname) {
      localStorage.removeItem("lastFocusedInput")
    }
    previousPathRef.current = location.pathname

    let hasTabbed = false
    let hasUserInteracted = false

    if (document.activeElement && document.activeElement !== document.body && document.activeElement
      !== document.documentElement) {
      hasUserInteracted = true
    }

    const handleUserInteraction = (event: Event) => {
      hasUserInteracted = true

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
      if (e.key !== "Tab" || hasTabbed || e.shiftKey) return

      hasTabbed = true
      e.preventDefault()

      const lastInputId = localStorage.getItem("lastFocusedInput")

      if (lastInputId) {
        const element = document.getElementById(lastInputId)
        if (element && element.offsetParent !== null) {
          element.focus()
          return
        }
        // If stored element is not visible, fall back to skip link regardless of user interaction
      }

      if (!hasUserInteracted || lastInputId) {
        const skipLink = document.querySelector(
          "[data-testid=\"eps_header_skipLink\"], .nhsuk-skip-link") as HTMLElement
        if (skipLink) {
          skipLink.focus()
        }
      }
    }

    document.addEventListener("click", handleUserInteraction, true)
    document.addEventListener("focus", handleUserInteraction, true)
    document.addEventListener("focusin", handleUserInteraction, true)
    document.addEventListener("keydown", handleKeyDown, true)

    return () => {
      document.removeEventListener("click", handleUserInteraction, true)
      document.removeEventListener("focus", handleUserInteraction, true)
      document.removeEventListener("focusin", handleUserInteraction, true)
      document.removeEventListener("keydown", handleKeyDown, true)
    }
  }, [location.pathname])
}
