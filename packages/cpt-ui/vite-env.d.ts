/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Auth Configuration
  readonly VITE_userPoolId: string;
  readonly VITE_userPoolClientId: string;
  readonly VITE_hostedLoginDomain: string;
  readonly VITE_cloudfrontBaseUrl: string;

  // Environment Configuration
  readonly VITE_TARGET_ENVIRONMENT: "dev" | "dev-pr" | "int" | "qa" | "prod";

  // Application Configuration
  readonly VITE_COMMIT_ID: string;
  readonly VITE_VERSION_NUMBER: string;

  readonly VITE_RUM_GUEST_ROLE_ARN: string;
  readonly VITE_RUM_IDENTITY_POOL_ID: string;
  readonly VITE_RUM_APPLICATION_ID: string;

  readonly VITE_REACT_LOG_LEVEL: string;
  readonly VITE_RUM_ERROR_TIMER_INTERVAL: number;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Additional type declarations for your environment
declare global {
  interface Window {
    env?: ImportMetaEnv;
  }
}
