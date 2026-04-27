"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { useState } from "react";

const navGroups: {
  label: string;
  links: { href: string; label: string; icon: string }[];
}[] = [
  {
    label: "Main",
    links: [
      { href: "/", label: "Overview", icon: "▦" },
      { href: "/members", label: "Members", icon: "◉" },
      { href: "/leads", label: "Leads", icon: "◎" },
      { href: "/transactions", label: "Transactions", icon: "▣" },
    ],
  },
  {
    label: "Automations",
    links: [{ href: "/whatsapp", label: "WhatsApp Hub", icon: "⟡" }],
  },
  {
    label: "Manage",
    links: [
      { href: "/settings", label: "Settings", icon: "◈" },
      { href: "/billing", label: "Billing", icon: "▤" },
      { href: "/staff", label: "Staff", icon: "◉" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = getBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2 px-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[--color-gold] text-xs font-black text-black">
          G
        </div>
        <span className="font-display text-lg font-bold tracking-tight">
          Gym<span className="text-[--color-gold]">OS</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[--color-text-muted]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-[--radius-md] px-2.5 py-2 text-sm transition-all duration-100",
                      isActive
                        ? "bg-[--color-gold-dim] text-[--color-gold] font-medium"
                        : "text-[--color-text-secondary] hover:bg-[--color-surface-2] hover:text-[--color-text-primary]"
                    )}
                  >
                    <span className="text-[13px] opacity-70">{link.icon}</span>
                    <span>{link.label}</span>
                    {isActive && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[--color-gold]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="space-y-2 pt-4">
        <div className="rounded-[--radius-md] border border-[--color-border] bg-[--color-surface-2] p-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[--color-green]" />
            <p className="text-xs font-medium text-[--color-text-primary]">Culturyal Fitness</p>
          </div>
          <p className="mt-0.5 text-[10px] text-[--color-text-muted]">Growth Plan · Active</p>
        </div>
        <div className="flex gap-2">
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="flex-1 rounded-[--radius-md] border border-[--color-border] py-2 text-xs text-[--color-text-secondary] transition-colors hover:border-[--color-border-hover] hover:bg-[--color-surface-2] hover:text-[--color-text-primary]"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 hidden h-screen w-[220px] border-r border-[--color-border] bg-[--color-surface] p-4 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <header className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-[--color-border] bg-[--color-surface]/95 px-4 py-3 backdrop-blur-sm lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[--color-gold] text-xs font-black text-black">
            G
          </div>
          <span className="font-display text-base font-bold">
            Gym<span className="text-[--color-gold]">OS</span>
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-8 w-8 items-center justify-center rounded-[--radius-md] border border-[--color-border] text-[--color-text-secondary]"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed left-0 top-0 z-50 h-screen w-72 border-r border-[--color-border] bg-[--color-surface] p-5 lg:hidden">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
