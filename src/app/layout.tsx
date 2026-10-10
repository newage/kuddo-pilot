import type { Metadata } from "next";
import { getLocale } from "@/i18n/server";
import "./globals.css";

export const metadata: Metadata = { title: "Kuddo Pilot" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className="font-sans">
      <body>{children}</body>
    </html>
  );
}
