export type BridgeId = string
export type RiskLevel = 'NORMAL' | 'CAUTION' | 'WARNING' | 'DANGER'
export type Condition = 'NORMAL' | 'D1' | 'D2' | 'D3'
export type LoadSource = 'LOAD_CELL' | 'KNOWN_MASS'

// Backend v0.1 DTO. PK는 관계 매핑에만 사용하고 화면에는 공개 식별자를 표시합니다.
export type BridgeDTO = {
  id: number
  bridge_id: string
  bridge_type: string
  name: string
  description?: string
}
export type ComponentDTO = {
  id: number
  component_id: string
  name: string
  description?: string
  bridge: number
}
export type SensorDTO = {
  id: number
  sensor_id: string
  sensor_type: string
  location: string
  zone_id: string
  model_x: number | null
  model_y: number | null
  model_z: number | null
  default_unit: string
  is_active: boolean
  bridge: number
  component: number | null
  connection_status?: 'ONLINE' | 'OFFLINE' | 'ERROR' | null
}
export type Measurement = {
  id: number
  event_id: string
  measured_at: string | null
  sequence: number | null
  value: number | null
  unit: string
  quality_status: string
  received_at: string | null
  bridge: number
  sensor: number
  experiment: number | null
  accel_x?: number | null
  accel_y?: number | null
  accel_z?: number | null
  temperature?: number | null
  timestamp?: string | null
}
export type ExperimentDTO = {
  id: number
  experiment_id: string
  bridge: number
  stage?: string
  damage_state?: string
  condition_code?: string
  load_n?: number | null
  load_position?: string
  load_source?: string
  repeat_no?: number | null
  impact_condition?: string
  started_at?: string | null
  ended_at?: string | null
  description?: string
  memo?: string
}
export type Sensor = SensorDTO & {
  component_id: string | null
  connection: 'UNKNOWN' | 'ONLINE' | 'OFFLINE' | 'ERROR'
  latest: Measurement | null
}
export type AIResult = {
  state: 'READY' | 'PENDING' | 'ERROR'
  anomaly_score: number | null
  is_anomaly: boolean | null
  risk_score: number | null
  risk_level: RiskLevel | null
  timestamp: string | null
  history: {
    timestamp: string
    anomaly_score: number
    risk_score: number
    risk_level: RiskLevel
  }[]
}
export type BridgeData = BridgeDTO & {
  timestamp: string | null
  measured_at: string | null
  sensors: Sensor[]
  components: ComponentDTO[]
  measurements: Record<string, Measurement[]>
  measurement_error: string | null
  ai: AIResult
}
export type Experiment = ExperimentDTO & { bridge_id: string | null }
export type SystemHealth = { status: 'UNKNOWN' }
export type BackendRecord = Record<string, unknown>
export type AnalysisRecords = {
  windows: BackendRecord[]
  anomalies: BackendRecord[]
  risks: BackendRecord[]
  alerts: BackendRecord[]
  errors: string[]
  failed?: ('windows' | 'anomalies' | 'risks' | 'alerts')[]
}
export type Workspace = {
  bridges: BridgeData[]
  experiments: Experiment[]
  experiments_error: string | null
  system: SystemHealth
  analysis: AnalysisRecords
}
export type MeasurementQuery = {
  bridge_id?: string
  sensor_id?: string
  from?: string
  to?: string
}
