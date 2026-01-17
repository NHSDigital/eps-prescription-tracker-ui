export enum Headers {
  x_request_id = "x-request-id",
  x_correlation_id = "x-correlation-id",
  x_rum_session_id = "x-rum-session-id",
  x_session_id = "x-session-id",
}

export interface ApigeeConfig {
  apigeeAccessToken: string
  roleId: string
  orgCode: string
  correlationId: string
}
