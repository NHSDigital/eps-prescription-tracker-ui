'use client'
import React, { useState, useEffect } from "react"
import 'nhsuk-frontend/dist/nhsuk.css';
import EpsHeader from '@/components/EpsHeader'
import EpsFooter from '@/components/EpsFooter'
import { AuthProvider } from '@/context/AuthProvider'

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
                    <EpsHeader />
                    {children}
                    <EpsFooter />
                </AuthProvider>
            </body>
            </html>
    )
}
