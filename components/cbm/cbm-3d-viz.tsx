"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from "@react-three/drei"
import { useMemo } from "react"
import * as THREE from "three"
import { cn } from "@/lib/utils"
import type { CargoItem } from "@/lib/db/schema/pallet-allocations"
import { itemCbm, totalCbm, fitInContainer } from "@/lib/cbm"

/**
 * 3D preview of how the cargo items would sit inside the chosen (or default
 * 40ft) reefer/dry container. Uses the same react-three-fiber + drei stack
 * as `components/booking/container-scene.tsx` so the aesthetic feels native.
 *
 * Item placement is a deliberately simple shelf-pack: items are sorted
 * largest-first and dropped along the floor row-by-row. This is not a real
 * 3D bin-packing simulation — that's the Phase 3 "Container Loading Planner"
 * future tool. For v1 the goal is a clear visual sense of occupancy, not
 * load-engineering accuracy.
 */

const DEFAULT_CONTAINER_DIMENSIONS_M = {
    // 40ft interior: ~12.03 m × 2.35 m × 2.39 m
    length: 12.0,
    width: 2.35,
    height: 2.39,
}

// Distinct colours per cargo-item type — the row's label seeds a hash so the
// same label gets the same colour across re-renders.
const PALETTE = [
    "#3b82f6", // blue
    "#10b981", // emerald
    "#f59e0b", // amber
    "#a855f7", // purple
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#f97316", // orange
    "#14b8a6", // teal
]

function colorForLabel(label: string, fallback: number): string {
    if (!label) return PALETTE[fallback % PALETTE.length]
    let hash = 0
    for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) | 0
    return PALETTE[Math.abs(hash) % PALETTE.length]
}

interface CBM3DVizProps {
    items: CargoItem[]
    /** Override container interior (m³). Defaults to 40ft. */
    containerVolumeCBM?: number | null
    /** Optional explicit interior dimensions in m (length, width, height). Overrides volumeCBM. */
    interior?: { length: number; width: number; height: number } | null
    className?: string
}

interface PlacedBox {
    x: number; y: number; z: number
    w: number; h: number; d: number
    color: string
    label: string
}

export function CBM3DViz({ items, containerVolumeCBM, interior, className }: CBM3DVizProps) {
    const dimensions = useMemo(() => {
        if (interior) return interior
        // If only volumeCBM is given, scale 40ft proportionally to keep aspect
        if (containerVolumeCBM && containerVolumeCBM > 0) {
            const defaultVol = DEFAULT_CONTAINER_DIMENSIONS_M.length *
                DEFAULT_CONTAINER_DIMENSIONS_M.width *
                DEFAULT_CONTAINER_DIMENSIONS_M.height
            const scale = Math.cbrt(containerVolumeCBM / defaultVol)
            return {
                length: DEFAULT_CONTAINER_DIMENSIONS_M.length * scale,
                width: DEFAULT_CONTAINER_DIMENSIONS_M.width * scale,
                height: DEFAULT_CONTAINER_DIMENSIONS_M.height * scale,
            }
        }
        return DEFAULT_CONTAINER_DIMENSIONS_M
    }, [interior, containerVolumeCBM])

    // Build cargo blocks. Each unit (after quantity expansion) becomes a block;
    // we cap visual blocks at 60 to keep the scene snappy, merging the rest
    // into a single "stacked remainder" cube of equivalent volume.
    const boxes = useMemo(() => buildBlocks(items, dimensions), [items, dimensions])

    const occupancyCbm = totalCbm(items)
    const containerCbm = dimensions.length * dimensions.width * dimensions.height
    const fit = fitInContainer(occupancyCbm, containerCbm)

    return (
        <div className={cn(
            "h-[280px] sm:h-[420px] w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 relative shadow-2xl",
            className
        )}>
            {/* Stats overlay */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 pointer-events-none">
                <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-brand-blue" />
                    <span className="text-[10px] sm:text-xs font-medium text-white">
                        Volume: {occupancyCbm.toFixed(2)} m³
                    </span>
                </div>
                <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                    <div className={cn(
                        "h-2 w-2 rounded-full",
                        !fit.fits ? "bg-red-500" : fit.percentFull > 85 ? "bg-amber-500" : "bg-emerald-500"
                    )} />
                    <span className="text-[10px] sm:text-xs font-medium text-white">
                        {fit.percentFull.toFixed(0)}% full · {dimensions.length.toFixed(1)} × {dimensions.width.toFixed(1)} × {dimensions.height.toFixed(1)} m
                    </span>
                </div>
            </div>

            <Canvas shadows dpr={[1, 2]}>
                <PerspectiveCamera makeDefault position={[dimensions.length * 0.9, dimensions.height * 2, dimensions.length * 0.9]} fov={40} />
                <OrbitControls
                    enablePan={false}
                    enableZoom={true}
                    minPolarAngle={Math.PI / 5}
                    maxPolarAngle={Math.PI / 2.1}
                    autoRotate
                    autoRotateSpeed={0.6}
                />

                <Environment preset="city" />
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 10, 5]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />

                <group position={[0, -dimensions.height / 2, 0]}>
                    <ContainerOutline {...dimensions} />
                    {boxes.map((b, i) => (
                        <mesh
                            key={i}
                            position={[b.x, b.y, b.z]}
                            castShadow
                            receiveShadow
                        >
                            <boxGeometry args={[b.w, b.h, b.d]} />
                            <meshStandardMaterial
                                color={b.color}
                                roughness={0.4}
                                metalness={0.05}
                                transparent
                                opacity={0.92}
                            />
                            <lineSegments>
                                <edgesGeometry args={[new THREE.BoxGeometry(b.w, b.h, b.d)]} />
                                <lineBasicMaterial color="white" transparent opacity={0.25} />
                            </lineSegments>
                        </mesh>
                    ))}
                </group>

                <ContactShadows
                    position={[0, -dimensions.height / 2 - 0.01, 0]}
                    opacity={0.35}
                    scale={dimensions.length * 1.5}
                    blur={2}
                    far={4}
                />
            </Canvas>
        </div>
    )
}

