"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function BudgetCreator() {

  type BudgetItem = {
    category: string;
    amount: string;
    type: "Need" | "Want" | "Income";
  };

  const searchParams = useSearchParams();
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState<BudgetItem[]>([
    { category: "", amount: "", type: "Need" }, // Default empty item
  ]);

  // Fetch existing budget on load or when month/year changes
  useEffect(() => {
    const fetchBudget = async () => {
      setLoading(true);
      try {
        let resolvedMonth: number | null = null;
        let resolvedYear: number | null = null;

        const urlMonth = searchParams.get("month");
        const urlYear = searchParams.get("year");

        if (urlMonth !== null && urlYear !== null) {
          resolvedMonth = parseInt(urlMonth);
          resolvedYear = parseInt(urlYear);
        } else {
          const latestRes = await fetch("/api/tools/budget/latest");
          if (latestRes.ok) {
            const latest = await latestRes.json();
            if (latest?.month && latest?.year) {
              resolvedMonth = latest.month;
              resolvedYear = latest.year;
            }
          }
        }

        if (resolvedMonth === null || resolvedYear === null) {
          resolvedMonth = 1;
          resolvedYear = new Date().getFullYear();
        }

        setMonth(resolvedMonth);
        setYear(resolvedYear);

        const res = await fetch(`/api/tools/budget?month=${resolvedMonth}&year=${resolvedYear}`);
        if (!res.ok) {
          console.error("Failed to fetch budget");
          return;
        }

        const data = await res.json();
        let fetchedItems: BudgetItem[] = data.items || [];

        const netIncomeItem = fetchedItems.find(i => i.category === "Net Income");
        fetchedItems = fetchedItems.filter(i => i.category !== "Net Income");

        if (netIncomeItem !== undefined) {
          fetchedItems = [netIncomeItem, ...fetchedItems];
        } else {
          fetchedItems = [{ category: "Net Income", amount: "", type: "Income" }, ...fetchedItems];
        }

        setItems(fetchedItems);
      } catch (err) {
        console.error("Error fetching budget:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBudget();
  }, []);

  const handleAddRow = () => {
    console.log("Adding new row");
    setItems([...items, { category: "", amount: "", type: "Need" }]);
  };

  const handleChange = (
    index: number,
    field: keyof BudgetItem,
    value: string
  ) => {
    setItems((prevItems) => {
      const updated = [...prevItems];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const filteredItems = items.filter(
      (item) => item.category.trim() !== ""
    );

    if (filteredItems.length === 0) {
      alert("Cannot submit an empty budget.");
      return;
    }

    const response = await fetch("/api/tools/budget", {
      method: "POST",
      body: JSON.stringify({ month, year, items }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      alert("Budget saved!");
    } else {
      alert("Failed to save budget.");
    }
  };

  const handleDeleteItem = async (index: number, category: string) => {
    console.log(`Deleting item at index ${index}, category: ${category}`);
    const confirmed = confirm(`Delete category "${category}"?`);
    if (!confirmed) return;

    const response = await fetch("/api/tools/budget", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ month, year, category }),
    });

    if (response.ok) {
      setItems((prev) => prev.filter((_, i) => i !== index));
    } else {
      alert("Failed to delete item.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-6 space-y-6">
      <div className="flex gap-4">
        <label>
          Month:
          <input
            type="number"
            min="1"
            max="12"
            value={month ?? ""}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="ml-2 w-16 border px-2"
          />
        </label>
        <label>
          Year:
          <input
            type="number"
            value={year ?? ""}
            onChange={(e) => setYear(Number(e.target.value))}
            className="ml-2 w-24 border px-2"
          />
        </label>
      </div>

      <div className="space-y-2">
        {/* Header row */}
        <div className="flex gap-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
          <div className="flex-1">Category</div>
          <div className="w-32 px-2">Amount</div>
          <div className="w-6" /> {/* Empty cell for delete icon */}
        </div>

        {items.map((item, index) => {
          const isIncome = item.category === "Net Income";

          return (
            <div key={index} className="flex gap-4 items-center">
              <select
                value={item.type}
                onChange={(e) => handleChange(index, "type", e.target.value)}
                className="border px-2 py-1 w-32"
              >
                <option value="Need">Need</option>
                <option value="Want">Want</option>
                <option value="Income">Income</option>
              </select>
              <input
                type="text"
                placeholder="Category"
                value={item.category}
                onChange={(e) =>
                  !isIncome && handleChange(index, "category", e.target.value)
                }
                className={`border px-2 py-1 flex-1 ${isIncome ? "bg-gray-100" : ""}`}
                readOnly={isIncome}
              />
              <input
                type="number"
                placeholder="Amount"
                value={item.amount}
                onChange={(e) => handleChange(index, "amount", e.target.value)}
                className={`border px-2 py-1 w-32 ${isIncome ? "text-green-600" : "text-red-600"
                  }`}
              />
              <button
                type="button"
                onClick={() => handleDeleteItem(index, item.category)}
                className={`text-red-500 text-sm ml-2 ${isIncome ? "invisible" : ""
                  }`}
                disabled={isIncome}
                title={isIncome ? "Cannot delete Net Income" : ""}
              >
                ✕
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={handleAddRow}
          className="text-blue-600 underline text-sm"
        >
          + Add Category
        </button>
      </div>

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Save Budget
      </button>
    </form>
  );
}
