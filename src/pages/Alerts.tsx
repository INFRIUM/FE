import { useEffect, useState } from 'react'
import API, { ENDPOINTS } from '../API.js'
import type { BackendRecord } from '../data/types'
import { listResponse } from '../services/normalize'
import RecordsTable from '../components/RecordsTable'
import { Icon, Notice, Panel } from '../components/UI'
import AlertFeed from '../components/AlertFeed'
import { presentAlerts } from '../services/alertPresentation'
import type { AlertItem } from '../services/alertPresentation'
import type { BrowserPermission } from '../services/browserNotifications'
import { formatTime } from '../data/rules'

export default function Alerts({
  alerts,
  error = null,
  onRefresh,
  items: providedItems,
  selectedId = '',
  unreadIds = new Set<string>(),
  onOpen,
  onAllRead,
  onCloseDetail,
  onEnableBrowser,
  permission = 'unsupported',
  permissionMessage = '',
}: {
  alerts: BackendRecord[]
  error?: string | null
  onRefresh: () => void
  items?: AlertItem[]
  selectedId?: string
  unreadIds?: Set<string>
  onOpen?: (item: AlertItem) => void
  onAllRead?: () => void
  onCloseDetail?: () => void
  onEnableBrowser?: () => void
  permission?: BrowserPermission
  permissionMessage?: string
}) {
  const items = providedItems || presentAlerts(alerts)
  const selected = items.find((item) => item.id === selectedId)
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [tab, setTab] = useState<'alerts' | 'history'>('alerts'),
    [version, setVersion] = useState(0)
  const [history, setHistory] = useState<{
    rows: BackendRecord[]
    loading: boolean
    error: string | null
  }>({ rows: [], loading: true, error: null })
  useEffect(() => {
    if (tab !== 'history') return
    const controller = new AbortController()
    API.get(ENDPOINTS.alertHistories, { signal: controller.signal })
      .then((value) => {
        const rows = listResponse<BackendRecord>(value, '알림 처리 이력')
        if (!controller.signal.aborted)
          setHistory({ rows, loading: false, error: null })
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setHistory({
            rows: [],
            loading: false,
            error:
              err instanceof Error
                ? err.message
                : '처리 이력을 조회하지 못했습니다.',
          })
      })
    return () => controller.abort()
  }, [tab, version])
  function refresh() {
    if (tab === 'alerts') onRefresh()
    else {
      setHistory((v) => ({ ...v, loading: true, error: null }))
      setVersion((v) => v + 1)
    }
  }
  return (
    <>
      <div className="alerts-page-toolbar">
        <div>
          <span className="eyebrow">NOTIFICATION CENTER</span>
          <p>
            미확인 <strong>{unreadIds.size}</strong>개 · 전체 {items.length}개
          </p>
        </div>
        <button
          className="button"
          onClick={onEnableBrowser}
          disabled={
            !onEnableBrowser ||
            permission === 'granted' ||
            permission === 'unsupported'
          }
        >
          <Icon name="bell" size={14} />
          {permission === 'granted'
            ? '브라우저 알림 켜짐'
            : permission === 'unsupported'
              ? '화면 내 알림 사용 중'
              : '브라우저 알림 켜기'}
        </button>
      </div>
      {permissionMessage && <Notice>{permissionMessage}</Notice>}
      {selectedId &&
        !error &&
        (selected ? (
          <Panel
            title="알림 상세"
            aside={
              <button className="text-button" onClick={onCloseDetail}>
                목록으로
              </button>
            }
          >
            <div className="alert-detail-card">
              <span
                className={`alert-feed-icon level-${selected.level.toLowerCase()}`}
              >
                <Icon name="bell" size={24} />
              </span>
              <div>
                <span className="eyebrow">{selected.context || 'INFREUM'}</span>
                <h2>{selected.title}</h2>
                <time>
                  {selected.timestamp
                    ? formatTime(selected.timestamp, true)
                    : '시각 미제공'}
                </time>
                <p>{selected.message}</p>
              </div>
            </div>
            <RecordsTable
              rows={[selected.record]}
              emptyTitle="알림 정보 없음"
            />
          </Panel>
        ) : (
          <Notice type="warning">
            현재 조회 목록에 해당 알림이 없습니다. 새로고침하거나 전체 알림에서
            확인해 주세요.
          </Notice>
        ))}
      <div className="tabs" role="tablist" aria-label="알림 조회 종류">
        <button
          role="tab"
          aria-selected={tab === 'alerts'}
          className={tab === 'alerts' ? 'selected' : ''}
          onClick={() => setTab('alerts')}
        >
          발생 알림{!error && ` · ${alerts.length}`}
        </button>
        <button
          role="tab"
          aria-selected={tab === 'history'}
          className={tab === 'history' ? 'selected' : ''}
          onClick={() => {
            if (tab !== 'history')
              setHistory((v) => ({ ...v, loading: true, error: null }))
            setTab('history')
          }}
        >
          처리 이력
        </button>
      </div>
      <Panel
        title={tab === 'alerts' ? '발생 알림' : '알림 처리 이력'}
        aside={
          <button className="button" onClick={refresh}>
            <Icon name="refresh" size={14} />
            새로고침
          </button>
        }
      >
        {tab === 'alerts' ? (
          error ? (
            <Notice type="error">{error}</Notice>
          ) : (
            <>
              <div className="alert-list-controls">
                <div className="segmented">
                  <button
                    className={!onlyUnread ? 'selected' : ''}
                    onClick={() => setOnlyUnread(false)}
                  >
                    전체
                  </button>
                  <button
                    className={onlyUnread ? 'selected' : ''}
                    onClick={() => setOnlyUnread(true)}
                  >
                    미확인
                  </button>
                </div>
                <button
                  className="text-button"
                  onClick={onAllRead}
                  disabled={!onAllRead || !unreadIds.size}
                >
                  모두 읽음
                </button>
              </div>
              <AlertFeed
                items={
                  onlyUnread
                    ? items.filter((item) => unreadIds.has(item.id))
                    : items
                }
                unreadIds={unreadIds}
                onOpen={onOpen}
              />
            </>
          )
        ) : history.loading ? (
          <div className="loading-label" role="status">
            알림 처리 이력 조회 중…
          </div>
        ) : history.error ? (
          <Notice type="error">{history.error}</Notice>
        ) : (
          <RecordsTable
            rows={history.rows}
            emptyTitle="등록된 알림 처리 이력이 없습니다"
          />
        )}
      </Panel>
      <Notice>
        읽음 표시는 이 브라우저에서만 관리됩니다. 점검·해결 등 서버 처리 상태는
        변경하지 않습니다. 새 알림은 페이지가 열려 있을 때 주기적으로 확인하며,
        앱을 닫은 상태의 푸시는 서버 구독 연동 후 지원됩니다.
      </Notice>
    </>
  )
}
