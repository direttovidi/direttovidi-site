import { db } from "@/lib/db";

export async function getUserByEmail(email: string) {
  const result = await db`
    SELECT * FROM users WHERE email = ${email} LIMIT 1;
  `;
  return result[0];
}
