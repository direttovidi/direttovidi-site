"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";

type BudgetSummary = {
	id: string;
	name: string;
	createdAt: string;
	modifiedAt: string | null;
	income: number;
	expenses: number;
	needs: number;
	wants: number;
	isRetired: boolean;
	assetsEquities: number | null;
	assetsBonds: number | null;
	assetsCash: number | null;
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

	// Custom grid template: Name (3fr), Income (1fr), Expenses (1fr), Retired (0.5fr), Equities (1fr), Bonds (1fr), Cash (1fr), Total Assets (1fr), Metrics (2fr), Modified (1fr)
	const gridTemplate = "lg:grid-cols-[2fr_1fr_1fr_0.5fr_1fr_1fr_1fr_1fr_1fr_0.7fr]";

	return (
		<div className="max-w-screen-2xl mx-auto p-4">
			<h1 className="text-2xl font-bold mb-4">Your Budgets</h1>

			{budgets.length === 0 ? (
				<p>No budgets found.</p>
			) : (
				<div className="overflow-auto border rounded-lg w-full">
					{/* Desktop Header */}
					<div className={`hidden lg:grid ${gridTemplate} font-semibold text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800`}>
						<div className="p-2">Name</div>
						<div className="p-2">Net Income (Yr)</div>
						<div className="p-2">Expenses (Yr)</div>
						<div className="p-2">Retired</div>
						<div className="p-2">Equities</div>
						<div className="p-2">Bonds</div>
						<div className="p-2">Cash</div>
						<div className="p-2">Total Assets</div>
						<div className="p-2">Metrics</div>
						<div className="p-2 text-right">Last Modified</div>
					</div>

					{/* Rows */}
					<div className="divide-y divide-gray-200 dark:divide-gray-700">
						{budgets.map((b) => {
							const totalAssets =
								(b.assetsEquities || 0) + (b.assetsBonds || 0) + (b.assetsCash || 0);

							return (
								<div
									key={b.id}
									className={`flex flex-col space-y-2 lg:grid ${gridTemplate} items-start lg:items-center p-2`}
								>
									<div>
										<span className="lg:hidden block text-xs text-gray-500 mb-1">Name</span>
										<Link
											href={`/tools/budget?name=${encodeURIComponent(b.name)}`}
											className="text-blue-600 underline font-medium"
										>
											{b.name}
										</Link>
									</div>
									<div>
										<span className="lg:hidden block text-xs text-gray-500 mb-1">Income</span>
										<span className="text-green-600">{formatCurrency(b.income)}</span>
									</div>
									<div>
										<span className="lg:hidden block text-xs text-gray-500 mb-1">Expenses</span>
										<span className="text-red-600">{formatCurrency(Math.abs(b.expenses))}</span>
									</div>
									<div>
										<span className="lg:hidden block text-xs text-gray-500 mb-1">Retired</span>
										{b.isRetired ? "Yes" : "No"}
									</div>
									<div>
										<span className="lg:hidden block text-xs text-gray-500 mb-1">Equities</span>
										{formatCurrency(b.assetsEquities || 0)}
									</div>
									<div>
										<span className="lg:hidden block text-xs text-gray-500 mb-1">Bonds</span>
										{formatCurrency(b.assetsBonds || 0)}
									</div>
									<div>
										<span className="lg:hidden block text-xs text-gray-500 mb-1">Cash</span>
										{formatCurrency(b.assetsCash || 0)}
									</div>
									<div>
										<span className="lg:hidden block text-xs text-gray-500 mb-1">Total Assets</span>
										{formatCurrency(totalAssets)}
									</div>
									<div className="space-y-1 text-xs text-gray-800 dark:text-gray-300">
										<span className="lg:hidden block text-xs text-gray-500 mb-1">Metrics</span>
										{b.isRetired ? (
											<>
												<div>
													Total WR: <strong>{((b.expenses / (totalAssets || 1)) * 100).toFixed(2)}%</strong>
												</div>
												<div>
													Needs WR: <strong>{((b.needs / (totalAssets || 1)) * 100).toFixed(2)}%</strong>
												</div>
												<div>
													Wants WR: <strong>{((b.wants / (totalAssets || 1)) * 100).toFixed(2)}%</strong>
												</div>
											</>
										) : (
											<>
												<div>
													Needs %: <strong>{((b.needs / (b.income || 1)) * 100).toFixed(2)}%</strong>
												</div>
												<div>
													Wants %: <strong>{((b.wants / (b.income || 1)) * 100).toFixed(2)}%</strong>
												</div>
												<div>
													Saved %: <strong>{(((b.income - b.needs - b.wants) / (b.income || 1)) * 100).toFixed(2)}%</strong>
												</div>
											</>
										)}
									</div>
									<div className="flex justify-between lg:justify-end items-center">
										<span className="text-xs text-gray-500 lg:hidden block mb-1">Modified</span>
										<span className="p-2 text-xs text-gray-500">
											{new Date(b.modifiedAt || b.createdAt).toLocaleDateString()}
										</span>
										<button
											onClick={async () => {
												const confirmed = confirm(`Delete budget \"${b.name}\"?`);
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
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
