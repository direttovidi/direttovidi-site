"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import { NumericFormat } from 'react-number-format';
import { formatCurrency } from "@/lib/format";
import { useBudgetImportStore } from "@/store/budgetImportStore";
import { useRouter } from "next/navigation";
import { extractJsonObjects } from "@/lib/jsonExtractor";

const isBudgetItem = (item: any) =>
  item &&
  typeof item.category === "string" &&
  typeof item.type === "string" &&
  ["Need", "Want", "Income", "Savings"].includes(item.type) &&
  (
    typeof item.monthlyAmount === "number" ||
    typeof item.monthlyAmount === "string" ||
    typeof item.yearlyAmount === "number" ||
    typeof item.yearlyAmount === "string"
  );

function isLikelyBudget(obj: any): boolean {
  if (!obj || typeof obj !== "object") return false;
  if (!Array.isArray(obj.items)) return false;
  if (obj.items.length === 0) return false;
  const validItems = obj.items.filter(isBudgetItem);
  return validItems.length / obj.items.length > 0.6; // 60%+ must look valid
}

export default function BudgetCreator() {
  console.log('BudgetCreator rendered');
  type BudgetItem = {
    category: string;
    monthlyAmount: string;
    yearlyAmount: string;
    type: "Need" | "Want" | "Income" | "Savings";
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
  const [importError, setImportError] = useState('');

  // Asset breakdown inputs
  const [assetsEquities, setAssetsEquities] = useState<string>("");
  const [assetsBonds, setAssetsBonds] = useState<string>("");
  const [assetsCash, setAssetsCash] = useState<string>("");
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [renameSuccess, setRenameSuccess] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [importText, setImportText] = useState("");
  const [sidebarMode, setSidebarMode] = useState<"create" | "import">("create");

  // Sum up assets
  const totalAssetsSum =
    parseFloat(assetsEquities || "0") +
    parseFloat(assetsBonds || "0") +
    parseFloat(assetsCash || "0");

  // Avoid division by zero
  const equitiesPct = totalAssetsSum > 0
    ? (parseFloat(assetsEquities) / totalAssetsSum) * 100
    : 0;
  const bondsPct = totalAssetsSum > 0
    ? (parseFloat(assetsBonds) / totalAssetsSum) * 100
    : 0;
  const cashPct = totalAssetsSum > 0
    ? (parseFloat(assetsCash) / totalAssetsSum) * 100
    : 0;

  type ImportedBudget = {
    name?: string;
    items: BudgetItem[];
    isRetired?: boolean;
    totalAssets?: number | null;
  };

  const [importParsed, setImportParsed] = useState<ImportedBudget | null>(null);
  const [importing, setImporting] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

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
              assetsEquities: parseFloat(assetsEquities || "0"),
              assetsBonds: parseFloat(assetsBonds || "0"),
              assetsCash: parseFloat(assetsCash || "0"),
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
  }, [items, newName, currentName, isRetired, totalAssetsSum]);

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
        assetsEquities: parseFloat(assetsEquities || "0"),
        assetsBonds: parseFloat(assetsBonds || "0"),
        assetsCash: parseFloat(assetsCash || "0"),
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
        setAssetsEquities(data.budget.assets_equities?.toString() ?? "")
        setAssetsBonds(data.budget.assets_bonds?.toString() ?? "")
        setAssetsCash(data.budget.assets_cash?.toString() ?? "")

        const fetchedItems: BudgetItem[] = (data.items || []).map((item: any) => ({
          category: item.category,
          monthlyAmount: item.monthlyAmount ? Number(item.monthlyAmount).toFixed(2) : "",
          yearlyAmount: item.yearlyAmount ? Number(item.yearlyAmount).toFixed(2) : "",
          type: item.type,
        }));

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

  //The budget table has monthly and yearly values. Depending on what is changed, the other value
  //needs to be computed.
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
      } else if (field === "type") {
        item.type = value as "Need" | "Want" | "Income" | "Savings";
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
    setItems([{ category: "", monthlyAmount: "", yearlyAmount: "", type: "Need" }]);

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

    const newItems = fetchedItems;

    const originalExists = history.includes(newBudgetName);

    const saveRes = await fetch("/api/tools/budget", {
      method: "POST",
      body: JSON.stringify({
        name: newBudgetName,
        originalName: originalExists ? newBudgetName : "", // ✅ fix here
        items: newItems,
        isRetired,
        assetsEquities: parseFloat(assetsEquities || "0"),
        assetsBonds: parseFloat(assetsBonds || "0"),
        assetsCash: parseFloat(assetsCash || "0"),
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

  const withdrawalRate = totalAssetsSum > 0
    ? (yearlyTotal / totalAssetsSum) * 100
    : 0;

  const needsWithdrawalRate = totalAssetsSum > 0
    ? (needs * 12 / totalAssetsSum) * 100
    : 0;

  const wantsWithdrawalRate = totalAssetsSum > 0
    ? (wants * 12 / totalAssetsSum) * 100
    : 0;

  const totalIncome = items
    .filter((i) => i.type === "Income")
    .reduce((sum, i) => sum + parseFloat(i.yearlyAmount || "0"), 0);

  const totalMonthlyIncome = items
    .filter((i) => i.type === "Income")
    .reduce((sum, i) => sum + parseFloat(i.monthlyAmount || "0"), 0);

  const totalExpenses = items
    .filter((i) => i.type !== "Income")
    .reduce((sum, i) => sum + parseFloat(i.yearlyAmount || "0"), 0);

  const totalMonthlyExpenses = items
    .filter((i) => i.type !== "Income")
    .reduce((sum, i) => sum + parseFloat(i.monthlyAmount || "0"), 0);

  const savings = items
    .filter((item) => item.type === "Savings")
    .reduce((sum, item) => sum + parseFloat(item.monthlyAmount || "0"), 0);

  const netAnnual = totalIncome - totalExpenses;
  const netMonthly = totalMonthlyIncome - totalMonthlyExpenses;

  const needsPct = income > 0 ? (needs / income) * 100 : 0;
  const wantsPct = income > 0 ? (wants / income) * 100 : 0;
  const savePct = income > 0 ? (savings / income) * 100 : 0;

  const router = useRouter();
  const setDraft = useBudgetImportStore((s) => s.setDraft);

  useEffect(() => {
    if (!importText.trim()) {
      setImportError("");  // 🔹 Clear the error if the user deletes the input
      return;
    }

    if (importText.length > 100_000) {
      setImportParsed(null);
      setImportError("The pasted input is too large to process. Please shorten it.");
      return;
    }

    try {
      const cleaned = importText
        .replace(/“|”/g, '"')
        .replace(/‘|’/g, "'")
        .replace(/\u200B/g, '') // zero-width space
        .trim();

      const allObjects = extractJsonObjects(cleaned);

      // Helper functions — put these above or in a utils file if not already
      const candidates = allObjects.filter(isLikelyBudget);

      if (candidates.length === 0) {
        throw new Error("No valid budget objects found");
      }

      const best = candidates.reduce((a, b) =>
        b.items.length > a.items.length ? b : a
      );

      // Success: set and navigate
      setDraft(best);
      setImportError(""); // clear any previous error
      router.push("/tools/budget/import-preview");
    }
    catch (err) {
      console.error("Failed to parse import JSON", err);
      setImportParsed(null);
      setImportError(`Hmm, we couldn’t read that budget. Make sure you pasted the entire response from the AI — 
        including the part that says 'items' and the list of categories. Try copying and pasting again.`);
    }
  }, [importText]);


  const handleImportJson = async () => {
    try {
      const parsed = JSON.parse(importText);
      if (!parsed || !parsed.items || !Array.isArray(parsed.items)) {
        alert("Invalid format: missing items array.");
        return;
      }

      let baseName = newBudgetName.trim() || "Imported Budget";
      let uniqueName = baseName;
      let counter = 1;

      // Generate a unique name if there's a conflict
      while (history.includes(uniqueName)) {
        uniqueName = `${baseName}-${counter}`;
        counter++;
      }

      setImporting(true); // ⏳ Start spinner

      const importedItems: BudgetItem[] = parsed.items.map((item: any) => ({
        category: item.category,
        monthlyAmount: item.monthlyAmount?.toString() || "",
        yearlyAmount: item.yearlyAmount?.toString() || "",
        type: item.type,
      }));

      const allItems = importedItems; // no injection or reordering

      const saveRes = await fetch("/api/tools/budget", {
        method: "POST",
        body: JSON.stringify({
          name: uniqueName,
          originalName: "", // always treat as new
          items: allItems,
          isRetired: parsed.isRetired || false,
          totalAssets: parsed.totalAssets ?? null,
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (!saveRes.ok) {
        const errorText = await saveRes.text();
        throw new Error("Failed to import: " + errorText);
      }

      setItems(allItems);
      setName(uniqueName);
      setCurrentName(uniqueName);
      setNewName(uniqueName);
      setIsRetired(parsed.isRetired || false);
      setAssetsEquities(parsed.assetsEquities?.toString() ?? "");
      setAssetsBonds(parsed.assetsBonds?.toString() ?? "");
      setAssetsCash(parsed.assetsCash?.toString() ?? "");

      const historyRes = await fetch("/api/tools/budgets");
      if (historyRes.ok) {
        const data = await historyRes.json();
        const names = data.budgets.map((b: any) => b.name);
        setHistory(names);
      }

      setImportText("");
      setImportParsed(null);
      setNewBudgetName("");
      setSidebarMode("create");
    } catch (err) {
      alert("Failed to import. Please make sure it's valid JSON.");
      console.error(err);
    } finally {
      setImporting(false); // ⏹️ Stop spinner
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
    <div className="flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 border-t lg:border-t-0 lg:border-r p-4 order-3 lg:order-1">
        {/* Toggle Buttons */}
        {/* Tab-style toggle buttons */}
        <div className="mb-4 border-b border-gray-300 dark:border-gray-700">
          <nav className="flex">
            <button
              onClick={() => setSidebarMode("create")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-150 ${sidebarMode === "create"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-blue-600 hover:border-blue-300"
                }`}
            >
              + Create New
            </button>
            <button
              onClick={() => setSidebarMode("import")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-150 ${sidebarMode === "import"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-blue-600 hover:border-blue-300"
                }`}
            >
              ⇪ Import
            </button>
          </nav>
        </div>

        {/* Import Section */}
        {sidebarMode === "import" && (
          <div className="mt-4">
            {!importParsed ? (
              <>
                <label htmlFor="importJson" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Paste Budget (copied from ChatGPT)
                </label>
                <textarea
                  id="importJson"
                  rows={1}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full border p-2 rounded text-sm"
                  placeholder='Paste budget here ...'
                />
                {importError && (
                  <p className="text-red-600 text-sm mt-2">{importError}</p>
                )}
              </>
            ) : (
              <>
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Budget detected: <strong>{newBudgetName || "Unnamed Budget"}</strong><br />
                    Categories: <strong>{Array.isArray(importParsed.items) ? importParsed.items.length : 0}</strong>
                  </p>

                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Enter New Budget Name
                  </label>
                  <input
                    type="text"
                    value={newBudgetName}
                    onChange={(e) => setNewBudgetName(e.target.value)}
                    className="border px-2 py-1 w-full mb-2"
                    placeholder="Enter a new name"
                  />

                  <button
                    onClick={handleImportJson}
                    disabled={importing}
                    className={`w-full px-3 py-1 rounded text-white flex justify-center items-center gap-2
                      ${importing ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}
                  >
                    {importing && (
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    )}
                    Import Budget
                  </button>
                  <button
                    onClick={() => {
                      setImportText("");
                      setImportParsed(null);
                      setNewBudgetName("");
                      setSidebarMode("create"); // optional
                    }}
                    className="mt-3 w-full px-3 py-1 border border-gray-400 rounded text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Cancel Import
                  </button>
                </>
              </>
            )}
          </div>
        )}

        {/* Create Section */}
        {sidebarMode === "create" && (
          <>
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
              onClick={async () => {
                setCopying(true); // start spinner
                await handleCopyFrom();
                setCopying(false); // stop spinner
                setCopyFrom("")
              }}
              disabled={!copyFrom.trim() || history.includes(newBudgetName) || copying}
              className={`w-full px-3 py-1 mb-4 rounded text-white ${!copyFrom.trim() || history.includes(newBudgetName) || copying
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
                } flex items-center justify-center gap-2`}
            >
              {copying ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Copying...
                </>
              ) : (
                "Copy From Existing"
              )}
            </button>          </>
        )}

        {/* Always Show Budget History */}
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

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-6 flex flex-col lg:flex-row gap-6 order-2 lg:order-2">
        {/* Budget Form Section */}
        <div className="w-full lg:max-w-2xl order-2 lg:order-2">
          {/* Inline editing header */}
          <form onSubmit={handleSubmit} className="space-y-6">
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
                const amountClass = item.type === "Income"
                  ? "text-green-700 dark:text-green-300"
                  : "text-red-700 dark:text-red-300";
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
                      disabled={false}
                    >
                      <option value="Need">Need</option>
                      <option value="Want">Want</option>
                      <option value="Income">Income</option>
                      <option value="Savings">Savings</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Category"
                      value={item.category}
                      onChange={(e) => handleChange(index, "category", e.target.value)}
                      className={`border px-1 py-1 w-full`}
                      readOnly={false}
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
                      className={`border px-1 py-1 w-[120px] sm:w-[140px] text-left ${amountClass}`}
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
                      className={`border px-1 py-1 w-[120px] sm:w-[140px] text-left ${amountClass}`}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(index, item.category)}
                      className={`text-red-500 text-sm`}
                      disabled={false}
                      title=""
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleAddRow}
                className={`text-sm underline ${name ? "text-blue-600 hover:text-blue-800" : "text-gray-400 cursor-not-allowed"}`}
                disabled={!name}
              >
                + Add Category
              </button>
            </div>
          </form>
        </div>

        {/* Asset Breakdown Panel */}
        <div className="w-full lg:w-[300px] flex flex-col gap-6 shrink-0 lg:sticky lg:top-4 lg:self-start lg:order-3">
          <div className="border rounded-md p-4 shadow-sm bg-white dark:bg-gray-900">
            <h3 className="text-md font-semibold mb-4">Asset Breakdown</h3>
            {[
              { label: "Equities", value: assetsEquities, onChange: setAssetsEquities },
              { label: "Bonds", value: assetsBonds, onChange: setAssetsBonds },
              { label: "Cash", value: assetsCash, onChange: setAssetsCash },
            ].map(({ label, value, onChange }) => (
              <div key={label} className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {label}
                </label>
                <NumericFormat
                  value={value}
                  thousandSeparator
                  prefix="$"
                  decimalScale={2}
                  fixedDecimalScale
                  allowNegative={false}
                  onValueChange={({ floatValue }) => {
                    onChange((floatValue ?? 0).toString());
                  }}
                  className="border px-2 py-1 w-full"
                  placeholder="0"
                />
              </div>
            ))}

            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Assets:{" "}
              <strong>
                {formatCurrency(
                  parseFloat(assetsEquities || "0") +
                  parseFloat(assetsBonds || "0") +
                  parseFloat(assetsCash || "0")
                )}
              </strong>
            </div>
          </div>

          {/* Metrics */}
          <div className="border rounded-md p-4 shadow-sm bg-white dark:bg-gray-900">
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Retired?</span>
                <button
                  onClick={() => setIsRetired(!isRetired)}
                  className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${isRetired ? "bg-blue-600" : "bg-gray-400"
                    }`}
                  role="switch"
                  aria-checked={isRetired}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-300 ${isRetired ? "translate-x-4" : ""
                      }`}
                  />
                </button>
              </div>
            </div>
            <h3 className="text-md font-semibold mb-2">
              {isRetired ? "Retirement Metrics" : "Income Allocation"}
            </h3>
            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li>
                Total Income: <strong>${totalMonthlyIncome.toLocaleString()}</strong>/mo • <strong>${totalIncome.toLocaleString()}</strong>/yr
              </li>
              <li>Total Expenses (Yearly): <strong>${totalExpenses.toLocaleString()}</strong></li>
              <li>Total Expenses (Monthly): <strong>${totalMonthlyExpenses.toLocaleString()}</strong></li>
              <li>
                Net: <strong>${netMonthly.toLocaleString()}</strong>/mo • <strong>${netAnnual.toLocaleString()}</strong>/yr
              </li>
              <li>
                Needs: <strong>${needs.toLocaleString()}</strong>/mo • <strong>${(needs * 12).toLocaleString()}</strong>/yr
              </li>
              <li>
                Wants: <strong>${wants.toLocaleString()}</strong>/mo • <strong>${(wants * 12).toLocaleString()}</strong>/yr
              </li>
              {/* Asset Allocation */}
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
                  <li>Savings: <strong>{savePct.toFixed(1)}%</strong> of income</li>              </>
              )}
            </ul>
            <h3 className="mt-4 text-md font-semibold text-gray-800 dark:text-gray-300">Asset Allocation</h3>
            <ul>
              <li className="flex items-center gap-2 text-xs text-gray-800 dark:text-gray-300">
                <span className="w-20 text-gray-500">Equities</span>
                <span><strong>{equitiesPct.toFixed(1)}%</strong></span>
              </li>
              <li className="flex items-center gap-2 text-xs text-gray-800 dark:text-gray-300">
                <span className="w-20 text-gray-500">Bonds</span>
                <span><strong>{bondsPct.toFixed(1)}%</strong></span>
              </li>
              <li className="flex items-center gap-2 text-xs text-gray-800 dark:text-gray-300">
                <span className="w-20 text-gray-500">Cash</span>
                <span><strong>{cashPct.toFixed(1)}%</strong></span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
