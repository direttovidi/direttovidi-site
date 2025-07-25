import { auth } from "@/app/auth";
import { db } from "@/lib/db";

// DELETE
export async function DELETE(req: Request) {
	const session = await auth();
	const userId = session?.user?.id;
	if (!userId) return new Response("Unauthorized", { status: 401 });

	const { name, category } = await req.json();
	if (!name) return new Response("Missing budget name", { status: 400 });

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
	const userId = session?.user?.id;
	if (!userId) return new Response("Unauthorized", { status: 401 });

	const url = new URL(req.url);
	const name = url.searchParams.get("name");
	if (!name) return new Response("Missing budget name", { status: 400 });

	const [budget] = await db`
		SELECT id, is_retired, assets_equities, assets_bonds, assets_cash FROM budgets
		WHERE user_id = ${userId} AND name = ${name}`;

	if (!budget) {
		return new Response(JSON.stringify({ budget: null, items: [] }), {
			headers: { "Content-Type": "application/json" },
			status: 200,
		});
	}

	const dbItems = await db`
		SELECT id, category, monthly_amount, yearly_amount, type
		FROM budget_items
		WHERE budget_id = ${budget.id}
		ORDER BY sort_order`;

	const items = dbItems.map((item: any) => ({
		id: item.id,
		category: item.category,
		monthlyAmount: item.monthly_amount?.toString() || "",
		yearlyAmount: item.yearly_amount?.toString() || "",
		type: item.type,
	}));

	return new Response(JSON.stringify({
		budget: {
			id: budget.id,
			is_retired: budget.is_retired,
			assets_equities: budget.assets_equities,
			assets_bonds: budget.assets_bonds,
			assets_cash: budget.assets_cash
		}, items
	}), {
		headers: { "Content-Type": "application/json" },
		status: 200,
	});
}

// POST
export async function POST(req: Request) {
	const session = await auth();
	const userId = session?.user?.id;
	if (!userId) return new Response("Unauthorized", { status: 401 });

	const { name, originalName, items, isRetired, assetsEquities, assetsBonds, assetsCash } = await req.json();
	if (!name || typeof name !== "string") return new Response("Missing or invalid name", { status: 400 });

	let budgetId;

	// 🚀 Case 1: Rename
	if (originalName && originalName !== name) {
		const [conflict] = await db`
			SELECT id FROM budgets WHERE user_id = ${userId} AND name = ${name}`;
		if (conflict) return new Response("Budget with this name already exists", { status: 400 });

		const [existing] = await db`
			SELECT id FROM budgets WHERE user_id = ${userId} AND name = ${originalName}`;
		if (!existing) return new Response("Original budget not found", { status: 404 });

		await db`
			UPDATE budgets SET name = ${name} WHERE id = ${existing.id}`;

		budgetId = existing.id;

		await db`
			UPDATE budgets
			SET is_retired = ${isRetired}, assets_equities = ${assetsEquities}, assets_bonds = ${assetsBonds}, assets_cash = ${assetsCash}
			WHERE id = ${budgetId}`;
	}

	// 🚀 Case 2 or 3: Create new or update existing
	if (!budgetId) {
		const [existing] = await db`
			SELECT id FROM budgets WHERE user_id = ${userId} AND name = ${name}`;

		if (existing) {
			budgetId = existing.id;

			await db`
				UPDATE budgets
				SET is_retired = ${isRetired}, assets_equities = ${assetsEquities}, assets_bonds = ${assetsBonds}, assets_cash = ${assetsCash}
				WHERE id = ${budgetId}`;
		} else {
			const [created] = await db`
				INSERT INTO budgets (user_id, name, is_retired, assets_equities, assets_bonds, assets_cash)
				VALUES (${userId}, ${name}, ${isRetired}, ${assetsEquities}, ${assetsBonds}, ${assetsCash})
				RETURNING id`;

			budgetId = created.id;
		}
	}

	// 🔁 Upsert items
	const existingItems = await db`
		SELECT id, category, monthly_amount, yearly_amount, type FROM budget_items WHERE budget_id = ${budgetId}`;

	const existingMap = new Map(
		existingItems.map((item: any) => [
			item.id,
			{
				category: item.category,
				monthly: parseFloat(item.monthly_amount),
				yearly: parseFloat(item.yearly_amount),
				type: item.type,
			},
		])
	);

	let sortOrder = 0;
	for (const item of items) {
		const { id, category, monthlyAmount, yearlyAmount, type } = item;
		const monthly = parseFloat(monthlyAmount || "0");
		const yearly = parseFloat(yearlyAmount || "0");

		if (id && existingMap.has(id)) {
			// Update existing item by id
			await db`
			UPDATE budget_items
			SET category = ${category},
				monthly_amount = ${monthly},
				yearly_amount = ${yearly},
				sort_order = ${sortOrder},
				type = ${type}
			WHERE id = ${id}`;
		} else {
			// Insert new item with fallback id
			const newId = id || crypto.randomUUID();
			await db`
			INSERT INTO budget_items (id, budget_id, category, monthly_amount, yearly_amount, sort_order, type)
			VALUES (${newId}, ${budgetId}, ${category}, ${monthly}, ${yearly}, ${sortOrder}, ${type})`;
		}

		sortOrder++;
	}

	const incomingIds = new Set((items || []).map((item: any) => item.id || "").filter(Boolean));

	if (incomingIds.size > 0) {
		const idsArray = [...incomingIds];

		await db`
		DELETE FROM budget_items
		WHERE budget_id = ${budgetId}
		AND id IS NOT NULL
		AND id NOT IN (SELECT UNNEST(${idsArray}::uuid[]))`;
	}

	return new Response("Saved", { status: 200 });
}
