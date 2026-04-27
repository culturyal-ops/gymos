import { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[--color-bg] text-[--color-text-primary]">
      <Sidebar />
      {/* Desktop: offset for sidebar. Mobile: offset for top bar */}
      <main className="min-h-screen px-4 pb-10 pt-20 lg:ml-[220px] lg:px-8 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
