import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const existing = await db`
            SELECT id FROM users WHERE email = ${email}
    `;

        if (existing.length > 0) {
            return NextResponse.json({ error: "User already exists" }, { status: 409 });
        }

        const password_hash = await bcrypt.hash(password, 10);

        await db`
            INSERT INTO users (email, password_hash, auth_method)
            VALUES (${email}, ${password_hash}, 'credentials')
        `;

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Signup error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
