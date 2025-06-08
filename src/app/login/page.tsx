// src/app/login/page.tsx
import Container from "@/app/_components/container";
import { redirect } from "next/navigation";
import { signIn } from "@/app/auth"

export default function LoginPage() {
return (
    <form
      action={async () => {
        "use server"
        await signIn("google")
      }}
    >
    <button type="submit">Signin with Google</button>
    </form>
  );
}
