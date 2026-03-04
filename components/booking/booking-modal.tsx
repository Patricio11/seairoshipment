"use client"

import { useState } from "react"
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
import { Ship, X } from "lucide-react"

interface BookingModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function BookingModal({ open, onOpenChange }: BookingModalProps) {
    const [confirmClose, setConfirmClose] = useState(false)

    const handleCloseAttempt = () => {
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
                        <div className="h-10 w-10 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                            <Ship className="h-6 w-6 text-brand-blue" />
                        </div>
                        <div className="flex-1">
                            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                                New Shipment Booking
                            </DialogTitle>
                            <DialogDescription className="text-slate-500">
                                Complete the 3-step wizard to secure your freight space.
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
                        <BookingWizard onSuccess={() => onOpenChange(false)} />
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
