"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import { NumericFormat } from 'react-number-format';

export default function BudgetCreator() {
  type BudgetItem = {
    category: string;
    monthlyAmount: string;
    yearlyAmount: string;
    type: "Need" | "Want" | "Income";
  };

  const searchParams = useSearchParams();
  const [name, setName] = useState<string>("");
  const [currentName, setCurrentName] = useState<string>(""); // to track original
  const [newName, setNewName] = useState<string>(""); // editable name
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BudgetItem[]>([
    { category: "", monthlyAmount: "", yearlyAmount: "", type: "Need" },
  ]);

  const [history, setHistory] = useState<string[]>([]);
  const [newBudgetName, setNewBudgetName] = useState<string>("");
  const [copyFrom, setCopyFrom] = useState<string>("");
  const [isRetired, setIsRetired] = useState<boolean>(false);
  const [totalAssets, setTotalAssets] = useState<string>("");
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [renameSuccess, setRenameSuccess] = useState(false);
  const [renaming, setRenaming] = useState(false);

  const [focusedField, setFocusedField] = useState<{
    index: number;
    field: "monthlyAmount" | "yearlyAmount" | null;
  } | null>(null);

  useEffect(() => {
    if (isEditingName || !newName.trim()) return;

    const timeout = setTimeout(() => {
      (async () => {
        const filteredItems = items.filter(
          (item) =>
            item.category.trim() !== "" &&
            item.monthlyAmount.trim() !== "" &&
            item.yearlyAmount.trim() !== ""
        );

        if (filteredItems.length === 0) return;

        // 🔐 prevent redundant call if nothing changed
        const isRename = newName !== currentName;

        if (!isRename && !itemsChangedSinceLastSave()) return;

        const normalizedItems = filteredItems.map(({ category, monthlyAmount, yearlyAmount, type }) => ({
          category,
          monthlyAmount,
          yearlyAmount,
          type,
        }));

        try {
          const res = await fetch("/api/tools/budget", {
            method: "POST",
            body: JSON.stringify({
              name: newName,
              originalName: currentName,
              items: normalizedItems,
              isRetired,
              totalAssets,
            }),
            headers: { "Content-Type": "application/json" },
          });

          if (res.ok) {
            // ✅ Only update sidebar when save is confirmed
            const historyRes = await fetch("/api/tools/budgets");
            if (historyRes.ok) {
              const data = await historyRes.json();
              const names = data.budgets.map((b: any) => b.name);
              setHistory(names);
            }
          }
        } catch (err) {
          console.error("Autosave failed", err);
        }
      })();
    }, 800);

    return () => clearTimeout(timeout);
  }, [items, newName, currentName, isRetired, totalAssets]);

  function itemsChangedSinceLastSave() {
    // Implement later: optionally track last saved state in a ref
    return true;
  }

  const applyRename = async () => {
    if (!newName.trim() || newName === currentName) return;

    const cleanedName = newName.trim();
    if (!cleanedName || cleanedName === currentName) return;

    setRenaming(true); // 🔄 Start spinner

    // Save current state explicitly
    const filteredItems = items.filter((item) => item.category.trim() !== "");
    const normalizedItems = filteredItems.map(({ category, monthlyAmount, yearlyAmount, type }) => ({
      category,
      monthlyAmount,
      yearlyAmount,
      type,
    }));

    const res = await fetch("/api/tools/budget", {
      method: "POST",
      body: JSON.stringify({
        name: cleanedName,
        originalName: currentName,
        items: normalizedItems,
        isRetired,
        totalAssets,
      }),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      // Update canonical states
      setName(cleanedName);
      setCurrentName(cleanedName);
      setRenameSuccess(true);
      setTimeout(() => setRenameSuccess(false), 3000); // Hide after 3 seconds

      const newUrl = new URLSearchParams(window.location.search);
      newUrl.set("name", cleanedName);
      window.history.replaceState(null, "", `?${newUrl.toString()}`);

      const historyRes = await fetch("/api/tools/budgets");
      if (historyRes.ok) {
        const data = await historyRes.json();
        const names = data.budgets.map((b: any) => b.name);
        setHistory(names);
      }

      setRenaming(false); // 🔄 Start spinner
    } else {
      const text = await res.text();
      alert(`Failed to rename: ${text}`);
    }
  };

  useEffect(() => {
    const fetchBudget = async () => {
      setLoading(true);

      try {
        let resolvedName = searchParams.get("name");

        if (!resolvedName) {
          const latestRes = await fetch("/api/tools/budget/latest");
          if (latestRes.ok) {
            const latest = await latestRes.json();
            resolvedName = latest.name;
          }
        }

        if (!resolvedName) {
          setName(""); // Ensure name is blank
          setItems([]); // No items at all
          setLoading(false);
          return;
        }

        setName(resolvedName);
        setCurrentName(resolvedName);
        setNewName(resolvedName);

        const res = await fetch(`/api/tools/budget?name=${encodeURIComponent(resolvedName)}`);
        if (!res.ok) {
          console.error("Failed to fetch budget");
          return;
        }

        const data = await res.json();
        setIsRetired(data.budget?.is_retired ?? false);
        setTotalAssets(data.budget?.total_assets?.toString() ?? "");

        let fetchedItems: BudgetItem[] = (data.items || []).map((item: any) => ({
          category: item.category,
          monthlyAmount: item.monthlyAmount ? Number(item.monthlyAmount).toFixed(2) : "",
          yearlyAmount: item.yearlyAmount ? Number(item.yearlyAmount).toFixed(2) : "",
          type: item.type,
        }));

        const netIncomeItem = fetchedItems.find(i => i.category === "Net Income");
        fetchedItems = fetchedItems.filter(i => i.category !== "Net Income");

        if (netIncomeItem !== undefined) {
          fetchedItems = [netIncomeItem, ...fetchedItems];
        } else {
          fetchedItems = [{ category: "Net Income", monthlyAmount: "", yearlyAmount: "", type: "Income" }, ...fetchedItems];
        }

        setItems(fetchedItems);
      } catch (err) {
        console.error("Error fetching budget:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchHistory = async () => {
      const res = await fetch("/api/tools/budgets");
      const data = await res.json();
      const names = data.budgets.map((b: any) => b.name);
      setHistory(names);
    };

    fetchBudget();
    fetchHistory();
  }, []);

  const handleAddRow = () => {
    setItems([...items, { category: "", monthlyAmount: "", yearlyAmount: "", type: "Need" }]);
  };

  const handleChange = (index: number, field: keyof BudgetItem, value: string) => {
    setItems((prevItems) => {
      const updated = [...prevItems];
      const item = { ...updated[index] };

      if (field === "monthlyAmount") {
        item.monthlyAmount = value;
        const monthly = parseFloat(value);
        if (
          !isNaN(monthly) &&
          (!focusedField || focusedField.index !== index || focusedField.field === "monthlyAmount")
        ) {
          item.yearlyAmount = (monthly * 12).toFixed(2);
        }
      } else if (field === "yearlyAmount") {
        item.yearlyAmount = value;
        const yearly = parseFloat(value);
        if (
          !isNaN(yearly) &&
          (!focusedField || focusedField.index !== index || focusedField.field === "yearlyAmount")
        ) {
          item.monthlyAmount = (yearly / 12).toFixed(2);
        }
      } else if (field === "category") {
        item.category = value;
        if (value === "Net Income") {
          item.type = "Income";
        }
      } else if (field === "type") {
        item.type = value as "Need" | "Want" | "Income";
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filteredItems = items.filter((item) => item.category.trim() !== "");
    if (filteredItems.length === 0 || !name.trim()) {
      alert("Name and items are required.");
      return;
    }
    const normalizedItems = filteredItems.map(({ category, monthlyAmount, yearlyAmount, type }) => ({
      category,
      monthlyAmount,
      yearlyAmount,
      type
    }));

    const response = await fetch("/api/tools/budget", {
      method: "POST",
      body: JSON.stringify({ name, items: normalizedItems, isRetired }),
      headers: { "Content-Type": "application/json" },
    });
    if (response.ok) {
      alert("Budget saved!");
      const res = await fetch("/api/tools/budgets");
      const data = await res.json();
      const names = data.budgets.map((b: any) => b.name);
      setHistory(names);
    } else {
      alert("Failed to save budget.");
    }
  };

  const handleDeleteItem = async (index: number, category: string) => {
    if (!history.includes(name)) {
      setItems((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    const response = await fetch("/api/tools/budget", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category }),
    });

    if (response.ok) {
      setItems((prev) => prev.filter((_, i) => i !== index));
    } else {
      alert("Failed to delete item.");
    }
  };

  const handleCreateNew = async () => {
    if (!newBudgetName.trim() || history.includes(newBudgetName)) return;
    setName(newBudgetName);
    setCurrentName(newBudgetName);
    setNewName(newBudgetName);
    setItems([{ category: "Net Income", monthlyAmount: "", yearlyAmount: "", type: "Income" }]);

    setNewBudgetName(""); // Clear input after creating
  };

  const handleCopyFrom = async () => {
    if (!copyFrom.trim() || history.includes(newBudgetName)) return;

    const res = await fetch(`/api/tools/budget?name=${encodeURIComponent(copyFrom)}`);
    const data = await res.json();

    const fetchedItems: BudgetItem[] = (data.items || []).map((item: any) => {
      const monthly = item.monthlyAmount ? Number(item.monthlyAmount).toFixed(2) : "";
      const yearly = item.yearlyAmount ? Number(item.yearlyAmount).toFixed(2) : "";
      return {
        category: item.category,
        type: item.type,
        monthlyAmount: monthly,
        yearlyAmount: yearly,
      };
    });

    const netIncomeItem = fetchedItems.find(i => i.category === "Net Income");
    const otherItems = fetchedItems.filter(i => i.category !== "Net Income");
    const netIncome = netIncomeItem ?? { category: "Net Income", monthlyAmount: "", yearlyAmount: "", type: "Income" };

    const newItems = [netIncome, ...otherItems];

    const originalExists = history.includes(newBudgetName);

    const saveRes = await fetch("/api/tools/budget", {
      method: "POST",
      body: JSON.stringify({
        name: newBudgetName,
        originalName: originalExists ? newBudgetName : "", // ✅ fix here
        items: newItems,
        isRetired,
        totalAssets: totalAssets ? parseFloat(totalAssets) : null,
      }),
      headers: { "Content-Type": "application/json" },
    });

    if (!saveRes.ok) {
      const err = await saveRes.text();
      alert("Failed to save copied budget: " + err);
      return;
    }

    // Update state after save
    setItems(newItems);
    setName(newBudgetName);
    setCurrentName(newBudgetName);
    setNewName(newBudgetName);

    const historyRes = await fetch("/api/tools/budgets");
    if (historyRes.ok) {
      const names = (await historyRes.json()).budgets.map((b: any) => b.name);
      setHistory(names);
    }
    setNewBudgetName(""); // Clear input after creating
  };

  const income = items
    .filter((item) => item.type === "Income")
    .reduce((sum, item) => sum + parseFloat(item.monthlyAmount || "0"), 0);

  const needs = items
    .filter((item) => item.type === "Need")
    .reduce((sum, item) => sum + parseFloat(item.monthlyAmount || "0"), 0);

  const wants = items
    .filter((item) => item.type === "Want")
    .reduce((sum, item) => sum + parseFloat(item.monthlyAmount || "0"), 0);

  const monthlyTotal = needs + wants;
  const yearlyTotal = monthlyTotal * 12;

  const withdrawalRate = totalAssets
    ? (yearlyTotal / parseFloat(totalAssets)) * 100
    : 0;

  const needsWithdrawalRate = totalAssets
    ? (needs * 12 / parseFloat(totalAssets)) * 100
    : 0;

  const wantsWithdrawalRate = totalAssets
    ? (wants * 12 / parseFloat(totalAssets)) * 100
    : 0;

  const totalIncome = items
    .filter((i) => i.type === "Income")
    .reduce((sum, i) => sum + parseFloat(i.yearlyAmount || "0"), 0);

  const totalExpenses = items
    .filter((i) => i.type !== "Income")
    .reduce((sum, i) => sum + parseFloat(i.yearlyAmount || "0"), 0);

  const totalMonthlyExpenses = items
    .filter((i) => i.type !== "Income")
    .reduce((sum, i) => sum + parseFloat(i.monthlyAmount || "0"), 0);

  const needsPct = income > 0 ? (needs / income) * 100 : 0;
  const wantsPct = income > 0 ? (wants / income) * 100 : 0;
  const savePct = income > 0 ? 100 - needsPct - wantsPct : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex">
      <aside className="w-64 border-r p-4">
        <h2 className="font-semibold mb-2 text-center">Create New Budget</h2>
        <input
          type="text"
          placeholder="Enter budget name"
          value={newBudgetName}
          onChange={(e) => setNewBudgetName(e.target.value)}
          className="border px-2 py-1 w-full mb-2"
        />
        <button
          onClick={handleCreateNew}
          disabled={!newBudgetName.trim() || history.includes(newBudgetName)}
          className={`w-full px-3 py-1 mb-4 rounded text-white ${!newBudgetName.trim() || history.includes(newBudgetName)
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700"
            }`}
        >
          Create
        </button>

        <div className="text-sm font-semibold text-gray-500 text-center mb-2">OR</div>

        <select
          value={copyFrom}
          onChange={(e) => setCopyFrom(e.target.value)}
          className="border px-2 py-1 w-full mb-2"
        >
          <option value="">Select existing budget...</option>
          {history.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <button
          onClick={handleCopyFrom}
          disabled={!copyFrom.trim() || history.includes(newBudgetName)}
          className={`w-full px-3 py-1 mb-4 rounded text-white ${!copyFrom.trim() || history.includes(newBudgetName)
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700"
            }`}
        >
          Copy From Existing
        </button>

        <h2 className="font-semibold mb-2 text-center">Existing Budgets</h2>
        <ul className="space-y-2">
          {history.map((b) => (
            <li key={b}>
              <a href={`?name=${encodeURIComponent(b)}`} className="text-blue-600 hover:underline block text-center">
                {b}
              </a>
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex-1 px-7 py-6 flex justify-left">
        <div className="flex flex-row gap-8 items-start">

          {/* Budget Section */}
          <div className="w-full px-2 sm:px-0 max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Budget Name Editing */}
              <div className="inline-flex text-lg font-semibold items-center gap-2">
                {isEditingName ? (
                  <input
                    ref={nameInputRef}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={async () => {
                      await applyRename();
                      setIsEditingName(false);
                    }}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        await applyRename();
                        setIsEditingName(false);
                      }
                    }}
                    className="border-b border-gray-400 focus:outline-none focus:border-blue-500 text-lg font-semibold bg-transparent"
                    autoFocus
                  />
                ) : (
                  <div
                    onClick={() => {
                      setIsEditingName(true);
                      setTimeout(() => nameInputRef.current?.select(), 0);
                    }}
                    className="cursor-pointer hover:underline"
                    title="Click to rename"
                  >
                    <span>Editing Budget: {renameSuccess ? newName : name}</span>
                  </div>
                )}

                {renaming && (
                  <span className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                )}
              </div>

              {/* Budget Grid */}
              <div className="space-y-2">
                <div className="hidden md:grid grid-cols-[3fr_6fr_4fr_4fr_auto] gap-3 font-semibold text-sm text-gray-700 dark:text-gray-300">
                  <div>Type</div>
                  <div>Category</div>
                  <div>Monthly</div>
                  <div>Yearly</div>
                  <div />
                </div>

                {items.map((item, index) => {
                  const isIncome = item.category === "Net Income";
                  return (
                    <div
                      key={index}
                      className="grid grid-cols-1 md:grid-cols-[3fr_6fr_4fr_4fr_auto] gap-3 items-center border p-2 rounded-md"
                    >
                      <div className="md:hidden text-xs text-gray-500">Type</div>
                      <select
                        value={item.type}
                        onChange={(e) => handleChange(index, "type", e.target.value)}
                        className="border px-2 py-1 w-full"
                        disabled={isIncome}
                      >
                        <option value="Need">Need</option>
                        <option value="Want">Want</option>
                        <option value="Income">Income</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Category"
                        value={item.category}
                        onChange={(e) => !isIncome && handleChange(index, "category", e.target.value)}
                        className={`border px-1 py-1 w-full ${isIncome ? "bg-gray-100" : ""}`}
                        readOnly={isIncome}
                      />
                      <NumericFormat
                        value={item.monthlyAmount}
                        thousandSeparator
                        prefix="$"
                        decimalScale={2}
                        fixedDecimalScale
                        allowNegative={false}
                        onFocus={() => setFocusedField({ index, field: "monthlyAmount" })}
                        onBlur={() => setFocusedField(null)}
                        onValueChange={(values) => {
                          const { floatValue } = values;
                          if (floatValue !== undefined) {
                            handleChange(index, "monthlyAmount", floatValue.toString());
                          }
                        }}
                        className={`border px-1 py-1 w-[120px] sm:w-[140px] text-left ${isIncome ? "text-green-600" : "text-red-600"}`}
                      />
                      <NumericFormat
                        value={item.yearlyAmount}
                        thousandSeparator
                        prefix="$"
                        decimalScale={2}
                        fixedDecimalScale
                        allowNegative={false}
                        onFocus={() => setFocusedField({ index, field: "yearlyAmount" })}
                        onBlur={() => setFocusedField(null)}
                        onValueChange={(values) => {
                          const { floatValue } = values;
                          if (floatValue !== undefined) {
                            handleChange(index, "yearlyAmount", floatValue.toString());
                          }
                        }}
                        className={`border px-1 py-1 w-[120px] sm:w-[140px] text-left ${isIncome ? "text-green-600" : "text-red-600"}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(index, item.category)}
                        className={`text-red-500 text-sm ${isIncome ? "invisible" : ""}`}
                        disabled={isIncome}
                        title={isIncome ? "Cannot delete Net Income" : ""}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={handleAddRow}
                  className={`text-sm underline ${name
                    ? "text-blue-600 hover:text-blue-800"
                    : "text-gray-400 cursor-not-allowed"
                    }`}
                  disabled={!name}
                >
                  + Add Category
                </button>
              </div>
            </form>
          </div>

          {/* Analysis Panel with Retirement Controls */}
          <div className="w-[300px] border rounded-md p-4 shadow-sm bg-white dark:bg-gray-900 sticky top-6 self-start">
            {/* Retirement Controls */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center gap-2">
                <label htmlFor="isRetired" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Retired?
                </label>
                <input
                  id="isRetired"
                  type="checkbox"
                  checked={isRetired}
                  onChange={() => setIsRetired(!isRetired)}
                  className="h-4 w-4"
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="totalAssets" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total Assets
                </label>
                <NumericFormat
                  id="totalAssets"
                  value={totalAssets}
                  thousandSeparator
                  prefix="$"
                  decimalScale={2}
                  fixedDecimalScale
                  allowNegative={false}
                  onValueChange={(values) => {
                    const { floatValue } = values;
                    if (floatValue !== undefined) {
                      setTotalAssets(floatValue.toString());
                    }
                  }}
                  className="border px-2 py-1 w-full"
                  placeholder="e.g. 1,500,000"
                />
              </div>
            </div>

            {/* Analysis Results */}
            <h3 className="text-md font-semibold mb-2">
              {isRetired ? "Retirement Metrics" : "Income Allocation"}
            </h3>
            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li>Total Income: <strong>${totalIncome.toLocaleString()}</strong></li>
              <li>Total Expenses (Yearly): <strong>${totalExpenses.toLocaleString()}</strong></li>
              <li>Total Expenses (Monthly): <strong>${totalMonthlyExpenses.toLocaleString()}</strong></li>
              {isRetired ? (
                <>
                  <li>Total Withdrawal Rate: <strong>{withdrawalRate.toFixed(2)}%</strong></li>
                  <li>Needs Withdrawal Rate: <strong>{needsWithdrawalRate.toFixed(2)}%</strong></li>
                  <li>Wants Withdrawal Rate: <strong>{wantsWithdrawalRate.toFixed(2)}%</strong></li>
                </>
              ) : (
                <>
                  <li>Needs: <strong>{needsPct.toFixed(1)}%</strong> of income</li>
                  <li>Wants: <strong>{wantsPct.toFixed(1)}%</strong> of income</li>
                  <li>Leftover to Save: <strong>{savePct.toFixed(1)}%</strong></li>
                </>
              )}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
