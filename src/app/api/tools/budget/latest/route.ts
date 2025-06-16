// File: app/api/tools/budget/latest/route.ts

import { auth } from "@/app/auth";
import { db } from "@/lib/db";

export async function GET() {
    const session = await auth();
    if (!session?.user?.email) {
        return new Response("Unauthorized", { status: 401 });
    }

    const [{ id: userId }] = await db`
    SELECT id FROM users WHERE email = ${session.user.email}`;

    const [latest] = await db`
    SELECT name
    FROM budgets
    WHERE user_id = ${userId}
    ORDER BY modified_at DESC NULLS LAST, created_at DESC
    LIMIT 1`;

    if (!latest) {
        return new Response("No budgets found", { status: 404 });
    }

    return Response.json({ name: latest.name });
}
