import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";

export const metadata = { title: "Om · TenkiBench" };

export default function OmPage() {
  return (
    <>
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-16">
        <div className="eyebrow mb-3">Om</div>
        <h1 className="h1 mb-8">TenkiBench</h1>

        <p className="text-lg leading-relaxed mb-6">
          TenkiBench er en åpen, uavhengig benchmark for hvordan store språkmodeller fungerer
          på arbeid norske små og mellomstore bedrifter faktisk gjør.
        </p>

        <p className="text-[var(--tenki-muted)] leading-relaxed mb-6">
          Drevet av <Link href="https://tenki.no" className="underline">Tenki Labs AS</Link> —
          en norsk lokal-KI- og AI-Act-konsulent for SMB-er. Tenki har en kommersiell interesse i at
          flere norske bedrifter forstår hvilke modeller som er gode nok for jobben deres.
          Den interessen er åpen og gir oss insentiv til å gjøre testen rigorøs, ikke til å
          favorisere noen modell.
        </p>

        <h2 className="h2 mt-10 mb-4">Kontakt</h2>
        <p className="text-[var(--tenki-muted)]">
          E-post: <a href="mailto:einar@tenki.no" className="underline">einar@tenki.no</a>
        </p>

        <h2 className="h2 mt-10 mb-4">Validatorer søkes</h2>
        <p className="text-[var(--tenki-muted)]">
          Er du regnskapsfører, advokat, HR-rådgiver eller språkviter og vil hjelpe å validere
          oppgaver? Send oss noen ord. Det er en relativt liten innsats (1–4 timer per kategori)
          og du blir kreditert på hver oppgave du har validert.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
