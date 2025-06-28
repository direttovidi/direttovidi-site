// src/lib/actions/signup.ts
"use server";

import bcrypt from "bcrypt";
import { db } from "@/lib/db";

export async function signupUser(email: string, password: string) {
    const hash = await bcrypt.hash(password, 10);

    await db`
    INSERT INTO users (email, password_hash, auth_method)
    VALUES (${email}, ${hash}, 'credentials')
    `;
}
