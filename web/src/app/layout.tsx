import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zirve — Doğa Sporları Gönüllülük Platformu",
  description: "Doğa sporları etkinliklerine gönüllü ol",
};

import Providers from "@/components/providers/Providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className={geist.className}>
        <Providers>
          <Navbar />
          <main className="min-h-screen bg-slate-50 text-slate-900">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}