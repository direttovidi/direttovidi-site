"use client";

import { useEffect, useState } from "react";
import { calculateReturns } from "@/lib/analysis/returns";

type Snapshot = {
    id: string;
    date: string;
    portfolio_value: number;
    contributions: number;
    withdrawals: number;
    note: string | null;
};

export default function SnapshotAnalysisPage() {
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchSnapshots = async () => {
            try {
                const res = await fetch("/api/tools/asset-snapshots");
                if (!res.ok) throw new Error("Failed to load");
                const data = await res.json();
                setSnapshots(data);
            } catch (err) {
                console.error(err);
                setError("Unable to load snapshots.");
            }
        };

        fetchSnapshots();
    }, []);

    const results = calculateReturns(snapshots);

    return (
        <div className="p-4 space-y-6">
            <h1 className="text-xl font-bold">Snapshot Analysis</h1>

            {error && <div className="text-red-600">{error}</div>}

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left">Date</th>
                            <th className="px-4 py-2 text-right">Monthly Return</th>
                            <th className="px-4 py-2 text-right">Quarterly Return</th>
                            <th className="px-4 py-2 text-right">Annual Return</th>
                            <th className="px-4 py-2 text-right">Withdrawal Rate</th>
                            <th className="px-4 py-2 text-right">Annual Withdrawal/Contribution</th>
                            <th className="px-4 py-2 text-right">Portfolio Value</th>
                            <th className="px-4 py-2 text-right">Annual Withdrawal/Contribution Rate</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {results.map((r) => (
                            <tr key={r.date}>
                                <td className="px-4 py-2">{new Date(r.date).toLocaleDateString()}</td>
                                <td
                                    className={`px-4 py-2 text-right ${r.monthlyReturn !== undefined && r.monthlyReturn < 0 ? "text-red-600" : ""}`}
                                >
                                    {r.monthlyReturn !== undefined ? `${(r.monthlyReturn * 100).toFixed(2)}%` : "—"}
                                </td>
                                <td
                                    className={`px-4 py-2 text-right ${r.quarterlyReturn !== undefined && r.quarterlyReturn < 0 ? "text-red-600" : ""}`}
                                >
                                    {r.quarterlyReturn !== undefined ? `${(r.quarterlyReturn * 100).toFixed(2)}%` : "—"}
                                </td>
                                <td
                                    className={`px-4 py-2 text-right ${r.annualReturn !== undefined && r.annualReturn < 0 ? "text-red-600" : ""}`}
                                >
                                    {r.annualReturn !== undefined ? `${(r.annualReturn * 100).toFixed(2)}%` : "—"}
                                </td>
                                <td className="px-4 py-2 text-right">
                                    {(r.withdrawalRate * 100).toFixed(2)}%
                                </td>
                                <td
                                    className={`px-4 py-2 text-right ${r.annualWithdrawal !== undefined && r.annualWithdrawal < 0 ? "text-red-600" : ""}`}
                                >
                                    {r.annualWithdrawal !== undefined
                                        ? new Intl.NumberFormat("en-US", {
                                            style: "currency",
                                            currency: "USD",
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        }).format(r.annualWithdrawal)
                                        : "—"}
                                </td>
                                <td className="px-4 py-2 text-right">
                                    {r.portfolioValue !== undefined
                                        ? new Intl.NumberFormat("en-US", {
                                            style: "currency",
                                            currency: "USD",
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        }).format(r.portfolioValue)
                                        : "—"}
                                </td>
                                <td
                                    className={`px-4 py-2 text-right ${r.annualWithdrawalRate !== undefined && r.annualWithdrawalRate < 0 ? "text-red-600" : ""}`}
                                >
                                    {r.annualWithdrawalRate !== undefined
                                        ? `${(r.annualWithdrawalRate * 100).toFixed(2)}%`
                                        : "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
