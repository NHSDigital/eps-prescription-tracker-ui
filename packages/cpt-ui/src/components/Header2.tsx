
import React from "react"
import {Header} from "nhsuk-react-components"

const Header2: React.FC = () => (
  <Header>
    <Header.Container>
      <Header.Logo href="/" />
      <Header.Nav>
        <Header.NavItem href="#">
          NHS service standard
        </Header.NavItem>
        <Header.NavItem href="#">
          Design system
        </Header.NavItem>
        <Header.NavItem href="#">
          Content guide
        </Header.NavItem>
        <Header.NavItem href="#">
          Accessibility
        </Header.NavItem>
        <Header.NavItem href="#">
          Community and contribution
        </Header.NavItem>
      </Header.Nav>
    </Header.Container>
  </Header>
)

export default Header2
