import React from "react"
import {BackLink} from "nhsuk-react-components"
import {useBackNavigation} from "@/hooks/useBackNavigation"

export default function EpsBackLink({children, ...props}: React.ComponentProps<typeof BackLink>) {
  const {goBack, getBackLink} = useBackNavigation()

  const handleGoBack = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault()
    goBack()
  }

  return (
    <BackLink
      asElement="a"
      href={getBackLink()}
      onClick={handleGoBack}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleGoBack(e)}
      {...props}
    >
      {children}
    </BackLink>
  )
}
