'use client'
import React from 'react'

import 'nhsuk-frontend/dist/nhsuk.css'
import EpsHeader from '@/components/EpsHeader'
import EpsFooter from '@/components/EpsFooter'
import {AuthProvider} from '@/context/AuthProvider'
import {AccessProvider} from '@/context/AccessProvider'

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <title>EPS Home</title>
            <body>
                <AuthProvider>
                    <AccessProvider>
                        <EpsHeader />
                            {children}
                        <EpsFooter />
                    </AccessProvider>
                </AuthProvider>
            </body>
        </html>
    )
}
