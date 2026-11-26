import type { BackendRecord } from '../data/types'
import { Empty } from './UI'
import { formatTime } from '../data/rules'
const labels: Record<string, string> = {
  id: '기록 ID',
  bridge: '교량 참조',
  bridge_id: '교량 ID',
  sensor: '센서 참조',
  sensor_id: '센서 ID',
  analysis_window: '분석 구간',
  anomaly_score: '이상 점수',
  risk_score: '위험도 점수',
  risk_level: '위험 등급',
  is_anomaly: '이상 여부',
  timestamp: '기준 시각',
  created_at: '생성 시각',
  updated_at: '수정 시각',
  measured_at: '측정 시각',
  message: '내용',
  status: '상태',
  label: '분류',
}
function display(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? '예' : '아니오'
  if (typeof value === 'object') return JSON.stringify(value)
  if (
    typeof value === 'string' &&
    /(?:_at|timestamp)$/.test(key) &&
    Number.isFinite(Date.parse(value))
  )
    return formatTime(value, true)
  return String(value)
}
export default function RecordsTable({
  rows,
  emptyTitle,
}: {
  rows: BackendRecord[]
  emptyTitle: string
}) {
  if (!rows.length)
    return (
      <Empty
        title={emptyTitle}
        message="DB에 결과가 저장되면 표시됩니다. 임의의 점수나 기록을 생성하지 않습니다."
        icon="ai"
      />
    )
  const columns = [
    ...new Set(rows.slice(0, 100).flatMap((r) => Object.keys(r))),
  ]
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{labels[c] || c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 100).map((row, i) => (
            <tr key={String(row.id ?? i)}>
              {columns.map((c) => (
                <td key={c}>{display(c, row[c])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="panel-footnote">
        서버 조회 {rows.length}건 · 최대 100행 표시 · 전체 교량 기록
      </div>
    </div>
  )
}
