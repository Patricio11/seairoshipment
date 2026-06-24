import * as React from "react"

import { Input } from "@/components/ui/input"

interface NumericInputProps extends Omit<React.ComponentProps<"input">, "type" | "onChange" | "value"> {
    /**
     * Current value. Accepts string OR number for convenience — internally
     * always stored as a string so the user can type partial decimals like
     * "12." without React fighting them.
     */
    value: string | number
    /**
     * onChange receives the raw string value (matching the shape `<input>`
     * would have produced), so existing callers using
     * `parseFloat(e.target.value)` keep working unchanged.
     */
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    /** Allow negative numbers. Defaults to false (rates are always positive). */
    allowNegative?: boolean
}

/**
 * Drop-in replacement for `<Input type="number" />` that:
 *  - Renders as `type="text"` with `inputMode="decimal"` so mobile keyboards
 *    show the numeric pad without the spinner arrows desktop browsers add to
 *    type="number".
 *  - Filters input to digits + at most one decimal point (and optional
 *    leading minus if allowNegative is on). Other characters are silently
 *    dropped — the user can't type letters.
 *  - Passes the filtered string straight to onChange via a synthetic event,
 *    so existing `parseFloat(e.target.value)` callers don't need any change.
 *
 * Why not type="number"? Two reasons we kept hitting:
 *  1. The spinner arrows look ugly in dark-themed cells and are easy to
 *     hit by mistake.
 *  2. type="number" inputs reject characters silently which makes "12,5"
 *     pastes look like nothing happened. With type="text" we can show the
 *     raw value, sanitise on change, and the user sees the result.
 */
export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
    function NumericInput({ value, onChange, allowNegative = false, ...props }, ref) {
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value
            // Allowed: optional leading -, digits, optional one decimal point.
            // Strip everything else.
            let cleaned = raw.replace(allowNegative ? /[^0-9.\-]/g : /[^0-9.]/g, "")
            // Only one decimal point total — keep the first, drop the rest.
            const firstDot = cleaned.indexOf(".")
            if (firstDot !== -1) {
                cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "")
            }
            // Only a leading minus is meaningful — strip any others.
            if (allowNegative) {
                cleaned = (cleaned.startsWith("-") ? "-" : "") + cleaned.replace(/-/g, "")
            }
            // Mutate the event's target so existing parseFloat(e.target.value) calls see the cleaned value.
            e.target.value = cleaned
            onChange(e)
        }

        return (
            <Input
                ref={ref}
                type="text"
                inputMode="decimal"
                value={value ?? ""}
                onChange={handleChange}
                {...props}
            />
        )
    },
)
