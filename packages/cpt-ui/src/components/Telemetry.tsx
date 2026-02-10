import http from "@/helpers/axios"
import {ENV_CONFIG} from "@/constants/environment"
import {useAuth} from "@/context/AuthProvider"

export type TelemetryLog = {
    log_level: "INFO" | "ERROR"
    message: string
    attributes: unknown
    timestamp?: number
    sessionId?: string
}

interface TelemetryLogRequired extends TelemetryLog {
    sessionId: string
    timestamp: number
}

export type TelemetryMetric = {
    metric_name: string
    dimension: "SUMTOTAL"
    timestamp?: number
    sessionId?: string
}

interface TelemetryMetricRequired extends TelemetryMetric {
    sessionId: string
    timestamp: number
}

function generateMandatories(props: TelemetryLog | TelemetryMetric) {
  if (!props.sessionId) {
    const auth = useAuth()
    props.sessionId = auth.sessionId
  }
  if (!props.timestamp) {
    props.timestamp = Date.now()
  }
}

export async function sendLog(props: TelemetryLog) {
  const mandatories = generateMandatories(props)
  const payload = {
    ...props,
    mandatories
  }
  await http.post(ENV_CONFIG.TELEMETRY_ENDPOINT, payload as TelemetryLogRequired)
}

export async function sendMetrics(props: TelemetryMetric) {
  const mandatories = generateMandatories(props)
  const payload = {
    ...props,
    mandatories
  }
  await http.post(ENV_CONFIG.TELEMETRY_ENDPOINT, payload as TelemetryMetricRequired)
}
