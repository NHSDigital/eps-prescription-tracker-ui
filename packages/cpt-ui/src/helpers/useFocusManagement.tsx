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
      }

      if (!hasUserInteracted || lastInputId) {
        // First check for cookie banner if user hasn't interacted
        if (!hasUserInteracted) {
          const cookieBanner = document.querySelector("[data-testid=\"cookieBanner\"]") as HTMLElement
          if (cookieBanner && cookieBanner.offsetParent !== null) {
            // Focus the Accept button to start the tab order through cookie banner elements
            const acceptButton = cookieBanner.querySelector("[data-testid=\"accept-button\"]") as HTMLElement
            if (acceptButton) {
              acceptButton.focus()
              return
            }
          }
        }

        // Fall back to skip link if no cookie banner or user has interacted
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
