'use client'
import React from 'react'

import 'nhsuk-frontend/dist/nhsuk.css'
import EpsHeaderLayout from '@/components/EpsHeaderLayout'
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
            <body>
                <AuthProvider>
                    <AccessProvider>
                        <EpsHeaderLayout />
                        {children}
                        <EpsFooter />
                    </AccessProvider>
                </AuthProvider>
            </body>
        </html>
    )
}
