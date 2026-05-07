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
      {/*
        flex/min-h-screen-mønster: <body> er en kolonne som er minst høyt som
        viewporten. Innholdet (med <main>) får flex-grow så det dytter footeren
        helt ned på korte sider. Hver side må selv legge `flex-1` på sitt
        <main>-element — eller via wrapperen vi bruker over hele siden.
      */}
      <body className="font-sans min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
