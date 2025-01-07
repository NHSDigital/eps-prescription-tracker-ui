'use client'
import React from 'react'
import "@/assets/styles/header.scss"
import {Header} from 'nhsuk-react-components'
import {HEADER_SERVICE, HEADER_EXIT_BUTTON} from '@/constants/ui-strings/HeaderStrings'

export default function EpsHeaderExit() {
  const handleExitClick = (e: React.MouseEvent) => {
    e.preventDefault() // Prevent default anchor behavior
    if (window.close) {
      window.close()
    } else {
      alert('Unable to close the tab. Please close it manually.')
    }
  }

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
          <a
            href="#"
            className="nhsuk-header__navigation-link"
            onClick={handleExitClick}
            data-testid="eps_header_exitLink"
          >
            {HEADER_EXIT_BUTTON}
          </a>
        </li>
      </Header.Nav>
    </Header>
  )
}
