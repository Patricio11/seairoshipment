"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { BookingWizard } from "./booking-wizard"
import { RoadBookingWizard } from "./road-booking-wizard"
import { Ship, Truck, X, ArrowRight } from "lucide-react"
import type { BookingPrefill } from "@/hooks/use-booking-modal"

interface BookingModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    prefill?: BookingPrefill | null
}

type Mode = "CHOICE" | "SEA" | "ROAD"

export function BookingModal({ open, onOpenChange, prefill }: BookingModalProps) {
    const [confirmClose, setConfirmClose] = useState(false)
    const [mode, setMode] = useState<Mode>("CHOICE")

    // A prefill (e.g. "book this container" deep links) is always a sea
    // booking - skip the choice screen. Otherwise start fresh at the choice.
    useEffect(() => {
        if (open) setMode(prefill ? "SEA" : "CHOICE")
    }, [open, prefill])

    const handleCloseAttempt = () => {
        // Nothing typed yet on the choice screen - close silently.
        if (mode === "CHOICE") {
            onOpenChange(false)
            return
        }
        setConfirmClose(true)
    }

    const handleConfirmClose = () => {
        setConfirmClose(false)
        onOpenChange(false)
    }

    return (
        <>
            <Dialog open={open} onOpenChange={() => {}}>
                <DialogContent
                    className="max-w-4xl p-0 overflow-hidden border-none bg-slate-50 dark:bg-slate-950 sm:max-w-[90vw] lg:max-w-4xl max-h-[90vh] flex flex-col"
                    onInteractOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => {
                        e.preventDefault()
                        handleCloseAttempt()
                    }}
                    showCloseButton={false}
                >
                    <DialogHeader className="p-6 pb-0 flex flex-row items-center gap-4 space-y-0">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${mode === "ROAD" ? "bg-emerald-500/10" : "bg-brand-blue/10"}`}>
                            {mode === "ROAD"
                                ? <Truck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                : <Ship className="h-6 w-6 text-brand-blue" />}
                        </div>
                        <div className="flex-1">
                            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                                {mode === "ROAD" ? "Refrigerated Road Freight Booking"
                                    : mode === "SEA" ? "New Shipment Booking"
                                    : "New Booking"}
                            </DialogTitle>
                            <DialogDescription className="text-slate-500">
                                {mode === "ROAD" ? "Book pallet space on a refrigerated truck - from 1 pallet."
                                    : mode === "SEA" ? "Complete the 3-step wizard to secure your freight space."
                                    : "Choose how your cargo travels."}
                            </DialogDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full opacity-70 hover:opacity-100"
                            onClick={handleCloseAttempt}
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                        {mode === "CHOICE" && (
                            <div className="grid sm:grid-cols-2 gap-4 py-6">
                                <button
                                    type="button"
                                    onClick={() => setMode("SEA")}
                                    className="group rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-left transition-all hover:border-brand-blue hover:shadow-xl hover:shadow-brand-blue/10"
                                >
                                    <div className="h-14 w-14 rounded-2xl bg-brand-blue/10 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                        <Ship className="h-7 w-7 text-brand-blue" />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Sea Freight</h3>
                                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                                        Shared Reefer &amp; Shared Container consolidations - international export by ocean.
                                    </p>
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-blue mt-4">
                                        Start sea booking <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setMode("ROAD")}
                                    className="group rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-left transition-all hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10"
                                >
                                    <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                        <Truck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Road Freight</h3>
                                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                                        Refrigerated road consolidations between Cape Town, Johannesburg &amp; Durban - from 1 pallet.
                                    </p>
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-4">
                                        Start road booking <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                                    </span>
                                </button>
                            </div>
                        )}

                        {mode === "SEA" && (
                            <BookingWizard onSuccess={() => onOpenChange(false)} prefill={prefill} />
                        )}

                        {mode === "ROAD" && (
                            <RoadBookingWizard onSuccess={() => onOpenChange(false)} />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Close booking?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to close? Your booking progress will be lost.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmClose}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Close Booking
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
