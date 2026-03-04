"use client"

type ModalListener = (state: boolean) => void
type RefreshListener = (key: number) => void

let isOpen = false
let refreshKey = 0
const modalListeners = new Set<ModalListener>()
const refreshListeners = new Set<RefreshListener>()

export const bookingModalStore = {
    isOpen: () => isOpen,
    getRefreshKey: () => refreshKey,
    subscribe: (listener: ModalListener) => {
        modalListeners.add(listener)
        return () => modalListeners.delete(listener)
    },
    subscribeRefresh: (listener: RefreshListener) => {
        refreshListeners.add(listener)
        return () => refreshListeners.delete(listener)
    },
    onOpen: () => {
        isOpen = true
        modalListeners.forEach((l) => l(isOpen))
    },
    onClose: () => {
        isOpen = false
        modalListeners.forEach((l) => l(isOpen))
    },
    triggerRefresh: () => {
        refreshKey++
        refreshListeners.forEach((l) => l(refreshKey))
    },
}

import { useState, useEffect } from "react"

export function useBookingModal() {
    const [open, setOpen] = useState(bookingModalStore.isOpen())
    const [rKey, setRKey] = useState(bookingModalStore.getRefreshKey())

    useEffect(() => {
        const unsub1 = bookingModalStore.subscribe(setOpen)
        const unsub2 = bookingModalStore.subscribeRefresh(setRKey)
        return () => {
            unsub1()
            unsub2()
        }
    }, [])

    return {
        isOpen: open,
        onOpen: bookingModalStore.onOpen,
        onClose: bookingModalStore.onClose,
        refreshKey: rKey,
        triggerRefresh: bookingModalStore.triggerRefresh,
    }
}
