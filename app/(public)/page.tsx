import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Pill } from "@/components/ui/pill";
import { query } from "@/lib/db";
import { formatScore, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 60;

interface LeaderRow {
  model_id: number;
  model_slug: string;
  display_name: string;
  family: string | null;
  is_open_weights: boolean;
  total_score: string;
  run_id: number;
  finished_at: string;
}

async function getTopLeaderboard(): Promise<LeaderRow[]> {
  const { rows } = await query<LeaderRow>(`
    with latest as (
      select distinct on (r.model_id) r.id as run_id, r.model_id, r.finished_at
      from runs r
      where r.status = 'finished'
      order by r.model_id, r.finished_at desc
    )
    select m.id as model_id, m.slug as model_slug, m.display_name, m.family, m.is_open_weights,
           rts.total_score, latest.run_id, latest.finished_at
    from latest
    join models m on m.id = latest.model_id
    join run_total_scores rts on rts.run_id = latest.run_id
    where m.is_active = true
    order by rts.total_score desc
    limit 20
  `);
  return rows;
}

const benchCards = [
  { eyebrow: "01", title: "Faktura",        href: "/kategorier/faktura"        },
  { eyebrow: "02", title: "Kontrakt",       href: "/kategorier/kontrakt"       },
  { eyebrow: "03", title: "MVA og skatt",   href: "/kategorier/mva-skatt"      },
  { eyebrow: "04", title: "Lov-referanse",  href: "/kategorier/lov-referanse"  },
  { eyebrow: "05", title: "Brønnøysund",    href: "/kategorier/brreg"          },
  { eyebrow: "06", title: "HR og lønn",     href: "/kategorier/hr-lonn"        },
  { eyebrow: "07", title: "Kundeservice",   href: "/kategorier/kundeservice"   },
  { eyebrow: "08", title: "Bokmål↔Nynorsk", href: "/kategorier/bokmal-nynorsk" },
];

export default async function HomePage() {
  let leaderboard: LeaderRow[] = [];
  try {
    leaderboard = await getTopLeaderboard();
  } catch {}

  return (
    <>
      <SiteHeader />

      {/* HERO */}
      <section className="container max-w-7xl mx-auto px-6 md:px-10 pt-16 pb-24 md:pt-24 md:pb-36">
        <p className="mb-6 font-mono text-[11px] md:text-xs font-medium uppercase tracking-eyebrow text-tenki-accent hero-animate">
          [ Norsk · SMB · GDPR · AI Act ]
        </p>
        <h1 className="font-mono font-medium leading-[0.95] tracking-tighter text-tenki-ink text-[2.5rem] sm:text-[3.5rem] md:text-[5rem] lg:text-[6rem] max-w-5xl hero-animate">
          Vi tester om kunstig intelligens
          <br className="hidden md:inline" />
          {" "}forstår Norge
          <span className="text-tenki-accent">.</span>
        </h1>
        <p className="mt-10 text-base md:text-lg text-tenki-muted max-w-2xl leading-relaxed">
          Åpen, uavhengig benchmark for hvor godt språkmodeller fungerer på
          norske SMB-oppgaver: faktura, kontrakter, MVA, lov-referanse,
          Brønnøysund-data, HR/lønn, kundeservice og Bokmål↔Nynorsk.
          Alle oppgavene, evalueringen og resultatene er offentlige.
          Modell-leverandører betaler ikke for å bli evaluert.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <Pill href="/leaderboard" variant="primary">Se leaderboard</Pill>
          <Pill href="/metodikk" variant="ghost">Les metodikken</Pill>
          <Link
            href="/api/public/leaderboard"
            className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-eyebrow text-tenki-muted hover:text-tenki-accent transition-colors"
          >
            JSON-API <span aria-hidden>↗</span>
          </Link>
        </div>
      </section>

      {/* LEADERBOARD */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 mb-24">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <Eyebrow brackets dot={false}>Topp-20 leaderboard</Eyebrow>
            <h2 className="mt-2 font-sans text-2xl md:text-3xl font-medium tracking-tight">
              Total-score, vektet per kategori
            </h2>
          </div>
          <Link
            href="/leaderboard"
            className="hidden sm:inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-accent hover:underline underline-offset-4"
          >
            Full liste <span aria-hidden>›</span>
          </Link>
        </div>

        {leaderboard.length === 0 ? (
          <div className="rounded-xl border border-tenki-subtle bg-white p-8">
            <Eyebrow brackets dot={false}>Ingen kjøringer ennå</Eyebrow>
            <p className="mt-3 text-tenki-muted">
              Benchmark er under oppstart. Første kjøring igangsettes fra <code className="font-mono">/admin/kjor</code>.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-tenki-subtle bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-tenki-subtle text-left">
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted">#</th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted">Modell</th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted">Familie</th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted">Vekter</th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted text-right">Score</th>
                  <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted text-right">Sist kjørt</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, i) => (
                  <tr
                    key={row.model_id}
                    className="border-b border-tenki-subtle last:border-0 hover:bg-tenki-surface/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-tenki-muted">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/modell/${row.model_slug}`} className="link-underline font-medium">
                        {row.display_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-tenki-muted">{row.family ?? "—"}</td>
                    <td className="px-4 py-3 text-tenki-muted text-xs">
                      {row.is_open_weights ? "Åpen" : "Lukket"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatScore(row.total_score)}</td>
                    <td className="px-4 py-3 text-right text-tenki-muted text-xs">
                      {formatDate(row.finished_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* KATEGORIER */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 mb-24">
        <div className="mb-6">
          <Eyebrow brackets dot={false}>8 kategorier · Norsk SMB</Eyebrow>
          <h2 className="mt-2 font-sans text-2xl md:text-3xl font-medium tracking-tight">
            Det norske SMB-er faktisk gjør hver dag
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {benchCards.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="group rounded-xl border border-tenki-subtle bg-white p-6 card-lift relative overflow-hidden"
            >
              <span
                aria-hidden
                className="absolute left-0 top-0 bottom-0 w-[3px] bg-transparent group-hover:bg-tenki-accent transition-colors duration-200"
              />
              <div className="font-mono text-[11px] uppercase tracking-eyebrow text-tenki-muted">
                {cat.eyebrow}
              </div>
              <div className="mt-2 font-sans text-lg font-medium tracking-tight">
                {cat.title}
              </div>
              <div className="mt-6 font-mono text-[10px] uppercase tracking-eyebrow text-tenki-accent inline-flex items-center gap-1.5">
                Se kategori <span aria-hidden>→</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6">
          <Link
            href="/benches"
            className="link-underline font-mono text-[11px] uppercase tracking-eyebrow text-tenki-accent"
          >
            Alle 32 benches i katalogen ›
          </Link>
        </div>
      </section>

      {/* PRINSIPPER */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 mb-32">
        <Eyebrow brackets dot={false}>Hvorfor TenkiBench</Eyebrow>
        <div className="mt-6 grid md:grid-cols-3 gap-12 md:gap-16">
          {[
            {
              n: "01",
              title: "Norsk-spesifikt",
              body: "Globale benchmarks misser MVA-regler, lov-§-sitering, Bokmål/Nynorsk, fødselsnummer-format. Vi tester nettopp det.",
            },
            {
              n: "02",
              title: "Uavhengig",
              body: "Modell-leverandører betaler ikke for plassering. Tenki Labs har konsulent-virksomheten som inntektskilde.",
            },
            {
              n: "03",
              title: "Åpen",
              body: "Alle oppgaver, evalueringskode, og resultater er åpne. Kritiser fasit, foreslå forbedringer, fork repo'et.",
            },
          ].map((p) => (
            <div key={p.n} className="border-l border-tenki-subtle pl-6">
              <div className="font-mono text-[11px] uppercase tracking-eyebrow text-tenki-accent">
                {p.n}
              </div>
              <h3 className="mt-3 font-sans text-xl font-medium tracking-tight">{p.title}</h3>
              <p className="mt-3 text-tenki-muted leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
