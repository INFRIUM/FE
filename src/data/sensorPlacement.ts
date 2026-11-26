import type { BridgeData, Sensor } from './types'

export type PlacementKind = 'BOX' | 'TRUSS'
export const PLACEMENT_SPAN_MM = 600
export const PLACEMENT_WIDTH_MM = 150
export type SensorPlacement = {
  label: string
  type: 'ACC' | 'TEMP'
  distanceMm: number
  model: string
  temporary: boolean
  coordinatesM: readonly [number, number, number]
}
// Hardware team's side-view design draft, before field measurement. These are
// drawing annotations, never backend records, online states or measurements.
export const SENSOR_PLACEMENTS: Record<
  PlacementKind,
  readonly SensorPlacement[]
> = {
  BOX: [
    {
      label: 'A1',
      type: 'ACC',
      distanceMm: 150,
      model: 'SEN0405 (LIS2DW12)',
      temporary: false,
      coordinatesM: [0.15, 0.12, 0],
    },
    {
      label: 'A2',
      type: 'ACC',
      distanceMm: 300,
      model: 'SEN0405 (LIS2DW12)',
      temporary: false,
      coordinatesM: [0.3, 0.12, 0],
    },
    {
      label: 'T1',
      type: 'TEMP',
      distanceMm: 300,
      model: 'DS18B20',
      temporary: true,
      coordinatesM: [0.3, 0.12, 0.06],
    },
  ],
  TRUSS: [
    {
      label: 'A3',
      type: 'ACC',
      distanceMm: 150,
      model: 'SEN0405 (LIS2DW12)',
      temporary: false,
      coordinatesM: [0.15, 0.12, 0],
    },
    {
      label: 'A4',
      type: 'ACC',
      distanceMm: 300,
      model: 'SEN0405 (LIS2DW12)',
      temporary: false,
      coordinatesM: [0.3, 0.12, 0],
    },
    {
      label: 'T2',
      type: 'TEMP',
      distanceMm: 300,
      model: 'DS18B20',
      temporary: true,
      coordinatesM: [0.3, 0.12, 0.06],
    },
  ],
}

export function placementSensorIndex(
  placement: SensorPlacement,
  sensors: Sensor[],
) {
  const matches = sensors
    .map((sensor, index) => ({ sensor, index }))
    .filter(
      ({ sensor }) =>
        sensor.sensor_id === placement.label &&
        (placement.type === 'ACC'
          ? sensor.sensor_type === 'ACCELEROMETER'
          : sensor.sensor_type === 'TEMPERATURE'),
    )
  return matches.length === 1 ? matches[0].index : -1
}

export function bridgeSensorPlacements(bridgeType: string) {
  if (bridgeType === 'STEEL_BOX') return SENSOR_PLACEMENTS.BOX
  if (bridgeType === 'STEEL_TRUSS') return SENSOR_PLACEMENTS.TRUSS
  return []
}

export function monitoringBridge(bridge: BridgeData): BridgeData {
  const placements = bridgeSensorPlacements(bridge.bridge_type)
  if (!placements.length) return bridge

  const sensors = placements.flatMap((placement) => {
    const index = placementSensorIndex(placement, bridge.sensors)
    return index < 0 ? [] : [bridge.sensors[index]]
  })
  const measuredAt = sensors
    .flatMap(({ latest }) => (latest?.measured_at ? [latest.measured_at] : []))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0]

  return { ...bridge, sensors, measured_at: measuredAt ?? null }
}

export function placementPosition(
  kind: PlacementKind,
  placement: SensorPlacement,
): [number, number, number] {
  // Shared model origin: left span end, bridge-base height and width centre.
  // 1 scene unit = 0.1 m; the support height adds 0.6 units to model Y.
  void kind
  const [x, y, z] = placement.coordinatesM
  return [x * 10 - PLACEMENT_SPAN_MM / 200, y * 10 + 0.6, z * 10]
}
