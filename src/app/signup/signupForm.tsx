// src/app/signup/SignupForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupForm() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const res = await fetch("/api/signup", {
            method: "POST",
            body: JSON.stringify({ email, password }),
            headers: { "Content-Type": "application/json" },
        });

        if (res.ok) {
            router.push("/signin");
        } else {
            const { error } = await res.json();
            setError(error || "Signup failed");
        }
    }

    return (
        <div className="max-w-sm mx-auto mt-10">
            <h1 className="text-2xl font-bold mb-4">Create Account</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border rounded p-2"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border rounded p-2"
                        required
                    />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">
                    Sign Up
                </button>
            </form>
        </div>
    );
}
