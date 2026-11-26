import { useEffect, useEffectEvent, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { BridgeId, Sensor } from '../data/types'
import { Icon } from './UI'
import { buildBridgeModel, disposeModel, MODEL_SPECS } from './bridgeModel'
import type { ModelKind } from './bridgeModel'
import SensorPlacement from './SensorPlacement'
import {
  SENSOR_PLACEMENTS,
  placementPosition,
  placementSensorIndex,
} from '../data/sensorPlacement'
import type { SensorPlacement as Placement } from '../data/sensorPlacement'

type View = 'perspective' | 'front' | 'top'
export default function DigitalTwin({
  bridgeId,
  bridgeType,
  sensors,
  selected = 0,
  onSelect,
}: {
  bridgeId: BridgeId
  bridgeType: string
  sensors: Sensor[]
  selected?: number
  onSelect?: (index: number) => void
}) {
  const mount = useRef<HTMLDivElement>(null)
  const commands = useRef<{
    zoom: (factor: number) => void
    view: (view: View) => void
  } | null>(null)
  const [preview, setPreview] = useState<ModelKind | null>(null)
  const [cutaway, setCutaway] = useState(false)
  const [dimensions, setDimensions] = useState(true)
  const [view, setView] = useState<View>('top')
  const [unavailable, setUnavailable] = useState(false)
  const [placementSelection, setPlacementSelection] = useState<string | null>(
    null,
  )
  const markerMeshes = useRef<THREE.Mesh[]>([])
  const currentKind: ModelKind = bridgeType === 'STEEL_TRUSS' ? 'TRUSS' : 'BOX'
  const kind = preview || currentKind
  const spec = MODEL_SPECS[kind]
  const isPreview = kind !== currentKind
  const placements = SENSOR_PLACEMENTS[kind]
  const activePlacement =
    placements.find((p) => p.label === placementSelection)?.label ||
    (!isPreview
      ? placements.find((p) => placementSensorIndex(p, sensors) === selected)
          ?.label
      : null) ||
    null
  function selectPlacement(placement: Placement) {
    setPlacementSelection(placement.label)
    const index = isPreview ? -1 : placementSensorIndex(placement, sensors)
    if (index >= 0) onSelect?.(index)
  }
  const pickPlacement = useEffectEvent((label: string) => {
    const placement = placements.find((p) => p.label === label)
    if (placement) selectPlacement(placement)
  })

  // Drawing units are separate from the still-unconfirmed API coordinate system.
  useEffect(() => {
    const container = mount.current
    if (!container) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      queueMicrotask(() => setUnavailable(true))
      return
    }
    queueMicrotask(() => setUnavailable(false))
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#F1F4F6')
    const camera = new THREE.OrthographicCamera(-6, 6, 4, -4, 0.1, 100)
    camera.position.set(9, 7, 11)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.setClearColor('#F1F4F6', 1)
    container.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('role', 'img')
    renderer.domElement.setAttribute(
      'aria-label',
      `${spec.label} 도안 기반 3D 모형. ${spec.length} × ${spec.width} × ${spec.height} cm. 아래 버튼으로 시점 변경 가능`,
    )
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = false
    controls.minZoom = 0.65
    controls.maxZoom = 3
    controls.maxPolarAngle = Math.PI * 0.49
    controls.target.set(0, 0.9, 0)
    scene.add(new THREE.HemisphereLight(0xffffff, 0xa8a28e, 3))
    const light = new THREE.DirectionalLight(0xfff4df, 3.4)
    light.position.set(-3, 9, 6)
    light.castShadow = true
    light.shadow.mapSize.set(2048, 2048)
    Object.assign(light.shadow.camera, {
      left: -7,
      right: 7,
      top: 5,
      bottom: -5,
      near: 0.5,
      far: 25,
    })
    light.shadow.normalBias = 0.035
    scene.add(light)
    const fill = new THREE.DirectionalLight(0xffffff, 1.5)
    fill.position.set(4, 3, -5)
    scene.add(fill)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShadowMaterial({ opacity: 0.14 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.006
    floor.receiveShadow = true
    scene.add(floor)
    const grid = new THREE.GridHelper(20, 40, 0xd9dee5, 0xe9edf0)
    grid.position.y = 0.001
    scene.add(grid)
    scene.add(buildBridgeModel(kind, cutaway))
    // Drawing guides show the shared centreline and the two installation stations.
    const guideY = 0.6 + spec.height / 10 + 0.025
    for (const [a, b] of [
      [
        [-3, guideY, 0],
        [3, guideY, 0],
      ],
      [
        [-1.5, guideY, -0.75],
        [-1.5, guideY, 0.75],
      ],
      [
        [0, guideY, -0.75],
        [0, guideY, 0.75],
      ],
    ]) {
      const guide = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...a),
          new THREE.Vector3(...b),
        ]),
        new THREE.LineDashedMaterial({
          color: '#53616B',
          dashSize: 0.09,
          gapSize: 0.07,
          depthTest: false,
          toneMapped: false,
          transparent: true,
          opacity: 0.65,
        }),
      )
      guide.computeLineDistances()
      guide.renderOrder = 8
      scene.add(guide)
    }
    const pins = placements.map((placement) => {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 18, 12),
        new THREE.MeshBasicMaterial({
          color: placement.type === 'ACC' ? '#2468A7' : '#B76A24',
          depthTest: false,
          toneMapped: false,
        }),
      )
      marker.position.set(...placementPosition(kind, placement))
      marker.renderOrder = 10
      marker.userData.placement = placement.label
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 80
      const context = canvas.getContext('2d')
      if (context) {
        context.fillStyle = '#FDFDFD'
        context.fillRect(0, 0, 256, 80)
        context.fillStyle = placement.type === 'ACC' ? '#2468A7' : '#B76A24'
        context.font = '600 32px sans-serif'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText(
          `${placement.label} · ${placement.distanceMm} mm`,
          128,
          40,
        )
      }
      const label = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(canvas),
          depthTest: false,
          toneMapped: false,
        }),
      )
      label.position.set(0, 0.3, placement.type === 'ACC' ? -0.32 : 0.32)
      label.scale.set(0.85, 0.26, 1)
      label.renderOrder = 11
      marker.add(label)
      scene.add(marker)
      return marker
    })
    markerMeshes.current = pins
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let down = [0, 0]
    const pointerDown = (event: PointerEvent) => {
      down = [event.clientX, event.clientY]
    }
    const pointerUp = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 5)
        return
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(pins)[0]
      if (hit) pickPlacement(hit.object.userData.placement)
    }
    renderer.domElement.addEventListener('pointerdown', pointerDown)
    renderer.domElement.addEventListener('pointerup', pointerUp)
    const dimensionGroup = new THREE.Group()
    scene.add(dimensionGroup)
    function dimension(
      a: THREE.Vector3,
      b: THREE.Vector3,
      text: string,
      position: THREE.Vector3,
    ) {
      dimensionGroup.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([a, b]),
          new THREE.LineBasicMaterial({ color: '#7C858C' }),
        ),
      )
      const dir = b.clone().sub(a).normalize()
      const tick = new THREE.Vector3(-dir.z, 0.12, dir.x)
        .normalize()
        .multiplyScalar(0.09)
      for (const p of [a, b]) {
        dimensionGroup.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              p.clone().sub(tick),
              p.clone().add(tick),
            ]),
            new THREE.LineBasicMaterial({ color: '#7C858C' }),
          ),
        )
      }
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 80
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#F1F4F6'
        ctx.fillRect(0, 0, 256, 80)
        ctx.fillStyle = '#53616B'
        ctx.font = '500 38px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, 128, 40)
      }
      const label = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(canvas),
          depthTest: false,
          toneMapped: false,
        }),
      )
      label.position.copy(position)
      label.scale.set(0.95, 0.3, 1)
      dimensionGroup.add(label)
    }
    dimension(
      new THREE.Vector3(-3, 0.03, 1.25),
      new THREE.Vector3(3, 0.03, 1.25),
      '600 mm',
      new THREE.Vector3(0, 0.04, 1.37),
    )
    dimension(
      new THREE.Vector3(3.55, 0.03, -0.75),
      new THREE.Vector3(3.55, 0.03, 0.75),
      '150 mm',
      new THREE.Vector3(3.8, 0.05, 0),
    )
    const top = 0.6 + spec.height / 10
    dimension(
      new THREE.Vector3(-3.45, 0.6, -0.75),
      new THREE.Vector3(-3.45, top, -0.75),
      `${spec.height * 10} mm`,
      new THREE.Vector3(-3.9, 0.6 + spec.height / 20, -0.75),
    )
    dimensionGroup.visible = dimensions
    let frame = 0
    const render = () => {
      controls.update()
      renderer.render(scene, camera)
    }
    const resize = () => {
      const { clientWidth: width, clientHeight: height } = container
      if (!width || !height) return
      renderer.setSize(width, height)
      const aspect = width / height
      const halfWidth = Math.max(4.6, 1.8 * aspect)
      camera.left = -halfWidth
      camera.right = halfWidth
      camera.top = halfWidth / aspect
      camera.bottom = -halfWidth / aspect
      camera.updateProjectionMatrix()
      render()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()
    const setCamera = (next: View) => {
      const position: [number, number, number] =
        next === 'top'
          ? [0, 15, 0.001]
          : next === 'front'
            ? [0, 1.1, 15]
            : [9, 7, 11]
      camera.position.set(...position)
      controls.target.set(0, 0.9, 0)
      camera.zoom = 1
      camera.updateProjectionMatrix()
      controls.update()
      render()
    }
    commands.current = {
      zoom: (factor) => {
        camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, 0.65, 3)
        camera.updateProjectionMatrix()
        render()
      },
      view: setCamera,
    }
    const highlight = () => render()
    renderer.domElement.addEventListener('placementchange', highlight)
    const change = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(render)
    }
    controls.addEventListener('change', change)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.removeEventListener('change', change)
      controls.dispose()
      renderer.domElement.removeEventListener('pointerdown', pointerDown)
      renderer.domElement.removeEventListener('pointerup', pointerUp)
      renderer.domElement.removeEventListener('placementchange', highlight)
      disposeModel(scene)
      renderer.dispose()
      renderer.domElement.remove()
      commands.current = null
      markerMeshes.current = []
    }
  }, [kind, cutaway, dimensions, spec, placements])
  useEffect(() => {
    markerMeshes.current.forEach((marker) =>
      marker.scale.setScalar(
        marker.userData.placement === activePlacement ? 1.55 : 1,
      ),
    )
    mount.current
      ?.querySelector('canvas')
      ?.dispatchEvent(new Event('placementchange'))
  }, [activePlacement, kind, cutaway, dimensions])
  useEffect(() => {
    commands.current?.view(view)
  }, [view, kind, cutaway, dimensions])

  return (
    <section className="drawing-twin" aria-label="도안 기반 교량 모형">
      <div className="drawing-twin-toolbar">
        <div
          className="twin-model-tabs"
          role="group"
          aria-label="도안 모형 선택"
        >
          {(['BOX', 'TRUSS'] as const).map((model) => (
            <button
              key={model}
              aria-pressed={kind === model}
              onClick={() => {
                setPreview(model)
                setView('top')
                commands.current?.view('top')
              }}
            >
              {model === 'BOX' ? '01' : '02'} <strong>{model}</strong>
            </button>
          ))}
        </div>
        <span className={`twin-model-source ${isPreview ? 'preview' : ''}`}>
          {isPreview
            ? '다른 도안 미리보기 · DB 선택 유지'
            : `${bridgeId} · 도안 기반`}
        </span>
      </div>
      <div className="digital-twin studio-twin">
        <div className="twin-topline">
          <span>
            <i /> {spec.label}
          </span>
          <span>SENSOR LAYOUT / mm · 실측 전</span>
        </div>
        <div className="twin-canvas" ref={mount} />
        {unavailable && (
          <div className="twin-fallback">
            <Icon name="bridge" size={44} />
            <strong>3D 보기를 사용할 수 없습니다</strong>
            <span>WebGL을 지원하는 브라우저에서 확인해 주세요.</span>
          </div>
        )}
        <div className="twin-bottom">
          <div className="twin-view-tabs" role="group" aria-label="모형 시점">
            {(
              [
                ['perspective', '입체'],
                ['front', '정면'],
                ['top', '상단 · 배치 확인'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                aria-pressed={view === key}
                onClick={() => {
                  setView(key)
                  commands.current?.view(key)
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="twin-camera-actions">
            <button
              onClick={() => commands.current?.zoom(1.18)}
              aria-label="모델 확대"
            >
              <Icon name="plus" size={15} />
            </button>
            <button
              onClick={() => commands.current?.zoom(0.85)}
              aria-label="모델 축소"
            >
              −
            </button>
            <button
              onClick={() => {
                setView('top')
                commands.current?.view('top')
              }}
              aria-label="시점 초기화"
            >
              <Icon name="expand" size={15} />
            </button>
          </div>
        </div>
      </div>
      <div className="twin-drawing-info">
        <div>
          <span>배치도 기준 경간 / 폭</span>
          <strong>
            600 <i>×</i> 150 <small>mm</small>
          </strong>
        </div>
        <div>
          <span>재료</span>
          <strong>{spec.material}</strong>
        </div>
        <div className="twin-drawing-options">
          {kind === 'BOX' && (
            <button aria-pressed={cutaway} onClick={() => setCutaway(!cutaway)}>
              <Icon name="bridge" size={14} />
              {cutaway ? '내부 보기' : '조립 보기'}
            </button>
          )}
          <button
            aria-pressed={dimensions}
            onClick={() => setDimensions(!dimensions)}
          >
            치수 {dimensions ? '켜짐' : '꺼짐'}
          </button>
        </div>
      </div>
      <p className="twin-drawing-note">
        {kind === 'BOX'
          ? `${cutaway ? '내부 보기는 앞쪽 측판을 숨겨 격판 2개를 보여줍니다. ' : ''}상·하판과 양쪽 측판으로 구성된 BOX 모형.`
          : '양쪽 트러스 · 상부 개방형.'}{' '}
        경간은 새 배치도 기준이며, 높이와 재료·지지대는 이전 제작 도안을 유지한
        개념 모델입니다.
      </p>
      <SensorPlacement
        key={kind}
        kind={kind}
        sensors={sensors}
        active={activePlacement}
        onSelect={selectPlacement}
        preview={isPreview}
      />
      {!isPreview && sensors.length > 0 && (
        <div
          className="twin-sensor-list"
          role="group"
          aria-label="등록 센서 선택"
        >
          <span>
            등록 센서 <b>{sensors.length}</b>
          </span>
          {sensors.map((sensor, i) => (
            <button
              key={sensor.sensor_id}
              aria-pressed={selected === i}
              onClick={() => {
                setPlacementSelection(null)
                onSelect?.(i)
              }}
            >
              <i />
              {sensor.sensor_id}
            </button>
          ))}
        </div>
      )}
      <p className="twin-coordinate-note">
        마커는 하드웨어팀 배치도의 설계 위치입니다. 실측 좌표·장치 연결 상태를
        뜻하지 않으며, DB에 없는 센서의 측정값은 생성하지 않습니다.
      </p>
    </section>
  )
}
