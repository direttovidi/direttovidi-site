import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hmacEmail } from "@/lib/crypto";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const emailHmac = hmacEmail(email);
        const existing = await db`
        SELECT id FROM users WHERE external_id = ${emailHmac}`;

        if (existing.length > 0) {
            return NextResponse.json({ error: "User already exists" }, { status: 409 });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const isTestAccount = email === process.env.TEST_ACCOUNT_EMAIL;

        if (isTestAccount) {
            await db`
            INSERT INTO users (external_id, password_hash, auth_method, email, created_at)
            VALUES (${emailHmac}, ${password_hash}, 'credentials', ${email}, ${new Date()})
            ON CONFLICT DO NOTHING
            `;
        } else {
            await db`
            INSERT INTO users (external_id, password_hash, auth_method, created_at)
            VALUES (${emailHmac}, ${password_hash}, 'credentials', ${new Date()})
            ON CONFLICT DO NOTHING
            `;
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Signup error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
