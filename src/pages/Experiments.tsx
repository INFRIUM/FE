import { useState } from 'react'
import type { BridgeId, Experiment } from '../data/types'
import { formatNumber as n, formatTime } from '../data/rules'
import { Empty, Notice, Panel } from '../components/UI'
export function Experiments({
  experiments,
  bridgeId,
  error = null,
}: {
  experiments: Experiment[]
  bridgeId: BridgeId
  error?: string | null
}) {
  const [filter, setFilter] = useState('ALL'),
    [selected, setSelected] = useState('')
  const rows = experiments.filter(
    (e) => filter === 'ALL' || e.bridge_id === bridgeId,
  )
  const detail = experiments.find((e) => e.experiment_id === selected)
  return (
    <>
      <Notice>
        현재는 실험 조회만 지원합니다. 등록·상태 수정·시작/종료 API는 후속 명세
        확정 후 연결합니다. 종료 시각이 null이라고 수집 중으로 단정하지
        않습니다.
      </Notice>
      {error && <Notice type="error">{error}</Notice>}
      <Panel
        title="실험 조회"
        aside={<span className="muted">서버 필드 최종 확정 전</span>}
      >
        <div className="filter-row">
          <label>
            교량
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="ALL">전체 교량</option>
              <option value="SELECTED">현재 선택 교량 · {bridgeId}</option>
            </select>
          </label>
          <span>{rows.length}건</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>실험 ID</th>
                <th>교량</th>
                <th>단계</th>
                <th>구조 상태</th>
                <th>하중 / 위치</th>
                <th>출처</th>
                <th>반복 번호</th>
                <th>시작 / 종료</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td>
                    <button
                      className="text-button"
                      onClick={() =>
                        setSelected(
                          selected === e.experiment_id ? '' : e.experiment_id,
                        )
                      }
                    >
                      {e.experiment_id}
                    </button>
                  </td>
                  <td>{e.bridge_id || '관계 미확인'}</td>
                  <td>{e.stage || '—'}</td>
                  <td>{e.condition_code || e.damage_state || '—'}</td>
                  <td>
                    {n(e.load_n, 1)} N / {e.load_position || '—'}
                  </td>
                  <td>{e.load_source || '—'}</td>
                  <td>{e.repeat_no ?? '—'}</td>
                  <td>
                    {formatTime(e.started_at, true)} /{' '}
                    {e.ended_at ? formatTime(e.ended_at, true) : '미기록'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && !error && (
            <Empty
              title="등록된 실험이 없습니다"
              message="서버에 실험이 등록되면 표시됩니다."
              icon="flask"
            />
          )}
        </div>
      </Panel>
      {detail && (
        <Panel title={`${detail.experiment_id} · 상세`}>
          <dl className="details-list">
            {[
              ['교량', detail.bridge_id || '관계 미확인'],
              ['실험 단계', detail.stage || '—'],
              ['손상 상태', detail.damage_state || '—'],
              ['구조 상태 코드', detail.condition_code || '—'],
              ['타격 조건', detail.impact_condition || '—'],
              ['설명', detail.description || '—'],
              ['메모', detail.memo || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      )}
    </>
  )
}
export function History({
  experiments,
  bridge,
  error,
}: {
  experiments: Experiment[]
  bridge: BridgeId
  error?: string | null
}) {
  return (
    <>
      <Notice>
        실험별 Measurement 필터와 비교용 데이터 계약은 아직 확정되지 않았습니다.
        정상/이상 파형·특징값을 임의로 생성해 비교하지 않습니다.
      </Notice>
      <Experiments experiments={experiments} bridgeId={bridge} error={error} />
    </>
  )
}
