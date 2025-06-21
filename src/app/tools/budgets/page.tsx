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
		<div className="max-w-6xl mx-auto p-4 space-y-6">
			<h1 className="text-2xl font-bold">Your Budgets</h1>

			{budgets.length === 0 ? (
				<p>No budgets found.</p>
			) : (
				<>
					{/* Desktop Grid Header */}
					<div className="hidden md:grid grid-cols-7 font-semibold text-sm text-gray-700 dark:text-gray-300 border-b pb-2 mb-2 gap-x-4">
						<div>Name</div>
						<div>Net Income (Yearly)</div>
						<div>Total Expenses (Yearly)</div>
						<div>Retired</div>
						<div>Total Assets</div>
						<div>Metrics</div>
						<div className="text-right">Last Modified</div>
					</div>

					<div className="space-y-4 md:space-y-0 md:grid md:grid-cols-1">
						{budgets.map((b) => (
							<div
								key={b.id}
								className="md:grid md:grid-cols-7 items-start gap-x-4 border-b pb-4 md:pb-2 pt-2"
							>
								{/* Name */}
								<Link
									href={`/tools/budget?name=${encodeURIComponent(b.name)}`}
									className="text-blue-600 underline font-medium"
								>
									{b.name}
								</Link>

								{/* Income */}
								<div className="flex md:block items-center gap-2 text-green-600">
									<span className="md:hidden text-xs text-gray-500 font-semibold w-20">Income</span>
									<span>{formatCurrency(b.income)}</span>
								</div>

								{/* Expenses */}
								<div className="flex md:block items-center gap-2 text-red-600">
									<span className="md:hidden text-xs text-gray-500 font-semibold w-20">Expenses</span>
									<span>{formatCurrency(Math.abs(b.expenses))}</span>
								</div>

								{/* Retired */}
								<div className="flex md:block items-center gap-2 text-sm">
									<span className="md:hidden text-xs text-gray-500 font-semibold w-20">Retired</span>
									<span>{b.isRetired ? "Yes" : "No"}</span>
								</div>

								{/* Total Assets */}
								<div className="flex md:block items-center gap-2 text-sm text-gray-900 dark:text-gray-200">
									<span className="md:hidden text-xs text-gray-500 font-semibold w-20">Assets</span>
									<span>{b.isRetired ? formatCurrency(b.totalAssets || 0) : "—"}</span>
								</div>

								{/* Metrics */}
								<div className="space-y-1">
									{b.isRetired ? (
										<>
											<div className="flex md:block items-center gap-2 text-xs text-gray-800 dark:text-gray-300">
												<span className="md:hidden w-20 text-gray-500">Total WR</span>
												<span><strong>{((b.expenses / (b.totalAssets || 1)) * 100).toFixed(2)}%</strong></span>
											</div>
											<div className="flex md:block items-center gap-2 text-xs text-gray-800 dark:text-gray-300">
												<span className="md:hidden w-20 text-gray-500">Needs WR</span>
												<span><strong>{((b.needs / (b.totalAssets || 1)) * 100).toFixed(2)}%</strong></span>
											</div>
											<div className="flex md:block items-center gap-2 text-xs text-gray-800 dark:text-gray-300">
												<span className="md:hidden w-20 text-gray-500">Wants WR</span>
												<span><strong>{((b.wants / (b.totalAssets || 1)) * 100).toFixed(2)}%</strong></span>
											</div>
										</>
									) : (
										<>
											<div className="flex md:block items-center gap-2 text-xs text-gray-800 dark:text-gray-300">
												<span className="md:hidden w-20 text-gray-500">Needs</span>
												<span><strong>{((b.needs / (b.income || 1)) * 100).toFixed(2)}%</strong></span>
											</div>
											<div className="flex md:block items-center gap-2 text-xs text-gray-800 dark:text-gray-300">
												<span className="md:hidden w-20 text-gray-500">Wants</span>
												<span><strong>{((b.wants / (b.income || 1)) * 100).toFixed(2)}%</strong></span>
											</div>
											<div className="flex md:block items-center gap-2 text-xs text-gray-800 dark:text-gray-300">
												<span className="md:hidden w-20 text-gray-500">Saved</span>
												<span><strong>{(((b.income - b.needs - b.wants) / (b.income || 1)) * 100).toFixed(2)}%</strong></span>
											</div>
										</>
									)}
								</div>

								{/* Last Modified & Delete */}
								<div className="flex justify-between md:justify-end items-center text-xs text-gray-500 gap-2 mt-2 md:mt-0">
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
									>
										<Trash2 className="w-4 h-4" />
									</button>
								</div>
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);


}
