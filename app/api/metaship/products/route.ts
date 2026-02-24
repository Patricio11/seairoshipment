import { NextResponse } from "next/server";
import { metaShipGet } from "@/lib/metaship";

export async function GET() {
    try {
        // Fetch max 100 products (paginated response: { data: [...], total, start, end })
        const raw = await metaShipGet<Record<string, unknown>>("/public/v2/product", {
            limit: "100",
        });

        const items = Array.isArray(raw) ? raw : (Array.isArray(raw.data) ? raw.data : []);

        // Map to our MetaShipProduct shape
        const products = items.map((p: Record<string, unknown>) => ({
            id: p.id,
            name: (p.name || "Unknown") as string,
            hsCode: (p.code || "") as string,
            description: (p.type || "") as string,
        }));

        return NextResponse.json(products);
    } catch (error: unknown) {
        console.error("MetaShip products error:", error);
        const message =
            error instanceof Error ? error.message : "Failed to fetch products";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
