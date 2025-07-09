// import NextAuth from "next-auth";
import type { Session as NextAuthSession, User as NextAuthUser } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session extends NextAuthSession {
    user: NextAuthUser &{
      id: string; //
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string; // 👈 add this
    };
  }

  interface User extends NextAuthUser {
    id: string; //
    role?: string; // 👈 also extend the User object (for jwt and db)
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    sub: string; // user ID
    role?: string;
  }
}
