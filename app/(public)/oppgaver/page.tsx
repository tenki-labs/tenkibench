import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import { loadAllTasks } from "@/lib/tasks/loader";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string; bench?: string }>;
}) {
  const { kategori, bench } = await searchParams;
  const all = loadAllTasks();
  let tasks = all;
  if (bench) tasks = tasks.filter((t) => t.bench === bench);
  if (kategori) tasks = tasks.filter((t) => t.category === kategori);

  return (
    <>
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="eyebrow mb-3">Oppgaver</div>
        <h1 className="h1 mb-2">{kategori ?? "Alle"} ({tasks.length})</h1>
        <p className="text-[var(--tenki-muted)] mb-10 max-w-2xl">
          Alle oppgaver er offentlige. Gull-svar og evalueringskode er åpen i{" "}
          <Link href="https://github.com/tenki-labs/tenkibench" className="underline">repo&apos;et</Link>.
        </p>

        <div className="border hairline border-[var(--tenki-subtle)] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b hairline border-b-[var(--tenki-subtle)] text-left">
                <th className="px-4 py-3 eyebrow">ID</th>
                <th className="px-4 py-3 eyebrow">Kategori</th>
                <th className="px-4 py-3 eyebrow">Tittel</th>
                <th className="px-4 py-3 eyebrow">Vansk.</th>
                <th className="px-4 py-3 eyebrow">Eval</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-b hairline border-b-[var(--tenki-subtle)] last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link href={`/oppgaver/${t.id}`}>{t.id}</Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--tenki-muted)]">{t.category}</td>
                  <td className="px-4 py-3">{t.title}</td>
                  <td className="px-4 py-3 text-[var(--tenki-muted)]">{t.difficulty}</td>
                  <td className="px-4 py-3 text-[var(--tenki-muted)] text-xs font-mono">{t.eval.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
