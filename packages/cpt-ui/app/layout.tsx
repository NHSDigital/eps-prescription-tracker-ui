'use client'
import React, { useState, useEffect } from 'react'

import 'nhsuk-frontend/dist/nhsuk.css'
import EpsHeaderLayout from '@/components/EpsHeaderLayout'
import EpsFooter from '@/components/EpsFooter'
import { AuthProvider } from '@/context/AuthProvider'
import { AccessProvider } from '@/context/AccessProvider'

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    return (
        <html lang="en">
            <body className={mounted ? "js-enabled" : "no-js"}>
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
