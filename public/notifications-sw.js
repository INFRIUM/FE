// 앱에서 이미 수신한 알림을 OS에 표시하고, 클릭 시 해당 알림 상세로 이동합니다.
// 닫힌 앱에 새 알림을 보내는 Web Push 수신 기능은 서버 구독 연동 전입니다.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim()),
)
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const id = event.notification.data?.alertId
  const hash =
    typeof id === 'string'
      ? `#/alerts?alert=${encodeURIComponent(id)}`
      : '#/alerts'
  const url = new URL('/' + hash, self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      const client = windows.find(
        (item) => new URL(item.url).origin === self.location.origin,
      )
      if (client) {
        client.postMessage({
          type: 'OPEN_ALERT',
          alertId: typeof id === 'string' ? id : null,
        })
        await client.focus()
      } else await self.clients.openWindow(url)
    })(),
  )
})
