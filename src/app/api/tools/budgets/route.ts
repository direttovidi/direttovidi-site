// /app/api/tools/budgets/route.ts
import { auth } from "@/app/auth";
import { db } from "@/lib/db";

export async function GET() {
	const session = await auth();
	if (!session?.user?.email) {
		return new Response("Unauthorized", { status: 401 });
	}

	const [{ id: userId }] = await db`
    SELECT id FROM users WHERE email = ${session.user.email}
  `;

	// /api/tools/budgets/route.ts (or wherever your budgets GET handler is)
	const budgets = await db`
		SELECT 
			b.id,
			b.month,
			b.year,
			SUM(CASE WHEN bi.category = 'Net Income' THEN bi.amount ELSE 0 END) AS income,
			SUM(CASE WHEN bi.category != 'Net Income' THEN bi.amount ELSE 0 END) AS expenses
		FROM budgets b
		JOIN budget_items bi ON bi.budget_id = b.id
		WHERE b.user_id = ${userId}
		GROUP BY b.id, b.month, b.year
		ORDER BY b.year DESC, b.month DESC`;

	return new Response(
		JSON.stringify({ budgets }),
		{ headers: { "Content-Type": "application/json" } }
	);
}
