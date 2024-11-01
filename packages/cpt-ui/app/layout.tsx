'use client'
import React from "react";

import 'nhsuk-frontend/dist/nhsuk.css';
import { Header } from 'nhsuk-react-components';
import EpsFooter from '../components/EpsFooter'

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">

            <body>
                <Header transactional >
                    <Header.Container>
                        <Header.Logo href="/" />
                        <Header.ServiceName href="/">
                            Clinical prescription tracking service
                        </Header.ServiceName>


                        {/* <Header.Nav>

                            <Header.NavItem href="/social-care-and-support">
                                Care and support
                            </Header.NavItem>
                            <Header.NavItem href="/news">
                                Health news
                            </Header.NavItem>
                            <Header.NavItem href="/service-search">
                                Services near you
                            </Header.NavItem>
                            <Header.NavItem
                                home
                                href="/"
                            >
                                Home
                            </Header.NavItem>
                            <Header.NavDropdownMenu />
                        </Header.Nav> */}

                    </Header.Container>
                </Header>

                {children}
                <EpsFooter />
            </body>
        </html>
    )
}
