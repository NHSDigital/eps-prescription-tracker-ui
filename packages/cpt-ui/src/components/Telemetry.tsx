import http from "@/helpers/axios"
import {ENV_CONFIG} from "@/constants/environment"

export type TelemetryLog = {
    log_level: "INFO" | "ERROR"
    message: string
    attributes: unknown
    timestamp?: number
    sessionId?: number
}

export type TelemetryMetric = {
    metric_name: string
    dimension: "SUMTOTAL"
    timestamp?: number
    sessionId?: number
}

export async function sendLog(props: TelemetryLog) {
  await http.post(ENV_CONFIG.TELEMETRY_ENDPOINT, props)
}

export async function sendMetrics(props: TelemetryLog) {
  await http.post(ENV_CONFIG.TELEMETRY_ENDPOINT, props)
}
