import React, {useEffect, useRef} from "react"

interface EpsModalProps {
  readonly children: React.ReactNode
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly ariaLabelledBy?: string
}

export function EpsModal({children, isOpen, onClose, ariaLabelledBy}: EpsModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null)
  const lastActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    lastActiveElementRef.current = document.activeElement as HTMLElement

    const mainContent = document.querySelector("main, #__next, body > div:first-child")
    if (mainContent && !mainContent.contains(modalRef.current)) {
      mainContent.setAttribute("inert", "")
    }

    setTimeout(() => {
      const focusableElements = modalRef.current?.querySelectorAll(
        "button:not([disabled]), [href]:not([disabled]), input:not([disabled]), " +
        "select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"]):not([disabled])"
      )
      if (focusableElements && focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus()
      }
    }, 0)

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !modalRef.current) return

      const focusableElements = Array.from(
        modalRef.current.querySelectorAll(
          "button:not([disabled]), [href]:not([disabled]), input:not([disabled]), " +
          "select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"]):not([disabled])"
        )
      ).filter(el => {
        const element = el as HTMLElement
        return element.offsetWidth > 0 && element.offsetHeight > 0 && !element.hidden
      }) as Array<HTMLElement>

      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement as HTMLElement

      if (e.shiftKey) {
        if (activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener("keydown", handleTabKey)

    return () => {
      if (lastActiveElementRef.current && document.body.contains(lastActiveElementRef.current)) {
        lastActiveElementRef.current.focus()
      }

      if (mainContent) {
        mainContent.removeAttribute("inert")
      }

      document.removeEventListener("keydown", handleTabKey)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose, isOpen])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="eps-modal-overlay"
      onClick={handleBackdropClick}
      data-testid="eps-modal-overlay"
    >
      <dialog
        ref={modalRef}
        className="eps-modal-content"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        data-testid="eps-modal-content"
      >
        <button className="eps-modal-close-button" onClick={onClose} aria-label="Close modal">
          ×
        </button>

        {children}

      </dialog>
    </div>
  )
}
