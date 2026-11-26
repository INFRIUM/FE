import type {
  AIResult,
  BridgeData,
  BridgeDTO,
  ComponentDTO,
  Experiment,
  ExperimentDTO,
  Measurement,
  SensorDTO,
} from '../data/types'

export function listResponse<T>(value: unknown, name: string): T[] {
  if (!Array.isArray(value))
    throw new Error(
      `${name}: JSON 배열 응답이 필요합니다. API 경로와 응답 형식을 확인해 주세요.`,
    )
  return value as T[]
}
const validTime = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value))
export function sortedMeasurements(rows: Measurement[]): Measurement[] {
  rows = rows.map(
    (row) =>
      row && {
        ...row,
        measured_at:
          row.measured_at === undefined && 'timestamp' in row
            ? row.timestamp!
            : row.measured_at,
        value:
          row.value === undefined &&
          ['accel_x', 'accel_y', 'accel_z', 'temperature'].some(
            (key) => key in row,
          )
            ? null
            : row.value,
      },
  )
  if (
    !rows.every(
      (r) =>
        r &&
        typeof r.id === 'number' &&
        (r.measured_at === null || validTime(r.measured_at)) &&
        (r.value === null ||
          (typeof r.value === 'number' && Number.isFinite(r.value))) &&
        typeof r.sensor === 'number' &&
        typeof r.bridge === 'number' &&
        typeof r.unit === 'string' &&
        ['accel_x', 'accel_y', 'accel_z', 'temperature'].every((key) => {
          const value = r[key as keyof Measurement]
          return (
            value == null ||
            (typeof value === 'number' && Number.isFinite(value))
          )
        }),
    )
  )
    throw new Error('측정값 응답 형식이 v0.1 명세와 다릅니다.')
  return [...rows].sort(
    (a, b) =>
      (b.measured_at ? Date.parse(b.measured_at) : 0) -
        (a.measured_at ? Date.parse(a.measured_at) : 0) ||
      (b.sequence ?? -1) - (a.sequence ?? -1) ||
      b.id - a.id,
  )
}
export function chronological(rows: Measurement[]): Measurement[] {
  return [...sortedMeasurements(rows)].reverse()
}
export function normalizeBridge(
  bridge: BridgeDTO,
  components: ComponentDTO[],
  sensors: SensorDTO[],
  measurements: Measurement[],
  ai: AIResult,
): BridgeData {
  const rows = sortedMeasurements(
    measurements.filter((m) => m.bridge === bridge.id),
  )
  const bridgeSensors = sensors.filter((s) => s.bridge === bridge.id)
  const grouped = Object.fromEntries(
    bridgeSensors.map((sensor) => [
      sensor.sensor_id,
      rows.filter((m) => m.sensor === sensor.id),
    ]),
  )
  const received = rows
    .map((r) => r.received_at)
    .filter(validTime)
    .sort((a, b) => Date.parse(b) - Date.parse(a))
  return {
    ...bridge,
    timestamp: received[0] || null,
    measured_at: rows[0]?.measured_at || null,
    components: components.filter((c) => c.bridge === bridge.id),
    sensors: bridgeSensors.map((sensor) => ({
      ...sensor,
      component_id:
        components.find(
          (c) => c.id === sensor.component && c.bridge === bridge.id,
        )?.component_id || null,
      connection: ['ONLINE', 'OFFLINE', 'ERROR'].includes(
        sensor.connection_status || '',
      )
        ? sensor.connection_status!
        : 'UNKNOWN',
      latest: grouped[sensor.sensor_id][0] || null,
    })),
    measurements: grouped,
    measurement_error: null,
    ai,
  }
}
export function normalizeExperiments(
  rows: ExperimentDTO[],
  bridges: BridgeDTO[],
): Experiment[] {
  return rows.map((row) => ({
    ...row,
    bridge_id: bridges.find((b) => b.id === row.bridge)?.bridge_id || null,
  }))
}
export const sensorLabel = (type: string) =>
  ({
    ACC: '가속도',
    ACCELEROMETER: '가속도',
    TEMP: '온도',
    TEMPERATURE: '온도',
    STRAIN: '변형률',
    DISP: '변위',
  })[type] || type
export function toISO(value: string): string {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp))
    throw new Error('조회 날짜와 시간을 확인해 주세요.')
  return new Date(timestamp).toISOString()
}
