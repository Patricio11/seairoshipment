"use client"

import { useState, useEffect } from "react"

type ModalListener = (state: boolean) => void
type RefreshListener = (key: number) => void
type PrefillListener = (prefill: BookingPrefill | null) => void

/**
 * Prefill data the modal can carry when opened from a deep-link (e.g. the
 * Smart-match panel in the CBM calculator). The wizard reads this on mount
 * and seeds its initial state.
 */
export interface BookingPrefill {
    cargoType?: "PALLET" | "CUBE"
    calculationId?: string
    containerId?: string
}

let isOpen = false
let refreshKey = 0
let currentPrefill: BookingPrefill | null = null
const modalListeners = new Set<ModalListener>()
const refreshListeners = new Set<RefreshListener>()
const prefillListeners = new Set<PrefillListener>()

export const bookingModalStore = {
    isOpen: () => isOpen,
    getRefreshKey: () => refreshKey,
    getPrefill: () => currentPrefill,
    subscribe: (listener: ModalListener) => {
        modalListeners.add(listener)
        return () => modalListeners.delete(listener)
    },
    subscribeRefresh: (listener: RefreshListener) => {
        refreshListeners.add(listener)
        return () => refreshListeners.delete(listener)
    },
    subscribePrefill: (listener: PrefillListener) => {
        prefillListeners.add(listener)
        return () => prefillListeners.delete(listener)
    },
    onOpen: () => {
        currentPrefill = null
        prefillListeners.forEach((l) => l(null))
        isOpen = true
        modalListeners.forEach((l) => l(isOpen))
    },
    /**
     * Open the booking wizard with prefill data - used by the Smart-match
     * panel deep-link to drop the user straight into a Cube booking with
     * a calculation + container already chosen.
     */
    onOpenWithPrefill: (prefill: BookingPrefill) => {
        currentPrefill = prefill
        prefillListeners.forEach((l) => l(prefill))
        isOpen = true
        modalListeners.forEach((l) => l(isOpen))
    },
    onClose: () => {
        currentPrefill = null
        prefillListeners.forEach((l) => l(null))
        isOpen = false
        modalListeners.forEach((l) => l(isOpen))
    },
    triggerRefresh: () => {
        refreshKey++
        refreshListeners.forEach((l) => l(refreshKey))
    },
}

export function useBookingModal() {
    const [open, setOpen] = useState(bookingModalStore.isOpen())
    const [rKey, setRKey] = useState(bookingModalStore.getRefreshKey())
    const [prefill, setPrefill] = useState<BookingPrefill | null>(bookingModalStore.getPrefill())

    useEffect(() => {
        const unsub1 = bookingModalStore.subscribe(setOpen)
        const unsub2 = bookingModalStore.subscribeRefresh(setRKey)
        const unsub3 = bookingModalStore.subscribePrefill(setPrefill)
        return () => {
            unsub1()
            unsub2()
            unsub3()
        }
    }, [])

    return {
        isOpen: open,
        onOpen: bookingModalStore.onOpen,
        onOpenWithPrefill: bookingModalStore.onOpenWithPrefill,
        onClose: bookingModalStore.onClose,
        refreshKey: rKey,
        triggerRefresh: bookingModalStore.triggerRefresh,
        prefill,
    }
}
