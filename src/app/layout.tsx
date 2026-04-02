import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { AdProvider } from "@/components/ads/ad-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LinkedIn Auto Apply",
  description: "Automatically apply to Easy Apply jobs on LinkedIn",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto p-6"><AdProvider>{children}</AdProvider></main>
        </div>
      </body>
    </html>
  );
}
