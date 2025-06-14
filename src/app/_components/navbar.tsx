"use client";

// src/app/_components/navbar.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const isToolsRoute = pathname.startsWith("/tools");

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
      <div className="flex justify-between items-center max-w-5xl mx-auto">
        <div className="space-x-6">
          <Link href="/" className="text-gray-700 hover:text-blue-600">
            Home
          </Link>
          <Link href="/tools" className="text-gray-700 hover:text-blue-600">
            Tools
          </Link>

          {isToolsRoute ? (
            <>
              <Link href="/tools/budget" className="text-gray-700 hover:text-blue-600">Budget</Link>
              <Link href="/tools/budgets" className="text-gray-700 hover:text-blue-600">Budgets</Link>
              <Link href="/tools/summary" className="text-gray-700 hover:text-blue-600">Summary</Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-700 hover:text-blue-600">
                Login
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-blue-600">
                About
              </Link>
            </>
          )}

        </div>
      </div>
    </nav>
  );
}

