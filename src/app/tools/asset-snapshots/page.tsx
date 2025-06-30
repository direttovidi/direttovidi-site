"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { NumericFormat } from 'react-number-format';
import { Trash2Icon } from "lucide-react";

export default function AssetSnapshotsPage() {
    const [snapshots, setSnapshots] = useState<any[]>([]);
    const [form, setForm] = useState({
        date: "",
        portfolioValue: "" as number | "",
        contributions: "" as number | "",
        withdrawals: "" as number | "",
        note: ""
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");
    const [editingId, setEditingId] = useState<string | null>(null);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);

    const fetchSnapshots = async () => {
        setError(""); // Clear any previous error
        try {
            const res = await fetch('/api/tools/asset-snapshots');
            console.log(res);
            if (!res.ok) throw new Error('Failed to load');
            const data = await res.json();
            setSnapshots(data);
        } catch (err) {
            console.error(err);
            setError('Unable to load snapshots.');
        }
    };

    useEffect(() => {
        fetchSnapshots();
    }, []);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleEdit = (snapshot: any) => {
        setForm({
            date: new Date(snapshot.date).toISOString().split("T")[0],
            portfolioValue: snapshot.portfolio_value,
            contributions: snapshot.contributions,
            withdrawals: snapshot.withdrawals,
            note: snapshot.note || "",
        });
        setEditingId(snapshot.id);
    };

    const handleDelete = async (id: string) => {
        const confirmed = confirm("Are you sure you want to delete this snapshot?");
        if (!confirmed) return;

        setLoading(true);
        setError("");

        try {
            const res = await fetch(`/api/tools/asset-snapshots/${id}`, {
                method: "DELETE"
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to delete snapshot");
            }

            await fetchSnapshots();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Error deleting snapshot.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const url = editingId
                ? `/api/tools/asset-snapshots/${editingId}`
                : `/api/tools/asset-snapshots`;

            const method = editingId ? "PUT" : "POST";

            const js = JSON.stringify({
                date: form.date,
                portfolioValue: form.portfolioValue === "" ? 0 : form.portfolioValue,
                contributions: form.contributions === "" ? 0 : form.contributions,
                withdrawals: form.withdrawals === "" ? 0 : form.withdrawals,
                note: form.note,
            });

            console.log("Submitting snapshot:", js);

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: js,
            });

            if (!res.ok) {
                let message = "Submission failed";
                try {
                    const err = await res.json();
                    message = err.error || message;
                } catch {
                    // response had no JSON body
                }
                throw new Error(message);
            }

            // Clear form and editing state
            setForm({
                date: "",
                portfolioValue: "",
                contributions: "",
                withdrawals: "",
                note: "",
            });
            setEditingId(null);
            await fetchSnapshots();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Error submitting snapshot.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 space-y-6">
            <h1 className="text-xl font-bold">Asset Snapshots</h1>

            {error && <div className="text-red-600">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Date</label>
                        <input
                            type="date"
                            name="date"
                            value={form.date}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full rounded p-2 border"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Portfolio Value</label>
                        <NumericFormat
                            name="portfolioValue"
                            value={form.portfolioValue}
                            thousandSeparator
                            prefix="$"
                            decimalScale={2}
                            allowNegative={false}
                            onValueChange={({ floatValue }) => {
                                setForm(prev => ({ ...prev, portfolioValue: floatValue ?? "" }));
                            }}
                            className="mt-1 block w-full rounded p-2 border"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Contributions</label>
                        <NumericFormat
                            name="contributions"
                            value={form.contributions}
                            thousandSeparator
                            prefix="$"
                            decimalScale={2}
                            allowNegative={false}
                            onValueChange={({ floatValue }) => {
                                setForm(prev => ({ ...prev, contributions: floatValue ?? "" }));
                            }}
                            className="mt-1 block w-full rounded p-2 border"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Withdrawals</label>
                        <NumericFormat
                            name="withdrawals"
                            value={form.withdrawals}
                            thousandSeparator
                            prefix="$"
                            decimalScale={2}
                            allowNegative={false}
                            onValueChange={({ floatValue }) => {
                                setForm(prev => ({ ...prev, withdrawals: floatValue ?? "" }));
                            }}
                            className="mt-1 block w-full rounded p-2 border"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium">Note (optional)</label>
                    <textarea
                        name="note"
                        value={form.note}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded p-2 border"
                    />
                </div>
                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 rounded bg-green-300 shadow hover:bg-gray-100"
                    >
                        {loading ? "Saving..." : editingId ? "Update Snapshot" : "Add Snapshot"}
                    </button>

                    {editingId && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingId(null);
                                setForm({
                                    date: "",
                                    portfolioValue: "",
                                    contributions: "",
                                    withdrawals: "",
                                    note: "",
                                });
                            }}
                            className="px-4 py-2 rounded bg-green-300 hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            <div className="mt-6">
                <h2 className="text-lg font-semibold">Previous Snapshots</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-sm font-medium">Date</th>
                                <th className="px-4 py-2 text-right text-sm font-medium">Value</th>
                                <th className="px-4 py-2 text-right text-sm font-medium">Contributions</th>
                                <th className="px-4 py-2 text-right text-sm font-medium">Withdrawals</th>
                                <th className="px-4 py-2 text-left text-sm font-medium">Note</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {snapshots.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-2 text-center text-sm text-gray-500">
                                        No snapshots yet.
                                    </td>
                                </tr>
                            ) : (
                                snapshots.map((s) => (
                                    <tr key={s.id}>
                                        <td className="px-4 py-2 text-sm">{new Date(s.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-2 text-sm text-right">{formatCurrency(s.portfolio_value)}</td>
                                        <td className="px-4 py-2 text-sm text-right">{formatCurrency(s.contributions)}</td>
                                        <td className="px-4 py-2 text-sm text-right">{formatCurrency(s.withdrawals)}</td>
                                        <td className="px-4 py-2 text-sm">{s.note || '—'}</td>
                                        <td className="px-4 py-2 text-sm text-right space-x-2">
                                            <button
                                                onClick={() => handleEdit(s)}
                                                className="text-blue-600 hover:underline"
                                            >
                                                ✏️ Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(s.id)}
                                                className="text-red-600 hover:text-red-800"
                                                aria-label="Delete snapshot"
                                            >
                                                <Trash2Icon className="h-4 w-4 inline" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
