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

    // Check if this is a fresh page load or navigation to a different path
    const isNewPage = focusState.pathname !== location.pathname

    // Reset interaction state when navigating to a different page
    if (isNewPage) {
      setFocusState({
        hasUserInteracted: false,
        lastFocusedElement: null,
        pathname: location.pathname
      })
    }

    // Check if there's currently an active interactive element (for initial page load)
    const activeElement = document.activeElement as HTMLElement
    const hasActiveInteractiveElement = activeElement &&
      activeElement !== document.body &&
      activeElement.tagName !== "HTML" &&
      INTERACTIVE_SELECTORS.some(selector => activeElement.matches?.(selector))

    // Determine if user has interacted based on:
    // 1. Persisted state (unless it's a new page)
    // 2. Currently active interactive element
    const userHasInteracted = !isNewPage && (focusState.hasUserInteracted || hasActiveInteractiveElement)

    const handleUserInteraction = (event: Event) => {
      const target = event.target as HTMLElement

      // Only track interaction with form elements and interactive content
      if (target && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.tagName === "BUTTON" ||
        target.hasAttribute("contenteditable") ||
        target.closest("button") ||
        target.closest("a")
      )) {
        const selector = INTERACTIVE_SELECTORS.find(sel => target.matches(sel))

        setFocusState(prev => ({
          ...prev,
          hasUserInteracted: true,
          lastFocusedElement: selector || prev.lastFocusedElement,
          pathname: location.pathname
        }))
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" && !hasTabbed && !userHasInteracted && !e.shiftKey) {
        hasTabbed = true
        e.preventDefault()

        const skipLink = document.querySelector(".nhsuk-skip-link") as HTMLElement
        if (skipLink) {
          skipLink.focus()
        }

        // Remove listeners after skip link is focused
        document.removeEventListener("keydown", handleKeyDown)
        document.removeEventListener("click", handleUserInteraction)
        document.removeEventListener("focusin", handleUserInteraction)
        document.removeEventListener("input", handleUserInteraction)
        return
      }

      // If user has interacted before and there's a saved focus element, restore it
      if (e.key === "Tab" && !hasTabbed && userHasInteracted && focusState.lastFocusedElement && !e.shiftKey) {
        const lastElement = document.querySelector(focusState.lastFocusedElement) as HTMLElement
        if (lastElement && lastElement.offsetParent !== null) { // Check if element is visible
          hasTabbed = true
          e.preventDefault()
          lastElement.focus()

          // Remove listeners after focus is restored
          document.removeEventListener("keydown", handleKeyDown)
          document.removeEventListener("click", handleUserInteraction)
          document.removeEventListener("focusin", handleUserInteraction)
          document.removeEventListener("input", handleUserInteraction)
          return
        }
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
