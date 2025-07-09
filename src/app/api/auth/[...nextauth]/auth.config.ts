import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { hmacEmail } from "@/lib/crypto"; // make sure this is exported

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

        const emailHmac = hmacEmail(credentials.email);

        const rows = await db`
          SELECT id, password_hash
          FROM users
          WHERE external_id = ${emailHmac}
            AND auth_method = 'credentials'
          LIMIT 1
        `;

        const user = rows[0];

        if (!user || typeof user.password_hash !== "string") return null;

        const isValid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isValid) return null;

        return { id: user.id, email: credentials.email};
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile?.sub) {
        console.log("🔐 Sign-in callback - user:", user);
        console.log("Sign-in profile:", profile);

        const externalId = profile.sub;
        const email = profile.email;
        const isTestAccount = email === process.env.TEST_ACCOUNT_EMAIL;

        const existing = await db`
          SELECT id FROM users WHERE external_id = ${externalId}
        `;

        if (existing.length === 0) {
          const id = crypto.randomUUID(); // standard UUID for all users

          if (isTestAccount) {
            await db`
              INSERT INTO users (id, external_id, auth_method, email, created_at)
              VALUES (${id}, ${externalId}, 'google', ${email}, NOW())
            `;
          } else {
            const emailHmac = hmacEmail(email ? email : "");

            await db`
              INSERT INTO users (id, external_id, auth_method, created_at)
              VALUES (${id}, ${externalId}, 'google', NOW())
            `;
          }
        }
      }

      return true;
    },
    async session({ session, token }) {
      console.log("🔐 Session callback - token.sub:", token.sub);

      if (token.sub) {
        session.user.id = token.sub;

        const dbUser = await db`
        SELECT role FROM users WHERE id = ${token.sub}`;
        session.user.role = dbUser[0]?.role ?? "user";
      }

      console.log('Session: Returning session ', session)
      return session;
    },

    async jwt({ token, user, account, profile }) {
      console.log("🔐 JWT callback - token:", token);

      if(account) {
        if(account.provider === "google" && profile) {
          console.log("✅ JWT: Setting Token for Google User:", profile.sub);

          const [dbUser] = await db`
            SELECT id, role FROM users WHERE external_id = ${profile.sub}`;
          token.sub = dbUser.id;
          token.role = dbUser.role ?? "user";
        } else if(account.provider == "credentials" && user) {
          console.log("✅ JWT: Setting token for Credential User:", user.id);

          token.sub = user.id;
          token.role = user.role ?? "user";
          token.email = user.email;
        }
      }

      return token;
    },

    async redirect({ url, baseUrl }) {
      return baseUrl;
    },
  },
};
