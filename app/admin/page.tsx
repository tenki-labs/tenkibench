import { query } from "@/lib/db";
import Link from "next/link";
import { formatDate, formatScore, formatCost } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const { rows: stats } = await query<{
    models: string; runs: string; tasks: string; latest_run_at: string | null;
  }>(`
    select
      (select count(*) from models)::text as models,
      (select count(*) from runs where status='finished')::text as runs,
      (select count(*) from task_results)::text as tasks,
      (select max(finished_at) from runs where status='finished') as latest_run_at
  `);

  const { rows: recent } = await query<{
    run_id: number; display_name: string; total_score: string;
    finished_at: string; total_cost_usd: string;
  }>(`
    select r.id as run_id, m.display_name, rts.total_score, r.finished_at, r.total_cost_usd
    from runs r
    join models m on m.id = r.model_id
    join run_total_scores rts on rts.run_id = r.id
    where r.status = 'finished'
    order by r.finished_at desc
    limit 10
  `);

  return (
    <>
      <div className="eyebrow mb-3">Oversikt</div>
      <h1 className="h1 mb-10">TenkiBench Admin</h1>

      <div className="grid sm:grid-cols-4 gap-4 mb-12">
        <Stat label="Modeller" value={stats[0]?.models ?? "0"} />
        <Stat label="Fullførte kjøringer" value={stats[0]?.runs ?? "0"} />
        <Stat label="Oppgave-resultater" value={stats[0]?.tasks ?? "0"} />
        <Stat label="Sist kjørt" value={formatDate(stats[0]?.latest_run_at)} />
      </div>

      <div className="mb-4 eyebrow">Siste kjøringer</div>
      <div className="border hairline border-[var(--tenki-subtle)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b hairline border-b-[var(--tenki-subtle)] text-left">
              <th className="px-4 py-3 eyebrow">Modell</th>
              <th className="px-4 py-3 eyebrow text-right">Score</th>
              <th className="px-4 py-3 eyebrow text-right">Kostnad</th>
              <th className="px-4 py-3 eyebrow text-right">Tid</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-[var(--tenki-muted)]">Ingen kjøringer ennå</td></tr>
            ) : recent.map((r) => (
              <tr key={r.run_id} className="border-b hairline border-b-[var(--tenki-subtle)] last:border-0">
                <td className="px-4 py-3"><Link href={`/admin/runs/${r.run_id}`}>{r.display_name}</Link></td>
                <td className="px-4 py-3 text-right font-mono">{formatScore(r.total_score)}</td>
                <td className="px-4 py-3 text-right text-[var(--tenki-muted)]">{formatCost(r.total_cost_usd)}</td>
                <td className="px-4 py-3 text-right text-[var(--tenki-muted)] text-xs">{formatDate(r.finished_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 flex gap-3">
        <Link href="/admin/kjor" className="border hairline border-[var(--tenki-ink)] px-4 py-2 text-sm">
          Kjør ny benchmark →
        </Link>
        <Link href="/admin/modeller/ny" className="px-4 py-2 text-sm">
          Legg til modell →
        </Link>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border hairline border-[var(--tenki-subtle)] bg-white p-4">
      <div className="eyebrow mb-1">{label}</div>
      <div className="font-mono text-xl">{value}</div>
    </div>
  );
}
