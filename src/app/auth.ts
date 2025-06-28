// src/auth.ts
import NextAuth from "next-auth";
import  { authConfig } from "@/app/api/auth/[...nextauth]/auth.config";

const {
  auth,
  handlers: { GET, POST },
  signIn,
  signOut,
} = NextAuth(authConfig);

export { GET, POST, signIn, signOut, auth };