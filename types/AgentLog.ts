// Ver saveAgentLogs en tracer-ingestor (src/controllers/agent_logs.controller.ts).
export type AgentLogLevel = 'VRB' | 'DBG' | 'INF' | 'WRN' | 'ERR' | 'FTL'

export interface AgentLogEntry {
  ts: string
  level: AgentLogLevel
  message: string
}

export interface AgentLogContext {
  app_version?: string
  os?: string
  windows_user?: string
  email?: string | null
  session_id?: number
  session_active?: boolean
  remote_session?: boolean
  monitors?: number
  uptime_minutes?: number
  memory_mb?: number
  pending_screenshots?: number
}

export interface AgentLogBatch {
  received_at: string
  machine: string
  appuser_id: string | null
  from: string | null
  to: string | null
  context: AgentLogContext
  entries: AgentLogEntry[]
  truncated?: number
}
