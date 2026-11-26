import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type {
  BridgeData,
  BridgeId,
  Measurement,
  AnalysisRecords,
  Sensor,
  SystemHealth,
} from '../data/types'
import { formatTime } from '../data/rules'
import {
  bridgeSensorPlacements,
  placementSensorIndex,
} from '../data/sensorPlacement'
import { chronological, sensorLabel } from '../services/normalize'
import { queryMeasurements } from '../services/workspace'
import RecordsTable from '../components/RecordsTable'
import {
  hasAxes,
  isAcceleration,
  readingSeries,
  readingText,
} from '../services/sensorReadings'
import { Chart, Empty, Icon, Metric, Notice, Panel } from '../components/UI'
const DigitalTwin = lazy(() => import('../components/DigitalTwin'))
type Props = {
  bridge: BridgeData
  bridges: BridgeData[]
  selectBridge: (id: BridgeId) => void
  go: (path: string) => void
}
const qualityLabels: Record<string, string> = {
  VALID: '유효',
  INVALID: '무효',
  DELAYED: '지연',
  UNKNOWN: '미확인',
}
function Quality({ value }: { value: string | undefined }) {
  return (
    <span
      className={`quality ${value === 'VALID' ? 'valid' : value === 'INVALID' ? 'invalid' : 'unknown'}`}
    >
      {value ? `${qualityLabels[value] || value} · ${value}` : 'UNKNOWN'}
    </span>
  )
}
function SensorDetail({ sensor }: { sensor: Sensor | undefined }) {
  return sensor ? (
    <div className="sensor-info">
      <div className="sensor-info-heading">
        <span className="sensor-chip">
          <Icon name="wave" size={16} />
        </span>
        <div>
          <strong>{sensor.sensor_id}</strong>
          <small>
            {sensorLabel(sensor.sensor_type)} · {sensor.sensor_type}
          </small>
        </div>
        <span className="connection-label">{sensor.connection}</span>
      </div>
      <div className="single-reading">
        <span>최근 측정값</span>
        <strong>
          {readingText(sensor, sensor.latest)}
          <small>{sensor.latest?.unit || sensor.default_unit}</small>
        </strong>
        <Quality value={sensor.latest?.quality_status} />
      </div>
      <dl className="details-list">
        {[
          ['사용 등록', sensor.is_active ? '활성 등록' : '비활성 등록'],
          ['설치 위치', sensor.location || '미확정'],
          ['구성요소', sensor.component_id || '미지정'],
          ['구역', sensor.zone_id || '미지정'],
          ['측정 시각', formatTime(sensor.latest?.measured_at, true)],
          ['서버 수신', formatTime(sensor.latest?.received_at, true)],
          [
            'DB 좌표',
            [sensor.model_x, sensor.model_y, sensor.model_z].some(
              (v) => v === null,
            )
              ? '미확정'
              : `${sensor.model_x}, ${sensor.model_y}, ${sensor.model_z}`,
          ],
        ].map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {isAcceleration(sensor.sensor_type) && (
        <Notice>
          {sensor.sensor_type === 'ACCELEROMETER'
            ? 'SEN0405 (LIS2DW12) · 3축 가속도. ±2 g / 100 Hz는 초기 제안입니다.'
            : '기존 API의 가속도 기록입니다.'}
          센서 축과 모델 축은 장착 방향 확인 후 확정합니다.
          {!hasAxes(sensor.latest) &&
            ' 현재 응답에는 3축 값이 없습니다. 기존 단일 value를 3축으로 복제하지 않습니다.'}
        </Notice>
      )}
      {sensor.sensor_type === 'TEMPERATURE' && (
        <Notice>
          DS18B20 · -55~125 °C · 9~12비트. 1 Hz는 초기 제안입니다. 설치부 주변
          온도이며 구조물 내부 온도를 직접 보장하지 않습니다.
        </Notice>
      )}
    </div>
  ) : (
    <Empty title="선택할 센서가 없습니다" />
  )
}
function SensorTable({
  bridge,
  onSelect,
}: {
  bridge: BridgeData
  onSelect?: (id: string) => void
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>센서 ID</th>
            <th>종류</th>
            <th>측정값</th>
            <th>측정 품질</th>
            <th>사용 등록</th>
            <th>연결 상태</th>
            <th>측정 시각</th>
            <th>선택</th>
          </tr>
        </thead>
        <tbody>
          {bridge.sensors.map((s) => (
            <tr key={s.sensor_id}>
              <td className="mono">{s.sensor_id}</td>
              <td>{sensorLabel(s.sensor_type)}</td>
              <td className="mono">
                {readingText(s, s.latest)} {s.latest?.unit || s.default_unit}
              </td>
              <td>
                <Quality value={s.latest?.quality_status} />
              </td>
              <td>{s.is_active ? '활성 등록' : '비활성 등록'}</td>
              <td>{s.connection}</td>
              <td className="mono">
                {formatTime(s.latest?.measured_at, true)}
              </td>
              <td>
                {onSelect && (
                  <button
                    className="text-button"
                    onClick={() => onSelect(s.sensor_id)}
                  >
                    상세 보기 →
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!bridge.sensors.length && <Empty title="등록된 센서가 없습니다" />}
    </div>
  )
}
function MeasurementChart({
  sensor,
  rows,
  height = 190,
}: {
  sensor: Sensor | undefined
  rows: Measurement[]
  height?: number
}) {
  if (!sensor) return <Empty />
  const ordered = chronological(rows).filter((r) => r.measured_at !== null)
  const plotted = ordered.slice(-600)
  const units = [...new Set(ordered.map((r) => r.unit))]
  if (units.length > 1)
    return (
      <Notice type="warning">
        서로 다른 단위가 섞여 있어 그래프를 표시하지 않습니다. 백엔드 단위를
        확인해 주세요.
      </Notice>
    )
  return (
    <>
      <Chart
        unit={units[0] || sensor.default_unit}
        height={height}
        series={readingSeries(sensor, plotted)}
        labels={plotted.map((r) => formatTime(r.measured_at))}
        xValues={plotted.map((r) => Date.parse(r.measured_at!))}
      />
      <div className="panel-footnote">
        측정 시각 오름차순 · 결측/INVALID는 선을 끊어 표시합니다. 시각 미확보
        항목은 원본 표/CSV에 보존합니다. 그래프는 최근 최대 600개 항목을
        표시합니다.
      </div>
    </>
  )
}
function Twin({
  bridge,
  index,
  onSelect,
}: {
  bridge: BridgeData
  index: number
  onSelect: (i: number) => void
}) {
  return (
    <Suspense
      fallback={<div className="twin-loading">3D 모델 불러오는 중…</div>}
    >
      <DigitalTwin
        bridgeId={bridge.bridge_id}
        bridgeType={bridge.bridge_type}
        sensors={bridge.sensors}
        selected={index}
        onSelect={onSelect}
      />
    </Suspense>
  )
}
export function Dashboard({ bridge, bridges, selectBridge, go }: Props) {
  const [index, setIndex] = useState(0)
  const placements = bridgeSensorPlacements(bridge.bridge_type)
  const summaries = placements.length
    ? placements.map((placement) => ({
        id: placement.label,
        label: placement.type === 'ACC' ? '가속도' : '온도',
        sensor: bridge.sensors[placementSensorIndex(placement, bridge.sensors)],
      }))
    : bridge.sensors.map((sensor) => ({
        id: sensor.sensor_id,
        label: sensorLabel(sensor.sensor_type),
        sensor,
      }))
  return (
    <>
      <div className="metrics-row">
        <Metric
          label="등록 교량"
          value={bridges.length}
          detail="API에 등록된 교량 기준"
          icon="bridge"
        />
        <Metric
          label={placements.length ? '배치도 센서' : '등록 센서'}
          value={placements.length || bridge.sensors.length}
          detail={
            placements.length ? '가속도 2개 · 온도 1개' : bridge.bridge_id
          }
          icon="wave"
        />
        <Metric
          label="사용 활성 센서"
          value={bridge.sensors.filter((s) => s.is_active).length}
          detail="is_active · 실제 연결 여부 아님"
        />
        <Metric
          label="장치 연결 상태"
          value="UNKNOWN"
          detail="연결 상태 API 제공 전"
        />
      </div>
      <div className="dashboard-grid">
        <Panel
          title="교량 디지털트윈"
          kicker="STRUCTURAL OVERVIEW"
          aside={<span className="mini-badge">제작 도안 기반</span>}
          className="twin-panel"
        >
          <Twin bridge={bridge} index={index} onSelect={setIndex} />
          <div className="twin-panel-footer">
            <span>경간 600 mm · BOX / TRUSS 센서 배치</span>
            <button className="text-button" onClick={() => go('/bridges')}>
              교량 상세 보기 →
            </button>
          </div>
        </Panel>
        <section className="bridge-status-list">
          <div className="section-title">
            <h2>등록 교량</h2>
            <span>{bridges.length} BRIDGES</span>
          </div>
          {bridges.map((b) => (
            <button
              key={b.bridge_id}
              className={`bridge-status-card ${bridge.bridge_id === b.bridge_id ? 'current' : ''}`}
              aria-pressed={bridge.bridge_id === b.bridge_id}
              onClick={() => selectBridge(b.bridge_id)}
            >
              <div className="bridge-card-top">
                <span className="bridge-initial">
                  <Icon name="bridge" size={18} />
                </span>
                <div>
                  <strong>{b.name}</strong>
                  <small>
                    {b.bridge_id} · {b.bridge_type}
                  </small>
                </div>
                {bridge.bridge_id === b.bridge_id && (
                  <span className="bridge-selected-label">
                    <Icon name="check" size={12} />
                    선택됨
                  </span>
                )}
              </div>
              <div className="bridge-ai-metrics">
                <div>
                  <span>등록 센서</span>
                  <strong>{b.sensors.length}</strong>
                </div>
                <div>
                  <span>연결 상태</span>
                  <strong style={{ fontSize: 15 }}>UNKNOWN</strong>
                </div>
              </div>
              <div className="bridge-card-time">
                <span>최신 측정</span>
                <span>{formatTime(b.measured_at, true)}</span>
              </div>
            </button>
          ))}
          <div className="ai-footnote">
            <Icon name="ai" size={17} />
            <span>
              서버에 저장된 최근 측정값을 표시합니다.
              <br />
              AI 화면에는 서버 DB에 등록된 분석 결과만 표시합니다.
            </span>
          </div>
        </section>
      </div>
      {bridge.measurement_error && (
        <Notice type="error">{bridge.measurement_error}</Notice>
      )}
      <div className="sensor-summary-grid">
        {summaries.map(({ id, label, sensor: s }) =>
          s ? (
            <button
              className="metric sensor-summary"
              key={s.sensor_id}
              onClick={() =>
                go(
                  `/sensor/${encodeURIComponent(bridge.bridge_id)}/${encodeURIComponent(s.sensor_id)}`,
                )
              }
            >
              <div className="metric-label">
                {label}
                <small>{id}</small>
              </div>
              <strong>
                {readingText(s, s.latest)}
                <small>{s.latest?.unit || s.default_unit}</small>
              </strong>
              <div className="summary-quality">
                <Quality value={s.latest?.quality_status} />
                <span>{formatTime(s.latest?.measured_at)}</span>
              </div>
            </button>
          ) : (
            <article className="metric sensor-summary" key={id}>
              <div className="metric-label">
                {label}
                <small>{id}</small>
              </div>
              <strong>—</strong>
              <span className="metric-detail">측정값 없음</span>
            </article>
          ),
        )}
      </div>
      <Panel
        title="최근 측정값"
        aside={
          <button className="text-button" onClick={() => go('/sensors')}>
            센서 모니터링 →
          </button>
        }
      >
        <SensorTable
          bridge={bridge}
          onSelect={(id) =>
            go(
              `/sensor/${encodeURIComponent(bridge.bridge_id)}/${encodeURIComponent(id)}`,
            )
          }
        />
      </Panel>
    </>
  )
}
export function Bridges({ bridge }: Props) {
  const [selected, setSelected] = useState('')
  const index = Math.max(
      0,
      bridge.sensors.findIndex((s) => s.sensor_id === selected),
    ),
    sensor = bridge.sensors[index]
  return (
    <>
      <div className="bridge-detail-heading">
        <div>
          <span className="eyebrow">
            {bridge.bridge_id} / {bridge.bridge_type}
          </span>
          <h2>{bridge.name}</h2>
          <p>{bridge.description}</p>
        </div>
      </div>
      <div className="twin-detail-grid">
        <Panel
          title="도안 기반 디지털트윈"
          kicker="PROTOTYPE STUDY"
          aside={<span className="mini-badge">600 mm SENSOR LAYOUT</span>}
        >
          <Twin
            bridge={bridge}
            index={index}
            onSelect={(i) => setSelected(bridge.sensors[i]?.sensor_id || '')}
          />
          <div className="panel-footnote">
            제작 도안의 외형 치수를 반영한 시각화입니다. 구조 해석 모델은
            아니며, 센서 선택 시 오른쪽에서 실제 DB 측정값을 확인할 수 있습니다.
          </div>
        </Panel>
        <Panel title="선택 센서">
          <SensorDetail sensor={sensor} />
        </Panel>
      </div>
      <Panel title="센서 목록">
        <SensorTable bridge={bridge} onSelect={setSelected} />
      </Panel>
      <Panel title="교량 구성요소">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Component ID</th>
                <th>이름</th>
                <th>설명</th>
              </tr>
            </thead>
            <tbody>
              {bridge.components.map((c) => (
                <tr key={c.component_id}>
                  <td>{c.component_id}</td>
                  <td>{c.name}</td>
                  <td>{c.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!bridge.components.length && (
            <Empty title="등록된 구성요소가 없습니다" />
          )}
        </div>
      </Panel>
    </>
  )
}
export function Sensors({
  bridge,
  initialSensor = '',
}: {
  bridge: BridgeData
  initialSensor?: string
}) {
  const [sensorId, setSensor] = useState(initialSensor),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [period, setPeriod] = useState({ from: '', to: '' }),
    [result, setResult] = useState<Measurement[] | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [paused, setPaused] = useState(false),
    [frozen, setFrozen] = useState<Measurement[]>([]),
    [version, setVersion] = useState(0)
  const request = useRef<AbortController | null>(null),
    sequence = useRef(0)
  const placements = bridgeSensorPlacements(bridge.bridge_type)
  const options = placements.length
    ? placements.map((placement) => ({
        id: placement.label,
        label: placement.type === 'ACC' ? '가속도' : '온도',
      }))
    : bridge.sensors.map((sensor) => ({
        id: sensor.sensor_id,
        label: sensorLabel(sensor.sensor_type),
      }))
  const selectedId =
    options.find((option) => option.id === sensorId)?.id ||
    bridge.sensors[0]?.sensor_id ||
    options[0]?.id ||
    ''
  const selectedPlacement = placements.find(({ label }) => label === selectedId)
  const sensor = bridge.sensors.find((s) => s.sensor_id === selectedId)
  const registeredId = sensor?.sensor_id
  useEffect(() => {
    const controller = new AbortController()
    request.current = controller
    const id = ++sequence.current
    if (registeredId) {
      queryMeasurements(
        {
          bridge_id: bridge.bridge_id,
          sensor_id: registeredId,
          from: period.from ? `${period.from}:00+09:00` : undefined,
          to: period.to ? `${period.to}:00+09:00` : undefined,
        },
        controller.signal,
      )
        .then((rows) => {
          if (!controller.signal.aborted && id === sequence.current) {
            setResult(rows)
            setBusy(false)
            setError('')
          }
        })
        .catch((err) => {
          if (!controller.signal.aborted && id === sequence.current) {
            setError(err instanceof Error ? err.message : '조회 실패')
            setBusy(false)
          }
        })
    }
    return () => controller.abort()
  }, [period, registeredId, bridge.bridge_id, bridge.measurements, version])
  const rows = registeredId
    ? (result ?? bridge.measurements[registeredId] ?? [])
    : []
  const visible = registeredId && paused ? frozen : rows
  const latest = visible[0]
  function reset() {
    request.current?.abort()
    sequence.current++
    setPeriod({ from: '', to: '' })
    setFrom('')
    setTo('')
    setResult(null)
    setBusy(false)
    setError('')
    setPaused(false)
  }
  function download() {
    const escape = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`
    const csv = [
      'event_id,sensor_id,measured_at,value,unit,quality_status,sequence,received_at,accel_x,accel_y,accel_z,temperature',
      ...visible.map((r) =>
        [
          r.event_id,
          selectedId,
          r.measured_at,
          r.value,
          r.unit,
          r.quality_status,
          r.sequence,
          r.received_at,
          r.accel_x,
          r.accel_y,
          r.accel_z,
          r.temperature,
        ]
          .map(escape)
          .join(','),
      ),
    ].join('\r\n')
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${selectedId}-measurements.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }
  return (
    <>
      <div className="metrics-row">
        <Metric
          label="최근 측정값"
          value={readingText(sensor, latest)}
          unit={latest?.unit || sensor?.default_unit}
          detail="현재 조회 범위의 최신 항목"
        />
        <Metric
          label="측정 품질"
          value={latest?.quality_status || 'UNKNOWN'}
          detail="VALID / INVALID / DELAYED / UNKNOWN"
        />
        <Metric
          label="사용 등록"
          value={sensor ? (sensor.is_active ? '활성' : '비활성') : '—'}
          detail="실제 온라인 상태와 다릅니다"
        />
        <Metric
          label="실제 장치 연결"
          value={sensor?.connection || 'UNKNOWN'}
          detail="서버 connection_status 기준 · 미제공 시 UNKNOWN"
        />
      </div>
      <Panel
        title="센서 측정 이력"
        kicker="MEASUREMENT · SENSOR DATA"
        aside={
          <button
            className="button"
            onClick={download}
            disabled={!visible.length || busy || !!error}
          >
            <Icon name="download" size={14} />
            CSV 다운로드
          </button>
        }
      >
        <form
          className="monitor-toolbar"
          onSubmit={(e) => {
            e.preventDefault()
            if (from && to && from > to) {
              setError('시작 시각이 종료 시각보다 늦을 수 없습니다.')
              return
            }
            setError('')
            setPaused(false)
            setResult(null)
            setBusy(Boolean(from || to))
            setPeriod({ from, to })
            setVersion((v) => v + 1)
          }}
        >
          <label>
            센서
            <select
              value={selectedId}
              disabled={!options.length}
              onChange={(e) => {
                reset()
                setSensor(e.target.value)
              }}
            >
              {options.map(({ id, label }) => (
                <option key={id} value={id}>
                  {id} · {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            시작 (KST)
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            종료 (KST)
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button
            className="button primary"
            type="submit"
            disabled={!sensor || busy}
          >
            조회
          </button>
          <button className="button" type="button" onClick={reset}>
            초기화
          </button>
          <button
            className="button"
            type="button"
            disabled={!visible.length || busy || !!error}
            onClick={() => {
              if (!paused) setFrozen(visible)
              setPaused(!paused)
            }}
          >
            <Icon name={paused ? 'play' : 'pause'} size={13} />
            {paused ? '다시 표시' : '표시 일시정지'}
          </button>
        </form>
        {sensor?.sensor_type === 'ACC' && (
          <Notice>
            가속도는 축 구분 없는 단일 측정값입니다. 3축 API 확정 전에는 X/Y/Z
            그래프를 표시하지 않습니다.
          </Notice>
        )}
        {paused && (
          <Notice>
            화면 표시가 일시정지되었습니다. 원본 조회는 계속되며 다시 표시하면
            최신 결과가 반영됩니다.
          </Notice>
        )}
        {bridge.measurement_error && !result && (
          <Notice type="error">{bridge.measurement_error}</Notice>
        )}
        {error ? (
          <Notice type="error">{error}</Notice>
        ) : busy ? (
          <div className="loading-label" role="status">
            기간별 측정값 조회 중…
          </div>
        ) : !sensor && selectedPlacement ? (
          <Empty
            title={`${selectedId} 측정 데이터 연동 대기`}
            message="배치도에 있는 센서입니다. 같은 ID의 센서가 연동되고 측정값이 들어오면 이곳에 그래프가 표시됩니다."
          />
        ) : (
          <MeasurementChart sensor={sensor} rows={visible} height={260} />
        )}
      </Panel>
      <div className="two-columns">
        <Panel title="센서 상세">
          {!sensor && selectedPlacement ? (
            <Empty
              title={`${selectedPlacement.label} · ${selectedPlacement.model}`}
              message={`교량 시작점에서 ${selectedPlacement.distanceMm} mm · 배치도 기준`}
            />
          ) : (
            <SensorDetail sensor={sensor} />
          )}
        </Panel>
        <Panel title="조회 정보">
          <dl className="details-list">
            <div>
              <dt>공개 교량 ID</dt>
              <dd>{bridge.bridge_id}</dd>
            </div>
            <div>
              <dt>센서 ID</dt>
              <dd>{selectedId || '—'}</dd>
            </div>
            <div>
              <dt>조회 건수</dt>
              <dd>{rows.length}</dd>
            </div>
            <div>
              <dt>최신 측정 시각</dt>
              <dd>{formatTime(latest?.measured_at, true)}</dd>
            </div>
            <div>
              <dt>서버 수신 시각</dt>
              <dd>{formatTime(latest?.received_at, true)}</dd>
            </div>
          </dl>
          <Notice>
            화면의 값은 백엔드 API로 조회한 DB 기록입니다. is_active와 측정
            품질은 장치의 온라인 상태를 의미하지 않습니다.
          </Notice>
        </Panel>
      </div>
      <Panel
        title="측정값 목록"
        aside={<span className="muted">최신 측정 우선 · 최대 100행 표시</span>}
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>측정 시각 (KST)</th>
                <th>값</th>
                <th>단위</th>
                <th>품질</th>
                <th>순번</th>
                <th>서버 수신</th>
              </tr>
            </thead>
            <tbody>
              {!error &&
                !busy &&
                visible.slice(0, 100).map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{formatTime(r.measured_at, true)}</td>
                    <td>{readingText(sensor, r)}</td>
                    <td>{r.unit}</td>
                    <td>
                      <Quality value={r.quality_status} />
                    </td>
                    <td>{r.sequence ?? '—'}</td>
                    <td>{formatTime(r.received_at, true)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!visible.length && !busy && !error && (
            <Empty title="조회된 측정값이 없습니다" />
          )}
        </div>
      </Panel>
    </>
  )
}
export function AIAnalysis({ analysis }: { analysis: AnalysisRecords }) {
  const sections = [
    { key: 'anomalies', title: '이상 탐지 결과' },
    { key: 'risks', title: '위험도 분석 결과' },
    { key: 'windows', title: '분석 구간' },
    { key: 'alerts', title: '알림 기록' },
  ] as const
  return (
    <>
      <Notice>
        서버 DB에 저장된 전체 교량 분석 기록을 조회합니다. 빈 목록은 분석 결과
        미등록이며 정상 등급을 의미하지 않습니다. 점수 범위·방향은 백엔드/AI
        계약 확정 전까지 해석하지 않습니다.
      </Notice>
      {analysis.errors.map((message) => (
        <Notice type="error" key={message}>
          {message}
        </Notice>
      ))}
      <div className="metrics-row">
        {sections.map((section) => (
          <Metric
            key={section.key}
            label={section.title}
            value={
              analysis.failed?.includes(section.key)
                ? '—'
                : analysis[section.key].length
            }
            unit="건"
          />
        ))}
      </div>
      {sections.map((section) => (
        <Panel key={section.key} title={section.title} kicker="SERVER DATABASE">
          {analysis.failed?.includes(section.key) ? (
            <Notice type="error">
              조회에 실패했습니다. 새로고침으로 다시 확인해 주세요.
            </Notice>
          ) : (
            <RecordsTable
              rows={analysis[section.key]}
              emptyTitle={`등록된 ${section.title}가 없습니다`}
            />
          )}
        </Panel>
      ))}
    </>
  )
}
export function Settings({
  reload,
}: {
  system: SystemHealth
  reload: () => void
}) {
  return (
    <>
      <Notice>
        실시간 연결 상태 API는 아직 제공되지 않습니다. 서버 조회 성공이나
        is_active=true를 ESP32 온라인으로 표시하지 않습니다.
      </Notice>
      <div className="metrics-row three">
        <Metric
          label="ESP32 연결"
          value="UNKNOWN"
          detail="시스템 상태 API 연결 전"
        />
        <Metric
          label="센서 온라인"
          value="UNKNOWN"
          detail="센서 사용 등록과 별도"
        />
        <Metric
          label="측정 데이터 출처"
          value="서버 DB"
          detail="백엔드 조회 API 응답"
        />
      </div>
      <Panel
        title="연결 상태·오류 기록"
        aside={
          <button className="button" onClick={reload}>
            <Icon name="refresh" size={14} />
            조회 다시 시도
          </button>
        }
      >
        <Empty
          title="시스템 상태 API 연동 대기"
          message="last_received_at 또는 시스템 상태 API가 제공되면 연결 상태와 장치 오류를 표시합니다."
          icon="settings"
        />
      </Panel>
    </>
  )
}
