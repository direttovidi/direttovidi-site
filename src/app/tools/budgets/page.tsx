"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";

type BudgetSummary = {
	id: string;
	name: string;
	created_at: string;
	modified_at: string | null;
	income: number;
	expenses: number;
	needs: number;
	wants: number;
	isRetired: boolean;
	totalAssets: number | null;
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
		<div className="max-w-5xl mx-auto p-6 space-y-4">
			<h1 className="text-2xl font-bold mb-4">Your Budgets</h1>

			{/* Header row for desktop */}
			<div className="hidden md:grid grid-cols-6 font-semibold text-sm text-gray-700 dark:text-gray-300 border-b pb-2 mb-2 gap-x-4">
				<div>Name</div>
				<div>Net Income (Yearly)</div>
				<div>Total Expenses (Yearly)</div>
				<div>Retired</div>
				<div>Metrics</div>
				<div className="text-right">Last Modified</div>
			</div>

			{budgets.length === 0 ? (
				<p>No budgets found.</p>
			) : (
				budgets.map((b) => (
					<div
						key={b.id}
						className="border-b py-4 md:grid md:grid-cols-6 gap-x-4 space-y-2 md:space-y-0"
					>
						{/* Name */}
						<div>
							<Link
								href={`/tools/budget?name=${encodeURIComponent(b.name)}`}
								className="text-blue-600 underline"
							>
								{b.name}
							</Link>
						</div>

						{/* Net Income */}
						<div className="text-green-600">{formatCurrency(b.income)}</div>

						{/* Expenses */}
						<div className="text-red-600">{formatCurrency(Math.abs(b.expenses))}</div>

						{/* Retired */}
						<div className="text-sm">{b.isRetired ? "Yes" : "No"}</div>

						{/* Metrics */}
						<div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
							{b.isRetired ? (
								<>
									<div>Total WR: <strong>{((b.expenses / (b.totalAssets || 1)) * 100).toFixed(1)}%</strong></div>
									<div>Needs WR: <strong>{((b.needs / (b.totalAssets || 1)) * 100).toFixed(1)}%</strong></div>
									<div>Wants WR: <strong>{((b.wants / (b.totalAssets || 1)) * 100).toFixed(1)}%</strong></div>
									<div>Total Assets: <strong>{formatCurrency(b.totalAssets || 0)}</strong></div>
								</>
							) : (
								<>
									<div>Needs: <strong>{((b.needs / (b.income || 1)) * 100).toFixed(1)}%</strong></div>
									<div>Wants: <strong>{((b.wants / (b.income || 1)) * 100).toFixed(1)}%</strong></div>
									<div>Saved: <strong>{(((b.income - b.needs - b.wants) / (b.income || 1)) * 100).toFixed(1)}%</strong></div>
								</>
							)}
						</div>

						{/* Modified Date and Delete */}
						<div className="flex justify-end gap-2 items-center text-xs text-gray-500">
							<span>{new Date(b.modified_at || b.created_at).toLocaleDateString()}</span>
							<button
								onClick={async () => {
									const confirmed = confirm(`Delete budget "${b.name}"?`);
									if (!confirmed) return;
									const res = await fetch("/api/tools/budget", {
										method: "DELETE",
										headers: { "Content-Type": "application/json" },
										body: JSON.stringify({ name: b.name }),
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
					</div>
				))
			)}
		</div>
	);
}
