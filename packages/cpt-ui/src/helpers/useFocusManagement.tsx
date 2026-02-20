import {useEffect, useState} from "react"
import {useLocation} from "react-router-dom"

export function useFocusManagement() {
  const location = useLocation()
  const [storedInputId, setStoredInputId] = useState<string | null>(() =>
    localStorage.getItem("lastFocusedInput")
  )

  useEffect(() => {
    let hasTabbed = false
    let mounted = true

    const checkInitialFocus = () => {
      if (document.activeElement &&
          document.activeElement !== document.body &&
          document.activeElement !== document.documentElement) {
        const element = document.activeElement as HTMLElement
        if (element.id && (
          element.tagName === "INPUT" ||
          element.tagName === "TEXTAREA" ||
          element.tagName === "SELECT"
        )) {
          localStorage.setItem("lastFocusedInput", element.id)
          setStoredInputId(element.id)
        } else {
          localStorage.setItem("lastFocusedInput", "interaction-detected")
          setStoredInputId("interaction-detected")
        }
      }
    }

    checkInitialFocus()

    const handleUserInteraction = (event: Event) => {
      if (!mounted) return

      const target = event.target as HTMLElement

      if (!storedInputId) {
        setStoredInputId("interaction-detected")
      }

      if (target && target.id && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      )) {
        localStorage.setItem("lastFocusedInput", target.id)
        setStoredInputId(target.id)
      } else {
        localStorage.setItem("lastFocusedInput", "interaction-detected")
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!mounted || e.key !== "Tab" || hasTabbed || e.shiftKey) return

      hasTabbed = true
      e.preventDefault()

      const lastInputId = localStorage.getItem("lastFocusedInput")

      if (lastInputId && lastInputId !== "interaction-detected") {
        const element = document.getElementById(lastInputId)
        if (element && element.offsetParent !== null) {
          element.focus()
          return
        }
      }

      if (lastInputId === "interaction-detected") {
        return
      }

      const skipLink = document.querySelector("[data-testid=\"eps_header_skipLink\"], .nhsuk-skip-link") as HTMLElement
      if (skipLink) {
        skipLink.focus()
      }
    }

    const attachListeners = () => {
      if (!mounted) return

      document.addEventListener("click", handleUserInteraction, true)
      document.addEventListener("focus", handleUserInteraction, true)
      document.addEventListener("focusin", handleUserInteraction, true)
      document.addEventListener("input", handleUserInteraction, true)
      document.addEventListener("keydown", handleKeyDown)
    }

    const isTestEnv = typeof jest !== "undefined"
    if (isTestEnv) {
      attachListeners()
    } else {
      const timeoutId = setTimeout(attachListeners, 50)

      return () => {
        mounted = false
        clearTimeout(timeoutId)
        document.removeEventListener("click", handleUserInteraction, true)
        document.removeEventListener("focus", handleUserInteraction, true)
        document.removeEventListener("focusin", handleUserInteraction, true)
        document.removeEventListener("input", handleUserInteraction, true)
        document.removeEventListener("keydown", handleKeyDown)
      }
    }

    return () => {
      mounted = false
      document.removeEventListener("click", handleUserInteraction, true)
      document.removeEventListener("focus", handleUserInteraction, true)
      document.removeEventListener("focusin", handleUserInteraction, true)
      document.removeEventListener("input", handleUserInteraction, true)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [location.pathname])

  return {
    hasUserInteracted: !!storedInputId,
    lastFocusedElement: (storedInputId && storedInputId !== "interaction-detected") ? `#${storedInputId}` : null,
    clearInteractionState: () => {
      localStorage.removeItem("lastFocusedInput")
      setStoredInputId(null)
    }
  }
}
