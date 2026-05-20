"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from "@react-three/drei"
import { useMemo } from "react"
import * as THREE from "three"
import { cn } from "@/lib/utils"
import type { CargoItem } from "@/lib/db/schema/pallet-allocations"
import { totalCbm, fitInContainer } from "@/lib/cbm"

/**
 * 3D preview of how the cargo items would sit inside the chosen (or default
 * 40ft) reefer/dry container. Uses the same react-three-fiber + drei stack
 * as `components/booking/container-scene.tsx` so the aesthetic feels native.
 *
 * Item placement is a deliberately simple shelf-pack: items are sorted
 * largest-first and dropped along the floor row-by-row. This is not a real
 * 3D bin-packing simulation - that's the Phase 3 "Container Loading Planner"
 * future tool. For v1 the goal is a clear visual sense of occupancy, not
 * load-engineering accuracy.
 */

const DEFAULT_CONTAINER_DIMENSIONS_M = {
    // 40ft interior: ~12.03 m × 2.35 m × 2.39 m
    length: 12.0,
    width: 2.35,
    height: 2.39,
}

// Distinct colours per cargo-item type - the row's label seeds a hash so the
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
 * Pack cargo blocks into the container. Each box's Y is computed from a
 * per-slice **heightmap** - i.e. the actual tops of whatever sits directly
 * beneath it. That kills the "floating" you'd get from a naive shelf-pack
 * that advances Y by the tallest box in the row.
 *
 * Priority matches how a forwarder loads a container:
 *
 *   1. Place across the **width** (X) - boxes go side-by-side first.
 *   2. When cursorX overflows the width, wrap to the left wall. The next
 *      box's bottom Y comes from what's actually below it, so it rests
 *      cleanly on its neighbours instead of floating at row-max height.
 *   3. When no Y position fits, advance forward in **length** (Z).
 *   4. When length runs out, stop. The totals overlay still reflects the
 *      full cargo volume, so the user gets honest numbers.
 *
 * Each box is **virtually rotated** before placement (smallest → width,
 * middle → height, largest → depth). Forwarders physically orient cargo
 * the same way; volume is preserved.
 *
 * Not a real 3D bin-packer - a proper one is the Phase-3 "Container
 * Loading Planner" tool. Goal here is "looks plausible at a glance".
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

    // Sort largest-volume-first so big anchors get placed against the floor
    expanded.sort((a, b) =>
        (b.item.lengthMm * b.item.widthMm * b.item.heightMm) -
        (a.item.lengthMm * a.item.widthMm * a.item.heightMm)
    )

    const placed: PlacedBox[] = []
    // 1 cm gap - visible but doesn't eat enough container width to push a
    // legitimately-fitting box into a stack.
    const gap = 0.01
    const eps = 0.001

    let cursorX = -dim.width / 2
    let cursorZ = -dim.length / 2
    let columnMaxDepth = 0

    /**
     * Highest Y already occupied within the rectangle (xLeft..xRight, zLeft..zRight).
     * Returns 0 if nothing is below - the new box sits on the floor.
     */
    function topOfStackUnder(xLeft: number, xRight: number, zLeft: number, zRight: number): number {
        let maxTop = 0
        for (const b of placed) {
            const bxLeft = b.x - b.w / 2
            const bxRight = b.x + b.w / 2
            // Strict overlap (touching edges don't count as overlap).
            if (bxRight <= xLeft + eps || bxLeft >= xRight - eps) continue
            const bzLeft = b.z - b.d / 2
            const bzRight = b.z + b.d / 2
            if (bzRight <= zLeft + eps || bzLeft >= zRight - eps) continue
            const top = b.y + b.h / 2
            if (top > maxTop) maxTop = top
        }
        return maxTop
    }

    for (const { item, index } of expanded) {
        const dimsMm = [item.lengthMm, item.widthMm, item.heightMm].sort((a, b) => a - b)
        const w = Math.min(dimsMm[0] / 1000, dim.width)
        const h = Math.min(dimsMm[1] / 1000, dim.height)
        const d = Math.min(dimsMm[2] / 1000, dim.length)

        // 1. Doesn't fit across width - wrap to the left wall. No Y bump
        //    here; the heightmap below picks the right floor.
        if (cursorX + w > dim.width / 2 + eps) {
            cursorX = -dim.width / 2
        }

        // 2. Y = top of whatever's directly under the new box's XZ footprint.
        let bottomY = topOfStackUnder(cursorX, cursorX + w, cursorZ, cursorZ + d)

        // 3. If that overflows the ceiling, advance to the next Z slice and
        //    retry against a fresh (empty) heightmap there.
        if (bottomY + h > dim.height + eps) {
            cursorZ += columnMaxDepth + gap
            cursorX = -dim.width / 2
            columnMaxDepth = 0
            if (cursorZ + d > dim.length / 2 + eps) break  // out of length
            bottomY = topOfStackUnder(cursorX, cursorX + w, cursorZ, cursorZ + d)
            if (bottomY + h > dim.height + eps) break  // single item too tall - give up
        }

        placed.push({
            x: cursorX + w / 2,
            y: bottomY + h / 2,
            z: cursorZ + d / 2,
            w, h, d,
            color: colorForLabel(item.label || "", index),
            label: item.label || `Item ${index + 1}`,
        })

        cursorX += w + gap
        if (d > columnMaxDepth) columnMaxDepth = d
    }

    return placed
}
