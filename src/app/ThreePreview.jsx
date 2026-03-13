import { useEffect, useRef } from "react"
import * as THREE from "three"

export function ThreePreview() {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return undefined
    const container = ref.current

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#0b1220")

    const camera = new THREE.PerspectiveCamera(55, 160 / 120, 0.1, 100)
    camera.position.z = 3.2

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(160, 120)
    container.appendChild(renderer.domElement)

    const lightA = new THREE.DirectionalLight(0x7dd3fc, 1.4)
    lightA.position.set(2, 2, 3)
    scene.add(lightA)

    const lightB = new THREE.AmbientLight(0x94a3b8, 0.6)
    scene.add(lightB)

    const geometry = new THREE.TorusKnotGeometry(0.75, 0.24, 120, 16)
    const material = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.35, roughness: 0.28 })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    let frame = null
    const loop = () => {
      mesh.rotation.x += 0.01
      mesh.rotation.y += 0.016
      renderer.render(scene, camera)
      frame = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      if (frame) cancelAnimationFrame(frame)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [])

  return <div className="three-preview" ref={ref} />
}
