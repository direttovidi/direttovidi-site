// src/app/tools/page.tsx
import Container from "@/app/_components/container";
import { redirect } from "next/navigation";
import { auth } from "@/app/auth";

export default async function ToolsPage() {
  const session = await auth();

  if (!session || session.user.role !== "admin") {
    // Option 1: Redirect away
    // redirect("/unauthorized");

    // Option 2: Or render a message
    return <div>Access denied</div>;
  }

  return (
    <main>
      <Container>
        <h1 className="text-3xl font-bold mt-8 mb-4">Tools</h1>
        <p className="text-gray-700 mb-6">
          Welcome to the Tools section. This is where you'll find interactive calculators, budgeting tools, and AI-powered assistants to help you with your financial planning.
        </p>

        <ul className="space-y-4">
          <li className="border p-4 rounded-md shadow-sm">
            <h2 className="text-xl font-semibold">Can I Afford This Apartment?</h2>
            <p className="text-sm text-gray-600">Estimate how much rent you can afford based on your income and spending habits.</p>
          </li>
          <li className="border p-4 rounded-md shadow-sm">
            <h2 className="text-xl font-semibold">Impact of a Big Purchase</h2>
            <p className="text-sm text-gray-600">Model how a large purchase affects your retirement withdrawals or budget.</p>
          </li>
          <li className="border p-4 rounded-md shadow-sm">
            <h2 className="text-xl font-semibold">Quick Budget Snapshot</h2>
            <p className="text-sm text-gray-600">Build a simple, categorized budget and see where your money is going.</p>
          </li>
        </ul>
      </Container>
    </main>
  );
}
