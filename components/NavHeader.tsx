"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, MessageSquare } from "lucide-react";

export function NavHeader() {
  const pathname = usePathname();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200"
      style={{ height: "var(--header-height)" }}
    >
      <div className="mx-auto max-w-5xl px-4 h-full flex items-center justify-between">
        {/* Logo / Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
            Product Knowledge Base
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          <NavLink href="/" icon={<MessageSquare size={15} />} label="Chat" active={pathname === "/"} />
          <NavLink href="/documents" icon={<BookOpen size={15} />} label="Documents" active={pathname === "/documents"} />
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
