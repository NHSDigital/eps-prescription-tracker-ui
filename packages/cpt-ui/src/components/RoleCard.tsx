import React from "react"
import {Card} from "nhsuk-react-components"
import {RoleCardProps, RoleCardLinkProps} from "./EpsRoleSelectionPage.types"
import {
  createCardClassName,
  createCardStyle,
  createLinkStyle,
  createLinkClassName,
  createHandleKeyDown
} from "./EpsRoleSelectionPage.utils"
import {RoleCardAddress} from "./RoleCardAddress"

function RoleCardLink({
  roleCardProps,
  isOtherCardDisabled,
  onCardClick,
  onCardKeyDown,
  linkStyle,
  linkClassName,
  noOrgName,
  noODSCode
}: RoleCardLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (isOtherCardDisabled) {
      e.preventDefault()
    } else {
      onCardClick(e, roleCardProps)
    }
  }

  const handleKeyDown = createHandleKeyDown(isOtherCardDisabled, onCardKeyDown, roleCardProps)

  return (
    <a
      href="#"
      onClick={handleClick}
      onKeyDown={isOtherCardDisabled ? undefined : handleKeyDown}
      style={linkStyle}
      tabIndex={isOtherCardDisabled ? -1 : 0}
      aria-disabled={isOtherCardDisabled}
      role="button"
      className={linkClassName}
    >
      {roleCardProps.role.org_name || noOrgName}
      <br />
      (ODS: {roleCardProps.role.org_code || noODSCode})
    </a>
  )
}

export function RoleCard({
  roleCardProps,
  isThisCardSelected,
  isOtherCardDisabled,
  onCardClick,
  onCardKeyDown,
  noOrgName,
  noODSCode,
  noRoleName
}: RoleCardProps) {
  const cardClassName = React.useMemo(() =>
    createCardClassName(isOtherCardDisabled, isThisCardSelected),
  [isOtherCardDisabled, isThisCardSelected]
  )

  const cardStyle = React.useMemo(() =>
    createCardStyle(isOtherCardDisabled),
  [isOtherCardDisabled]
  )

  const linkStyle = React.useMemo(() =>
    createLinkStyle(isOtherCardDisabled),
  [isOtherCardDisabled]
  )

  const linkClassName = React.useMemo(() =>
    createLinkClassName(isOtherCardDisabled, isThisCardSelected),
  [isOtherCardDisabled, isThisCardSelected]
  )

  const handleClick = (e: React.MouseEvent) => {
    if (!isOtherCardDisabled) {
      onCardClick(e, roleCardProps)
    }
  }

  const handleKeyDown = createHandleKeyDown(isOtherCardDisabled, onCardKeyDown, roleCardProps)

  return (
    <Card
      key={roleCardProps.uuid}
      data-testid="eps-card"
      className={cardClassName}
      tabIndex={isOtherCardDisabled ? -1 : 0}
      onKeyDown={isOtherCardDisabled ? undefined : handleKeyDown}
      onClick={isOtherCardDisabled ? undefined : handleClick}
      style={cardStyle}
      role="button"
      aria-disabled={isOtherCardDisabled}
    >
      <Card.Content>
        {/* anchor tags are used here for accessibility reasons,
       as they more accurately depict if a card is active or disabled for screen readers */}
        <div className="eps-card__layout">
          <div>
            <Card.Heading className="nhsuk-heading-s eps-card__org-name">
              <RoleCardLink
                roleCardProps={roleCardProps}
                isOtherCardDisabled={isOtherCardDisabled}
                onCardClick={onCardClick}
                onCardKeyDown={onCardKeyDown}
                linkStyle={linkStyle}
                linkClassName={linkClassName}
                noOrgName={noOrgName}
                noODSCode={noODSCode}
              />
            </Card.Heading>
            <Card.Description className="nhsuk-u-margin-top-2">
              {roleCardProps.role.role_name || noRoleName}
            </Card.Description>
          </div>
          <RoleCardAddress address={roleCardProps.role.site_address} />
        </div>
      </Card.Content>
    </Card>
  )
}
