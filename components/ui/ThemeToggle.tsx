"use client";

import * as React from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-md border border-[--color-border] bg-[--color-surface]" />
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-[--color-border] bg-[--color-surface] text-lg transition-colors hover:border-[--color-border-hover] hover:bg-[--color-surface-2]"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "☼" : "☾"}
    </button>
  );
}
