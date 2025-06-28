import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { getUserByEmail } from "@/lib/queries";
import { db } from "@/lib/db";

export const authConfig: NextAuthConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          !credentials ||
          typeof credentials.email !== "string" ||
          typeof credentials.password !== "string"
        ) {
          return null;
        }

        const rows = await db`
          SELECT id, email, password_hash
          FROM users
          WHERE email = ${credentials.email}
            AND auth_method = 'credentials'
          LIMIT 1
        `;
        const user = rows[0];

        if (!user || typeof user.password_hash !== "string") return null;

        const isValid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isValid) return null;

        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user?.email) {
        const dbUser = await getUserByEmail(session.user.email);
        session.user.role = dbUser?.role ?? "user";
      }
      return session;
    },
    async jwt({ token }) {
      if (token.email) {
        const dbUser = await getUserByEmail(token.email as string);
        token.role = dbUser?.role ?? "user";
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      return baseUrl;
    },
  },
};
