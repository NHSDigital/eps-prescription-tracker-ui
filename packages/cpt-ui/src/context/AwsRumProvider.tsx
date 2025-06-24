import React, {createContext, useContext, ReactNode} from "react"
import {AwsRum} from "aws-rum-web"
import {cptAwsRum} from "@/helpers/awsRum"

// Define the context type
export type AwsRumContextType = AwsRum | null

// Create and export the context
export const AwsRumContext = createContext<AwsRumContextType>(null)

interface AwsRumProviderProps {
  children: ReactNode
}

export const AwsRumProvider: React.FC<AwsRumProviderProps> = ({children}) => {
  const awsRum = cptAwsRum.getAwsRum()

  return (
    <AwsRumContext.Provider value={awsRum}>{children}</AwsRumContext.Provider>
  )
}

// Hook to access the AwsRum context
export const useAwsRum = (): AwsRumContextType => {
  return useContext(AwsRumContext)
}
