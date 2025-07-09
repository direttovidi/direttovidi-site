import { auth } from "@/app/auth"; // your wrapped NextAuth `auth()` function
import { redirect } from "next/navigation";

export default async function ToolsLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();

    if (!session?.user || session.user.role !== "premium") {
        redirect("/"); // or a custom unauthorized page
    }

    return <>{children}</>;
}
