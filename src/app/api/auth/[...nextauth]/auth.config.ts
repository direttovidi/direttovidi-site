import { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getUserByEmail } from "@/lib/queries";

export const authConfig: NextAuthConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
      return baseUrl; // or any page you want post-login
    },
  },
};
