import { useId } from 'react'
import type { ReactNode } from 'react'
import type { RiskLevel } from '../data/types'
import { riskLabels } from '../data/rules'

export type IconName =
  | 'grid'
  | 'bridge'
  | 'wave'
  | 'ai'
  | 'flask'
  | 'history'
  | 'settings'
  | 'arrow'
  | 'refresh'
  | 'bell'
  | 'check'
  | 'close'
  | 'download'
  | 'play'
  | 'pause'
  | 'expand'
  | 'plus'
  | 'logout'
export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.4" />
        <rect x="14" y="3" width="7" height="7" rx="1.4" />
        <rect x="3" y="14" width="7" height="7" rx="1.4" />
        <rect x="14" y="14" width="7" height="7" rx="1.4" />
      </>
    ),
    bridge: (
      <path d="M3 19V6m18 13V6M2 19h20M3 9c5 7 13 7 18 0M3 15h18m-14-4v8m5-6v6m5-8v8" />
    ),
    wave: <path d="M2 12h4l3-8 5 16 3-8h5" />,
    ai: (
      <>
        <rect x="6" y="6" width="12" height="12" rx="3" />
        <path d="M9 1v5m6-5v5m-6 12v5m6-5v5M1 9h5m-5 6h5m12-6h5m-5 6h5M10 10h4v4h-4z" />
      </>
    ),
    flask: (
      <path d="M9 3h6m-5 0v7L4 20c-.5 1 0 1 1 1h14c1 0 1.5 0 1-1l-6-10V3M7 15h10" />
    ),
    history: (
      <>
        <path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l4 2" />
      </>
    ),
    settings: (
      <>
        <path d="m9 3 1-1h4l1 3 3 1 3-1 2 4-2 2v3l2 2-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-2v-3L1 9l2-4 3 1 3-1z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    refresh: <path d="M20 10a8 8 0 1 0-2 8m2-15v7h-7" />,
    bell: <path d="M6 8a6 6 0 0 1 12 0c0 6 3 7 3 9H3c0-2 3-3 3-9m4 13h4" />,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    download: <path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4" />,
    play: <path d="m8 4 12 8-12 8z" />,
    pause: <path d="M8 4v16m8-16v16" />,
    expand: <path d="M3 9V3h6m6 0h6v6m0 6v6h-6M9 21H3v-6" />,
    plus: <path d="M12 4v16M4 12h16" />,
    logout: <path d="M10 4H4v16h6m-1-8h12m-4-4 4 4-4 4" />,
  }
  return (
    <svg
      className={`ui-icon ui-icon-${name}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
export function Logo() {
  return (
    <span className="logo">
      <span className="logo-symbol">
        <Icon name="bridge" size={24} />
      </span>
      INFREUM<span className="brand-period">.</span>
    </span>
  )
}
export function Panel({
  title,
  kicker,
  aside,
  children,
  className = '',
}: {
  title: string
  kicker?: string
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <div>
          {kicker && <span className="eyebrow">{kicker}</span>}
          <h2>{title}</h2>
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}
export function Badge({
  level,
  label,
}: {
  level: RiskLevel | null
  label?: string
}) {
  return (
    <span className={`badge ${level?.toLowerCase() || 'pending'}`}>
      <i />
      {label || (level ? riskLabels[level] : '분석 대기')}
    </span>
  )
}
export function Metric({
  label,
  value,
  unit,
  detail,
  icon,
}: {
  label: string
  value: ReactNode
  unit?: string
  detail?: string
  icon?: IconName
}) {
  return (
    <article className="metric">
      <div className="metric-label">
        {label}
        {icon && <Icon name={icon} size={16} />}
      </div>
      <strong
        className={
          typeof value === 'string' && value.length > 6
            ? 'metric-value-text'
            : undefined
        }
      >
        {value}
        <small>{unit}</small>
      </strong>
      {detail && <span className="metric-detail">{detail}</span>}
    </article>
  )
}
export function Empty({
  title = '데이터가 없습니다',
  message = '센서 연결 상태나 조회 조건을 확인해 주세요.',
  icon = 'wave',
}: {
  title?: string
  message?: string
  icon?: IconName
}) {
  return (
    <div className="empty">
      <span>
        <Icon name={icon} size={27} />
      </span>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  )
}
export function Notice({
  children,
  type = 'info',
}: {
  children: ReactNode
  type?: 'info' | 'warning' | 'error'
}) {
  return (
    <div
      className={`notice ${type}`}
      role={type === 'error' ? 'alert' : undefined}
    >
      <Icon name={type === 'info' ? 'ai' : 'bell'} size={17} />
      <div>{children}</div>
    </div>
  )
}
export function Chart({
  series,
  unit,
  labels = [],
  height = 170,
  frequency = false,
  xValues,
}: {
  series: { label: string; color: string; values: (number | null)[] }[]
  unit: string
  labels?: string[]
  height?: number
  frequency?: boolean
  xValues?: number[]
}) {
  const id = useId().replace(/:/g, '')
  const values = series
    .flatMap((s) => s.values)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (!values.length) return <Empty />
  const low = Math.min(...values),
    high = Math.max(...values),
    padding = (high - low) * 0.2 || 0.1
  const min = low - padding,
    max = high + padding
  const xMin = xValues?.[0] ?? 0,
    xMax = xValues?.at(-1) ?? 1
  const points = (vals: (number | null)[]) =>
    vals
      .map((v, i) =>
        v === null
          ? '|'
          : `${46 + (xValues && xValues.length === vals.length && xMax > xMin ? ((xValues[i] - xMin) / (xMax - xMin)) * 630 : (i * 630) / Math.max(1, vals.length - 1))},${18 + ((max - v) / (max - min)) * 150}`,
      )
      .join(' ')
  return (
    <div className="chart">
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.label}>
            <i style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        <small>{unit}</small>
      </div>
      <svg
        viewBox="0 0 700 200"
        style={{ height }}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${series.map((s) => s.label).join(', ')} ${unit} 그래프`}
      >
        <defs>
          <linearGradient id={id} x2="0" y2="1">
            <stop stopColor={series[0].color} stopOpacity=".12" />
            <stop offset="1" stopColor={series[0].color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: 4 }, (_, i) => (
          <g key={i}>
            <line
              x1="46"
              x2="676"
              y1={18 + i * 50}
              y2={18 + i * 50}
              stroke="#D9DEE5"
              strokeDasharray="3 4"
            />
            <text
              x="38"
              y={22 + i * 50}
              textAnchor="end"
              fill="#7C858C"
              fontSize="9"
            >
              {(max - (i * (max - min)) / 3).toFixed(unit === 'g' ? 3 : 2)}
            </text>
          </g>
        ))}
        {series.length === 1 && !series[0].values.includes(null) && (
          <polygon
            points={`46,168 ${points(series[0].values)} 676,168`}
            fill={`url(#${id})`}
          />
        )}{' '}
        {series.flatMap((s) =>
          points(s.values)
            .split('|')
            .map((segment, index) =>
              segment.trim() ? (
                <g key={`${s.label}-${index}`}>
                  <polyline
                    points={segment}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="1.7"
                    vectorEffect="non-scaling-stroke"
                  />
                  {segment.trim().split(/\s+/).length === 1 && (
                    <circle
                      cx={segment.trim().split(',')[0]}
                      cy={segment.trim().split(',')[1]}
                      r="2.5"
                      fill={s.color}
                    />
                  )}
                </g>
              ) : null,
            ),
        )}
        {[0, 1, 2, 3, 4].map((i) => (
          <text
            key={i}
            x={46 + i * 157}
            y="191"
            textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}
            fill="#7C858C"
            fontSize="9"
          >
            {(xValues?.length
              ? new Intl.DateTimeFormat('ko-KR', {
                  timeZone: 'Asia/Seoul',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                }).format(new Date(xMin + ((xMax - xMin) * i) / 4))
              : labels[Math.floor((i * Math.max(labels.length - 1, 0)) / 4)]) ||
              (frequency ? `${i * 10} Hz` : `${i * 3} s`)}
          </text>
        ))}
      </svg>
    </div>
  )
}
