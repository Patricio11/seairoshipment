import { BookingWizard } from "@/components/booking/booking-wizard"

export default function BookingPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    New Booking
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Create a new LCL shipment in 3 simple steps.
                </p>
            </div>

            <BookingWizard />
        </div>
    )
}
