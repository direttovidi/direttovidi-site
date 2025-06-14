// /app/tools/budgets/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";

type BudgetSummary = {
	id: string;
	month: number;
	year: number;
	income: number;
	expenses: number;
};

export default function BudgetList() {
	const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchBudgets = async () => {
			setLoading(true);
			try {
				const res = await fetch("/api/tools/budgets");
				if (res.ok) {
					const data = await res.json();
					setBudgets(data.budgets);
				} else {
					console.error("Failed to fetch budgets");
				}
			} finally {
				setLoading(false);
			}
		};
		fetchBudgets();
	}, []);

	if (loading) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	return (
		<div className="max-w-xl mx-auto p-6 space-y-4">
			<h1 className="text-2xl font-bold mb-4">Your Budgets</h1>

			<div className="grid grid-cols-4 font-semibold text-sm text-gray-700 dark:text-gray-300 border-b pb-2 mb-2">
				<div>Month / Year</div>
				<div>Net Income</div>
				<div>Total Expenses</div>
				<div></div>
			</div>

			{budgets.length === 0 ? (
				<p>No budgets found.</p>
			) : (
				budgets.map((b) => (
					<div
						key={b.id}
						className="grid grid-cols-4 py-2 border-b hover:bg-gray-50 dark:hover:bg-slate-800 items-center"
					>
						<a href={`/tools/budget?month=${b.month}&year=${b.year}`} className="text-blue-600 underline">
							{new Date(b.year, b.month - 1).toLocaleString("default", { month: "long" })} {b.year}
						</a>
						<div className="text-green-600">${Number(b.income).toFixed(2)}</div>
						<div className="text-red-600">${Math.abs(Number(b.expenses)).toFixed(2)}</div>
						<button
							onClick={async () => {
								const confirmed = confirm(`Delete budget for ${new Date(b.year, b.month - 1).toLocaleString("default", { month: "long" })} ${b.year}?`);
								if (!confirmed) return;
								const res = await fetch("/api/tools/budget", {
									method: "DELETE",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({ month: b.month, year: b.year }),
								});
								if (res.ok) {
									setBudgets((prev) => prev.filter((item) => item.id !== b.id));
								} else {
									alert("Failed to delete budget.");
								}
							}}
							className="text-red-500 hover:text-red-700"
							title="Delete budget"
						>
							<Trash2 className="w-4 h-4" />
						</button>
					</div>
				))
			)}
		</div>
	);
}
