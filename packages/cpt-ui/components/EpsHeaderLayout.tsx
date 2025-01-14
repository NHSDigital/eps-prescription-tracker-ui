'use client'
import React from 'react'
import {usePathname} from 'next/navigation'
import {useAccess} from '@/context/AccessProvider'
import EpsHeader from '@/components/EpsHeader'
import EpsHeaderExit from '@/components/EpsHeaderExit'

export default function EpsHeaderLayout() {
    const accessContext = useAccess()
    const pathname = usePathname()

    if (pathname === '/selectyourrole' && accessContext.noAccess) {
        return <EpsHeaderExit />
    }

    return <EpsHeader accessContext={accessContext} />
}
