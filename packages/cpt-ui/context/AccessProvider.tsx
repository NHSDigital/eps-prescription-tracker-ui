import React, { createContext, useContext, useState, ReactNode } from 'react'

import { RoleDetails } from '@/types/TrackerUserInfoTypes'

type AccessContextType = {
  noAccess: boolean
  setNoAccess: (value: boolean) => void
  singleAccess: boolean
  setSingleAccess: (value: boolean) => void
  selectedRole: RoleDetails | null
  setSelectedRole: (value: RoleDetails | null) => void
  clear: () => void
}

const AccessContext = createContext<AccessContextType | undefined>(undefined)

export const AccessProvider = ({ children }: { children: ReactNode }) => {
  const [noAccess, setNoAccess] = useState(false)
  const [singleAccess, setSingleAccess] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleDetails | null>(null)

  const clear = () => {
    console.warn("Clearing access context.")
    setNoAccess(false);
    setSingleAccess(false);
    setSelectedRole(null);
  }

  return (
    <AccessContext.Provider value={{ noAccess, setNoAccess, singleAccess, setSingleAccess, selectedRole, setSelectedRole, clear }}>
      {children}
    </AccessContext.Provider>
  )
}

export const useAccess = () => {
  const context = useContext(AccessContext)
  if (!context) {
    throw new Error('useAccess must be used within an AccessProvider')
  }
  return context
}
