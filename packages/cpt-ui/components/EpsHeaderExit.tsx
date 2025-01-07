'use client'
import React from 'react'
import Link from 'next/link'
import {Header} from 'nhsuk-react-components'
import {
  HEADER_SERVICE,
  HEADER_EXIT_BUTTON,
  HEADER_EXIT_TARGET
} from '@/constants/ui-strings/HeaderStrings'

export default function EpsHeaderExit() {
  return (
    <Header transactional className="masthead" id="eps-header">
      <Header.Container className="masthead-container">
        <Header.Logo href="/" data-testid="eps_header_logoLink" />
        <Header.ServiceName href="/" data-testid="eps_header_serviceName">
          {HEADER_SERVICE}
        </Header.ServiceName>
        <Header.Content />
      </Header.Container>
      <Header.Nav className="masthead-nav">
        <li className="nhsuk-header__navigation-item">
          <Link className="nhsuk-header__navigation-link" href={HEADER_EXIT_TARGET} data-testid="eps_header_exitLink">
            {HEADER_EXIT_BUTTON}
          </Link>
        </li>
      </Header.Nav>
    </Header>
  )
}
