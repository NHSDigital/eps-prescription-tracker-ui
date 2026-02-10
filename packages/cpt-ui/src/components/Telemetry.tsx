import http from "@/helpers/axios"
import {API_ENDPOINTS} from "@/constants/environment"
// import {useAuth} from "@/context/AuthProvider"
import {logger} from "@/helpers/logger"
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
    dimension: {type: string, value: number}
    timestamp?: number
    sessionId?: string
}

interface TelemetryMetricRequired extends TelemetryMetric {
    sessionId: string
    timestamp: number
}

function generateMandatories(props: TelemetryLog | TelemetryMetric) {
  if (!props.sessionId) {
    // const auth = useAuth()
    // props.sessionId = auth.sessionId
    props.sessionId = "mock-session-id"
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
  await http.post(API_ENDPOINTS.TELEMETRY, payload as TelemetryLogRequired)
}

export async function sendMetrics(props: TelemetryMetric) {
  const mandatories = generateMandatories(props)

  if (props.dimension.type === "SUMTOTAL") {
    props.dimension.value = 1
  }

  const payload = {
    ...props,
    mandatories
  }
  logger.info(`Sending metric ${props.metric_name}`, payload)
  await http.post(API_ENDPOINTS.TELEMETRY, payload as TelemetryMetricRequired)
}
