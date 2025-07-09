"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export default function UserMenu({
  user,
}: {
  user?: { name?: string | null; email?: string | null };
}) {
  const [open, setOpen] = useState(false);

  if (!user) return null;

  // const initials = user.name
  //   ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
  //   : "U"; // fallback if no name

  const getInitials = (email?: string | null) => email != null ? email[0].toUpperCase() : "U";
  const initials = getInitials(user.email);

  const displayName = user.name ?? "User";
  const email = user.email ?? "";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold"
      >
        {initials}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-md z-50">
          <div className="px-4 py-2 text-sm text-gray-700">{displayName}</div>
          <div className="px-4 py-2 text-sm text-gray-700">{email}</div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
