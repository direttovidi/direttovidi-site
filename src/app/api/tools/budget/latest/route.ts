// File: app/api/tools/budget/latest/route.ts

import { auth } from "@/app/auth";
import { db } from "@/lib/db";

export async function GET() {
    const session = await auth();
    if (!session?.user?.email) {
        return new Response("Unauthorized", { status: 401 });
    }

    const userResult = await db`
    SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult[0]?.id;

    const latest = await db`
    SELECT month, year
    FROM budgets
    WHERE user_id = ${userId}
    ORDER BY year DESC, month DESC
    LIMIT 1`;

    if (latest.length === 0) {
        return new Response("No budgets found", { status: 404 });
    }

    return Response.json(latest[0]);
}
