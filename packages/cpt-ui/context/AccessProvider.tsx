import React, {createContext, useContext, useState, ReactNode} from 'react'

type AccessContextType = {
  noAccess: boolean
  setNoAccess: (value: boolean) => void
  singleAccess: boolean
  setSingleAccess: (value: boolean) => void
  selectedRole: string
  setSelectedRole: (value: string) => void
  clear: () => void
}

const AccessContext = createContext<AccessContextType | undefined>(undefined)

export const AccessProvider = ({children}: {children: ReactNode}) => {
  const [noAccess, setNoAccess] = useState(false)
  const [singleAccess, setSingleAccess] = useState(false)
  const [selectedRole, setSelectedRole] = useState("")

  const clear = () => {
    console.warn("Clearing access context.")
    setNoAccess(false);
    setSingleAccess(false);
    setSelectedRole("");
  }
  
  return (
    <AccessContext.Provider value={{noAccess, setNoAccess, singleAccess, setSingleAccess, selectedRole, setSelectedRole, clear}}>
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
