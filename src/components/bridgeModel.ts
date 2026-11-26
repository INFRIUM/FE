import * as THREE from 'three'

export type ModelKind = 'BOX' | 'TRUSS'
// Drawing dimensions in cm. One scene unit represents 10 cm, not API coordinates.
export const MODEL_SPECS = {
  BOX: {
    length: 60,
    width: 15,
    height: 12,
    thickness: 0.3,
    material: 'MDF 3 mm',
    label: 'BOX 거더교',
  },
  TRUSS: {
    length: 60,
    width: 15,
    height: 15,
    thickness: 0.5,
    material: '폼보드 5 mm · MDF 3 mm',
    label: 'TRUSS 교량',
  },
} as const

export function buildBridgeModel(kind: ModelKind, cutaway = false) {
  const root = new THREE.Group()
  root.name = `drawing-${kind}`
  const body = new THREE.Group()
  body.name = 'bridge-body'
  const supports = new THREE.Group()
  supports.name = 'wood-supports'
  root.add(body, supports)
  const wood = new THREE.MeshStandardMaterial({
    color: '#cfb58d',
    roughness: 0.84,
  })
  const edge = new THREE.MeshStandardMaterial({
    color: '#ad8d64',
    roughness: 0.85,
  })
  const foam = new THREE.MeshStandardMaterial({
    color: '#e5e9e4',
    roughness: 0.65,
    metalness: 0.12,
  })
  const bolt = new THREE.MeshStandardMaterial({
    color: '#65716d',
    roughness: 0.45,
    metalness: 0.65,
  })
  function plate(
    name: string,
    position: number[],
    size: number[],
    material: THREE.Material,
    parent = body,
  ) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size[0], size[1], size[2]),
      material,
    )
    mesh.name = name
    mesh.position.set(position[0], position[1], position[2])
    mesh.castShadow = mesh.receiveShadow = true
    parent.add(mesh)
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({
        color: '#665d4b',
        transparent: true,
        opacity: 0.3,
      }),
    )
    mesh.add(outline)
    return mesh
  }
  for (const x of [-2.7, 2.7])
    plate('support', [x, 0.3, 0], [0.6, 0.6, 1.5], edge, supports)
  if (kind === 'BOX') {
    plate('bottom-plate', [0, 0.615, 0], [6, 0.03, 1.5], wood)
    plate('top-plate', [0, 1.785, 0], [6, 0.03, 1.5], wood)
    plate('back-web', [0, 1.2, -0.735], [6, 1.14, 0.03], wood)
    const front = plate('front-web', [0, 1.2, 0.735], [6, 1.14, 0.03], wood)
    front.visible = !cutaway
    for (const x of [-1, 1])
      plate('internal-diaphragm', [x, 1.2, 0], [0.03, 1.14, 1.44], wood)
    const boltGeometry = new THREE.CylinderGeometry(0.014, 0.014, 0.007, 8)
    for (const x of [-2.92, -2, -1, 0, 1, 2, 2.92]) {
      for (const z of [-0.68, 0.68]) {
        const screw = new THREE.Mesh(boltGeometry, bolt)
        screw.position.set(x, 1.803, z)
        screw.name = 'fastener'
        body.add(screw)
      }
    }
  } else {
    plate('deck', [0, 0.615, 0], [6, 0.03, 1.5], wood)
    // Flat foam strips: 3 cm wide, 5 mm thick, with eight schematic bays over the 600 mm reference span.
    function member(name: string, a: THREE.Vector3, b: THREE.Vector3) {
      const direction = b.clone().sub(a)
      const mesh = plate(
        name,
        a.clone().add(b).multiplyScalar(0.5).toArray(),
        [0.3, direction.length(), 0.05],
        foam,
      )
      mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize(),
      )
      return mesh
    }
    for (const z of [-0.725, 0.725]) {
      plate('lower-chord', [0, 0.78, z], [6, 0.3, 0.05], foam)
      plate('upper-chord', [0, 1.95, z], [6, 0.3, 0.05], foam)
      for (let i = 0; i <= 8; i++) {
        const x = -2.85 + i * 0.7125
        member(
          'vertical-member',
          new THREE.Vector3(x, 0.78, z),
          new THREE.Vector3(x, 1.95, z),
        )
        if (i < 8)
          member(
            'diagonal-member',
            new THREE.Vector3(
              x,
              i % 2 ? 1.95 : 0.78,
              z + (z < 0 ? 0.025 : -0.025),
            ),
            new THREE.Vector3(
              x + 0.7125,
              i % 2 ? 0.78 : 1.95,
              z + (z < 0 ? 0.025 : -0.025),
            ),
          )
      }
    }
    // Open-top truss: keep both side frames without overhead cross members.
  }
  root.userData.spec = MODEL_SPECS[kind]
  return root
}

export function disposeModel(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  root.traverse((obj) => {
    if (
      obj instanceof THREE.Mesh ||
      obj instanceof THREE.Line ||
      obj instanceof THREE.Sprite
    ) {
      if ('geometry' in obj) geometries.add(obj.geometry)
      for (const material of Array.isArray(obj.material)
        ? obj.material
        : [obj.material]) {
        materials.add(material)
        if ('map' in material && material.map instanceof THREE.Texture)
          textures.add(material.map)
      }
    }
  })
  geometries.forEach((g) => g.dispose())
  materials.forEach((m) => m.dispose())
  textures.forEach((t) => t.dispose())
}
