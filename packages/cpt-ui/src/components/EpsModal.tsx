import React, {useEffect, useRef} from "react"

interface EpsModalProps {
  readonly children: React.ReactNode
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly ariaLabelledBy?: string
}

export function EpsModal({children, isOpen, onClose, ariaLabelledBy}: EpsModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = modalRef.current
    if (!dialog) return

    if (isOpen) {
      dialog.showModal()
    } else {
      dialog.close()
    }

    const handleCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }

    dialog.addEventListener("cancel", handleCancel)

    return () => {
      dialog.removeEventListener("cancel", handleCancel)
    }
  }, [isOpen, onClose])

  // Block arrow keys and mouse scroll globally when modal is open
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
    }

    document.addEventListener("keydown", handleKeyDown, true)
    document.addEventListener("wheel", handleWheel, {passive: false})

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true)
      document.removeEventListener("wheel", handleWheel)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <dialog
      ref={modalRef}
      className="eps-modal-overlay eps-modal-content"
      aria-labelledby={ariaLabelledBy}
      aria-modal="true"
      data-testid="eps-modal-overlay"
    >
      {children}
    </dialog>
  )
}
