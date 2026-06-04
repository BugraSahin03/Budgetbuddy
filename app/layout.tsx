import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppNavigation } from "@/app/components/app-navigation";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BudgetBuddy",
  description: "Private Finanz-App als Nachfolger des Excel-Budgetplaners.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="min-h-screen md:grid md:grid-cols-[17rem_1fr]">
          <aside className="flex flex-col border-b border-slate-200 bg-slate-950 text-slate-100 md:border-b-0 md:border-r md:border-slate-800">
            <div className="border-b border-slate-800 px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                BudgetBuddy
              </p>
              <h1 className="mt-2 text-lg font-semibold">Private Finanzen</h1>
              <p className="mt-2 text-sm text-slate-300">
                Desktop-first Uebersicht fuer Budget, Import und Zuordnung.
              </p>
            </div>

            <AppNavigation />

            <div className="hidden border-t border-slate-800 px-5 py-4 text-xs text-slate-400 md:block">
              Transfers, Fixkosten und Sonderbudgets bleiben getrennt auswertbar.
            </div>
          </aside>

          <div className="flex min-h-screen flex-col">
            <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
