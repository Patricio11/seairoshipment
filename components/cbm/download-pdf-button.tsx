"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
    totalCbm,
    totalWeight,
    volumetricWeightSea,
    palletEquivalent,
    fitInStandardContainers,
    formatCbm,
    formatKg,
    sustainabilityScore,
} from "@/lib/cbm"
import type { CargoItem } from "@/lib/db/schema/pallet-allocations"

interface DownloadPdfButtonProps {
    calculationName: string
    items: CargoItem[]
}

/**
 * Generates a PDF of the saved calculation client-side. jsPDF is already in
 * the project; we dynamic-import it on click so its ~80 KB chunk stays out
 * of the main bundle.
 *
 * The PDF intentionally skips the 3D viz screenshot - html2canvas can't
 * capture WebGL reliably across browsers without preserveDrawingBuffer
 * surgery, and a text-first PDF is what consignees actually pass to
 * customs / brokers. A 3D screenshot can be added later as a polish item.
 */
export function DownloadPdfButton({ calculationName, items }: DownloadPdfButtonProps) {
    const [busy, setBusy] = useState(false)

    const handleDownload = async () => {
        const meaningful = items.filter(it =>
            it.lengthMm > 0 && it.widthMm > 0 && it.heightMm > 0 && it.quantity > 0
        )
        if (meaningful.length === 0) {
            toast.error("Add cargo items first")
            return
        }

        setBusy(true)
        try {
            // Dynamic import - keeps the ~80 KB jspdf chunk out of the main bundle
            const { jsPDF } = await import("jspdf")
            const doc = new jsPDF({ unit: "mm", format: "a4" })

            const cbm = totalCbm(meaningful)
            const weight = totalWeight(meaningful)
            const volumetric = volumetricWeightSea(cbm)
            const pallets = palletEquivalent(cbm)
            const fits = fitInStandardContainers(cbm)
            const sustainability = sustainabilityScore(weight, cbm)

            const left = 18
            const right = 192
            let y = 22

            // Header
            doc.setFont("helvetica", "bold")
            doc.setFontSize(18)
            doc.text(calculationName || "CBM Calculation", left, y)
            y += 7
            doc.setFont("helvetica", "normal")
            doc.setFontSize(9)
            doc.setTextColor(120)
            doc.text(`Generated ${new Date().toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`, left, y)
            doc.text("Seairo Cargo · Shared Reefer Services", right, y, { align: "right" })
            y += 8

            // Totals strip
            doc.setDrawColor(220)
            doc.setFillColor(245, 247, 252)
            doc.roundedRect(left, y, right - left, 18, 2, 2, "F")
            doc.setFont("helvetica", "bold")
            doc.setFontSize(11)
            doc.setTextColor(30)
            doc.text("Total volume", left + 3, y + 6)
            doc.text("Total weight", left + 50, y + 6)
            doc.text("Volumetric (sea)", left + 97, y + 6)
            doc.text("Pallet equivalent", left + 145, y + 6)
            doc.setFont("helvetica", "bold")
            doc.setFontSize(13)
            doc.setTextColor(40, 70, 220)
            doc.text(formatCbm(cbm), left + 3, y + 14)
            doc.setTextColor(40)
            doc.text(formatKg(weight), left + 50, y + 14)
            doc.text(formatKg(volumetric), left + 97, y + 14)
            // jsPDF's default Helvetica is WinAnsi-encoded - it can't render
            // characters outside that set (≈, subscripts, emojis, etc.) and
            // they come out as garbage. Stick to ASCII fallbacks: ~ for ≈,
            // CO2 for CO₂.
            doc.text(`~ ${pallets.toFixed(1)}`, left + 145, y + 14)
            y += 24

            // Sustainability line
            doc.setFont("helvetica", "italic")
            doc.setFontSize(9)
            doc.setTextColor(80, 140, 80)
            doc.text(
                `Estimated ~${sustainability.kgCO2eqSea.toFixed(0)} kg CO2eq via ocean SCS - about ${sustainability.percentLessThanAir.toFixed(0)}% less than air for this volume.`,
                left, y,
            )
            y += 6
            doc.setFont("helvetica", "normal")
            doc.setTextColor(40)

            // Items table
            doc.setFontSize(11)
            doc.setFont("helvetica", "bold")
            doc.text("Cargo items", left, y)
            y += 4
            doc.setDrawColor(220)
            doc.line(left, y, right, y)
            y += 5
            doc.setFontSize(9)
            doc.setFont("helvetica", "bold")
            doc.setTextColor(110)
            doc.text("Label", left, y)
            doc.text("L (mm)", left + 70, y, { align: "right" })
            doc.text("W (mm)", left + 90, y, { align: "right" })
            doc.text("H (mm)", left + 110, y, { align: "right" })
            doc.text("Wt (kg)", left + 135, y, { align: "right" })
            doc.text("Qty", left + 155, y, { align: "right" })
            doc.text("Volume", right, y, { align: "right" })
            y += 4
            doc.setFont("helvetica", "normal")
            doc.setTextColor(40)

            for (const item of meaningful) {
                if (y > 270) {
                    doc.addPage()
                    y = 22
                }
                const itemVol = (item.lengthMm * item.widthMm * item.heightMm * item.quantity) / 1_000_000_000
                doc.text((item.label || "-").slice(0, 38), left, y)
                doc.text(String(item.lengthMm), left + 70, y, { align: "right" })
                doc.text(String(item.widthMm), left + 90, y, { align: "right" })
                doc.text(String(item.heightMm), left + 110, y, { align: "right" })
                doc.text(item.weightKg ? item.weightKg.toFixed(1) : "-", left + 135, y, { align: "right" })
                doc.text(String(item.quantity), left + 155, y, { align: "right" })
                doc.text(`${itemVol.toFixed(3)} m³`, right, y, { align: "right" })
                y += 5
            }

            y += 4

            // Container fit table
            if (y > 240) { doc.addPage(); y = 22 }
            doc.setFontSize(11)
            doc.setFont("helvetica", "bold")
            doc.text("Container fit", left, y)
            y += 4
            doc.line(left, y, right, y)
            y += 5
            doc.setFontSize(9)
            doc.setFont("helvetica", "bold")
            doc.setTextColor(110)
            doc.text("Container", left, y)
            doc.text("Capacity", left + 80, y, { align: "right" })
            doc.text("% full", left + 120, y, { align: "right" })
            doc.text("Remaining", right, y, { align: "right" })
            y += 4
            doc.setFont("helvetica", "normal")
            doc.setTextColor(40)

            for (const { container, volumeCbm, fit } of fits) {
                const label = container === "40ftHC" ? "40ft High Cube" : container
                doc.text(label, left, y)
                doc.text(`${volumeCbm.toFixed(1)} m³`, left + 80, y, { align: "right" })
                doc.text(`${fit.percentFull.toFixed(0)}%`, left + 120, y, { align: "right" })
                doc.text(
                    fit.fits ? `${fit.remainingCbm.toFixed(2)} m³ spare` : `${Math.abs(fit.remainingCbm).toFixed(2)} m³ over`,
                    right, y, { align: "right" },
                )
                y += 5
            }

            // Footer
            const pageHeight = doc.internal.pageSize.getHeight()
            doc.setFontSize(8)
            doc.setTextColor(140)
            doc.setFont("helvetica", "italic")
            doc.text(
                "Generated by Seairo Cargo. Quotes and capacity are estimates - final confirmation provided by sales at booking.",
                left, pageHeight - 10,
            )

            const safeName = (calculationName || "calculation")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .slice(0, 40)
            doc.save(`${safeName || "cbm-calculation"}.pdf`)
            toast.success("PDF downloaded")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't generate PDF")
        } finally {
            setBusy(false)
        }
    }

    return (
        <Button
            variant="outline"
            onClick={handleDownload}
            disabled={busy}
            className="border-slate-200 dark:border-slate-800"
        >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download PDF
        </Button>
    )
}
