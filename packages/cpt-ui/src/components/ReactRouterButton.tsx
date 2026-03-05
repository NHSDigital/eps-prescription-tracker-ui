import React from "react"
import {Button as NHSButton} from "nhsuk-react-components"
import {useNavigate} from "react-router-dom"

interface ReactRouterButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** The text content of the button */
    children: React.ReactNode
    /** Optional route to navigate to when clicked */
    to?: string
    /** Optional click handler for custom behavior */
    onClick?: (event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => void
    /** Optional additional className */
    className?: string
    /** Data test id for testing */
    "data-testid"?: string
    /** Prevent double clicking/rapid clicking */
    preventDoubleClick?: boolean
    /** Debounce timeout in milliseconds (defaults to 1000ms) */
    debounceTimeout?: number
}

export const Button: React.FC<ReactRouterButtonProps> = ({
  children,
  to,

  disabled = false,
  onClick,
  className = "",
  "data-testid": testId,
  preventDoubleClick = false,
  debounceTimeout = 1000,
  ...props
}) => {
  const navigate = useNavigate()

  const handleClick = (event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => {
    if (to) {
      event.preventDefault()
      const absolutePath = to.startsWith("/") ? to : `/${to}`
      navigate(absolutePath)
      return
    }

    onClick?.(event)
  }

  return (
    <NHSButton
      onClick={handleClick}
      className={`${className}`}
      data-testid={testId}
      disabled={disabled}
      preventDoubleClick={preventDoubleClick}
      debounceTimeout={debounceTimeout}
      {...props}
    >
      {children}
    </NHSButton>
  )

}
