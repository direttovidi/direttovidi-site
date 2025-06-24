// app/tools/ai-explore/retirement/page.tsx (or pages/tools/ai-explore/retirement.tsx)

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const RETIREMENT_QUESTIONS = [
    {
        label: "Is my current withdrawal rate sustainable for 30 years?",
        prompt: `Please analyze whether the withdrawal rate in this retirement budget is sustainable over a 30-year period. 
                    Use both a Monte Carlo simulation (1,000+ simulations, using inflation-adjusted returns) and backtesting 
                    against multiple historical market return sequences (e.g., 1929, 1973, 2000, 1982). The total portfolio size is 
                    provided in the JSON as \`assetsEquities, assetsBonds, assetsCash\` — please extract it programmatically. Parse the JSON data 
                    programmatically (not manually), calculate total annual expenses, the withdrawal rate, and simulate whether 
                    the portfolio survives 30 years in each case.
                    For Monte Carlo, run 1,000 or more simulations using inflation-adjusted returns and return the probability 
                    of success, defined as the percentage of simulations where the portfolio does not run out of money.
                    For historical backtesting, simulate the portfolio against known challenging retirement years such as 1929, 
                    1973, 2000, and 1982. For each of these scenarios, return:
                    - Whether the portfolio survived the full 30 years
                    - The final portfolio value, formatted as currency
                    - If it failed, the year it ran out of money
                    Return a summary table showing these results for each historical scenario, along with the Monte Carlo success rate.
                    Please analyze whether the withdrawal rate in this budget is sustainable over a 30-year retirement. 
                    Consider portfolio size, expenses, and historical scenarios.`
    },
    {
        label: "How much more could I safely spend each year?",
        prompt: `Review this retirement budget and suggest how much additional spending could be safely added annually without significantly increasing risk. 
                Parse the JSON data programmatically (not manually).`
    },
    {
        label: "If the market dropped 20%, how would that affect my plan?",
        prompt: "Assume a 20% drop in portfolio value and reassess the sustainability of this retirement budget. Discuss trade-offs or risks."
    },
    {
        label: "Can I retire earlier based on this budget?",
        prompt: "Based on the savings and expenses in this budget, estimate if early retirement is feasible. Highlight assumptions."
    },
];

export default function RetirementExplorePage() {
    const [selectedBudget, setSelectedBudget] = useState<string>('');
    const [budgets, setBudgets] = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [budgetJson, setBudgetJson] = useState<string>('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetch('/api/tools/budgets')
            .then(res => res.json())
            .then(data => {
                const names = data.budgets.map((b: any) => b.name);
                setBudgets(names);
                if (names.length > 0) setSelectedBudget(names[0]);
            });
    }, []);

    useEffect(() => {
        if (!selectedBudget) return;
        fetch(`/api/tools/budget?name=${encodeURIComponent(selectedBudget)}`)
            .then(res => res.json())
            .then(data => {
                const cleaned = {
                    name: selectedBudget,
                    isRetired: data.budget?.is_retired ?? false,
                    assetsEquities: data.budget?.assets_equities ?? 0,
                    assetsBonds: data.budget?.assets_bonds ?? 0,
                    assetsCash: data.budget?.assets_cash ?? 0,
                    items: data.items,
                };
                setBudgetJson(JSON.stringify(cleaned, null, 2));
            });
    }, [selectedBudget]);

    const finalPrompt = `${RETIREMENT_QUESTIONS[selectedIndex].prompt}\n\n--- BUDGET JSON START ---\n${budgetJson}\n--- BUDGET JSON END ---`;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(finalPrompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            alert("Failed to copy prompt to clipboard.");
        }
    };

    return (
        <div className="px-4 sm:px-6 md:px-8 py-6 space-y-6">
            <h1 className="text-2xl font-bold">Retirement Questions</h1>

            <div className="space-y-2">
                <label className="block text-sm font-medium">Choose a Budget</label>
                <select
                    value={selectedBudget}
                    onChange={(e) => setSelectedBudget(e.target.value)}
                    className="border px-2 py-1 rounded w-full max-w-sm"
                >
                    {budgets.map((name) => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium">Select a Question</label>
                <ul className="space-y-2">
                    {RETIREMENT_QUESTIONS.map((q, i) => (
                        <li key={q.label}>
                            <label className="flex items-start gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="retirement-question"
                                    value={q.label}
                                    checked={selectedIndex === i}
                                    onChange={() => setSelectedIndex(i)}
                                />
                                <span>{q.label}</span>
                            </label>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="space-y-2">
                <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    {copied ? "Copied!" : "Copy Prompt for ChatGPT"}
                </button>
            </div>
            <details className="border rounded-md p-4 bg-blue-50 dark:bg-gray-800 dark:border-gray-700 mt-4">
                <summary className="font-semibold cursor-pointer text-blue-700 dark:text-blue-300">
                    💡 How to Use ChatGPT to Explore Budget Scenarios
                </summary>
                <div className="mt-2 text-sm text-gray-800 dark:text-gray-200 space-y-3">
                    <p>
                        You can use ChatGPT to explore what-if retirement scenarios — like adjusting your spending, testing different withdrawal rates, or stress-testing your plan.
                    </p>

                    <p className="text-sm font-medium">Here’s how:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>Use the <strong>“Copy Prompt”</strong> button above to copy your current budget and question.</li>
                        <li>Paste it into ChatGPT (or another AI tool).</li>
                        <li>
                            Ask follow-up questions like:
                            <ul className="list-disc list-inside ml-4 mt-1">
                                <li>“How can I reduce my monthly spending to get my withdrawal rate to 4%?”</li>
                                <li>“What happens if the market drops 25% this year?”</li>
                                <li>“Could I retire sooner if I cut discretionary expenses?”</li>
                            </ul>
                        </li>
                        <li>
                            Once you're happy with the revised budget, say:
                            <br />
                            <span className="italic text-sm text-gray-700 dark:text-gray-300">
                                “Now return only the updated budget in JSON format so I can import it into my tool.”
                            </span>
                        </li>
                        <li>Copy the AI's response and paste it into the Budget page's “Import” tab.</li>
                    </ol>

                    <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                        You can repeat this process with different questions to explore tradeoffs and opportunities.
                    </p>
                </div>
            </details>

        </div>
    );
}
