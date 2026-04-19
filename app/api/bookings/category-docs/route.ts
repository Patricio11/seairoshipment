import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { productCategories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Returns the required-documents list for a category.
 * Used by step-3-docs on the client to render the upload checklist.
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const categoryId = request.nextUrl.searchParams.get("categoryId");
        if (!categoryId) {
            return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
        }

        const [cat] = await db
            .select({
                id: productCategories.id,
                name: productCategories.name,
                requiredDocuments: productCategories.requiredDocuments,
            })
            .from(productCategories)
            .where(eq(productCategories.id, categoryId))
            .limit(1);

        if (!cat) {
            return NextResponse.json({ requiredDocuments: [] });
        }

        return NextResponse.json({
            categoryName: cat.name,
            requiredDocuments: (cat.requiredDocuments as string[]) || [],
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch category docs";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
