import type { BackendRecord, BridgeData } from '../data/types'
export type AlertItem = {
  id: string
  title: string
  message: string
  context: string
  timestamp: string | null
  level: string
  href: string
  record: BackendRecord
}
const text = (...values: unknown[]) =>
  values.find((v) => typeof v === 'string' && v.trim()) as string | undefined
const scalar = (v: unknown) =>
  typeof v === 'string' || typeof v === 'number' ? String(v) : null
export function alertIdentity(record: BackendRecord): string {
  const id =
    scalar(record.id) ?? scalar(record.alert_id) ?? scalar(record.event_id)
  if (id !== null) return id
  // ID 미제공 레코드도 응답 순서가 바뀌어 중복 알림이 생기지 않도록 안정적으로 식별합니다.
  const stable = JSON.stringify(
    Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((k) => [k, record[k]]),
    ),
  )
  let hash = 2166136261
  for (let i = 0; i < stable.length; i++) {
    hash ^= stable.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `record-${(hash >>> 0).toString(16)}`
}
export const alertHref = (id: string) =>
  `/alerts?alert=${encodeURIComponent(id)}`
export function presentAlerts(
  records: BackendRecord[],
  bridges: BridgeData[] = [],
): AlertItem[] {
  const unique = new Map<string, AlertItem>()
  for (const record of records) {
    const id = alertIdentity(record)
    const bridge = bridges.find(
      (b) => b.id === record.bridge || b.bridge_id === record.bridge_id,
    )
    const sensor = bridges
      .flatMap((b) => b.sensors)
      .find((s) => s.id === record.sensor || s.sensor_id === record.sensor_id)
    const context = [
      text(record.bridge_id) || bridge?.bridge_id,
      text(record.sensor_id) || sensor?.sensor_id,
    ]
      .filter(Boolean)
      .join(' · ')
    const candidate = text(
      record.created_at,
      record.triggered_at,
      record.occurred_at,
      record.timestamp,
      record.measured_at,
    )
    const timestamp =
      candidate && Number.isFinite(Date.parse(candidate)) ? candidate : null
    const level = (
      text(record.severity, record.risk_level, record.level) || 'INFO'
    ).toUpperCase()
    unique.set(id, {
      id,
      title:
        text(record.title, record.alert_type, record.name) ||
        '교량 모니터링 알림',
      message:
        text(
          record.message,
          record.description,
          record.content,
          record.detail,
        ) || '새 알림이 등록되었습니다. 상세 내용을 확인해 주세요.',
      context,
      timestamp,
      level,
      href: alertHref(id),
      record,
    })
  }
  return [...unique.values()].sort(
    (a, b) =>
      (b.timestamp ? Date.parse(b.timestamp) : 0) -
        (a.timestamp ? Date.parse(a.timestamp) : 0) ||
      b.id.localeCompare(a.id, undefined, { numeric: true }),
  )
}
export type AlertTracker = { initialized: boolean; known: Set<string> }
export function detectNewAlerts(
  state: AlertTracker,
  items: AlertItem[],
): { state: AlertTracker; fresh: AlertItem[] } {
  const fresh = state.initialized
    ? items.filter((item) => !state.known.has(item.id))
    : []
  return {
    state: {
      initialized: true,
      known: new Set([...state.known, ...items.map((item) => item.id)]),
    },
    fresh,
  }
}
export const alertDate = (timestamp: string | null) =>
  timestamp
    ? new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(timestamp))
    : '시각 미제공'
