'use client'
import React from "react";

import 'nhsuk-frontend/dist/nhsuk.css';
import EpsHeader from '../components/EpsHeader'
import EpsFooter from '../components/EpsFooter'

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>
                <EpsHeader />
                {children}
                <EpsFooter />
            </body>
        </html>
    )
}
