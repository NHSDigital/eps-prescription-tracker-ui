'use client'
import React from "react";

import 'nhsuk-frontend/dist/nhsuk.css';
import EpsHeader from '../components/EpsHeader'
import EpsFooter from '../components/EpsFooter'
import { AuthProvider } from '../context/AuthContext'

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>
                <AuthProvider>
                    <EpsHeader />
                    {children}
                    <EpsFooter />
                </AuthProvider>
            </body>

        </html>
    )
}
