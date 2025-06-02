// src/app/_components/navbar.tsx
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
      <div className="flex justify-between items-center max-w-5xl mx-auto">
        <Link href="/" className="text-xl font-bold text-blue-600">
          DirettoVidi
        </Link>
        <div className="space-x-4">
          <Link href="/" className="text-gray-700 hover:text-blue-600">
            Home
          </Link>
          <Link href="/about" className="text-gray-700 hover:text-blue-600">
            About
          </Link>
          <Link href="/tools" className="text-gray-700 hover:text-blue-600">
            Tools
          </Link>
          <Link href="/login" className="text-gray-700 hover:text-blue-600">
            Login
          </Link>
        </div>
      </div>
    </nav>
  );
}
