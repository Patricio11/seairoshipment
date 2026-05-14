"use client"

/**
 * Throwaway smoke-test page for Phase B of the CBM Cargo Type rollout.
 *
 * Lets me exercise <CBMCalculator> + <CBM3DViz> in isolation, before the
 * Tools section wiring (Phase C) and the booking integration (Phase D)
 * land. Delete after Phase C is fully shipped.
 *
 * Reachable at /dev/cbm — not linked anywhere in the app.
 */

import { useState } from "react"
import { CBMCalculator } from "@/components/cbm/cbm-calculator"
import { CBM3DViz } from "@/components/cbm/cbm-3d-viz"
import type { CargoItem } from "@/lib/db/schema/pallet-allocations"
import { Button } from "@/components/ui/button"
import { nanoid } from "nanoid"

const DEMO_ITEMS: CargoItem[] = [
    { id: `ci-${nanoid(8)}`, label: "Wine 12-bottle case", lengthMm: 350, widthMm: 300, heightMm: 230, weightKg: 16, quantity: 24 },
    { id: `ci-${nanoid(8)}`, label: "Citrus 15kg carton", lengthMm: 400, widthMm: 300, heightMm: 270, weightKg: 15, quantity: 36 },
    { id: `ci-${nanoid(8)}`, label: "Chocolate bulk box", lengthMm: 500, widthMm: 400, heightMm: 300, weightKg: 12, quantity: 12 },
]

export default function CBMSmokeTestPage() {
    const [items, setItems] = useState<CargoItem[]>([])

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white">CBM Calculator · smoke test</h1>
                        <p className="text-xs text-slate-500 mt-1">Throwaway page. Delete after Phase C is shipped.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setItems(DEMO_ITEMS)}>Load demo cargo</Button>
                        <Button variant="outline" onClick={() => setItems([])}>Reset</Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CBMCalculator value={items} onChange={setItems} />
                    <CBM3DViz items={items} containerVolumeCBM={67.7} />
                </div>
            </div>
        </div>
    )
}
