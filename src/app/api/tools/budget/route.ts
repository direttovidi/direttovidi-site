import { auth } from "@/app/auth";
import { db } from "@/lib/db";

export async function DELETE(req: Request) {
	const session = await auth();
	if (!session?.user?.email) {
		return new Response("Unauthorized", { status: 401 });
	}

	const { month, year, category } = await req.json();
	if (!month || !year || !category) {
		return new Response("Missing data", { status: 400 });
	}

	const [{ id: userId }] = await db`
    SELECT id FROM users WHERE email = ${session.user.email}`;

	const [budget] = await db`
    SELECT id FROM budgets WHERE user_id = ${userId} AND month = ${month} AND year = ${year}`;

	if (!budget) return new Response("Budget not found", { status: 404 });

	await db`
    DELETE FROM budget_items WHERE budget_id = ${budget.id} AND category = ${category}`;

	return new Response("Deleted", { status: 200 });
}

export async function GET(req: Request) {
	const session = await auth();
	if (!session?.user?.email) {
		return new Response("Unauthorized", { status: 401 });
	}

	const url = new URL(req.url);
	const month = parseInt(url.searchParams.get("month") || "");
	const year = parseInt(url.searchParams.get("year") || "");

	if (!month || !year) {
		return new Response("Missing month or year", { status: 400 });
	}

	const userResult = await db`
    SELECT id FROM users WHERE email = ${session.user.email}`;
	const userId = userResult[0]?.id;

	if (!userId) {
		return new Response("User not found", { status: 404 });
	}

	const budgets = await db`
    SELECT id FROM budgets
    WHERE user_id = ${userId} AND month = ${month} AND year = ${year}`;

	if (budgets.length === 0) {
		return new Response(JSON.stringify({ budget: null, items: [] }), {
			headers: { "Content-Type": "application/json" },
			status: 200,
		});
	}

	const budgetId = budgets[0].id;

	const dbItems = await db`
    SELECT category, amount, type FROM budget_items
    WHERE budget_id = ${budgetId}
    ORDER BY sort_order`;

	// Normalize amounts for display: keep income positive, show absolute for expenses
	const items = dbItems.map((item: any) => ({
		category: item.category,
		amount:
			item.category === "Net Income" ? item.amount : Math.abs(item.amount),
	}));

	return new Response(JSON.stringify({ budget: { id: budgetId }, items }), {
		headers: { "Content-Type": "application/json" },
		status: 200,
	});
}

export async function POST(req: Request) {
	const session = await auth();
	if (!session?.user?.email) {
		return new Response("Unauthorized", { status: 401 });
	}

	const { month, year, items } = await req.json();

	// Get the user
	const result = await db`
    SELECT id FROM users WHERE email = ${session.user.email}`;
	const userId = result[0]?.id;

	// Get or create budget
	const [existingBudget] = await db`
    SELECT id FROM budgets WHERE user_id = ${userId} AND month = ${month} AND year = ${year}`;

	const budgetId = existingBudget
		? existingBudget.id
		: (
			await db`
	INSERT INTO budgets (user_id, month, year)
	VALUES (${userId}, ${month}, ${year})
	RETURNING id
        `
		)[0].id;

	// Fetch existing budget items
	const existingItems = await db`
    SELECT category, amount, type FROM budget_items WHERE budget_id = ${budgetId}
	`;

	const existingMap = new Map(
		existingItems.map((item: any) => [item.category, {amount: item.amount, type: item.type}]));

	let sortOrder = 0;
	for (const item of items) {
		const isIncome = item.category === "Net Income";
		const rawAmount = parseFloat(item.amount || "0");
		const normalizedAmount = isIncome ? rawAmount : -Math.abs(rawAmount);

		const existingItem = existingMap.get(item.category);

		if (existingItem === undefined) {
			// Insert new item
			await db`
				INSERT INTO budget_items (budget_id, category, amount, sort_order, type)
				VALUES (${budgetId}, ${item.category}, ${normalizedAmount}, ${sortOrder}, ${item.type})`;
		} else if (parseFloat(existingItem.amount) !== normalizedAmount || existingItem.type !== item.type) {
			// Update existing item if normalized amount changed
			await db`
				UPDATE budget_items
				SET amount = ${normalizedAmount}, type = ${item.type}, sort_order = ${sortOrder}
				WHERE budget_id = ${budgetId} AND category = ${item.category}`;
		}

		sortOrder++;
	}

	return new Response("Saved", { status: 200 });
}
