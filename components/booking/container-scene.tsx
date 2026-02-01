"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from "@react-three/drei"
import { useRef, useMemo } from "react"
import * as THREE from "three"
import { cn } from "@/lib/utils"

// Pallet Block Component - Square, full-height realistic pallet
function Pallet({ position, index, type }: { position: [number, number, number], index: number, type: 'pre-filled' | 'user-added' }) {
    const meshRef = useRef<THREE.Mesh>(null!)

    // Color logic: Pre-filled is grey/slate, User-added is brand-blue
    const color = type === 'pre-filled'
        ? new THREE.Color("#64748b") // Slate 500
        : new THREE.Color("#3b82f6") // Blue 500 (Brand Blue)

    return (
        <mesh ref={meshRef} position={position} castShadow receiveShadow>
            {/* Square pallet: width=1.0, height=2.3 (full height), depth=1.0 (square) */}
            <boxGeometry args={[1.0, 2.3, 1.0]} />
            <meshStandardMaterial
                color={color}
                roughness={0.2}
                metalness={0.1}
                transparent
                opacity={type === 'pre-filled' ? 0.4 : 0.9}
            />
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(1.0, 2.3, 1.0)]} />
                <lineBasicMaterial color="white" transparent opacity={0.3} />
            </lineSegments>
        </mesh>
    )
}

// The Container Frame (Wireframe representation)
function ContainerFrame({ type }: { type: '20FT' | '40FT' }) {
    // 20FT is half the length (3m vs 6m visual representation)
    const length = type === '20FT' ? 3 : 6
    const zOffset = type === '20FT' ? 0 : 0 // Center it

    return (
        <group>
            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
                <planeGeometry args={[2.5, length]} />
                <meshStandardMaterial color="#334155" roughness={0.8} />
            </mesh>

            {/* Wireframe Box indicating boundaries */}
            <mesh position={[0, 1.25, 0]}>
                <boxGeometry args={[2.4, 2.5, length]} />
                <meshStandardMaterial color="#94a3b8" wireframe transparent opacity={0.2} />
            </mesh>

            {/* Frame posts */}
            {[[-1.2, 2.5, length / 2], [1.2, 2.5, length / 2], [-1.2, 2.5, -length / 2], [1.2, 2.5, -length / 2]].map((pos, i) => (
                <mesh key={i} position={[pos[0] as number, 1.25, pos[2] as number]}>
                    <boxGeometry args={[0.1, 2.5, 0.1]} />
                    <meshStandardMaterial color="#cbd5e1" />
                </mesh>
            ))}
        </group>
    )
}

export function ContainerScene({
    preFilledCount = 0,
    userAddedCount = 0,
    type = '40FT',
    className
}: {
    preFilledCount?: number,
    userAddedCount?: number,
    type?: '20FT' | '40FT',
    className?: string
}) {
    const totalCount = preFilledCount + userAddedCount
    const maxCapacity = type === '20FT' ? 10 : 20
    const length = type === '20FT' ? 3 : 6

    // Camera preset zoom
    const cameraPos: [number, number, number] = type === '20FT' ? [4, 3, 5] : [5, 4, 7]

    const pallets = useMemo(() => {
        const items = []

        // Two-column layout: 10 pallets on the left, 10 pallets on the right
        for (let i = 0; i < totalCount; i++) {
            // Determine which column (left or right)
            const columnIndex = Math.floor(i / 10) // 0 = left column, 1 = right column
            const rowInColumn = i % 10 // Position within the column (0-9)

            // X position: -0.55 for left column, +0.55 for right column
            const x = columnIndex === 0 ? -0.55 : 0.55

            // Y position: centered height (half of 2.3 height + padding)
            const y = 1.2

            // Z position: front to back spacing (0.6 units apart)
            // Start from front (-length/2 + padding)
            const startZ = -(length / 2) + 0.5
            const z = startZ + (rowInColumn * 0.6)

            items.push({
                x, y, z,
                type: i < preFilledCount ? 'pre-filled' : 'user-added' as 'pre-filled' | 'user-added'
            })
        }
        return items
    }, [preFilledCount, totalCount, length])

    return (
        <div className={cn("h-[250px] sm:h-[400px] w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 relative shadow-2xl transition-all duration-500", className)}>
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
                <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-slate-500" />
                    <span className="text-[10px] sm:text-xs font-medium text-white">Occupied: {preFilledCount}</span>
                </div>
                {userAddedCount > 0 && (
                    <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-[10px] sm:text-xs font-medium text-white">Your Cargo: {userAddedCount}</span>
                    </div>
                )}
            </div>

            <Canvas shadows dpr={[1, 2]}>
                <PerspectiveCamera makeDefault position={cameraPos} fov={40} />
                <OrbitControls
                    enablePan={false}
                    enableZoom={false}
                    minPolarAngle={Math.PI / 4}
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
                    <ContainerFrame type={type} />
                    {pallets.map((pos, i) => (
                        <Pallet
                            key={i}
                            position={[pos.x, pos.y, pos.z]}
                            index={i}
                            type={pos.type}
                        />
                    ))}
                    <ContactShadows resolution={1024} scale={20} blur={1} opacity={0.5} far={10} color="#0f172a" />
                </group>
            </Canvas>
        </div>
    )
}
