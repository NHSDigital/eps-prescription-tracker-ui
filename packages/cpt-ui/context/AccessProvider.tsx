import React, {createContext, useContext, useState, ReactNode} from 'react'

type AccessContextType = {
  noAccess: boolean
  setNoAccess: (value: boolean) => void
}

const AccessContext = createContext<AccessContextType | undefined>(undefined)

export const AccessProvider = ({children}: {children: ReactNode}) => {
  const [noAccess, setNoAccess] = useState(false)

  return (
    <AccessContext.Provider value={{noAccess, setNoAccess}}>
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
