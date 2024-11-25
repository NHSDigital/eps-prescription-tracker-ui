'use client'
import React from 'react'
import Link from 'next/link';
import "../assets/styles/header.scss"
import { useRouter, usePathname } from 'next/navigation';
import { Header } from "nhsuk-react-components";
import {
    HEADER_SERVICE,
    HEADER_CONFIRM_ROLE_BUTTON,
    HEADER_CONFIRM_ROLE_TARGET,
    HEADER_CHANGE_ROLE_BUTTON,
    HEADER_CHANGE_ROLE_TARGET
} from "../constants/ui-strings/HeaderStrings"

export default function EpsHeader() {
    const router = useRouter()
    const pathname = usePathname();
    console.log(router);    // Query parameters
    return (
        <Header transactional className="masthead" id="eps-header" >
            <Header.Container className="masthead-container">
                <Header.Logo href="/" data-testid="eps_header_logoLink" />

                <Header.ServiceName href="/" data-testid="eps_header_serviceName">
                    {HEADER_SERVICE}
                </Header.ServiceName>
                <Header.Content />
            </Header.Container>
            <Header.Nav className="masthead-nav">
                <Header.NavItem>Placeholder 1</Header.NavItem>
                <Header.NavItem>Placeholder 2</Header.NavItem>
                {pathname != '/' ? (
                    <li className="nhsuk-header__navigation-item">
                        <Link className="nhsuk-header__navigation-link" href={HEADER_CHANGE_ROLE_TARGET} data-testid="eps_header_changeRoleLink">{HEADER_CHANGE_ROLE_BUTTON}</Link>
                    </li>
                ) :
                    (
                        <li className="nhsuk-header__navigation-item">
                            <Link className="nhsuk-header__navigation-link" href={HEADER_CONFIRM_ROLE_TARGET} data-testid="eps_header_confirmRoleLink">{HEADER_CONFIRM_ROLE_BUTTON}</Link>
                        </li>
                    )
                }
                <Header.NavItem>Placeholder 3</Header.NavItem>
                <Header.NavDropdownMenu dropdownText="Menu" />
            </Header.Nav>
        </Header>
    )
}
