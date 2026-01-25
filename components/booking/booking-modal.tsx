"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { BookingWizard } from "./booking-wizard"
import { Ship } from "lucide-react"

interface BookingModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function BookingModal({ open, onOpenChange }: BookingModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden border-none bg-slate-50 dark:bg-slate-950 sm:max-w-[90vw] lg:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader className="p-6 pb-0 flex flex-row items-center gap-4 space-y-0">
                    <div className="h-10 w-10 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                        <Ship className="h-6 w-6 text-brand-blue" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                            New Shipment Booking
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">
                            Complete the 3-step wizard to secure your freight space.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                    <BookingWizard onSuccess={() => onOpenChange(false)} />
                </div>
            </DialogContent>
        </Dialog>
    )
}
