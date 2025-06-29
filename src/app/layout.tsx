import Footer from "@/app/_components/footer";
import { CMS_NAME, HOME_OG_IMAGE_URL } from "@/lib/constants";
import { Analytics } from "@vercel/analytics/next"
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import cn from "classnames";
// import { ThemeSwitcher } from "./_components/theme-switcher";
import { auth, signOut } from "@/app/auth";
import UserMenu from "@/app/_components/usermenu";
import "./globals.css";
import Navbar from "./_components/navbar";
import Link from "next/link";
import { SessionClientProvider } from './SessionClientProvider';
import TopRightAuthSlot from "./_components/topRightAuthSlot";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Personal Finance for the Modern Age",
  description: "Guided tools and blog for modern money decisions",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const user = session?.user;
  console.log("User in RootLayout:", user);

  return (
    <html lang="en">
      <head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/favicon/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon/favicon-16x16.png"
        />
        <link rel="manifest" href="/favicon/site.webmanifest" />
        <link
          rel="mask-icon"
          href="/favicon/safari-pinned-tab.svg"
          color="#000000"
        />
        <link rel="shortcut icon" href="/favicon/favicon.ico" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta
          name="msapplication-config"
          content="/favicon/browserconfig.xml"
        />
        <meta name="theme-color" content="#000" />
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
      </head>
      <body className={cn(inter.className, "dark:bg-slate-900 dark:text-slate-400")}>
        <SessionClientProvider>
          <div className="min-h-screen flex flex-col">
            {/* ✅ Header must come before children and inside provider */}
            <header className="flex justify-between items-center px-6 py-4 border-b">
              <div className="flex-1">
                <Link
                  href="/"
                  className="text-xl font-bold text-blue-600 mr-4 sm:mr-6 md:mr-8 lg:mr-10"
                >
                  DirettoVidi
                </Link>
              </div>
              <div className="flex-none">
                <Navbar />
              </div>
              <div className="flex-1 flex justify-end items-center space-x-6">
                <TopRightAuthSlot/>
              </div>
            </header>

            {/* ✅ Page content */}
            <main className="flex-1">{children}</main>
          </div>
        </SessionClientProvider>

        {/* Optional Footer & Analytics */}
        {/* <Footer /> */}
        <Analytics />
      </body>
    </html>
  );
}
