import "./globals.css";
import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";

const sans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-dm-sans",
});

const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: {
    default: "TenkiBench — norsk SMB-evaluering for språkmodeller",
    template: "%s · TenkiBench",
  },
  description:
    "Åpen test av hvor godt store språkmodeller fungerer for norske små og mellomstore bedrifter. Faktura, kontrakter, MVA, lov, Brønnøysund, HR, kundeservice, Bokmål↔Nynorsk.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://bench.tenki.no"),
  openGraph: {
    type: "website",
    siteName: "TenkiBench",
    locale: "nb_NO",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb" className={`${sans.variable} ${mono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
