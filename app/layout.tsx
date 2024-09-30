'use client'
import React from "react";

import 'nhsuk-frontend/dist/nhsuk.css';
import { Header, Footer } from 'nhsuk-react-components';

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
                            Hello World
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
                <Footer>
                    <Footer.List></Footer.List>
                    <Footer.Copyright>
                        © Crown copyright
                    </Footer.Copyright>
                </Footer>
            </body>
        </html>
    )
}
