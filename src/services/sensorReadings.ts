import type { Measurement, Sensor } from '../data/types'
import { formatNumber } from '../data/rules'

export const isAcceleration = (type: string) =>
  ['ACC', 'ACCELEROMETER'].includes(type)
export const isTemperature = (type: string) =>
  ['TEMP', 'TEMPERATURE'].includes(type)
export const hasAxes = (row: Measurement | null | undefined) =>
  !!row && ['accel_x', 'accel_y', 'accel_z'].some((key) => key in row)
export function readingText(
  sensor: Sensor | undefined,
  row: Measurement | null | undefined,
) {
  if (!sensor || !row) return '—'
  if (
    isAcceleration(sensor.sensor_type) &&
    (hasAxes(row) || sensor.sensor_type === 'ACCELEROMETER')
  )
    return `X ${formatNumber(row.accel_x)} · Y ${formatNumber(row.accel_y)} · Z ${formatNumber(row.accel_z)}`
  if (isTemperature(sensor.sensor_type))
    return formatNumber('temperature' in row ? row.temperature : row.value)
  return formatNumber(row.value, 5)
}
export function readingSeries(sensor: Sensor, rows: Measurement[]) {
  const valid = (r: Measurement, value: number | null | undefined) =>
    r.quality_status !== 'INVALID' &&
    typeof value === 'number' &&
    Number.isFinite(value)
      ? value
      : null
  if (
    isAcceleration(sensor.sensor_type) &&
    (sensor.sensor_type === 'ACCELEROMETER' || rows.some(hasAxes))
  ) {
    return (['accel_x', 'accel_y', 'accel_z'] as const).map((field, i) => ({
      label: `${sensor.sensor_id} · ${['X', 'Y', 'Z'][i]}`,
      color: ['#53616B', '#2468A7', '#7C858C'][i],
      values: rows.map((row) => valid(row, row[field])),
    }))
  }
  return [
    {
      label: sensor.sensor_id,
      color: '#53616B',
      values: rows.map((row) =>
        valid(
          row,
          isTemperature(sensor.sensor_type) && 'temperature' in row
            ? row.temperature
            : row.value,
        ),
      ),
    },
  ]
}
