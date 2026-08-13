/**
 * Per-customer payment terms - client-safe labels + helpers. The enum values
 * live in lib/db/schema/users.ts; road invoice generation branches on them.
 */
export type PaymentTerms = "SPLIT_60_40" | "NET_30_STATEMENT" | "NET_7_DELIVERY";

export const PAYMENT_TERMS: Array<{ value: PaymentTerms; label: string; description: string }> = [
    { value: "SPLIT_60_40", label: "60/40 split on booking", description: "60% deposit payable on confirmation, 40% balance before departure" },
    { value: "NET_30_STATEMENT", label: "30 days from statement", description: "Single invoice for the full amount, due 30 days from statement" },
    { value: "NET_7_DELIVERY", label: "7 days from delivery", description: "Single invoice for the full amount, due 7 days after delivery" },
];

export function paymentTermsLabel(value: string | null | undefined): string {
    return PAYMENT_TERMS.find(t => t.value === value)?.label ?? "60/40 split on booking";
}
