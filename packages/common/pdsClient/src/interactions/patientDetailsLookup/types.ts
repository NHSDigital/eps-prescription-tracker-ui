export interface PDSResponse {
  id: string;
  name?: Array<{
    given?: Array<string>;
    family?: string;
    prefix?: Array<string>;
    suffix?: Array<string>;
  }>;
  gender?: string;
  birthDate?: string;
  address?: Array<{
    line?: Array<string>;
    city?: string;
    postalCode?: string;
  }>;
  meta?: {
    security?: Array<{
      code: string;
    }>;
  };
}
