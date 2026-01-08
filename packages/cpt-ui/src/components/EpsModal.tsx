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

  if (!isOpen) return null

  return (
    <dialog
      ref={modalRef}
      className="eps-modal-overlay eps-modal-content"
      aria-labelledby={ariaLabelledBy}
      data-testid="eps-modal-overlay"
    >
      {children}

    </dialog>
  )
}
