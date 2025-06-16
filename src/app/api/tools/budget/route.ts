import { auth } from "@/app/auth";
import { db } from "@/lib/db";

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

export async function GET(req: Request) {
	const session = await auth();
	if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

	const url = new URL(req.url);
	const name = url.searchParams.get("name");

	if (!name) return new Response("Missing budget name", { status: 400 });

	const [{ id: userId }] = await db`
    SELECT id FROM users WHERE email = ${session.user.email}`;

	const [budget] = await db`
    SELECT id FROM budgets WHERE user_id = ${userId} AND name = ${name}`;

	if (!budget) {
		return new Response(JSON.stringify({ budget: null, items: [] }), {
			headers: { "Content-Type": "application/json" },
			status: 200,
		});
	}

	const dbItems = await db`
    SELECT category, amount, type FROM budget_items
    WHERE budget_id = ${budget.id}
    ORDER BY sort_order`;

	const items = dbItems.map((item: any) => ({
		category: item.category,
		amount: item.category === "Net Income" ? item.amount : Math.abs(item.amount),
		type: item.type
	}));

	return new Response(JSON.stringify({ budget: { id: budget.id }, items }), {
		headers: { "Content-Type": "application/json" },
		status: 200,
	});
}

export async function POST(req: Request) {
	const session = await auth();
	if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

	const { name, items } = await req.json();
	if (!name || typeof name !== "string") return new Response("Missing or invalid name", { status: 400 });

	const [{ id: userId }] = await db`
    SELECT id FROM users WHERE email = ${session.user.email}`;

	const [existingBudget] = await db`
    SELECT id FROM budgets WHERE user_id = ${userId} AND name = ${name}`;

	const budgetId = existingBudget
		? existingBudget.id
		: (
			await db`
        INSERT INTO budgets (user_id, name)
        VALUES (${userId}, ${name})
        RETURNING id
      `
		)[0].id;

	const existingItems = await db`
    SELECT category, amount, type FROM budget_items WHERE budget_id = ${budgetId}`;

	const existingMap = new Map(
		existingItems.map((item: any) => [item.category, { amount: item.amount, type: item.type }])
	);

	let sortOrder = 0;
	for (const item of items) {
		const isIncome = item.category === "Net Income";
		const rawAmount = parseFloat(item.amount || "0");
		const normalizedAmount = isIncome ? rawAmount : -Math.abs(rawAmount);

		const existingItem = existingMap.get(item.category);

		if (!existingItem) {
			await db`
        INSERT INTO budget_items (budget_id, category, amount, sort_order, type)
        VALUES (${budgetId}, ${item.category}, ${normalizedAmount}, ${sortOrder}, ${item.type})`;
		} else if (
			parseFloat(existingItem.amount) !== normalizedAmount ||
			existingItem.type !== item.type
		) {
			await db`
        UPDATE budget_items
        SET amount = ${normalizedAmount}, type = ${item.type}, sort_order = ${sortOrder}
        WHERE budget_id = ${budgetId} AND category = ${item.category}`;
		}

		sortOrder++;
	}

	return new Response("Saved", { status: 200 });
}
