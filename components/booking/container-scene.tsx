"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from "@react-three/drei"
import { useRef, useMemo } from "react"
import * as THREE from "three"

// Pallet Block Component
function Pallet({ position, index }: { position: [number, number, number], index: number }) {
    const meshRef = useRef<THREE.Mesh>(null!)

    // Spring-like animation for entry (simple lerp for now)
    useFrame((state) => {
        if (meshRef.current) {
            // Gentle float/bob check
            // meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + index) * 0.02
        }
    })

    // Color logic based on index or "fill" feel
    const color = new THREE.Color().setHSL(0.55 + (index * 0.01) % 0.1, 0.8, 0.5)

    return (
        <mesh ref={meshRef} position={position} castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1.2]} />
            <meshStandardMaterial
                color={color}
                roughness={0.2}
                metalness={0.1}
                transparent
                opacity={0.9}
            />
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1.2)]} />
                <lineBasicMaterial color="white" transparent opacity={0.3} />
            </lineSegments>
        </mesh>
    )
}

// The Container Frame (Wireframe representation)
function ContainerFrame() {
    return (
        <group>
            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
                <planeGeometry args={[2.5, 6]} />
                <meshStandardMaterial color="#334155" roughness={0.8} />
            </mesh>

            {/* Wireframe Box indicating boundaries */}
            <mesh position={[0, 1.25, 0]}>
                <boxGeometry args={[2.4, 2.5, 6]} />
                <meshStandardMaterial color="#94a3b8" wireframe transparent opacity={0.2} />
            </mesh>

            {/* Frame posts */}
            {[[-1.2, 2.5, 3], [1.2, 2.5, 3], [-1.2, 2.5, -3], [1.2, 2.5, -3]].map((pos, i) => (
                <mesh key={i} position={[pos[0] as number, 1.25, pos[2] as number]}>
                    <boxGeometry args={[0.1, 2.5, 0.1]} />
                    <meshStandardMaterial color="#cbd5e1" />
                </mesh>
            ))}
        </group>
    )
}

export function ContainerScene({ palletCount }: { palletCount: number }) {
    // Logic to stack pallets in a simplified grid (2 wide, 2 high)
    const pallets = useMemo(() => {
        const items = []
        const cols = 2
        const rows = 2
        // Length capacity is roughly 5 rows deep for this scale (2x2x5 = 20 max)

        for (let i = 0; i < palletCount; i++) {
            // Calculate grid position
            // Z fills first (depth), then X (width), then Y (height)

            const layerSize = cols * rows; // 4 per vertical slice? No, real containers load depth first usually.
            // Let's stack: Fill floor (2 wide) from back to front, then stack on top.

            // Let's do: 2 wide (x), N deep (z). Stack height 2 (y).
            // Capacity 20: 2 width * 5 depth * 2 height = 20.

            const floorIndex = Math.floor(i / 2) // Index in the 2D floor plane (ignoring height)
            const heightIndex = i % 2 // 0 = bottom, 1 = top

            const col = floorIndex % 2 // Left or Right
            const row = Math.floor(floorIndex / 2) // Depth index (0 to 4)

            // Coordinates
            // Width 2.4 => x spans from -1.2 to 1.2. Centers at roughly -0.6 and 0.6
            const x = col === 0 ? -0.6 : 0.6

            // Depth 6 => z spans -3 to 3. Start from back (-2.4) to front.
            // Pallet length 1.2. 
            // 5 rows: -2.4, -1.2, 0, 1.2, 2.4
            const z = -2.4 + (row * 1.2)

            // Height
            // Pallet height 1. 0.5 (half height) + y index
            // y=0 -> 0.5
            // y=1 -> 1.5
            const y = 0.5 + (heightIndex * 1.1) // 1.1 to leave a tiny gap

            items.push({ x, y, z })
        }
        return items
    }, [palletCount])

    return (
        <div className="h-[250px] sm:h-[400px] w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 relative shadow-2xl">
            <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                <span className="text-xs font-medium text-white">Live Capacity: {Math.round((palletCount / 20) * 100)}%</span>
            </div>

            <Canvas shadows dpr={[1, 2]}>
                <PerspectiveCamera makeDefault position={[4, 4, 6]} fov={50} />
                <OrbitControls
                    enablePan={false}
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI / 2}
                    autoRotate={true}
                    autoRotateSpeed={0.5}
                />

                <Environment preset="city" />
                <ambientLight intensity={0.5} />
                <directionalLight
                    position={[5, 10, 5]}
                    intensity={1}
                    castShadow
                    shadow-mapSize={[1024, 1024]}
                />

                <group position={[0, -1, 0]}>
                    <ContainerFrame />
                    {pallets.map((pos, i) => (
                        <Pallet key={i} position={[pos.x, pos.y, pos.z]} index={i} />
                    ))}
                    <ContactShadows resolution={1024} scale={20} blur={1} opacity={0.5} far={10} color="#0f172a" />
                </group>
            </Canvas>
        </div>
    )
}
