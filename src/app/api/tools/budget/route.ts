import { auth } from "@/app/auth";
import { db } from "@/lib/db";

// DELETE
export async function DELETE(req: Request) {
	const session = await auth();
	if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

	const { name, category } = await req.json();
	if (!name) return new Response("Missing budget name", { status: 400 });

	const [{ id: userId }] = await db`
		SELECT id FROM users WHERE email = ${session.user.email}`;

	const [budget] = await db`
		SELECT id FROM budgets WHERE user_id = ${userId} AND name = ${name}`;
	if (!budget) return new Response("Budget not found", { status: 404 });

	if (category) {
		await db`
			DELETE FROM budget_items WHERE budget_id = ${budget.id} AND category = ${category}`;
		return new Response("Deleted item", { status: 200 });
	}

	await db`DELETE FROM budget_items WHERE budget_id = ${budget.id}`;
	await db`DELETE FROM budgets WHERE id = ${budget.id}`;

	return new Response("Deleted budget", { status: 200 });
}

// GET
export async function GET(req: Request) {
	const session = await auth();
	if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

	const url = new URL(req.url);
	const name = url.searchParams.get("name");
	if (!name) return new Response("Missing budget name", { status: 400 });

	const [{ id: userId }] = await db`
		SELECT id FROM users WHERE email = ${session.user.email}`;

	const [budget] = await db`
		SELECT id, is_retired, total_assets FROM budgets
		WHERE user_id = ${userId} AND name = ${name}`;

	if (!budget) {
		return new Response(JSON.stringify({ budget: null, items: [] }), {
			headers: { "Content-Type": "application/json" },
			status: 200,
		});
	}

	const dbItems = await db`
		SELECT category, monthly_amount, yearly_amount, type
		FROM budget_items
		WHERE budget_id = ${budget.id}
		ORDER BY sort_order`;

	const items = dbItems.map((item: any) => ({
		category: item.category,
		monthlyAmount: item.monthly_amount?.toString() || "",
		yearlyAmount: item.yearly_amount?.toString() || "",
		type: item.type,
	}));

	return new Response(JSON.stringify({ budget: { id: budget.id }, items }), {
		headers: { "Content-Type": "application/json" },
		status: 200,
	});
}

// POST
export async function POST(req: Request) {
	const session = await auth();
	if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

	const { name, items, isRetired, totalAssets } = await req.json();
	if (!name || typeof name !== "string") return new Response("Missing or invalid name", { status: 400 });

	const [{ id: userId }] = await db`
		SELECT id FROM users WHERE email = ${session.user.email}`;

	const [existingBudget] = await db`
		SELECT id FROM budgets WHERE user_id = ${userId} AND name = ${name}`;

	if (existingBudget && (isRetired !== undefined || totalAssets !== undefined)) {
		await db`
		UPDATE budgets
		SET
		is_retired = ${isRetired},
		total_assets = ${totalAssets}
		WHERE id = ${existingBudget.id}`;
	}

	const budgetId = existingBudget
		? existingBudget.id
		: (
			await db`
				INSERT INTO budgets (user_id, name, is_retired, total_assets)
				VALUES (${userId}, ${name}, ${isRetired}, ${totalAssets})
				RETURNING id`
		)[0].id;

	const existingItems = await db`
		SELECT category, monthly_amount, yearly_amount, type FROM budget_items WHERE budget_id = ${budgetId}`;

	const existingMap = new Map(
		existingItems.map((item: any) => [
			item.category,
			{
				monthly: parseFloat(item.monthly_amount),
				yearly: parseFloat(item.yearly_amount),
				type: item.type,
			},
		])
	);

	let sortOrder = 0;
	for (const item of items) {
		const category = item.category;
		const monthly = parseFloat(item.monthlyAmount || "0");
		const yearly = parseFloat(item.yearlyAmount || "0");
		const type = item.type;

		const existing = existingMap.get(category);

		if (!existing) {
			await db`
				INSERT INTO budget_items (budget_id, category, monthly_amount, yearly_amount, sort_order, type)
				VALUES (${budgetId}, ${category}, ${monthly}, ${yearly}, ${sortOrder}, ${type})`;
		} else if (
			existing.monthly !== monthly ||
			existing.yearly !== yearly ||
			existing.type !== type
		) {
			await db`
				UPDATE budget_items
				SET monthly_amount = ${monthly}, yearly_amount = ${yearly}, type = ${type}, sort_order = ${sortOrder}
				WHERE budget_id = ${budgetId} AND category = ${category}`;
		}

		sortOrder++;
	}

	return new Response("Saved", { status: 200 });
}
