import type { Metadata } from "next";
import "./globals.css";
import { NavHeader } from "@/components/NavHeader";

export const metadata: Metadata = {
  title: "Product Knowledge Base",
  description:
    "Search and query your product catalog instantly — powered by AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 font-sans antialiased">
        <NavHeader />
        <main
          className="mx-auto max-w-5xl px-4"
          style={{ paddingTop: "var(--header-height)" }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
