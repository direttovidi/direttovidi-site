'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBudgetImportStore } from '@/store/budgetImportStore';
import { NumericFormat } from 'react-number-format';

type BudgetItemUI = {
    category: string;
    monthlyAmount: string;
    yearlyAmount: string;
    type: 'Need' | 'Want' | 'Income' | 'Savings';
};


export default function ImportPreviewPage() {
    const budget = useBudgetImportStore((s) => s.draft);
    const clearDraft = useBudgetImportStore((s) => s.clearDraft);
    const router = useRouter();

    const [nameError, setNameError] = useState('');
    const [draftName, setDraftName] = useState('');
    const [draftItems, setDraftItems] = useState<BudgetItemUI[]>([]);
    const [draftAssets, setDraftAssets] = useState({ equities: 0, bonds: 0, cash: 0 });
    const [errors, setErrors] = useState<string[]>([]);
    const [nameConflictError, setNameConflictError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        async function checkNameConflict() {
            if (!draftName.trim()) return;

            const budgetList = await fetch('/api/tools/budgets').then((r) => r.json());
            const nameConflict = budgetList.budgets.some((b: any) => b.name === draftName);

            if (nameConflict) {
                setNameConflictError(`A budget named "${draftName}" already exists.`);
            } else {
                setNameConflictError('');
            }
        }

        checkNameConflict();
    }, [draftName]);

    useEffect(() => {
        if (!budget) return;

        setDraftName(budget.name || '');
        setDraftItems(
            budget.items.map((item: any) => ({
                category: item.category,
                monthlyAmount: item.monthlyAmount?.toString() || '',
                yearlyAmount: item.yearlyAmount?.toString() || '',
                type: item.type,
            }))
        );
        setDraftAssets({
            equities: budget.assetsEquities,
            bonds: budget.assetsBonds,
            cash: budget.assetsCash,
        });
    }, [budget]);

    useEffect(() => {
        if (!budget) {
            router.replace('/tools/budget');
        }
    }, [budget, router]);

    useEffect(() => {
        const issues = validateBudget({
            name: draftName,
            items: draftItems,
        });
        setErrors(issues);
    }, [draftName, draftItems]);

    function validateBudget({
        name,
        items,
    }: {
        name: string;
        items: BudgetItemUI[];
    }): string[] {
        const issues: string[] = [];

        if (!name.trim()) issues.push('Budget name is required.');
        if (items.length === 0) issues.push('At least one budget item is required.');

        items.forEach((item, i) => {
            if (!item.category?.trim()) issues.push(`Item ${i + 1}: category is required.`);
            if (!['Need', 'Want', 'Income', 'Savings'].includes(item.type)) {
                issues.push(`Item ${i + 1}: type must be Need, Want, Income, or Savings.`);
            }
        });

        return issues;
    }
    if (!budget) return null;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">Review Imported Budget</h1>

            {(errors.length > 0 || nameConflictError) && (
                <div className="bg-yellow-100 border border-yellow-300 text-yellow-900 p-4 rounded mb-4">
                    <p className="font-semibold mb-2">⚠️ Please fix the following errors before saving:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                        {errors.map((err, i) => (
                            <li key={i}>{err}</li>
                        ))}
                        {nameConflictError && <li>{nameConflictError}</li>}
                    </ul>
                </div>
            )}

            <pre className="bg-gray-100 text-sm p-4 rounded mb-6 overflow-x-auto">
                <div className="space-y-6">

                    {/* Editable name field */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Budget Name</label>
                        <input
                            type="text"
                            className={`w-full border px-3 py-2 rounded ${errors.some((e) => e.toLowerCase().includes('name')) || nameConflictError
                                ? 'border-red-500'
                                : 'border-gray-300'
                                }`}
                            value={draftName}
                            onChange={(e) => {
                                setDraftName(e.target.value);
                                const updated = validateBudget({ name: e.target.value, items: draftItems });
                                setErrors(updated);
                            }}
                        />
                        {nameConflictError && (
                            <p className="text-sm text-red-600 mt-1">{nameConflictError}</p>
                        )}
                    </div>

                    {/* Assets */}
                    <div className="grid grid-cols-3 gap-4">
                        {['equities', 'bonds', 'cash'].map((type) => (
                            <div key={type}>
                                <label className="block text-sm mb-1 capitalize">{type}</label>
                                <NumericFormat
                                    thousandSeparator
                                    prefix="$"
                                    allowNegative={false}
                                    className="w-full border px-2 py-1 rounded"
                                    value={draftAssets[type as keyof typeof draftAssets]}
                                    onValueChange={(values) =>
                                        setDraftAssets((prev) => ({
                                            ...prev,
                                            [type]: parseFloat(values.value) || 0,
                                        }))
                                    }
                                />
                            </div>
                        ))}
                    </div>

                    {/* Budget items */}
                    <div className="overflow-x-auto mb-2">
                        <div className="min-w-[600px]">
                            <h2 className="text-md font-semibold mt-4 mb-2">Budget Items</h2>
                            <div className="grid grid-cols-4 gap-2 mb-2 font-semibold text-sm text-gray-700">
                                <div>Category</div>
                                <div>Monthly</div>
                                <div>Yearly</div>
                                <div>Type</div>
                            </div>
                            {draftItems.map((item, i) => (
                                <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                                    <input
                                        type="text"
                                        placeholder="Category"
                                        className={`border px-2 py-1 rounded ${errors.some((e) => e.includes(`Item ${i + 1}: category`)) ? 'border-red-500' : ''
                                            }`}
                                        value={item.category}
                                        onChange={(e) => {
                                            const items = [...draftItems];
                                            items[i].category = e.target.value;
                                            setDraftItems(items);
                                            const updated = validateBudget({ name: draftName, items });
                                            setErrors(updated);
                                        }}
                                    />
                                    <NumericFormat
                                        thousandSeparator
                                        prefix="$"
                                        allowNegative={false}
                                        className={`border px-2 py-1 rounded w-full`}
                                        value={item.monthlyAmount}
                                        onValueChange={(values) => {
                                            const items = [...draftItems];
                                            items[i].monthlyAmount = values.value;
                                            setDraftItems(items);
                                            setErrors(validateBudget({ name: draftName, items }));
                                        }}
                                    />
                                    <NumericFormat
                                        thousandSeparator
                                        prefix="$"
                                        allowNegative={false}
                                        className={`border px-2 py-1 rounded w-full`}
                                        value={item.yearlyAmount}
                                        onValueChange={(values) => {
                                            const items = [...draftItems];
                                            items[i].yearlyAmount = values.value;
                                            setDraftItems(items);
                                            setErrors(validateBudget({ name: draftName, items }));
                                        }}
                                    />
                                    <select
                                        className={`border px-2 py-1 rounded ${errors.some((e) => e.includes(`Item ${i + 1}: type`)) ? 'border-red-500 bg-red-50' : ''
                                            }`}
                                        value={item.type}
                                        onChange={(e) => {
                                            const items = [...draftItems];
                                            items[i].type = e.target.value as typeof item.type;
                                            setDraftItems(items);
                                            const updated = validateBudget({ name: draftName, items });
                                            setErrors(updated);
                                        }}
                                    >
                                        {
                                            !['Need', 'Want', 'Income', 'Savings'].includes(item.type) && (
                                                <option value={item.type} disabled hidden>
                                                    {item.type} (Invalid)
                                                </option>
                                            )
                                        }
                                        <option value="Need">Need</option>
                                        <option value="Want">Want</option>
                                        <option value="Income">Income</option>
                                        <option value="Savings">Savings</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Add new item button */}

                    {/* Error messages */}
                    {errors.length > 0 && (
                        <div className="bg-red-100 text-red-800 p-3 rounded text-sm">
                            <ul className="list-disc ml-4">
                                {errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </pre>
            <div className="flex items-center space-x-4 mt-6">
                <button
                    disabled={isSaving || errors.length > 0 || !!nameConflictError}
                    onClick={async () => {
                        setIsSaving(true);

                        const validation = validateBudget({
                            name: draftName,
                            items: draftItems,
                        });

                        if (validation.length > 0) {
                            setErrors(validation);
                            setIsSaving(false);
                            return;
                        }

                        if (nameConflictError) {
                            setIsSaving(false);
                            return;
                        }

                        const normalizedItems = draftItems.map((item) => ({
                            category: item.category,
                            type: item.type,
                            monthlyAmount: parseFloat(item.monthlyAmount || '0').toFixed(2),
                            yearlyAmount: parseFloat(item.yearlyAmount || '0').toFixed(2),
                        }));

                        const budgetList = await fetch('/api/tools/budgets').then((r) => r.json());
                        const nameConflict = budgetList.budgets.some((b: any) => b.name === draftName);

                        if (nameConflict) {
                            setNameError(`A budget named "${draftName}" already exists. Please choose a different name.`);
                            setIsSaving(false);
                            return;
                        }

                        const res = await fetch('/api/tools/budget', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                name: draftName,
                                originalName: '',
                                items: normalizedItems,
                                isRetired: budget.isRetired,
                                assetsEquities: draftAssets.equities,
                                assetsBonds: draftAssets.bonds,
                                assetsCash: draftAssets.cash,
                            }),
                        });

                        setIsSaving(false);

                        if (res.ok) {
                            clearDraft();
                            const data = await fetch('/api/tools/budgets').then((r) => r.json());
                            const newId = data.budgets.find((b: any) => b.name === draftName)?.name;
                            router.push(`/tools/budget?name=${encodeURIComponent(newId || draftName)}`);
                        } else {
                            const err = await res.text();
                            alert(`Save failed: ${err}`);
                        }
                    }}
                    className={`px-4 py-2 rounded text-white transition flex items-center justify-center ${isSaving || errors.length > 0 || nameConflictError
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                        }`}
                >
                    {isSaving && (
                        <svg
                            className="animate-spin h-4 w-4 mr-2 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                            />
                        </svg>
                    )}
                    {isSaving ? 'Saving...' : 'Save This Budget'}
                </button>


                <button
                    onClick={() => {
                        clearDraft();
                        router.push('/tools/budget');
                    }}
                    className="ml-4 px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
