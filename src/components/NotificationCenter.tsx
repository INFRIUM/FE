import { useEffect, useRef, useState } from 'react'
import type { AlertItem } from '../services/alertPresentation'
import type { BrowserPermission } from '../services/browserNotifications'
import AlertFeed from './AlertFeed'
import { Icon } from './UI'

export default function NotificationCenter({
  items,
  unreadIds,
  error,
  onOpen,
  onAllRead,
  onViewAll,
  onEnable,
  permission,
  permissionMessage,
}: {
  items: AlertItem[]
  unreadIds: Set<string>
  error: string | null
  onOpen: (item: AlertItem) => void
  onAllRead: () => void
  onViewAll: () => void
  onEnable: () => void
  permission: BrowserPermission
  permissionMessage: string
}) {
  const [expanded, setExpanded] = useState(false)
  const root = useRef<HTMLDivElement>(null),
    bell = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!expanded) return
    const click = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setExpanded(false)
    }
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false)
        bell.current?.focus()
      }
    }
    document.addEventListener('pointerdown', click)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', click)
      document.removeEventListener('keydown', key)
    }
  }, [expanded])
  return (
    <div className="notification-center" ref={root}>
      <button
        className="header-bell"
        ref={bell}
        aria-label={`알림 보기${unreadIds.size ? ` · 미확인 ${unreadIds.size}개` : ''}`}
        aria-expanded={expanded}
        aria-controls="notification-popover"
        onClick={() => setExpanded(!expanded)}
      >
        <Icon name="bell" />
        {unreadIds.size > 0 && (
          <span className="header-alert-count">
            {unreadIds.size > 99 ? '99+' : unreadIds.size}
          </span>
        )}
      </button>
      {expanded && (
        <section
          id="notification-popover"
          className="notification-popover"
          aria-label="최근 알림"
        >
          <div className="notification-popover-head">
            <h2>
              알림 <span>{unreadIds.size}개 미확인</span>
            </h2>
            <button
              className="text-button"
              onClick={onAllRead}
              disabled={!unreadIds.size}
            >
              모두 읽음
            </button>
          </div>
          {error ? (
            <p className="notification-error" role="alert">
              {error}
            </p>
          ) : (
            <div className="notification-popover-list">
              <AlertFeed
                compact
                items={items.slice(0, 6)}
                unreadIds={unreadIds}
                onOpen={(item) => {
                  setExpanded(false)
                  onOpen(item)
                }}
              />
            </div>
          )}
          <div className="notification-popover-footer">
            <button
              className="text-button"
              onClick={() => {
                setExpanded(false)
                onViewAll()
              }}
            >
              전체 알림 보기 <Icon name="arrow" size={13} />
            </button>
            <button
              className="notification-enable"
              onClick={onEnable}
              disabled={
                permission === 'granted' || permission === 'unsupported'
              }
            >
              {permission === 'granted'
                ? '브라우저 알림 켜짐'
                : permission === 'unsupported'
                  ? '화면 내 알림 사용 중'
                  : '브라우저 알림 켜기'}
            </button>
          </div>
          {permissionMessage && (
            <p className="notification-permission-message" role="status">
              {permissionMessage}
            </p>
          )}
        </section>
      )}
    </div>
  )
}
export function NotificationToasts({
  items,
  onOpen,
  onDismiss,
}: {
  items: AlertItem[]
  onOpen: (item: AlertItem) => void
  onDismiss: (id: string) => void
}) {
  return (
    <div
      className="notification-toasts"
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.map((item) => (
        <div className="notification-toast" key={item.id}>
          <button
            className="notification-toast-body"
            onClick={() => onOpen(item)}
          >
            <span
              className={`alert-feed-icon level-${item.level.toLowerCase()}`}
            >
              <Icon name="bell" size={19} />
            </span>
            <div>
              <span>INFREUM · 새 알림</span>
              <strong>{item.title}</strong>
              <p>{item.message}</p>
              {item.context && <small>{item.context}</small>}
              <span className="notification-toast-link">상세 보기 →</span>
            </div>
          </button>
          <button
            className="notification-toast-close icon-button"
            aria-label="알림 팝업 닫기"
            onClick={() => onDismiss(item.id)}
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}
