"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function BudgetCreator() {
  type BudgetItem = {
    category: string;
    monthlyAmount: string;
    yearlyAmount: string;
    type: "Need" | "Want" | "Income";
  };

  const searchParams = useSearchParams();
  const [name, setName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BudgetItem[]>([
    { category: "", monthlyAmount: "", yearlyAmount: "", type: "Need" },
  ]);

  const [history, setHistory] = useState<string[]>([]);
  const [newBudgetName, setNewBudgetName] = useState<string>("");
  const [copyFrom, setCopyFrom] = useState<string>("");
  const [isRetired, setIsRetired] = useState<boolean>(false);
  const [totalAssets, setTotalAssets] = useState<string>("");

  useEffect(() => {
    if (!name.trim()) return;

    const timeout = setTimeout(() => {
      const filteredItems = items.filter(
        (item) =>
          item.category.trim() !== "" &&
          item.monthlyAmount.trim() !== "" &&
          item.yearlyAmount.trim() !== ""
      );

      if (filteredItems.length === 0) return;
      const normalizedItems = filteredItems.map(({ category, monthlyAmount, yearlyAmount, type }) => ({
        category,
        monthlyAmount,
        yearlyAmount,
        type,
      }));

      fetch("/api/tools/budget", {
        method: "POST",
        body: JSON.stringify({ name, items: normalizedItems, isRetired, totalAssets }),
        headers: { "Content-Type": "application/json" },
      }).then((res) => {
        if (!res.ok) {
          console.error("Auto-save failed");
        }
      });
    }, 800);

    return () => clearTimeout(timeout);
  }, [items, name, isRetired, totalAssets]);

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
        item.yearlyAmount = !isNaN(monthly) ? (monthly * 12).toFixed(2) : "";
      } else if (field === "yearlyAmount") {
        item.yearlyAmount = value;
        const yearly = parseFloat(value);
        item.monthlyAmount = !isNaN(yearly) ? (yearly / 12).toFixed(2) : "";
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

  const handleCreateNew = () => {
    if (!newBudgetName.trim() || history.includes(newBudgetName)) return;
    setName(newBudgetName);
    setItems([{ category: "Net Income", monthlyAmount: "", yearlyAmount: "", type: "Income" }]);
  };

  const handleCopyFrom = async () => {
    if (!copyFrom.trim() || history.includes(newBudgetName)) return;
    const res = await fetch(`/api/tools/budget?name=${encodeURIComponent(copyFrom)}`);
    const data = await res.json();
    const fetchedItems: BudgetItem[] = (data.items || []).map((item: any) => {
      const monthly = item.amount ? (Number(item.amount)).toFixed(2) : "";
      const yearly = item.amount ? (Number(item.amount) * 12).toFixed(2) : "";
      return { ...item, monthlyAmount: monthly, yearlyAmount: yearly };
    });

    const netIncomeItem = fetchedItems.find(i => i.category === "Net Income");
    const otherItems = fetchedItems.filter(i => i.category !== "Net Income");

    const netIncome = netIncomeItem ?? { category: "Net Income", monthlyAmount: "", yearlyAmount: "", type: "Income" };

    setItems([netIncome, ...otherItems]);
    setName(newBudgetName);
  };

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
        <div className="w-full px-2 sm:px-0 max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-6 mb-4">
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

              <div className="flex items-center gap-2">
                <label htmlFor="totalAssets" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total Assets
                </label>
                <input
                  id="totalAssets"
                  type="number"
                  value={totalAssets}
                  onChange={(e) => setTotalAssets(e.target.value)}
                  className="border px-2 py-1 w-40"
                  placeholder="e.g. 1500000"
                />
              </div>
            </div>
            <div className="text-lg font-semibold">
              {name ? `Editing Budget: ${name}` : "No Budget Found. Please create a new one."}
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[3fr_6fr_4fr_4fr_auto] gap-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
                <div>Type</div>
                <div>Category</div>
                <div>Monthly</div>
                <div>Yearly</div>
                <div />
              </div>
              {items.map((item, index) => {
                const isIncome = item.category === "Net Income";
                return (
                  <div key={index} className="grid grid-cols-[3fr_6fr_4fr_4fr_auto] gap-4 items-center">
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
                    <input
                      type="number"
                      placeholder="Monthly"
                      value={item.monthlyAmount}
                      onChange={(e) => handleChange(index, "monthlyAmount", e.target.value)}
                      onBlur={() => {
                        const value = parseFloat(item.monthlyAmount);
                        if (!isNaN(value)) {
                          handleChange(index, "monthlyAmount", value.toFixed(2));
                        }
                      }}
                      className={`border px-1 py-1 w-full text-left truncate ${isIncome ? "text-green-600" : "text-red-600"}`}
                    />
                    <input
                      type="number"
                      placeholder="Yearly"
                      value={item.yearlyAmount}
                      onChange={(e) => handleChange(index, "yearlyAmount", e.target.value)}
                      onBlur={() => {
                        const value = parseFloat(item.yearlyAmount);
                        if (!isNaN(value)) {
                          handleChange(index, "yearlyAmount", value.toFixed(2));
                        }
                      }}
                      className={`border px-1 py-1 w-full text-left truncate ${isIncome ? "text-green-600" : "text-red-600"}`}
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
      </main>
    </div>
  );
}
