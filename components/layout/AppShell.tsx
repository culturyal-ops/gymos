import { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[--color-bg] text-[--color-text-primary]">
      <Sidebar />
      <main className="ml-[220px] min-h-screen p-10">{children}</main>
    </div>
  );
}
