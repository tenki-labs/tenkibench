import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Pill } from "@/components/ui/pill";
import { query } from "@/lib/db";

export const metadata = { title: "Validatorer · TenkiBench" };
export const dynamic = "force-dynamic";

interface PublicValidator {
  id: number;
  name: string;
  title: string | null;
  employer: string | null;
  expertise_areas: string[];
  bio: string | null;
}

export default async function ValidatorerPage({
  searchParams,
}: {
  searchParams: Promise<{ omr?: string }>;
}) {
  const { omr } = await searchParams;
  const filterArea = omr?.trim() || null;

  const sql = filterArea
    ? `select id, name, title, employer, expertise_areas, bio
         from validator_applications
        where status = 'approved'
          and $1 = any(expertise_areas)
        order by name`
    : `select id, name, title, employer, expertise_areas, bio
         from validator_applications
        where status = 'approved'
        order by name`;

  const params = filterArea ? [filterArea] : [];
  const { rows: validators } = await query<PublicValidator>(sql, params);

  // Build the area-set from the loaded list (no extra round-trip).
  const allAreas = new Set<string>();
  for (const v of validators) for (const a of v.expertise_areas) allAreas.add(a);

  return (
    <>
      <SiteHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-16">
        <div className="eyebrow mb-3">Validatorer</div>
        <h1 className="h1 mb-6">De som signerer på TenkiBench-oppgaver</h1>
        <p className="text-lg leading-relaxed text-[var(--tenki-muted)] max-w-2xl mb-10">
          Hver kategori valideres av minst én ekstern fagperson. Listen under
          viser de som har sagt seg villige til å bli kreditert offentlig.
          Validatorene står inne for at fasiten i sitt fagområde er fag-riktig.
        </p>

        <div className="mb-8 flex flex-wrap items-center gap-2">
          <Link
            href="/validatorer"
            className={
              "rounded-full px-3 py-1 text-xs font-mono uppercase tracking-eyebrow border " +
              (!filterArea
                ? "border-tenki-ink bg-tenki-ink text-tenki-bg"
                : "border-tenki-subtle text-tenki-muted hover:border-tenki-ink")
            }
          >
            Alle
          </Link>
          {[...allAreas].sort().map((a) => (
            <Link
              key={a}
              href={`/validatorer?omr=${encodeURIComponent(a)}`}
              className={
                "rounded-full px-3 py-1 text-xs font-mono uppercase tracking-eyebrow border " +
                (filterArea === a
                  ? "border-tenki-ink bg-tenki-ink text-tenki-bg"
                  : "border-tenki-subtle text-tenki-muted hover:border-tenki-ink")
              }
            >
              {a}
            </Link>
          ))}
        </div>

        {validators.length === 0 ? (
          <div className="rounded-xl border border-tenki-subtle bg-white p-8 text-center text-[var(--tenki-muted)]">
            {filterArea
              ? "Ingen validatorer registrert i dette fagområdet ennå."
              : "Ingen offentlige validatorer ennå — vi rekrutterer aktivt."}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {validators.map((v) => (
              <article
                key={v.id}
                className="rounded-xl border border-tenki-subtle bg-white p-5"
              >
                <h2 className="font-sans text-lg font-medium tracking-tight mb-1">
                  {v.name}
                </h2>
                {(v.title || v.employer) && (
                  <p className="text-sm text-[var(--tenki-muted)] mb-3">
                    {[v.title, v.employer].filter(Boolean).join(" · ")}
                  </p>
                )}
                {v.bio && (
                  <p className="text-sm leading-relaxed mb-4">{v.bio}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {v.expertise_areas.map((a) => (
                    <span
                      key={a}
                      className="font-mono text-[10px] uppercase tracking-eyebrow text-tenki-muted border border-tenki-subtle rounded-full px-2 py-0.5"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-16 rounded-xl border border-tenki-subtle bg-tenki-surface p-8">
          <div className="eyebrow mb-3">Bli med</div>
          <h2 className="h2 mb-3">Er du fagperson?</h2>
          <p className="text-[var(--tenki-muted)] mb-6 max-w-2xl">
            Vi rekrutterer norske advokater, revisorer, leger, ingeniører,
            regnskapsførere, HR-rådgivere og språkvitere. 1–4 timer per
            kategori, full kreditt.
          </p>
          <Pill href="/validator/registrer" arrow>
            Søk om å bli validator
          </Pill>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
