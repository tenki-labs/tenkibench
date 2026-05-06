import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TenkiBench — norsk SMB-evaluering for språkmodeller",
  description:
    "Åpen test av hvor godt store språkmodeller fungerer for norske små og mellomstore bedrifter. Faktura, kontrakter, MVA, lov, Brønnøysund, HR, kundeservice, Bokmål↔Nynorsk.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://bench.tenki.no"),
  openGraph: {
    type: "website",
    siteName: "TenkiBench",
    locale: "nb_NO",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
