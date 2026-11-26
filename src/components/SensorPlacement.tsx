import {
  SENSOR_PLACEMENTS,
  placementSensorIndex,
} from '../data/sensorPlacement'
import type {
  PlacementKind,
  SensorPlacement as Placement,
} from '../data/sensorPlacement'
import type { Sensor } from '../data/types'
import { useState } from 'react'

export default function SensorPlacement({
  kind,
  sensors,
  active,
  onSelect,
  preview,
}: {
  kind: PlacementKind
  sensors: Sensor[]
  active: string | null
  onSelect: (placement: Placement) => void
  preview: boolean
}) {
  const placements = SENSOR_PLACEMENTS[kind]
  const [projection, setProjection] = useState<'top' | 'side'>('top')
  return (
    <section className="sensor-placement" aria-label={`${kind} 센서 배치도`}>
      <header>
        <div>
          <strong>센서 배치도</strong>
          <span>
            {kind} · ESP32 #{kind === 'BOX' ? '1' : '2'}
          </span>
        </div>
        <span className="placement-draft">설계 초안 · 실측 전</span>
      </header>
      <div
        className="placement-projection-tabs"
        role="group"
        aria-label="센서 배치 확인 방향"
      >
        <button
          aria-pressed={projection === 'top'}
          onClick={() => setProjection('top')}
        >
          상단 · 중앙선 확인
        </button>
        <button
          aria-pressed={projection === 'side'}
          onClick={() => setProjection('side')}
        >
          측면 · 거리 확인
        </button>
      </div>
      <p className="placement-check-summary">
        {placements[0].label}·{placements[1].label}: 상판 폭 중앙선 Z=0에 일직선
        배치 · {placements[2].label}: 300 mm 임시 위치
      </p>
      {projection === 'top' ? (
        <svg
          className="placement-diagram placement-top-diagram"
          viewBox="0 0 720 300"
          role="img"
          aria-label={`${kind} 상단 배치도. ${placements[0].label} 150 mm, ${placements[1].label} 300 mm는 폭 중앙선 Z=0. ${placements[2].label}는 X 300 mm, Z 60 mm 임시 위치.`}
        >
          <rect
            x="60"
            y="70"
            width="600"
            height="150"
            rx="2"
            fill="#E9EDF0"
            stroke="#53616B"
            strokeWidth="2"
          />
          {kind === 'TRUSS' && (
            <g stroke="#7C858C" strokeWidth="5">
              <path d="M60 73H660M60 217H660" />
            </g>
          )}
          <path
            d="M60 145H660"
            stroke="#2468A7"
            strokeWidth="1.5"
            strokeDasharray="7 5"
          />
          <text
            x="648"
            y="135"
            textAnchor="end"
            className="placement-center-label"
          >
            폭 중앙선 Z = 0
          </text>
          {[150, 300].map((mm) => (
            <path
              key={mm}
              d={`M${60 + mm} 70V220`}
              stroke="#7C858C"
              strokeDasharray="4 5"
              opacity=".5"
            />
          ))}
          {placements.map((p) => {
            const temp = p.type === 'TEMP'
            const x = 60 + p.coordinatesM[0] * 1000
            const y = 145 + p.coordinatesM[2] * 1000
            return (
              <g
                key={p.label}
                className={`placement-point ${temp ? 'temperature' : 'acceleration'} ${active === p.label ? 'active' : ''}`}
              >
                <path d={temp ? `M${x} ${y}V242H${x + 85}` : `M${x} ${y}V38`} />
                <circle cx={x} cy={y} r={active === p.label ? 8 : 6} />
                <text
                  x={temp ? x + 90 : x}
                  y={temp ? 248 : 29}
                  textAnchor={temp ? 'start' : 'middle'}
                >
                  {p.label} · {p.distanceMm} mm{temp ? ' · 임시' : ''}
                </text>
              </g>
            )
          })}
          {[0, 150, 300, 600].map((mm) => (
            <text
              key={mm}
              x={60 + mm}
              y="283"
              textAnchor="middle"
              className="placement-axis"
            >
              {mm}
              {mm === 600 ? ' mm' : ''}
            </text>
          ))}
          <text x="48" y="76" textAnchor="end" className="placement-axis">
            −75
          </text>
          <text x="48" y="223" textAnchor="end" className="placement-axis">
            +75
          </text>
        </svg>
      ) : (
        <svg
          className="placement-diagram"
          viewBox="0 0 720 210"
          role="img"
          aria-label={`${kind} 경간 600 mm, 폭 150 mm. ${placements.map((p) => `${p.label} ${p.distanceMm} mm`).join(', ')}. 온도 센서는 임시 위치.`}
        >
          <rect
            x="60"
            y="112"
            width="600"
            height="24"
            fill="#D9DEE5"
            stroke="#53616B"
            strokeWidth="2"
          />
          <path
            d="M60 136v15h36v-15m528 0v15h36v-15"
            fill="#E9EDF0"
            stroke="#53616B"
            strokeWidth="2"
          />
          {kind === 'TRUSS' && (
            <path
              d="M60 112 135 66 210 112 285 66 360 112 435 66 510 112 585 66 660 112M135 66H585"
              stroke="#53616B"
              strokeWidth="3"
              fill="none"
            />
          )}
          {placements.map((p) => {
            const x = 60 + p.distanceMm
            const temp = p.type === 'TEMP'
            return (
              <g
                key={p.label}
                className={`placement-point ${temp ? 'temperature' : 'acceleration'} ${active === p.label ? 'active' : ''}`}
              >
                <path d={temp ? `M${x} 125 L${x + 95} 169` : `M${x} 112 V37`} />
                <circle
                  cx={x}
                  cy={temp ? 125 : 112}
                  r={active === p.label ? 7 : 5}
                />
                <text
                  x={temp ? x + 98 : x}
                  y={temp ? 174 : 28}
                  textAnchor={temp ? 'start' : 'middle'}
                >
                  {p.label} {p.distanceMm} mm{temp ? ' · 임시' : ''}
                </text>
              </g>
            )
          })}
          {[0, 150, 300, 600].map((mm) => (
            <text
              key={mm}
              x={60 + mm}
              y="199"
              textAnchor="middle"
              className="placement-axis"
            >
              {mm}
              {mm === 600 ? ' mm' : ''}
            </text>
          ))}
        </svg>
      )}
      <div className="placement-cards">
        {placements.map((p) => {
          const index = preview ? -1 : placementSensorIndex(p, sensors)
          return (
            <button
              key={p.label}
              className={`placement-card ${p.type.toLowerCase()}`}
              aria-pressed={active === p.label}
              onClick={() => onSelect(p)}
            >
              <span className="placement-card-heading">
                <i />
                <strong>{p.label}</strong>
                <span>{p.type === 'ACC' ? '가속도' : '온도'}</span>
              </span>
              <b>
                {p.distanceMm} <small>mm</small>
                {p.temporary && <em>임시 위치</em>}
              </b>
              <span>{p.model}</span>
              <span>
                X {p.coordinatesM[0].toFixed(2)} / Y{' '}
                {p.coordinatesM[1].toFixed(2)} / Z{' '}
                {p.coordinatesM[2].toFixed(2)} m
              </span>
              <small>Y 임시값{p.temporary ? ' · 온도 위치 임시' : ''}</small>
              <small>
                {index >= 0
                  ? `DB · ${sensors[index].sensor_id}`
                  : preview
                    ? '도안 미리보기'
                    : 'DB 연결 대기'}
              </small>
            </button>
          )
        })}
      </div>
      <p>
        왼쪽 시작점 0 mm 기준 · 경간 600 mm / 폭 150 mm. 파랑은 가속도, 주황은
        온도입니다. 모델 좌표는 X 길이 / Y 높이 / Z 폭 중앙 기준입니다. Y와 온도
        위치는 임시값이며 센서 축과 모델 축의 대응은 장착 후 확정합니다.
      </p>
      <p>
        연결 대상: {kind === 'BOX' ? 'BRIDGE_BOX_01' : 'BRIDGE_TRUSS_01'} · 구형
        센서 ID와 자동 연결하지 않습니다. 가속도 ±2 g·100 Hz, 온도 1 Hz는 초기
        제안이며 실제 수집률과 화면 갱신 주기는 별도입니다. 온도는 설치부 주변
        온도입니다.
      </p>
    </section>
  )
}
