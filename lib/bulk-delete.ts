/**
 * Shared helper for admin bulk-delete endpoints. Loops the IDs serially,
 * calls the provided per-row delete function, and accumulates
 *   { deleted: string[], failed: Array<{ id, reason }> }
 *
 * Serial (not Promise.all) on purpose — most deletes touch shared parent
 * counters (container.totalPallets etc.) so racing them would corrupt
 * state. The volumes here are admin-driven cleanup, not high-throughput.
 */
export interface BulkDeleteResult {
    deleted: string[]
    failed: Array<{ id: string; reason: string }>
}

export async function runBulkDelete(
    ids: string[],
    deleteOne: (id: string) => Promise<{ ok: true } | { ok: false; reason: string }>,
): Promise<BulkDeleteResult> {
    const result: BulkDeleteResult = { deleted: [], failed: [] }
    for (const id of ids) {
        try {
            const r = await deleteOne(id)
            if (r.ok) result.deleted.push(id)
            else result.failed.push({ id, reason: r.reason })
        } catch (e) {
            result.failed.push({ id, reason: e instanceof Error ? e.message : "unknown error" })
        }
    }
    return result
}

/** Strict input parser — the body must contain `ids: string[]` with at least one entry. */
export function parseBulkIds(body: unknown): { ids: string[] } | { error: string } {
    if (!body || typeof body !== "object") return { error: "Body must be JSON" }
    const ids = (body as { ids?: unknown }).ids
    if (!Array.isArray(ids) || ids.length === 0) return { error: "ids[] is required" }
    if (!ids.every((x) => typeof x === "string")) return { error: "ids must be strings" }
    return { ids: ids as string[] }
}
