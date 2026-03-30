import React from "react"
import {Card} from "nhsuk-react-components"
import {RoleCardAddressProps} from "./EpsRoleSelectionPage.types"

export function RoleCardAddress({address}: RoleCardAddressProps) {
  const addressLines = React.useMemo(() => {
    const addressText = address || "No address available"
    return addressText.split("\n")
  }, [address])

  return (
    <div className="eps-card__address">
      <Card.Description>
        {addressLines.map((line: string, index: number) => (
          <span key={index}>
            {line}
            <br />
          </span>
        ))}
      </Card.Description>
    </div>
  )
}
