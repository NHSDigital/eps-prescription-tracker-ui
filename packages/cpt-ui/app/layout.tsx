'use client'
import React, { useState, useEffect } from 'react'

import 'nhsuk-frontend/dist/nhsuk.css'

import EpsHeader from '@/components/EpsHeader'
import EpsFooter from '@/components/EpsFooter'
import RBACBanner from '@/components/RBACBanner'

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
            <title>EPS Home</title>
            <body className={mounted ? "js-enabled" : "no-js"}>
                <AuthProvider>
                    <AccessProvider>
                        <EpsHeader />
                        {children}
                        <RBACBanner />
                        <EpsFooter />
                    </AccessProvider>
                </AuthProvider>
            </body>
        </html>
    )
}
