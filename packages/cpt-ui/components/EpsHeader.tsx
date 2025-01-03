'use client'
import React, { useContext } from 'react'
import Link from 'next/link';
import "@/assets/styles/header.scss"
import { useRouter, usePathname } from 'next/navigation';
import { Header } from "nhsuk-react-components";
import {
    HEADER_SERVICE,
    HEADER_CONFIRM_ROLE_BUTTON,
    HEADER_CONFIRM_ROLE_TARGET,
    HEADER_CHANGE_ROLE_BUTTON,
    HEADER_CHANGE_ROLE_TARGET,
    HEADER_SELECT_YOUR_ROLE_BUTTON,
    HEADER_SELECT_YOUR_ROLE_TARGET
} from "@/constants/ui-strings/HeaderStrings"

import { AuthContext } from "@/context/AuthProvider";

export default function EpsHeader() {
    const router = useRouter()
    const pathname = usePathname();

    const auth = useContext(AuthContext);

    const handleLogoutClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        await auth?.cognitoSignOut();
        router.push("/");
    };

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
                <li className="nhsuk-header__navigation-item">
                    <Link className="nhsuk-header__navigation-link" href='/' data-testid="eps_header_placeholder1">Placeholder 1</Link>
                </li>
                
                <li className="nhsuk-header__navigation-item">
                    <Link className="nhsuk-header__navigation-link" href='/auth_demo/' data-testid="eps_header_placeholder2">Placeholder 2</Link>
                </li>
                
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
                
                {pathname === '/selectyourrole' ? (
                    <li className="nhsuk-header__navigation-item">
                        <Link className="nhsuk-header__navigation-link" href={HEADER_CONFIRM_ROLE_TARGET} data-testid="eps_header_confirmRoleLink">{HEADER_CONFIRM_ROLE_BUTTON}</Link>
                    </li>
                ) : (
                    <li className="nhsuk-header__navigation-item">
                        <Link className="nhsuk-header__navigation-link" href={HEADER_SELECT_YOUR_ROLE_TARGET} data-testid="eps_header_selectYourRoleLink">{HEADER_SELECT_YOUR_ROLE_BUTTON}</Link>
                    </li>
                )}

                {auth?.isSignedIn ? (
                    <li className="nhsuk-header__navigation-item">
                        <Link 
                            className="nhsuk-header__navigation-link" 
                            href='/' 
                            data-testid="eps_header_logout" 
                            onClick={handleLogoutClick}
                        >
                            Log out
                        </Link>
                    </li>
                ) : null}

                <Header.NavDropdownMenu dropdownText="Menu" />
            </Header.Nav>
        </Header>
    )
}
