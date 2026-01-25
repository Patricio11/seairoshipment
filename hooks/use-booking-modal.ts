"use client"

import { create } from "zustand"

interface BookingModalStore {
    isOpen: boolean
    onOpen: () => void
    onClose: () => void
}

// Since zustand is not in package.json, I will use a simple custom implementation
// Or I can just use a React Context. Let's use a simple listener pattern for a global store.

type Listener = (state: boolean) => void
let isOpen = false
const listeners = new Set<Listener>()

export const bookingModalStore = {
    isOpen: () => isOpen,
    subscribe: (listener: Listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
    },
    onOpen: () => {
        isOpen = true
        listeners.forEach((l) => l(isOpen))
    },
    onClose: () => {
        isOpen = false
        listeners.forEach((l) => l(isOpen))
    },
}

import { useState, useEffect } from "react"

export function useBookingModal() {
    const [open, setOpen] = useState(bookingModalStore.isOpen())

    useEffect(() => {
        const unsubscribe = bookingModalStore.subscribe(setOpen)
        return () => {
            unsubscribe()
        }
    }, [])

    return {
        isOpen: open,
        onOpen: bookingModalStore.onOpen,
        onClose: bookingModalStore.onClose,
    }
}
