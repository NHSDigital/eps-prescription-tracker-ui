/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Auth Configuration
  readonly VITE_userPoolId: string;
  readonly VITE_userPoolClientId: string;
  readonly VITE_hostedLoginDomain: string;
  readonly VITE_redirectSignIn: string;
  readonly VITE_redirectSignOut: string;

  // Environment Configuration
  readonly VITE_TARGET_ENVIRONMENT: "dev" | "dev-pr" | "int" | "qa" | "prod";
  readonly VITE_API_DOMAIN_OVERRIDE: string;

  // Application Configuration
  readonly VITE_SERVICE_NAME: string;
  readonly VITE_BASE_PATH: string;
  readonly VITE_LOCAL_DEV: string;
  readonly VITE_COMMIT_ID: string;

  readonly VITE_RUM_GUEST_ROLE_ARN: string;
  readonly VITE_RUM_IDENTITY_POOL_ID: string;
  readonly VITE_RUM_APPLICATION_ID: string;
  readonly VITE_RUM_ALLOW_COOKIES: string;
  readonly VITE_RUM_ENABLE_XRAY: string;
  readonly VITE_RUM_SESSION_SAMPLE_RATE: string;
  readonly VITE_RUM_TELEMETRIES: string;
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
