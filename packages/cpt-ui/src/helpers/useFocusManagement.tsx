import {useEffect} from "react"
import {useLocalStorageState} from "./useLocalStorageState"
import {useLocation} from "react-router-dom"

interface FocusState {
  hasUserInteracted: boolean
  lastFocusedElement: string | null
  pathname: string
}

const INTERACTIVE_SELECTORS = [
  "#presc-id-input",
  "#nhs-number-input",
  "#first-name",
  "#last-name",
  "#dob-day-input",
  "#dob-month-input",
  "#dob-year-input",
  "#postcode-input"
]

/**
 * Custom hook to manage focus behavior and persist user interaction state
 * This ensures that focus restoration works correctly after page refreshes
 * while maintaining compatibility with existing skip link behavior
 */
export function useFocusManagement() {
  const location = useLocation()

  const [focusState, setFocusState] = useLocalStorageState<FocusState>(
    "focusState",
    "pageInteraction",
    {
      hasUserInteracted: false,
      lastFocusedElement: null,
      pathname: location.pathname
    }
  )

  useEffect(() => {
    let hasTabbed = false
    let hasUserInteracted = false

    // Check if this is a navigation to a different page vs page refresh
    const isNewPage = focusState.pathname !== location.pathname

    // Reset interaction state when navigating to a different page
    if (isNewPage) {
      setFocusState({
        hasUserInteracted: false,
        lastFocusedElement: null,
        pathname: location.pathname
      })
    } else {
      // Same page - check if user had previously interacted (page refresh scenario)
      hasUserInteracted = focusState.hasUserInteracted
    }

    // Initial check: see if there's an active interactive element on page load
    const activeElement = document.activeElement as HTMLElement
    const hasActiveInteractiveElement = activeElement &&
      activeElement !== document.body &&
      activeElement.tagName !== "HTML" &&
      activeElement.id &&
      INTERACTIVE_SELECTORS.includes(`#${activeElement.id}`)

    // If there's an active interactive element but no stored user interaction, save it
    if (hasActiveInteractiveElement && !hasUserInteracted) {
      hasUserInteracted = true
      setFocusState(prev => ({
        ...prev,
        hasUserInteracted: true,
        lastFocusedElement: `#${activeElement.id}`,
        pathname: location.pathname
      }))
    }

    const handleUserInteraction = (event: Event) => {
      const target = event.target as HTMLElement

      if (target && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.tagName === "BUTTON" ||
        target.hasAttribute("contenteditable")
      )) {
        hasUserInteracted = true
        const selector = target.id ? `#${target.id}` : null
        const matchingSelector = selector && INTERACTIVE_SELECTORS.includes(selector) ? selector : null

        setFocusState(prev => ({
          ...prev,
          hasUserInteracted: true,
          lastFocusedElement: matchingSelector || prev.lastFocusedElement,
          pathname: location.pathname
        }))
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" && !hasTabbed && !e.shiftKey) {
        hasTabbed = true

        // Default behavior: if user hasn't interacted, focus skip link
        if (!hasUserInteracted) {
          e.preventDefault()
          const skipLink = document.querySelector(".nhsuk-skip-link") as HTMLElement
          if (skipLink) {
            skipLink.focus()
          }
        } else if (hasUserInteracted && focusState.lastFocusedElement && !isNewPage) {
          const lastElement = document.querySelector(focusState.lastFocusedElement) as HTMLElement
          if (lastElement && lastElement.offsetParent !== null) {
            e.preventDefault()
            lastElement.focus()
          } else {
            e.preventDefault()
            const skipLink = document.querySelector(".nhsuk-skip-link") as HTMLElement
            if (skipLink) {
              skipLink.focus()
            }
          }
        }

        // Remove listeners after handling first tab
        document.removeEventListener("keydown", handleKeyDown)
        document.removeEventListener("click", handleUserInteraction)
        document.removeEventListener("focusin", handleUserInteraction)
        document.removeEventListener("input", handleUserInteraction)
      }
    }

    // Add event listeners
    document.addEventListener("click", handleUserInteraction)
    document.addEventListener("focusin", handleUserInteraction)
    document.addEventListener("input", handleUserInteraction)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("click", handleUserInteraction)
      document.removeEventListener("focusin", handleUserInteraction)
      document.removeEventListener("input", handleUserInteraction)
    }
  }, [location.pathname, focusState, setFocusState])

  return {
    hasUserInteracted: focusState.hasUserInteracted,
    lastFocusedElement: focusState.lastFocusedElement,
    clearInteractionState: () => setFocusState({
      hasUserInteracted: false,
      lastFocusedElement: null,
      pathname: location.pathname
    })
  }
}
