import type { AlertItem } from './alertPresentation'
export type BrowserPermission = NotificationPermission | 'unsupported'
export const notificationPermission = (): BrowserPermission =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  window.isSecureContext
    ? Notification.permission
    : 'unsupported'
let worker: Promise<ServiceWorkerRegistration> | null = null
function registration() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext)
    return Promise.reject(new Error('서비스 워커를 지원하지 않습니다.'))
  worker ??= navigator.serviceWorker
    .register('/notifications-sw.js', { scope: '/' })
    .then(() => navigator.serviceWorker.ready)
    .catch((error) => {
      worker = null
      throw error
    })
  return worker
}
export async function requestBrowserNotifications(): Promise<BrowserPermission> {
  if (notificationPermission() === 'unsupported') return 'unsupported'
  const permission = await Notification.requestPermission()
  if (permission === 'granted') await registration()
  return permission
}
export async function notifyInBrowser(
  item: AlertItem,
  onClick: () => void,
): Promise<void> {
  if (notificationPermission() !== 'granted') return
  const options: NotificationOptions = {
    body: [item.context, item.message].filter(Boolean).join('\n'),
    icon: '/favicon.svg',
    tag: `infreum-alert-${item.id}`,
    data: { alertId: item.id },
  }
  try {
    const reg = await registration()
    await reg.showNotification(`INFREUM · ${item.title}`, options)
  } catch {
    // 서비스 워커 미지원 데스크톱의 기본 Notifications API 대체 경로.
    const notification = new Notification(`INFREUM · ${item.title}`, options)
    notification.onclick = () => {
      window.focus()
      onClick()
      notification.close()
    }
  }
}
