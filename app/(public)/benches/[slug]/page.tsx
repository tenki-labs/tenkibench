import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { query } from "@/lib/db";
import { loadAllTasks } from "@/lib/tasks/loader";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function BenchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { rows: bench } = await query<{ slug: string; name: string; description: string }>(
    `select slug, name, description from benches where slug = $1`,
    [slug],
  );
  if (!bench[0]) notFound();

  const { rows: cats } = await query<{
    slug: string; name: string; description: string; weight: string;
  }>(
    `select slug, name, description, weight from categories
     where bench_slug = $1 order by weight desc, name`,
    [slug],
  );

  const tasks = loadAllTasks().filter((t) => t.bench === slug);
  const tasksByCategory = tasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + 1;
    return acc;
  }, {});

  const totalTasks = tasks.length;

  return (
    <>
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-16">
        <div className="eyebrow mb-3">Bench</div>
        <h1 className="h1 mb-2">{bench[0].name}</h1>
        <p className="text-[var(--tenki-muted)] mb-10 max-w-2xl">{bench[0].description}</p>

        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <Stat label="Oppgaver" value={String(totalTasks)} />
          <Stat label="Kategorier" value={String(cats.length)} />
          <Stat label="Status" value={totalTasks > 0 ? "Under utvikling" : "Planlagt"} />
        </div>

        <div className="eyebrow mb-2">Kategorier</div>
        <div className="rounded-xl border border-tenki-subtle bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b hairline border-b-[var(--tenki-subtle)] text-left">
                <th className="px-4 py-3 eyebrow">Slug</th>
                <th className="px-4 py-3 eyebrow">Navn</th>
                <th className="px-4 py-3 eyebrow">Beskrivelse</th>
                <th className="px-4 py-3 eyebrow text-right">Vekt</th>
                <th className="px-4 py-3 eyebrow text-right">Oppgaver</th>
              </tr>
            </thead>
            <tbody>
              {cats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[var(--tenki-muted)]">
                    Ingen kategorier registrert.
                  </td>
                </tr>
              ) : cats.map((c) => (
                <tr key={c.slug} className="border-b hairline border-b-[var(--tenki-subtle)] last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--tenki-muted)]">{c.slug}</td>
                  <td className="px-4 py-3">{c.name}</td>
                  <td className="px-4 py-3 text-[var(--tenki-muted)] text-xs">{c.description}</td>
                  <td className="px-4 py-3 text-right text-[var(--tenki-muted)]">{c.weight}</td>
                  <td className="px-4 py-3 text-right font-mono">{tasksByCategory[c.slug] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-sm text-[var(--tenki-muted)]">
          <Link href={`/oppgaver?bench=${slug}`} className="underline">
            Se alle oppgaver i denne benchen →
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-tenki-subtle bg-white overflow-hidden p-4">
      <div className="eyebrow mb-1">{label}</div>
      <div className="font-mono text-xl">{value}</div>
    </div>
  );
}
