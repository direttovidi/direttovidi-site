// src/auth.ts
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import  { authConfig } from "@/app/api/auth/[...nextauth]/auth.config";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);
