// src/lib/server-only-auth.ts
import NextAuth from "next-auth";
import { auth as baseAuth } from "@/app/auth"; // this is the function from NextAuth
import { authConfig } from "@/app/api/auth/[...nextauth]/auth.config";

export const {
    handlers: { GET, POST },
    signIn,
    signOut,
} = NextAuth(authConfig);

export async function getServerAuth() {
  return await baseAuth(); // <-- now returns session
}