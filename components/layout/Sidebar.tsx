"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const navGroups = [
  {
    label: "Main",
    links: [
      { href: "/" as const, label: "Overview", glyph: "◈" },
      { href: "/members" as const, label: "Members", glyph: "◉" },
      { href: "/leads" as const, label: "Leads", glyph: "◎" },
      { href: "/transactions" as const, label: "Transactions", glyph: "▣" }
    ]
  },
  {
    label: "Automations",
    links: [{ href: "/whatsapp" as const, label: "WhatsApp Hub", glyph: "⟡" }]
  },
  {
    label: "Settings",
    links: [
      { href: "/settings" as const, label: "Gym Settings", glyph: "◈" },
      { href: "/staff" as const, label: "Staff", glyph: "◉" }
    ]
  }
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] border-r border-[--color-border] bg-[--color-surface] p-4">
      <div className="mb-8 text-xl font-bold display-font">
        Gym<span className="text-[--color-gold]">OS</span>
      </div>

      <div className="flex h-[calc(100%-72px)] flex-col justify-between">
        <nav className="space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-2 text-[10px] uppercase tracking-[0.18em] text-[--color-text-muted]">{group.label}</p>
              <div className="space-y-1">
                {group.links.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-2 text-sm text-[--color-text-secondary] transition-colors hover:bg-[--color-surface-2] hover:text-[--color-text-primary]",
                        isActive && "bg-[--color-gold-dim] text-[--color-gold]"
                      )}
                    >
                      <span>{link.glyph}</span>
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-3">
          <div className="card p-3">
            <p className="text-xs text-[--color-text-secondary]">Culturyal Fitness</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-[--color-gold]">Growth</span>
              <span className="h-2 w-2 rounded-full bg-[--color-green]" />
            </div>
          </div>
          <div className="flex gap-2">
            <ThemeToggle />
            <button className="flex-1 rounded-md border border-[--color-border] py-2 text-sm text-[--color-text-secondary] transition-colors hover:border-[--color-border-hover] hover:bg-[--color-surface-2]">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
