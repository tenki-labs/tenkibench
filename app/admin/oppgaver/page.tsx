import Link from "next/link";
import { loadAllTasks } from "@/lib/tasks/loader";

export const dynamic = "force-dynamic";

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string; q?: string }>;
}) {
  const { kategori, q } = await searchParams;
  let tasks = loadAllTasks();
  if (kategori) tasks = tasks.filter((t) => t.category === kategori);
  if (q) {
    const s = q.toLowerCase();
    tasks = tasks.filter((t) =>
      t.id.toLowerCase().includes(s) ||
      t.title.toLowerCase().includes(s) ||
      t.tags.some((tag) => tag.toLowerCase().includes(s)),
    );
  }

  const categories = Array.from(new Set(loadAllTasks().map((t) => t.category))).sort();

  return (
    <>
      <div className="eyebrow mb-3">Oppgaver</div>
      <h1 className="h1 mb-2">Oppgave-oversikt</h1>
      <p className="text-[var(--tenki-muted)] mb-6 text-sm">
        {tasks.length} treff. Alle oppgavene leses fra YAML-filene i <code>tasks/</code>.
      </p>

      <form className="flex flex-wrap gap-3 mb-6">
        <select name="kategori" defaultValue={kategori ?? ""} className="tenki-input text-sm">
          <option value="">Alle kategorier</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Søk id, tittel eller tag…"
          className="tenki-input text-sm flex-1 min-w-[200px]"
        />
        <button type="submit" className="border hairline border-[var(--tenki-ink)] px-4 py-2 text-sm">Filtrer</button>
      </form>

      <div className="rounded-xl border border-tenki-subtle bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b hairline border-b-[var(--tenki-subtle)] text-left">
              <th className="px-4 py-3 eyebrow">ID</th>
              <th className="px-4 py-3 eyebrow">Kategori</th>
              <th className="px-4 py-3 eyebrow">Tittel</th>
              <th className="px-4 py-3 eyebrow">Vansk.</th>
              <th className="px-4 py-3 eyebrow">Eval</th>
              <th className="px-4 py-3 eyebrow">Validert</th>
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
                <td className="px-4 py-3 text-[var(--tenki-muted)] text-xs">
                  {t.validated_by?.length
                    ? <span className="text-emerald-700">✓ {t.validated_by.length}</span>
                    : <span>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
