import type { Metadata } from "next";
import { ReactNode } from "react";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "@fontsource/syne/700.css";
import "@fontsource/syne/800.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "GymOS",
  description: "Multi-tenant revenue engine for gyms"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
