import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import { loadAllTasks } from "@/lib/tasks/loader";
import { TasksTable } from "@/components/tasks-table";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string; bench?: string }>;
}) {
  const { kategori, bench } = await searchParams;
  const all = loadAllTasks();
  let initial = all;
  if (bench) initial = initial.filter((t) => t.bench === bench);
  if (kategori) initial = initial.filter((t) => t.category === kategori);

  const rows = initial.map((t) => ({
    id: t.id,
    bench: t.bench,
    category: t.category,
    title: t.title,
    difficulty: t.difficulty,
    eval_method: t.eval.method,
  }));

  return (
    <>
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-16">
        <div className="eyebrow mb-3">Oppgaver</div>
        <h1 className="h1 mb-2">
          {bench ?? kategori ? `${bench ?? ""}${bench && kategori ? " · " : ""}${kategori ?? ""}` : "Alle"}
        </h1>
        <p className="text-[var(--tenki-muted)] mb-10 max-w-2xl">
          Alle oppgaver er offentlige. Gull-svar og evalueringskode er åpen i{" "}
          <Link href="https://github.com/tenki-labs/tenkibench" className="underline">repo&apos;et</Link>.
        </p>

        <TasksTable tasks={rows} />
      </main>
      <SiteFooter />
    </>
  );
}
