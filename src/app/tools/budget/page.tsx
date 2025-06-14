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
  const [switchMonth, setSwitchMonth] = useState<number | null>(null);
  const [switchYear, setSwitchYear] = useState<number | null>(null);

  const [items, setItems] = useState<BudgetItem[]>([
    { category: "", amount: "", type: "Need" },
  ]);

  const [history, setHistory] = useState<{ month: number; year: number; label: string }[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<{ month: number; year: number } | null>(null);

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
        setSwitchMonth(resolvedMonth);
        setSwitchYear(resolvedYear);

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

    const fetchHistory = async () => {
      const res = await fetch("/api/tools/budgets");
      const data = await res.json();
      setHistory(
        data.budgets.map((b: { month: number; year: number }) => ({
          ...b,
          label: `${new Date(b.year, b.month - 1).toLocaleString("default", { month: "long" })} ${b.year}`
        }))
      );
    };

    fetchBudget();
    fetchHistory();
  }, []);

  const loadFromHistory = async (month: number, year: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tools/budget?month=${month}&year=${year}`);
      const data = await res.json();
      const fetchedItems: BudgetItem[] = data.items || [];

      const netIncomeItem = fetchedItems.find(i => i.category === "Net Income");
      const otherItems = fetchedItems.filter(i => i.category !== "Net Income");

      const netIncome = netIncomeItem ?? { category: "Net Income", amount: "", type: "Income" };

      setItems([netIncome, ...otherItems]);
    } catch (err) {
      console.error("Error loading from history:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = () => {
    setItems([...items, { category: "", amount: "", type: "Need" }]);
  };

  const handleChange = (index: number, field: keyof BudgetItem, value: string) => {
    setItems((prevItems) => {
      const updated = [...prevItems];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filteredItems = items.filter((item) => item.category.trim() !== "");
    if (filteredItems.length === 0) {
      alert("Cannot submit an empty budget.");
      return;
    }
    const response = await fetch("/api/tools/budget", {
      method: "POST",
      body: JSON.stringify({ month, year, items }),
      headers: { "Content-Type": "application/json" },
    });
    if (response.ok) {
      alert("Budget saved!");
    } else {
      alert("Failed to save budget.");
    }
  };

  const handleDeleteItem = async (index: number, category: string) => {
    const confirmed = confirm(`Delete category "${category}"?`);
    if (!confirmed) return;
    const response = await fetch("/api/tools/budget", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, year, category }),
    });
    if (response.ok) {
      setItems((prev) => prev.filter((_, i) => i !== index));
    } else {
      alert("Failed to delete item.");
    }
  };

  useEffect(() => {
    console.log("Checking Create button state");
    console.log("switchMonth:", switchMonth);
    console.log("switchYear:", switchYear);
    console.log("Conflict exists:", history.some(h => h.month === switchMonth && h.year === switchYear));
  }, [switchMonth, switchYear, history]);

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
        <h2 className="font-semibold mb-2 text-center">Budget To Create</h2>
        <div className="flex gap-2">
          <select
            value={switchMonth ?? new Date().getMonth() + 1}
            onChange={
              (e) => {
                console.log("Create New Budget: Switch month changed:", e.target.value);
                setSwitchMonth(Number(e.target.value))
              }
            }
            className="border px-2 py-1 w-full"
          >
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={switchYear ?? new Date().getFullYear()}
            onChange={(e) => setSwitchYear(Number(e.target.value))}
            className="border px-2 py-1 w-20"
          />
        </div>
        <div className="flex justify-center">
          <button
            disabled={!switchMonth || !switchYear || history.some(h => h.month === switchMonth && h.year === switchYear)}
            onClick={async () => {
              const netIncome: BudgetItem = { category: "Net Income", amount: "", type: "Income" };
              setItems([netIncome]);
              setMonth(switchMonth);
              setYear(switchYear);
            }
            }
            className={`w-fit mt-4 px-3 py-1 rounded text-white ${history.some(h => h.month === switchMonth && h.year === switchYear) ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
          >
            Create New Budget
          </button>
        </div>
        <div className="my-4 text-sm font-semibold text-gray-500 text-center">OR</div>
        <div className="space-y-2 mb-4">
          <select
            onChange={(e) => {
              const [srcMonth, srcYear] = e.target.value.split('-').map(Number);
              setSelectedHistory({ month: srcMonth, year: srcYear });
            }}
            className="border px-2 py-1 w-full"
          >
            <option value="">Select existing budget...</option>
            {history.map((b) => (
              <option key={`${b.month}-${b.year}`} value={`${b.month}-${b.year}`}>
                {b.label}
              </option>
            ))}
          </select>
          <div className="flex justify-center">
            <button
              disabled={!selectedHistory || selectedHistory.month === 0 || selectedHistory.year === 0 || history.some(h => h.month === switchMonth && h.year === switchYear)}
              onClick={async () => {
                if (!selectedHistory) return;
                const res = await fetch(`/api/tools/budget?month=${selectedHistory.month}&year=${selectedHistory.year}`);
                const data = await res.json();
                const fetchedItems: BudgetItem[] = data.items || [];

                const netIncomeItem = fetchedItems.find(i => i.category === "Net Income");
                const otherItems = fetchedItems.filter(i => i.category !== "Net Income");

                const netIncome = netIncomeItem ?? { category: "Net Income", amount: "", type: "Income" };

                setItems([netIncome, ...otherItems]);
              }}
              className={`px-3 py-1 mt-2 rounded text-white ${history.some(h => h.month === switchMonth && h.year === switchYear) ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
            >
              Copy Existing Budget
            </button>
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-2 text-center">Existing Budgets</h2>
        </div>
        <ul className="space-y-2 flex flex-col items-center">
          {history.map((b) => (
            <li key={`${b.month}-${b.year}`}>
              <button
                className="text-blue-600 hover:underline"
                onClick={() => {
                  setMonth(month);
                  setYear(year);
                  loadFromHistory(b.month, b.year);
                }}
              >
                {b.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex-1 p-6">
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6">
          <div className="text-lg font-semibold">
            Editing Budget for: {month && year ? `${new Date(year, month - 1).toLocaleString("default", { month: "long" })} ${year}` : "Loading..."}
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-4 font-semibold text-sm text-gray-700 dark:text-gray-300">
              <div>Type</div>
              <div>Category</div>
              <div>Amount</div>
              <div />
            </div>
            {items.map((item, index) => {
              const isIncome = item.category === "Net Income";
              return (
                <div key={index} className="grid grid-cols-4 gap-4 items-center">
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
                    onChange={(e) => !isIncome && handleChange(index, "category", e.target.value)}
                    className={`border px-2 py-1 flex-1 ${isIncome ? "bg-gray-100" : ""}`}
                    readOnly={isIncome}
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={item.amount}
                    onChange={(e) => handleChange(index, "amount", e.target.value)}
                    className={`border px-2 py-1 w-32 ${isIncome ? "text-green-600" : "text-red-600"}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(index, item.category)}
                    className={`text-red-500 text-sm ml-2 ${isIncome ? "invisible" : ""}`}
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
      </main>
    </div>
  );
}
