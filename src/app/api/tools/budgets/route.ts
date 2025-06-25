// /app/api/tools/budgets/route.ts
import { auth } from "@/app/auth";
import { db } from "@/lib/db";

export async function GET() {
	const session = await auth();
	if (!session?.user?.email) {
		return new Response("Unauthorized", { status: 401 });
	}

	const [{ id: userId }] = await db`
    SELECT id FROM users WHERE email = ${session.user.email}`;

	const budgets = await db`
		SELECT 
		b.id,
		b.name,
		b.created_at,
		b.modified_at,
		b.is_retired,
		b.assets_equities,
		b.assets_bonds,
		b.assets_cash,
		SUM(CASE WHEN bi.type = 'Income' THEN bi.yearly_amount ELSE 0 END) AS income,
		SUM(CASE WHEN bi.type != 'Income' THEN bi.yearly_amount ELSE 0 END) AS expenses,
		SUM(CASE WHEN bi.type = 'Need' THEN bi.yearly_amount ELSE 0 END) AS needs,
		SUM(CASE WHEN bi.type = 'Want' THEN bi.yearly_amount ELSE 0 END) AS wants
		FROM budgets b
		LEFT JOIN budget_items bi ON bi.budget_id = b.id
		WHERE b.user_id = ${userId}
		GROUP BY b.id
		ORDER BY b.modified_at DESC NULLS LAST, b.created_at DESC
		`;

	return new Response(
		JSON.stringify({
			budgets: budgets.map((b) => ({
				id: b.id,
				name: b.name,
				createdAt: b.created_at,
				modifiedAt: b.modified_at,
				income: Number(b.income),
				expenses: Number(b.expenses),
				needs: Number(b.needs),
				wants: Number(b.wants),
				isRetired: b.is_retired,
				assetsEquities: b.assets_equities !== null ? Number(b.assets_equities) : null,
				assetsBonds: b.assets_bonds !== null ? Number(b.assets_bonds) : null,
				assetsCash: b.assets_cash !== null ? Number(b.assets_cash) : null,
			})),
		}),
		{ headers: { "Content-Type": "application/json" } }
	);
}
