// src/app/api/auth/[...nextauth]/route.ts
import { db } from "@/lib/db"; // Your Neon client
import { GET, POST } from "@/app/auth";
import { authConfig } from "@/app/api/auth/[...nextauth]/auth.config";

export { GET, POST };
