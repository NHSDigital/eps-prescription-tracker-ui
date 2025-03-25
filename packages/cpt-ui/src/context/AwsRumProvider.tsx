import React, { createContext, useContext, ReactNode } from "react"
import { AwsRum, AwsRumConfig } from "aws-rum-web"

import { RUM_CONFIG } from "@/constants/environment"

// Define the context type
export type AwsRumContextType = AwsRum | null

// Create the context
const AwsRumContext = createContext<AwsRumContextType>(null)

interface AwsRumProviderProps {
  children: ReactNode
}

export const AwsRumProvider: React.FC<AwsRumProviderProps> = ({ children }) => {
  let awsRum: AwsRum | null = null

  try {
    const config: AwsRumConfig = {
      sessionSampleRate: RUM_CONFIG.SESSION_SAMPLE_RATE,
      guestRoleArn: RUM_CONFIG.GUEST_ROLE_ARN,
      identityPoolId: RUM_CONFIG.IDENTITY_POOL_ID,
      endpoint: RUM_CONFIG.ENDPOINT,
      telemetries: RUM_CONFIG.TELEMETRIES,
      allowCookies: RUM_CONFIG.ALLOW_COOKIES,
      enableXRay: RUM_CONFIG.ENABLE_XRAY,
    };

    awsRum = new AwsRum(RUM_CONFIG.APPLICATION_ID, RUM_CONFIG.VERSION, RUM_CONFIG.REGION, config)
  } catch (error) {
    console.error("AWS RUM initialization error:", error)
  }

  return (
    <AwsRumContext.Provider value={awsRum}>{children}</AwsRumContext.Provider>
  );
};

// Hook to access the AwsRum context
export const useAwsRum = (): AwsRumContextType => {
  return useContext(AwsRumContext);
};
