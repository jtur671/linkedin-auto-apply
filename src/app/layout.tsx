import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { LayoutShell } from "@/components/layout-shell";

const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Scout — your job search, handled",
  description: "Scout finds jobs across the web, scores them against your resume, and applies for you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${nunito.variable} ${nunito.className}`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <LayoutShell>{children}</LayoutShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
