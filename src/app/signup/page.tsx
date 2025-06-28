// src/app/signup/page.tsx
import { getServerAuth } from "@/lib/server-only-auth";
import { redirect } from "next/navigation";
import SignupForm from "./signupForm";

export default async function SignupPage() {
    const session = await getServerAuth();

    if (session?.user) {
        redirect("/");
    }

    return <SignupForm />;
}
