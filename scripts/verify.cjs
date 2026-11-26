const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToString } = require('react-dom/server')
const root = path.resolve(__dirname, '..')
global.__apiTestEnv = { VITE_API_BASE_URL: 'https://test.ngrok-free.dev' }
const compile = (mod, filename) => {
  const source = fs
    .readFileSync(filename, 'utf8')
    .replaceAll('import.meta.env', 'global.__apiTestEnv')
  const out = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  })
  mod._compile(out.outputText, filename)
}
require.extensions['.ts'] = compile
require.extensions['.tsx'] = compile
require.extensions['.css'] = () => {}
const originalJs = require.extensions['.js']
require.extensions['.js'] = (mod, filename) =>
  filename.startsWith(path.join(root, 'src'))
    ? compile(mod, filename)
    : originalJs(mod, filename)
async function verify() {
  const THREE = require('three')
  const {
    buildBridgeModel,
    disposeModel,
  } = require('../src/components/bridgeModel.ts')
  const count = (model, name) => {
    let total = 0
    model.traverse((object) => {
      if (object.name === name) total++
    })
    return total
  }
  const close = (actual, expected) =>
    assert.ok(Math.abs(actual - expected) < 0.001, `${actual} vs ${expected}`)
  const box = buildBridgeModel('BOX')
  const section = buildBridgeModel('BOX', true)
  const truss = buildBridgeModel('TRUSS')
  assert.equal(count(box, 'internal-diaphragm'), 2)
  assert.equal(count(box, 'support'), 2)
  assert.equal(section.getObjectByName('front-web').visible, false)
  assert.equal(box.getObjectByName('front-web').visible, true)
  const deckSize = box.getObjectByName('top-plate').geometry.parameters
  close(deckSize.width, 6)
  close(deckSize.depth, 1.5)
  close(deckSize.height, 0.03)
  const bodyBounds = new THREE.Box3().setFromObject(
    truss.getObjectByName('bridge-body'),
  )
  const size = bodyBounds.getSize(new THREE.Vector3())
  close(size.x, 6)
  close(size.y, 1.5)
  close(size.z, 1.5)
  assert.equal(count(truss, 'diagonal-member'), 16)
  assert.equal(count(truss, 'top-cross-brace'), 0)
  assert.equal(count(truss, 'support'), 2)
  const support = box.getObjectByName('support').geometry.parameters
  close(support.width, 0.6)
  close(support.height, 0.6)
  close(support.depth, 1.5)
  for (const model of [box, section, truss]) disposeModel(model)
  console.log(
    'PASS: drawing dimensions, hollow BOX with two diaphragms, TRUSS bracing, cutaway and wooden supports.',
  )
  const fixture = require('../tests/fixtures/backend.ts')
  const {
    normalizeBridge,
    normalizeExperiments,
    sortedMeasurements,
    chronological,
    listResponse,
  } = require('../src/services/normalize.ts')
  const workspace = fixture.createMockWorkspace()
  const {
    SENSOR_PLACEMENTS,
    placementPosition,
    placementSensorIndex,
  } = require('../src/data/sensorPlacement.ts')
  const PlacementView = require('../src/components/SensorPlacement.tsx').default
  for (const kind of ['BOX', 'TRUSS']) {
    const slots = SENSOR_PLACEMENTS[kind]
    assert.deepEqual(
      slots.map((p) => p.distanceMm),
      [150, 300, 300],
    )
    assert.equal(slots[2].temporary, true)
    close(placementPosition(kind, slots[0])[0], -1.5)
    close(placementPosition(kind, slots[1])[0], 0)
    close(placementPosition(kind, slots[2])[0], 0)
    close(placementPosition(kind, slots[0])[1], 1.8)
    close(placementPosition(kind, slots[2])[2], 0.6)
    const html = renderToString(
      React.createElement(PlacementView, {
        kind,
        sensors: [],
        active: null,
        onSelect() {},
        preview: false,
      }),
    )
    for (const slot of slots) assert.ok(html.includes(slot.label))
    assert.ok(
      html.includes('DB 연결 대기') &&
        html.includes('실측 전') &&
        html.includes('600 mm'),
    )
  }
  const [a1, a2, t1] = SENSOR_PLACEMENTS.BOX
  assert.equal(placementSensorIndex(a1, workspace.bridges[0].sensors), -1)
  assert.equal(placementSensorIndex(a2, workspace.bridges[0].sensors), -1)
  const newAcceleration = {
    ...workspace.bridges[0].sensors[0],
    sensor_id: 'A1',
    sensor_type: 'ACCELEROMETER',
  }
  assert.equal(placementSensorIndex(a1, [newAcceleration]), 0)
  assert.equal(placementSensorIndex(a1, [newAcceleration, newAcceleration]), -1)
  assert.equal(placementSensorIndex(t1, workspace.bridges[0].sensors), -1)
  assert.equal(
    placementSensorIndex(a1, [
      { ...workspace.bridges[0].sensors[0], sensor_id: 'UNRELATED_ACC' },
    ]),
    -1,
  )
  assert.equal(
    placementSensorIndex(a1, [
      workspace.bridges[0].sensors[0],
      workspace.bridges[0].sensors[0],
    ]),
    -1,
  )
  assert.equal(
    placementSensorIndex(t1, [
      {
        ...workspace.bridges[0].sensors[0],
        sensor_id: 'T1',
        sensor_type: 'TEMPERATURE',
      },
    ]),
    0,
  )
  console.log(
    'PASS: 600 mm sensor layout, 150/300 mm positions, temperature draft and explicit unique DB mapping.',
  )
  assert.equal(workspace.bridges[0].sensors.length, 5)
  assert.ok(
    workspace.bridges[0].sensors.every((s) => s.connection === 'UNKNOWN'),
  )
  const original = fixture.mockMeasurements[0]
  const {
    readingSeries,
    readingText,
  } = require('../src/services/sensorReadings.ts')
  const { Chart } = require('../src/components/UI.tsx')
  const threeAxisRows = [
    { ...original, accel_x: 0.1, accel_y: 0.2, accel_z: 0.3 },
    { ...original, accel_x: null, accel_y: null, accel_z: null },
    { ...original, accel_x: 0.4, accel_y: 0.5, accel_z: 0.6 },
  ]
  const axes = readingSeries(newAcceleration, threeAxisRows)
  assert.equal(axes.length, 3)
  assert.deepEqual(axes[0].values, [0.1, null, 0.4])
  const gapHtml = renderToString(
    React.createElement(Chart, { series: axes, unit: 'g' }),
  )
  assert.equal((gapHtml.match(/<polyline/g) || []).length, 6)
  assert.ok(!gapHtml.includes('<polygon'))
  assert.ok(!gapHtml.includes('NaN'))
  assert.equal(readingText(newAcceleration, original), 'X — · Y — · Z —')
  const tempSensor = {
    ...newAcceleration,
    sensor_id: 'T1',
    sensor_type: 'TEMPERATURE',
  }
  assert.equal(readingText(tempSensor, { ...original, temperature: null }), '—')
  assert.equal(
    readingText(tempSensor, { ...original, temperature: 24.5 }),
    '24.500',
  )
  const unknownTime = sortedMeasurements([{ ...original, measured_at: null }])
  assert.equal(unknownTime[0].measured_at, null)
  assert.throws(() => sortedMeasurements([{ ...original, accel_x: 'bad' }]))
  const vectorOnly = sortedMeasurements([
    {
      ...original,
      value: undefined,
      measured_at: undefined,
      timestamp: original.measured_at,
      accel_x: 0.1,
    },
  ])
  assert.equal(vectorOnly[0].value, null)
  assert.equal(vectorOnly[0].measured_at, original.measured_at)
  console.log(
    'PASS: meter coordinates, new-ID-only mapping, 3-axis/temperature values, missing-value gaps and null timestamps.',
  )
  const tied = [
    { ...original, id: 90, sequence: 1 },
    { ...original, id: 91, sequence: 3 },
    { ...original, id: 92, sequence: 2 },
  ]
  assert.deepEqual(
    sortedMeasurements(tied).map((r) => r.sequence),
    [3, 2, 1],
  )
  assert.deepEqual(
    chronological(tied).map((r) => r.sequence),
    [1, 2, 3],
  )
  assert.equal(tied[0].sequence, 1)
  assert.throws(() => listResponse({ results: [] }, 'test'))
  assert.throws(() => sortedMeasurements([{ ...original, value: 'invalid' }]))
  const otherBridge = {
    id: 9,
    bridge_id: 'TRUSS_FUTURE_02',
    bridge_type: 'STEEL_TRUSS',
    name: 'Future Truss',
  }
  const otherSensor = {
    ...fixture.mockSensors[0],
    id: 81,
    bridge: 9,
    sensor_id: 'CUSTOM_SENSOR_81',
    sensor_type: 'HUMIDITY',
    default_unit: '%',
    component: null,
    is_active: false,
  }
  const otherRow = {
    ...original,
    id: 812,
    sensor: 81,
    bridge: 9,
    value: 61.3,
    unit: '%',
  }
  const other = normalizeBridge(
    otherBridge,
    [],
    [otherSensor],
    [otherRow],
    fixture.demoAI(),
  )
  assert.equal(other.sensors[0].latest.value, 61.3)
  assert.equal(other.sensors[0].connection, 'UNKNOWN')
  const experiment = {
    id: 1,
    experiment_id: 'EXP_BOX_001',
    stage: 'NORMAL',
    condition_code: 'NORMAL',
    load_n: 100,
    load_position: 'CENTER',
    load_source: 'KNOWN_MASS',
    repeat_no: 1,
    started_at: '2026-10-15T03:00:00Z',
    ended_at: null,
    bridge: 1,
  }
  const experiments = normalizeExperiments([experiment], fixture.mockBridges)
  assert.equal(experiments[0].bridge_id, 'BOX_01')
  const pages = require('../src/pages/Monitoring.tsx'),
    exp = require('../src/pages/Experiments.tsx'),
    Auth = require('../src/components/Auth.tsx').default
  let renders = 0
  const Alerts = require('../src/pages/Alerts.tsx').default
  for (const props of [
    { alerts: [] },
    { alerts: [{ id: 1, message: 'Sensor alert', status: 'OPEN' }] },
    { alerts: [], error: '알림 조회 오류' },
  ]) {
    const html = renderToString(
      React.createElement(Alerts, { ...props, onRefresh: () => {} }),
    )
    assert.ok(html.includes('처리 이력'))
    assert.ok(html.includes(props.error || '발생 알림'))
    renders++
  }
  for (const bridgeSource of [workspace.bridges[0], other])
    for (const empty of [false, true]) {
      const bridge = empty
        ? {
            ...bridgeSource,
            sensors: [],
            components: [],
            measurements: {},
            measured_at: null,
            timestamp: null,
          }
        : bridgeSource
      const props = {
        bridge,
        bridges: [bridge],
        selectBridge: () => {},
        go: () => {},
      }
      for (const [Page, extra] of [
        [pages.Dashboard, {}],
        [pages.Bridges, {}],
        [pages.Sensors, {}],
        [pages.AIAnalysis, { analysis: workspace.analysis }],
        [pages.Settings, { system: workspace.system, reload: () => {} }],
        [
          exp.Experiments,
          { experiments: empty ? [] : experiments, bridgeId: bridge.bridge_id },
        ],
        [exp.History, { experiments: [], bridge: bridge.bridge_id }],
      ]) {
        const html = renderToString(
          React.createElement(Page, { ...props, ...extra }),
        )
        assert.ok(html.length > 100)
        assert.ok(!html.includes('NaN') && !html.includes('undefined'))
        assert.ok(!html.includes('DEMO') && !html.includes('MOCK'))
        renders++
      }
    }
  for (const signup of [false, true]) {
    const html = renderToString(
      React.createElement(Auth, { signup, go: () => {}, connected: true }),
    )
    assert.ok(html.includes('<form') && html.includes('type="password"'))
    assert.equal(html.includes('name="confirm"'), signup)
    assert.ok(html.includes('DB'))
    renders++
  }
  const aiEmpty = renderToString(
    React.createElement(pages.AIAnalysis, { analysis: workspace.analysis }),
  )
  assert.ok(!aiEmpty.includes('0.128'))
  assert.ok(aiEmpty.includes('DB'))
  const aiPresent = {
    ...workspace.analysis,
    anomalies: [{ id: 1, anomaly_score: 0, is_anomaly: false }],
    risks: [{ id: 2, risk_score: 0.73, risk_level: 'CAUTION' }],
  }
  const aiHtml = renderToString(
    React.createElement(pages.AIAnalysis, { analysis: aiPresent }),
  )
  assert.ok(aiHtml.includes('0.73'))
  assert.ok(aiHtml.includes('CAUTION'))
  let calls = [],
    experimentFailure = false,
    measurementFailure = false,
    aiFailure = false
  global.fetch = async (url, options) => {
    calls.push({ url, options })
    assert.equal(options.method, 'GET')
    assert.equal(options.headers.get('ngrok-skip-browser-warning'), 'true')
    const u = new URL(url)
    let data
    if (u.pathname === '/api/v1/bridges/')
      data = [...fixture.mockBridges, otherBridge]
    else if (u.pathname === '/api/v1/components/') data = fixture.mockComponents
    else if (u.pathname === '/api/v1/sensors/')
      data = [...fixture.mockSensors, otherSensor]
    else if (u.pathname === '/api/v1/experiments/') {
      if (experimentFailure)
        return new Response('{"detail":"Unavailable"}', {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      data = [experiment]
    } else if (
      [
        '/api/v1/analysis-windows/',
        '/api/v1/anomaly-results/',
        '/api/v1/risk-results/',
        '/api/v1/alerts/',
      ].includes(u.pathname)
    ) {
      if (aiFailure)
        return new Response('{"detail":"Unavailable"}', {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      data = []
    } else if (u.pathname === '/api/v1/measurements/') {
      if (measurementFailure)
        return new Response('{"detail":"Unavailable"}', {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      const b = [...fixture.mockBridges, otherBridge].find(
          (b) => b.bridge_id === u.searchParams.get('bridge_id'),
        ),
        s = [...fixture.mockSensors, otherSensor].find(
          (s) => s.sensor_id === u.searchParams.get('sensor_id'),
        )
      data = [...fixture.mockMeasurements, otherRow].filter(
        (m) =>
          (!u.searchParams.has('bridge_id') || m.bridge === b?.id) &&
          (!u.searchParams.has('sensor_id') || m.sensor === s?.id) &&
          (!u.searchParams.has('from') ||
            Date.parse(m.measured_at) >=
              Date.parse(u.searchParams.get('from'))) &&
          (!u.searchParams.has('to') ||
            Date.parse(m.measured_at) <= Date.parse(u.searchParams.get('to'))),
      )
    } else throw new Error('Unexpected endpoint: ' + u.pathname)
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const service = require('../src/services/workspace.ts')
  const live = await service.loadWorkspace(new AbortController().signal)
  assert.equal(live.bridges.length, 2)
  assert.equal(live.system.status, 'UNKNOWN')
  assert.equal(live.bridges[0].ai.state, 'PENDING')
  assert.equal(live.bridges[0].ai.risk_score, null)
  assert.deepEqual(live.analysis.anomalies, [])
  assert.equal(
    (
      await service.queryMeasurements({
        bridge_id: 'BOX_01',
        sensor_id: 'ACC_BOX_01',
        from: '2026-10-15T11:59:30+09:00',
        to: '2026-10-15T12:00:00+09:00',
      })
    ).length,
    4,
  )
  const last = new URL(calls.at(-1).url)
  assert.equal(last.searchParams.get('from'), '2026-10-15T02:59:30.000Z')
  await assert.rejects(
    service.queryMeasurements({
      from: '2026-10-16T00:00:00Z',
      to: '2026-10-15T00:00:00Z',
    }),
  )
  experimentFailure = true
  aiFailure = true
  const partial = await service.loadWorkspace(new AbortController().signal)
  assert.ok(partial.experiments_error)
  assert.equal(partial.analysis.errors.length, 4)
  assert.equal(partial.bridges.length, 2)
  measurementFailure = true
  const failed = await service.loadWorkspace(new AbortController().signal)
  assert.ok(
    failed.bridges.every(
      (b) => b.measurement_error && b.sensors.every((s) => s.latest === null),
    ),
  )
  const { default: API, APIError } = require('../src/API.js')
  global.fetch = async () =>
    new Response('<html>ngrok</html>', {
      headers: { 'Content-Type': 'text/html' },
    })
  await assert.rejects(
    API.get('/api/v1/'),
    (e) => e instanceof APIError && e.message.includes('HTML'),
  )
  global.fetch = async () =>
    new Response('{"detail":"Denied"}', {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  await assert.rejects(API.get('/api/v1/'), (e) => e.status === 403)
  global.fetch = async () => {
    throw new Error('Disconnected')
  }
  await assert.rejects(service.loadWorkspace(new AbortController().signal))
  const {
    registerAccount,
    loginAccount,
    setAccessToken,
  } = require('../src/API.js')
  let authRequest
  global.fetch = async (url, options) => {
    authRequest = { url, options }
    return new Response(JSON.stringify({ password_confirm: ['Mismatch'] }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  await assert.rejects(
    registerAccount({
      name: 'Test',
      email: 'test@example.com',
      password: 'test-only-password',
      password_confirm: 'different',
    }),
    (e) => e.message.includes('Mismatch'),
  )
  assert.equal(new URL(authRequest.url).pathname, '/api/v1/auth/register/')
  assert.equal(authRequest.options.method, 'POST')
  assert.equal(
    JSON.parse(authRequest.options.body).password_confirm,
    'different',
  )
  global.fetch = async () =>
    new Response(
      JSON.stringify({ user: { id: 1, name: 'Test' }, message: 'Created' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    )
  assert.equal(
    (
      await registerAccount({
        name: 'Test',
        email: 'test@example.com',
        password: 'test-only-password',
        password_confirm: 'test-only-password',
      })
    ).user.id,
    1,
  )
  global.fetch = async () =>
    new Response(JSON.stringify({ email: ['Invalid credentials'] }), {
      headers: { 'Content-Type': 'application/json' },
    })
  await assert.rejects(
    loginAccount({ email: 'test@example.com', password: 'test-only-password' }),
    (e) => e.message.includes('Invalid credentials'),
  )
  global.fetch = async (url, options) => {
    authRequest = { url, options }
    return new Response(JSON.stringify({ access: 'test-access-token' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  await loginAccount({
    email: 'test@example.com',
    password: 'test-only-password',
  })
  assert.equal(new URL(authRequest.url).pathname, '/api/v1/auth/login/')
  assert.equal(authRequest.options.method, 'POST')
  await API.get('/api/v1/bridges/')
  assert.equal(
    authRequest.options.headers.get('Authorization'),
    'Bearer test-access-token',
  )
  setAccessToken(null)
  global.fetch = async () =>
    new Response(JSON.stringify({ message: 'Unrecognized' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  await assert.rejects(
    loginAccount({ email: 'test@example.com', password: 'test-only-password' }),
  )
  const walk = (dir) =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((entry) =>
        entry.isDirectory()
          ? walk(path.join(dir, entry.name))
          : [path.join(dir, entry.name)],
      )
  for (const file of walk(path.join(root, 'src')).filter((f) =>
    /\.(js|tsx?)$/.test(f),
  )) {
    const source = fs.readFileSync(file, 'utf8')
    assert.ok(
      !source.includes('VITE_DATA_SOURCE') &&
        !source.includes('Math.sin(') &&
        !source.includes('createMockWorkspace') &&
        !source.includes('demoAI'),
      file + ' must not include demo data paths',
    )
  }
  console.log(
    `PASS: ${renders} API-only page renders; no simulated auth/data; DB mapping/filters; real-record AI tables; empty/error handling; network failure rejects without fallback. Test fixtures stay outside src.`,
  )
}
verify().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