function ContainerOutline({ length, width, height }: { length: number; width: number; height: number }) {
    return (
        <group>
            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
                <planeGeometry args={[width, length]} />
                <meshStandardMaterial color="#334155" roughness={0.85} />
            </mesh>
            {/* Wireframe box */}
            <mesh position={[0, height / 2, 0]}>
                <boxGeometry args={[width, height, length]} />
                <meshStandardMaterial color="#94a3b8" wireframe transparent opacity={0.18} />
            </mesh>
            {/* Corner posts */}
            {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz], i) => (
                <mesh key={i} position={[(width / 2) * sx, height / 2, (length / 2) * sz]}>
                    <boxGeometry args={[0.06, height, 0.06]} />
                    <meshStandardMaterial color="#cbd5e1" />
                </mesh>
            ))}
        </group>
    )
}

/**
 * Pack cargo blocks into the container using a 3-axis shelf algorithm.
 * Priority matches how a forwarder actually loads a container:
 *
 *   1. Place across the **width** (X) — boxes go side-by-side first.
 *   2. When the width row fills, stack up in **height** (Y) — new layer
 *      on top. Layer height = tallest box in the row that just closed.
 *   3. When the column (the back-most XY slice) is full, advance forward
 *      in **length** (Z) — start a fresh column. Column depth = deepest
 *      box in the slice that just closed.
 *   4. When length runs out, stop placing. Totals overlay still reflects
 *      the full cargo volume, so the user gets honest numbers even if a
 *      few items don't render.
 *
 * Not a real 3D bin-packer — a proper one is the Phase-3 "Container
 * Loading Planner" tool. Goal here is "looks plausible at a glance" so
 * the user trusts the volume figure.
 */
function buildBlocks(items: CargoItem[], dim: { length: number; width: number; height: number }): PlacedBox[] {
    // Expand quantities into per-unit blocks, capping at 60 for scene perf
    const PERF_CAP = 60
    const expanded: Array<{ item: CargoItem; index: number }> = []
    for (let i = 0; i < items.length && expanded.length < PERF_CAP; i++) {
        const item = items[i]
        const qty = Math.min(item.quantity || 0, PERF_CAP - expanded.length)
        for (let q = 0; q < qty; q++) expanded.push({ item, index: i })
    }

    // Sort largest-volume-first for visually nicer packing
    expanded.sort((a, b) =>
        (b.item.lengthMm * b.item.widthMm * b.item.heightMm) -
        (a.item.lengthMm * a.item.widthMm * a.item.heightMm)
    )

    const placed: PlacedBox[] = []
    const gap = 0.02

    // 3-axis cursor. Container coordinates centred on origin:
    //   X spans [-W/2, +W/2] (width)   ← fastest axis
    //   Y spans [0, H]       (height, container floor at 0)
    //   Z spans [-L/2, +L/2] (length, back at -L/2)  ← slowest axis
    let cursorX = -dim.width / 2
    let cursorY = 0
    let cursorZ = -dim.length / 2

    let rowMaxHeight = 0    // tallest box in the current X-row → bumps Y when row closes
    let columnMaxDepth = 0  // deepest box in the current XY-slice → bumps Z when slice closes

    const eps = 0.001

    for (const { item, index } of expanded) {
        const w = Math.min(item.widthMm / 1000, dim.width)
        const h = Math.min(item.heightMm / 1000, dim.height)
        const d = Math.min(item.lengthMm / 1000, dim.length)

        // 1. Doesn't fit across width — stack up.
        if (cursorX + w > dim.width / 2 + eps) {
            cursorY += rowMaxHeight + gap
            cursorX = -dim.width / 2
            rowMaxHeight = 0
        }

        // 2. Doesn't fit in height — move forward.
        if (cursorY + h > dim.height + eps) {
            cursorZ += columnMaxDepth + gap
            cursorX = -dim.width / 2
            cursorY = 0
            rowMaxHeight = 0
            columnMaxDepth = 0
        }

        // 3. Doesn't fit in length — container full, stop.
        if (cursorZ + d > dim.length / 2 + eps) {
            break
        }

        placed.push({
            x: cursorX + w / 2,
            y: cursorY + h / 2,
            z: cursorZ + d / 2,
            w, h, d,
            color: colorForLabel(item.label || "", index),
            label: item.label || `Item ${index + 1}`,
        })

        cursorX += w + gap
        if (h > rowMaxHeight) rowMaxHeight = h
        if (d > columnMaxDepth) columnMaxDepth = d
    }

    return placed
}
