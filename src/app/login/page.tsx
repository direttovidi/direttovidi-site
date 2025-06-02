// src/app/login/page.tsx
import Container from "@/app/_components/container";
import { redirect } from "next/navigation";

export default function LoginPage() {
redirect("/");
return (
    <main>
      <Container>
        <h1 className="text-3xl font-bold mt-8 mb-4">Login</h1>
        <p className="text-gray-700">
          This feature is currently under construction. Please check back soon!
        </p>
      </Container>
    </main>
  );
}
