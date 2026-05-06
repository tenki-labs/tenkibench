import { query } from "@/lib/db";
import Link from "next/link";
import { formatDate, formatScore, formatCost } from "@/lib/utils";

export default async function RunsList() {
  const { rows } = await query<{
    id: number; status: string; display_name: string; started_at: string; finished_at: string | null;
    task_count: number; completed_count: number; failed_count: number;
    total_cost_usd: string; total_score: string | null;
  }>(`select r.id, r.status, m.display_name, r.started_at, r.finished_at,
              r.task_count, r.completed_count, r.failed_count, r.total_cost_usd,
              rts.total_score
       from runs r
       join models m on m.id = r.model_id
       left join run_total_scores rts on rts.run_id = r.id
       order by r.started_at desc
       limit 50`);

  return (
    <>
      <div className="eyebrow mb-3">Run-historikk</div>
      <h1 className="h1 mb-8">Siste 50 kjøringer</h1>

      <div className="border hairline border-[var(--tenki-subtle)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b hairline border-b-[var(--tenki-subtle)] text-left">
              <th className="px-4 py-3 eyebrow">#</th>
              <th className="px-4 py-3 eyebrow">Modell</th>
              <th className="px-4 py-3 eyebrow">Status</th>
              <th className="px-4 py-3 eyebrow text-right">Score</th>
              <th className="px-4 py-3 eyebrow text-right">Fremdrift</th>
              <th className="px-4 py-3 eyebrow text-right">Kostnad</th>
              <th className="px-4 py-3 eyebrow text-right">Startet</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b hairline border-b-[var(--tenki-subtle)] last:border-0">
                <td className="px-4 py-3 font-mono"><Link href={`/admin/runs/${r.id}`}>#{r.id}</Link></td>
                <td className="px-4 py-3">{r.display_name}</td>
                <td className="px-4 py-3">
                  <span className={
                    r.status === "finished" ? "text-emerald-700" :
                    r.status === "failed" ? "text-red-700" :
                    "text-[var(--tenki-muted)]"
                  }>{r.status}</span>
                </td>
                <td className="px-4 py-3 text-right font-mono">{formatScore(r.total_score)}</td>
                <td className="px-4 py-3 text-right text-[var(--tenki-muted)] font-mono text-xs">
                  {r.completed_count}/{r.task_count}
                  {r.failed_count > 0 && <span className="text-red-700"> ({r.failed_count} feil)</span>}
                </td>
                <td className="px-4 py-3 text-right text-[var(--tenki-muted)]">{formatCost(r.total_cost_usd)}</td>
                <td className="px-4 py-3 text-right text-[var(--tenki-muted)] text-xs">{formatDate(r.started_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
