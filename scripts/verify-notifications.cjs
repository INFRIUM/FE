const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const vm = require('node:vm')
const React = require('react')
const { renderToString } = require('react-dom/server')
function compile(mod, filename) {
  mod._compile(
    ts.transpileModule(
      fs
        .readFileSync(filename, 'utf8')
        .replaceAll(
          'import.meta.env',
          '({VITE_API_BASE_URL:"https://test.ngrok-free.dev"})',
        ),
      {
        fileName: filename,
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      },
    ).outputText,
    filename,
  )
}
require.extensions['.ts'] = compile
require.extensions['.tsx'] = compile
const originalJs = require.extensions['.js']
require.extensions['.js'] = (mod, filename) =>
  filename.startsWith(path.resolve(__dirname, '../src'))
    ? compile(mod, filename)
    : originalJs(mod, filename)
async function verify() {
  const {
    presentAlerts,
    alertIdentity,
    alertHref,
    detectNewAlerts,
  } = require('../src/services/alertPresentation.ts')
  const old = {
    id: 1,
    title: 'Vibration',
    message: 'Stored record',
    created_at: '2026-10-15T01:00:00Z',
    bridge_id: 'BOX_01',
  }
  const incoming = {
    id: 2,
    title: 'Sensor warning',
    message: 'New record',
    created_at: '2026-10-16T01:00:00Z',
    risk_level: 'WARNING',
    sensor_id: 'ACC_BOX_01',
  }
  const initial = presentAlerts([old])
  const first = detectNewAlerts(
    { initialized: false, known: new Set() },
    initial,
  )
  assert.equal(
    first.fresh.length,
    0,
    'first load must not notify historical records',
  )
  const update = detectNewAlerts(
    first.state,
    presentAlerts([old, incoming, incoming]),
  )
  assert.equal(update.fresh.length, 1)
  assert.equal(update.fresh[0].id, '2')
  assert.equal(
    detectNewAlerts(update.state, presentAlerts([incoming, old])).fresh.length,
    0,
    'reordering/refetch must not repeat',
  )
  assert.equal(
    detectNewAlerts(
      update.state,
      presentAlerts([{ ...incoming, message: 'Updated' }, old]),
    ).fresh.length,
    0,
    'updates are not new records',
  )
  assert.equal(
    alertIdentity({ message: 'x', created_at: 'a' }),
    alertIdentity({ created_at: 'a', message: 'x' }),
  )
  assert.equal(
    alertHref('https://outside.example/a?x=1'),
    '/alerts?alert=https%3A%2F%2Foutside.example%2Fa%3Fx%3D1',
  )
  const feed = require('../src/components/AlertFeed.tsx').default
  const html = renderToString(
    React.createElement(feed, {
      items: presentAlerts([old, incoming]),
      unreadIds: new Set(['2']),
    }),
  )
  assert.ok(html.includes('#/alerts?alert=2'))
  assert.ok(html.includes('미확인 알림'))
  assert.ok(html.indexOf('Sensor warning') < html.indexOf('Vibration'))
  const Alerts = require('../src/pages/Alerts.tsx').default
  const detail = renderToString(
    React.createElement(Alerts, {
      alerts: [old, incoming],
      selectedId: '2',
      onRefresh: () => {},
    }),
  )
  assert.ok(detail.includes('알림 상세'))
  assert.ok(detail.includes('New record'))
  const {
    default: Center,
    NotificationToasts,
  } = require('../src/components/NotificationCenter.tsx')
  const centerHtml = renderToString(
    React.createElement(Center, {
      items: presentAlerts([old, incoming]),
      unreadIds: new Set(['2']),
      error: null,
      onOpen: () => {},
      onAllRead: () => {},
      onViewAll: () => {},
      onEnable: () => {},
      permission: 'default',
      permissionMessage: '',
    }),
  )
  assert.ok(centerHtml.includes('미확인 1개'))
  assert.ok(centerHtml.includes('header-alert-count'))
  assert.ok(
    renderToString(
      React.createElement(NotificationToasts, {
        items: presentAlerts([incoming]),
        onOpen: () => {},
        onDismiss: () => {},
      }),
    ).includes('새 알림'),
  )
  const originalNavigator = Object.getOwnPropertyDescriptor(global, 'navigator')
  const originalWindow = global.window
  const originalNotification = global.Notification
  const displayed = [],
    constructors = []
  let permissionCalls = 0,
    registrations = 0
  class FakeNotification {
    static permission = 'denied'
    static async requestPermission() {
      permissionCalls++
      FakeNotification.permission = 'granted'
      return 'granted'
    }
    constructor(title, options) {
      constructors.push({ title, options, notification: this })
    }
    close() {}
  }
  const registration = {
    showNotification: async (title, options) => {
      displayed.push({ title, options })
    },
  }
  global.window = {
    Notification: FakeNotification,
    isSecureContext: true,
    focus: () => {},
  }
  global.Notification = FakeNotification
  Object.defineProperty(global, 'navigator', {
    configurable: true,
    value: {
      serviceWorker: {
        register: async () => {
          registrations++
        },
        ready: Promise.resolve(registration),
      },
    },
  })
  const browser = require('../src/services/browserNotifications.ts')
  await browser.notifyInBrowser(presentAlerts([incoming])[0], () => {})
  assert.equal(displayed.length, 0)
  assert.equal(permissionCalls, 0, 'never prompt automatically')
  assert.equal(await browser.requestBrowserNotifications(), 'granted')
  assert.equal(permissionCalls, 1)
  assert.equal(registrations, 1)
  await browser.notifyInBrowser(presentAlerts([incoming])[0], () => {})
  assert.equal(displayed.length, 1)
  assert.equal(displayed[0].options.data.alertId, '2')
  assert.equal(displayed[0].options.tag, 'infreum-alert-2')
  delete global.navigator.serviceWorker
  let clicked = false
  await browser.notifyInBrowser(presentAlerts([incoming])[0], () => {
    clicked = true
  })
  assert.equal(constructors.length, 1)
  constructors[0].notification.onclick()
  assert.equal(clicked, true)
  global.window = originalWindow
  global.Notification = originalNotification
  if (originalNavigator)
    Object.defineProperty(global, 'navigator', originalNavigator)
  else delete global.navigator
  const handlers = {}
  let pending,
    opened,
    focused = false,
    message
  let clients = [
    {
      url: 'http://localhost:5173/#/dashboard',
      postMessage: (value) => {
        message = value
      },
      focus: async () => {
        focused = true
      },
    },
  ]
  const workerSelf = {
    location: { origin: 'http://localhost:5173' },
    skipWaiting: async () => {},
    addEventListener: (name, handler) => {
      handlers[name] = handler
    },
    clients: {
      claim: async () => {},
      matchAll: async () => clients,
      openWindow: async (url) => {
        opened = url
      },
    },
  }
  vm.runInNewContext(
    fs.readFileSync(
      path.join(__dirname, '../public/notifications-sw.js'),
      'utf8',
    ),
    { self: workerSelf, URL },
  )
  handlers.notificationclick({
    notification: { data: { alertId: '2' }, close: () => {} },
    waitUntil: (promise) => {
      pending = promise
    },
  })
  await pending
  assert.equal(focused, true)
  assert.equal(message.alertId, '2')
  assert.equal(message.type, 'OPEN_ALERT')
  clients = []
  handlers.notificationclick({
    notification: {
      data: { alertId: 'https://outside.example' },
      close: () => {},
    },
    waitUntil: (promise) => {
      pending = promise
    },
  })
  await pending
  assert.ok(opened.startsWith('http://localhost:5173/#/alerts?alert='))
  assert.equal(new URL(opened).origin, 'http://localhost:5173')
  console.log(
    'PASS: notification baseline/dedup, stable identity, safe deep links, unread badges, feed/detail/toast rendering, permission gating, OS click handlers, service-worker focus/open routing. No real OS notification or DB write performed.',
  )
}
verify().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
