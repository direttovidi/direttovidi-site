import Link from "next/link";

export default function AIExploreLandingPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-center">Analyze Your Budget with AI</h1>
            <p className="text-center text-gray-700 dark:text-gray-300">
                Use AI to gain insights into your financial plan. Start by choosing one of the focused question areas below.
            </p>

            <div className="px-6 bg-blue-50 border border-blue-300 text-blue-800 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700 p-4 rounded-md">
                <p className="font-medium mb-2">How It Works:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Select a topic area like Retirement or Spending.</li>
                    <li>Choose a saved budget from your account.</li>
                    <li>Pick a question and copy the AI prompt to your clipboard.</li>
                    <li>Paste the prompt into ChatGPT or your preferred AI assistant.</li>
                    <li>The budget is included and formatted for the AI (you don't need to understand the format).</li>
                </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Link
                    href="/tools/ai-explore/retirement"
                    className="block p-4 border rounded-md hover:shadow-md hover:border-blue-500 transition"
                >
                    <h2 className="text-lg font-semibold mb-1">📆 Retirement</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Understand withdrawal rates, sustainability, and future income needs.
                    </p>
                </Link>

                <Link
                    href="/tools/ai-explore/spending"
                    className="block p-4 border rounded-md hover:shadow-md hover:border-blue-500 transition"
                >
                    <h2 className="text-lg font-semibold mb-1">💸 Spending</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Explore how you're spending across needs, wants, and savings.
                    </p>
                </Link>

                <Link
                    href="/tools/ai-explore/custom"
                    className="block p-4 border rounded-md hover:shadow-md hover:border-blue-500 transition"
                >
                    <h2 className="text-lg font-semibold mb-1">✍️ Custom Question</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Craft your own question and get a tailored analysis.
                    </p>
                </Link>
            </div>
        </div>
    );
}
