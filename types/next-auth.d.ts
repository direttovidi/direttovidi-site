import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string; // 👈 add this
    };
  }

  interface User {
    role?: string; // 👈 also extend the User object (for jwt and db)
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
  }
}
