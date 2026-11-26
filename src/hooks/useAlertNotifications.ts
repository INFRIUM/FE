import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { API_BASE_URL } from '../API.js'
import type { BackendRecord, BridgeData } from '../data/types'
import {
  alertHref,
  detectNewAlerts,
  presentAlerts,
} from '../services/alertPresentation'
import type { AlertItem, AlertTracker } from '../services/alertPresentation'
import {
  notificationPermission,
  notifyInBrowser,
  requestBrowserNotifications,
} from '../services/browserNotifications'
const READ_KEY = `infreum-alert-read-v1:${API_BASE_URL}`
function storedRead(): Set<string> {
  try {
    const value = JSON.parse(localStorage.getItem(READ_KEY) || '[]')
    return new Set(
      Array.isArray(value)
        ? value.filter((v): v is string => typeof v === 'string')
        : [],
    )
  } catch {
    return new Set()
  }
}
export function useAlertNotifications({
  records,
  bridges,
  active,
  onNavigate,
}: {
  records: BackendRecord[] | null
  bridges: BridgeData[]
  active: boolean
  onNavigate: (href: string) => void
}) {
  const items = useMemo(
    () => presentAlerts(records || [], bridges),
    [records, bridges],
  )
  const [read, setRead] = useState(storedRead),
    [toasts, setToasts] = useState<AlertItem[]>([]),
    [permission, setPermission] = useState(notificationPermission),
    [permissionMessage, setPermissionMessage] = useState('')
  const tracker = useRef<AlertTracker>({ initialized: false, known: new Set() })
  const navigate = useRef(onNavigate)
  useEffect(() => {
    navigate.current = onNavigate
  }, [onNavigate])
  const markRead = useCallback((ids: string[]) => {
    setRead((previous) => new Set([...previous, ...ids]))
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(READ_KEY, JSON.stringify([...read]))
    } catch {
      /* 저장소를 사용할 수 없어도 현재 화면의 읽음 상태는 유지합니다. */
    }
  }, [read])
  useEffect(() => {
    const listener = (event: StorageEvent) => {
      if (event.key === READ_KEY) setRead(storedRead())
    }
    window.addEventListener('storage', listener)
    return () => window.removeEventListener('storage', listener)
  }, [])
  const open = useCallback(
    (item: AlertItem) => {
      markRead([item.id])
      setToasts((previous) => previous.filter((t) => t.id !== item.id))
      navigate.current(item.href)
    },
    [markRead],
  )
  useEffect(() => {
    if (!active || records === null) return
    const timer = setTimeout(() => {
      const next = detectNewAlerts(tracker.current, items)
      tracker.current = next.state
      if (!next.fresh.length) return
      setToasts((previous) =>
        [...next.fresh, ...previous]
          .filter(
            (item, i, all) => all.findIndex((v) => v.id === item.id) === i,
          )
          .slice(0, 3),
      )
      // 동시 도착한 OS 알림은 최신 1건으로 묶고 전체 기록은 목록에 남깁니다.
      const latest = next.fresh[0]
      void notifyInBrowser(latest, () => open(latest)).catch(() => {
        setPermissionMessage(
          '브라우저 알림을 표시하지 못했습니다. 화면의 알림 목록에서 확인해 주세요.',
        )
      })
    }, 0)
    return () => clearTimeout(timer)
  }, [active, records, items, open])
  useEffect(() => {
    if (!toasts.length) return
    const timer = setTimeout(
      () => setToasts((previous) => previous.slice(0, -1)),
      10000,
    )
    return () => clearTimeout(timer)
  }, [toasts])
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const listener = (event: MessageEvent) => {
      if (
        event.data?.type === 'OPEN_ALERT' &&
        typeof event.data.alertId === 'string'
      ) {
        markRead([event.data.alertId])
        navigate.current(alertHref(event.data.alertId))
      }
    }
    navigator.serviceWorker.addEventListener('message', listener)
    return () =>
      navigator.serviceWorker.removeEventListener('message', listener)
  }, [markRead])
  async function enableBrowserNotifications() {
    try {
      const value = await requestBrowserNotifications()
      setPermission(value)
      setPermissionMessage(
        value === 'granted'
          ? '브라우저 알림이 켜졌습니다. 페이지가 열려 있을 때 새 알림을 표시합니다.'
          : value === 'denied'
            ? '브라우저 사이트 설정에서 알림을 허용해 주세요.'
            : value === 'default'
              ? '알림 권한 창에서 허용을 선택하면 브라우저 알림을 받을 수 있습니다.'
              : '이 환경에서는 브라우저 알림을 사용할 수 없습니다. 화면 내 알림은 계속 제공됩니다.',
      )
    } catch {
      setPermission(notificationPermission())
      setPermissionMessage(
        '브라우저 알림 설정을 완료하지 못했습니다. 사이트 권한을 확인해 주세요.',
      )
    }
  }
  const unreadIds = useMemo(
    () =>
      new Set(
        items.filter((item) => !read.has(item.id)).map((item) => item.id),
      ),
    [items, read],
  )
  return {
    items,
    unreadIds,
    toasts,
    permission,
    permissionMessage,
    enableBrowserNotifications,
    open,
    markRead,
    markAllRead: () => markRead(items.map((i) => i.id)),
    dismiss: (id: string) =>
      setToasts((previous) => previous.filter((item) => item.id !== id)),
  }
}
