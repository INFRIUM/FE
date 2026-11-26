import { useEffect, useState } from 'react'
import { formatTime } from './data/rules'
import { monitoringBridge } from './data/sensorPlacement'
import { Icon, Logo, Empty } from './components/UI'
import type { IconName } from './components/UI'
import Auth from './components/Auth'
import Alerts from './pages/Alerts'
import NotificationCenter, {
  NotificationToasts,
} from './components/NotificationCenter'
import { useAlertNotifications } from './hooks/useAlertNotifications'
import {
  Dashboard,
  Bridges,
  Sensors,
  AIAnalysis,
  Settings,
} from './pages/Monitoring'
import { Experiments, History } from './pages/Experiments'
import { useWorkspace } from './hooks/useWorkspace'
import { setAccessToken } from './API.js'
import './App.css'
import './design.css'
const pages: {
  path: string
  title: string
  subtitle: string
  icon: IconName
  en: string
}[] = [
  {
    path: '/dashboard',
    title: '종합 대시보드',
    subtitle: '서버 DB에 등록된 교량과 센서의 최신 측정값을 확인하세요.',
    icon: 'grid',
    en: 'Dashboard',
  },
  {
    path: '/bridges',
    title: '교량 디지털트윈',
    subtitle:
      '제작 도안의 구조와 치수를 살펴보고, 등록된 센서 정보를 확인하세요.',
    icon: 'bridge',
    en: 'Bridges',
  },
  {
    path: '/sensors',
    title: '센서 모니터링',
    subtitle: '가속도와 온도 센서를 선택해 측정 이력을 확인하세요.',
    icon: 'wave',
    en: 'Sensors',
  },
  {
    path: '/ai',
    title: 'AI 분석 결과',
    subtitle:
      '서버 DB에 저장된 분석 구간·이상 탐지·위험도 결과와 알림을 조회합니다.',
    icon: 'ai',
    en: 'AI Analysis',
  },
  {
    path: '/alerts',
    title: '알림 및 처리 이력',
    subtitle: '교량 알림과 확인·점검·해결 처리 이력을 조회합니다.',
    icon: 'bell',
    en: 'Alerts',
  },
  {
    path: '/experiments',
    title: '실험 조회',
    subtitle:
      '실험 API에 등록된 기록을 조회합니다. 등록·상태 수정은 지원 전입니다.',
    icon: 'flask',
    en: 'Experiments',
  },
  {
    path: '/history',
    title: '실험 이력 · 비교 준비',
    subtitle: '실험별 측정 데이터 계약 확정 후 정상·이상 비교를 연결합니다.',
    icon: 'history',
    en: 'History',
  },
  {
    path: '/settings',
    title: '시스템 상태 · UNKNOWN',
    subtitle: '실제 장치 연결 상태 API 제공 전에는 UNKNOWN으로 표시합니다.',
    icon: 'settings',
    en: 'Settings',
  },
]
function routeInfo() {
  const rawHash = window.location.hash.slice(1) || '/dashboard'
  const [hash, query = ''] = rawHash.split('?')
  const parts = hash.split('/')
  let bridge = '',
    sensor = ''
  try {
    if (parts[1] === 'bridge' || parts[1] === 'sensor') {
      bridge = decodeURIComponent(parts[2] || '')
      sensor = decodeURIComponent(parts[3] || '')
    }
  } catch {
    /* 잘못된 해시는 기본 목록으로 복구합니다. */
  }
  return {
    path:
      parts[1] === 'bridge'
        ? '/bridges'
        : parts[1] === 'sensor'
          ? '/sensors'
          : hash === '/overview'
            ? '/dashboard'
            : hash,
    bridge,
    sensor,
    alertId: new URLSearchParams(query).get('alert') || '',
  }
}
export default function App() {
  const [route, setRoute] = useState(() => routeInfo()),
    [bridgeId, setBridge] = useState(() => routeInfo().bridge),
    [userMenu, setMenu] = useState(false)
  const resource = useWorkspace()
  useEffect(() => {
    const sync = () => {
      const next = routeInfo()
      setRoute(next)
      if (next.bridge) setBridge(next.bridge)
      setMenu(false)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  function go(path: string) {
    window.location.assign(`#${path}`)
  }
  const page = pages.find((p) => p.path === route.path)
  const workspace = resource.data
  const alertError = workspace?.analysis.failed?.includes('alerts')
    ? workspace.analysis.errors.find((e) => e.startsWith('알림:')) ||
      '알림을 조회하지 못했습니다.'
    : null
  const notifications = useAlertNotifications({
    records: workspace && !alertError ? workspace.analysis.alerts : null,
    bridges: workspace?.bridges || [],
    active: route.path !== '/login' && route.path !== '/signup',
    onNavigate: go,
  })
  const { items: notificationItems, markRead: markNotificationRead } =
    notifications
  useEffect(() => {
    if (
      route.path !== '/alerts' ||
      !route.alertId ||
      !notificationItems.some((item) => item.id === route.alertId)
    )
      return
    const timer = setTimeout(() => markNotificationRead([route.alertId]), 0)
    return () => clearTimeout(timer)
  }, [route.path, route.alertId, notificationItems, markNotificationRead])
  const bridge =
    workspace?.bridges.find((b) => b.bridge_id === bridgeId) ||
    workspace?.bridges[0]
  const props =
    bridge && workspace
      ? {
          bridge: monitoringBridge(bridge),
          bridges: workspace.bridges.map(monitoringBridge),
          selectBridge: setBridge,
          go,
        }
      : null
  const busy = resource.loading
  function reload() {
    resource.reload()
  }
  if (route.path === '/login' || route.path === '/signup')
    return (
      <Auth
        key={route.path}
        signup={route.path === '/signup'}
        go={go}
        loading={resource.loading}
        connected={resource.data !== null}
        error={resource.error}
        retry={reload}
      />
    )
  return (
    <div className="app-shell">
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
      >
        본문으로 이동
      </a>
      <aside className="sidebar">
        <button className="brand-button" onClick={() => go('/dashboard')}>
          <Logo />
        </button>
        <div className="workspace-label">
          <span>WORKSPACE</span>
          <small>교량 안전 연구 플랫폼</small>
        </div>
        <nav aria-label="주 메뉴">
          {pages.map((p, index) => (
            <button
              key={p.path}
              className={`nav-item ${route.path === p.path ? 'active' : ''}`}
              aria-current={route.path === p.path ? 'page' : undefined}
              onClick={() => go(p.path)}
            >
              <Icon name={p.icon} />
              <span>
                {p.title}
                <small>{p.en}</small>
              </span>
              <span className="nav-number">
                {String(index + 1).padStart(2, '0')}
              </span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="sidebar-online">
            <i className="offline" />
            장치 연결 UNKNOWN
          </span>
          <span>INFRASTRUCTURE INTELLIGENCE</span>
          <small>© 2026 INFREUM</small>
        </div>
      </aside>
      <div className="content-shell">
        <header className="topbar">
          <div className="header-breadcrumb">
            워크스페이스 <span>/</span>
            <strong>{page?.en || 'Page'}</strong>
          </div>
          <div className="header-right">
            <span className="system-status unknown">
              <i />
              장치 연결 UNKNOWN
            </span>
            <NotificationCenter
              items={notifications.items}
              unreadIds={notifications.unreadIds}
              error={alertError || resource.error}
              onOpen={notifications.open}
              onAllRead={notifications.markAllRead}
              onViewAll={() => go('/alerts')}
              onEnable={notifications.enableBrowserNotifications}
              permission={notifications.permission}
              permissionMessage={notifications.permissionMessage}
            />
            <div className="user-menu-wrap">
              <button
                className="user-button"
                onClick={() => setMenu(!userMenu)}
                aria-expanded={userMenu}
              >
                <span className="avatar">연</span>
                <span>
                  연구 워크스페이스
                  <small>SERVER DATABASE</small>
                </span>
                <span>⌄</span>
              </button>
              {userMenu && (
                <div className="user-menu">
                  <strong>연구 워크스페이스</strong>
                  <span>계정 인증</span>
                  <button
                    onClick={() => {
                      setAccessToken(null)
                      go('/login')
                    }}
                  >
                    <Icon name="logout" size={15} />
                    로그아웃 · 로그인 화면
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main id="main-content" className="main" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {page?.en.toUpperCase() || 'WORKSPACE'} / INFREUM PLATFORM
              </span>
              <h1>{page?.title || '페이지를 찾을 수 없습니다'}</h1>
              <p>{page?.subtitle}</p>
            </div>
            <div className="heading-controls">
              <span className="data-badge api">서버 DB 조회</span>
              <button className="button" onClick={reload}>
                <Icon name="refresh" size={15} />
                <span>새로고침</span>
              </button>
            </div>
          </div>
          <div className="context-bar">
            <div className="bridge-select">
              <Icon name="bridge" size={17} />
              <label>
                <span className="sr-only">현재 선택 교량</span>
                <select
                  value={bridge?.bridge_id || ''}
                  disabled={!workspace?.bridges.length}
                  onChange={(e) => setBridge(e.target.value)}
                >
                  {workspace?.bridges.length ? (
                    workspace.bridges.map((b) => (
                      <option key={b.bridge_id} value={b.bridge_id}>
                        {b.bridge_id} · {b.name}
                      </option>
                    ))
                  ) : (
                    <option value="">등록 교량 없음</option>
                  )}
                </select>
              </label>
            </div>
            <span className="last-received">
              서버 수신 시각{' '}
              <strong>{formatTime(bridge?.timestamp, true)}</strong>
            </span>
          </div>
          <div className="data-notice">
            <span>DATABASE</span>백엔드 API를 통해 서버 DB에 저장된 값만
            표시합니다. 실제 HW 계측 여부는 데이터 수집 상태에 따라 달라집니다.
            장치 연결 상태는 별도 API 제공 전까지 UNKNOWN입니다.
          </div>
          {busy ? (
            <div className="loading-layout" aria-busy="true" role="status">
              <div className="loading-label">
                <Icon name="refresh" />
                데이터 불러오는 중…
              </div>
              <div className="skeleton-row">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} />
                ))}
              </div>
              <div className="skeleton-main" />
            </div>
          ) : resource.error ? (
            <section className="error-panel">
              <Icon name="refresh" size={29} />
              <h2>데이터를 불러오지 못했습니다</h2>
              <p>{resource.error}</p>
              <button className="button primary" onClick={reload}>
                다시 시도
              </button>
            </section>
          ) : !page ? (
            <Empty
              title="페이지를 찾을 수 없습니다"
              message="메뉴에서 화면을 선택해 주세요."
            />
          ) : workspace && route.path === '/settings' ? (
            <Settings system={workspace.system} reload={reload} />
          ) : workspace && route.path === '/alerts' ? (
            <Alerts
              alerts={workspace.analysis.alerts}
              items={notifications.items}
              error={alertError}
              selectedId={route.alertId}
              unreadIds={notifications.unreadIds}
              onOpen={notifications.open}
              onAllRead={notifications.markAllRead}
              onCloseDetail={() => go('/alerts')}
              onEnableBrowser={notifications.enableBrowserNotifications}
              permission={notifications.permission}
              permissionMessage={notifications.permissionMessage}
              onRefresh={reload}
            />
          ) : !workspace || !bridge || !props ? (
            <Empty
              title="등록된 교량이 없습니다"
              message="서버에 등록된 교량만 표시합니다. TRUSS는 마스터 데이터 추가 후 자동 표시됩니다."
            />
          ) : (
            <>
              {route.path === '/dashboard' && (
                <Dashboard key={bridge.bridge_id} {...props} />
              )}
              {route.path === '/bridges' && (
                <Bridges key={bridge.bridge_id} {...props} />
              )}
              {route.path === '/sensors' && (
                <Sensors
                  key={`${bridge.bridge_id}-${route.sensor}`}
                  bridge={props.bridge}
                  initialSensor={route.sensor}
                />
              )}
              {route.path === '/ai' && (
                <AIAnalysis analysis={workspace.analysis} />
              )}
              {route.path === '/experiments' && (
                <Experiments
                  experiments={workspace.experiments}
                  bridgeId={bridge.bridge_id}
                  error={workspace.experiments_error}
                />
              )}
              {route.path === '/history' && (
                <History
                  experiments={workspace.experiments}
                  bridge={bridge.bridge_id}
                  error={workspace.experiments_error}
                />
              )}
            </>
          )}
          <footer className="page-footer">
            <span>INFREUM · BACKEND v0.1</span>
            <span>서버 기준 시각 / KST</span>
          </footer>
        </main>
      </div>
      <NotificationToasts
        items={notifications.toasts}
        onOpen={notifications.open}
        onDismiss={notifications.dismiss}
      />
    </div>
  )
}
