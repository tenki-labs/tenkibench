import { query } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function recordCalibration(formData: FormData) {
  "use server";
  const judge_model_id = Number(formData.get("judge_model_id"));
  const task_id = String(formData.get("task_id") ?? "");
  const human_score = Number(formData.get("human_score"));
  const judge_score = Number(formData.get("judge_score"));
  const rated_by = String(formData.get("rated_by") ?? "");
  if (!judge_model_id || !task_id || isNaN(human_score) || isNaN(judge_score)) {
    redirect("/admin/dommer-kalibrering?err=missing");
  }
  await query(
    `insert into judge_calibration (judge_model_id, task_id, human_score, judge_score, rated_by)
     values ($1, $2, $3, $4, $5)`,
    [judge_model_id, task_id, human_score, judge_score, rated_by],
  );
  redirect("/admin/dommer-kalibrering");
}

export default async function CalibrationPage() {
  const { rows: stats } = await query<{
    judge_slug: string; judge_name: string; n: string;
    mae: string | null; pearson_r: string | null;
  }>(`
    with calib as (
      select jc.judge_model_id, jc.task_id,
             jc.human_score::float as h, jc.judge_score::float as j
      from judge_calibration jc
    )
    select m.slug as judge_slug, m.display_name as judge_name,
           count(*)::text as n,
           avg(abs(j - h))::numeric(4,3)::text as mae,
           corr(j, h)::numeric(4,3)::text as pearson_r
    from calib c
    join models m on m.id = c.judge_model_id
    group by m.slug, m.display_name
    order by m.display_name
  `);

  const { rows: judgeModels } = await query<{ id: number; display_name: string }>(
    `select id, display_name from models where is_active = true order by display_name`,
  );

  const { rows: recent } = await query<{
    id: number; task_id: string; judge_name: string;
    human_score: string; judge_score: string; delta: string; rated_by: string | null;
    rated_at: string;
  }>(`select jc.id, jc.task_id, m.display_name as judge_name,
              jc.human_score, jc.judge_score, jc.delta, jc.rated_by, jc.rated_at
       from judge_calibration jc
       join models m on m.id = jc.judge_model_id
       order by jc.rated_at desc limit 30`);

  return (
    <>
      <div className="eyebrow mb-3">Dommer-kalibrering</div>
      <h1 className="h1 mb-8">LLM-dommer × menneske-konsensus</h1>

      <section className="mb-10">
        <div className="eyebrow mb-3">Aggregert per dommer-modell</div>
        <div className="rounded-xl border border-tenki-subtle bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b hairline border-b-[var(--tenki-subtle)] text-left">
                <th className="px-4 py-3 eyebrow">Dommer</th>
                <th className="px-4 py-3 eyebrow text-right">N</th>
                <th className="px-4 py-3 eyebrow text-right">MAE</th>
                <th className="px-4 py-3 eyebrow text-right">Pearson r</th>
                <th className="px-4 py-3 eyebrow">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-[var(--tenki-muted)]">Ingen kalibreringsdata ennå</td></tr>
              ) : stats.map((s) => {
                const mae = Number(s.mae);
                const r = Number(s.pearson_r);
                const ok = mae <= 0.15 && r >= 0.8;
                return (
                  <tr key={s.judge_slug} className="border-b hairline border-b-[var(--tenki-subtle)] last:border-0">
                    <td className="px-4 py-3">{s.judge_name}</td>
                    <td className="px-4 py-3 text-right font-mono">{s.n}</td>
                    <td className="px-4 py-3 text-right font-mono">{s.mae ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">{s.pearson_r ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      {Number(s.n) < 30
                        ? <span className="text-[var(--tenki-muted)]">Trenger ≥ 30 ratings</span>
                        : ok
                          ? <span className="text-emerald-700">✓ Kalibrert</span>
                          : <span className="text-red-700">⚠ Ute av spec (MAE &gt; 0.15 eller r &lt; 0.8)</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-[var(--tenki-muted)]">
          Akseptkriterier: MAE ≤ 0,15 og Pearson r ≥ 0,8 ved minst 30 menneske-rated oppgaver.
        </p>
      </section>

      <section className="mb-10">
        <div className="eyebrow mb-3">Registrer ny menneske-rating</div>
        <form action={recordCalibration} className="grid sm:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label className="eyebrow block mb-1">Dommer-modell *</label>
            <select name="judge_model_id" required className="tenki-input">
              <option value="">Velg…</option>
              {judgeModels.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
            </select>
          </div>
          <div>
            <label className="eyebrow block mb-1">Task ID *</label>
            <input name="task_id" required placeholder="kontrakt-001" className="tenki-input" />
          </div>
          <div>
            <label className="eyebrow block mb-1">Menneske-score (0–1) *</label>
            <input name="human_score" required type="number" step="0.01" min="0" max="1" className="tenki-input" />
          </div>
          <div>
            <label className="eyebrow block mb-1">Dommer-score (0–1) *</label>
            <input name="judge_score" required type="number" step="0.01" min="0" max="1" className="tenki-input" />
          </div>
          <div>
            <label className="eyebrow block mb-1">Vurdert av</label>
            <input name="rated_by" placeholder="navn / e-post" className="tenki-input" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="border hairline border-[var(--tenki-ink)] px-4 py-2 text-sm">
              Registrer rating
            </button>
          </div>
        </form>
      </section>

      <section>
        <div className="eyebrow mb-3">Siste 30 ratings</div>
        <div className="rounded-xl border border-tenki-subtle bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b hairline border-b-[var(--tenki-subtle)] text-left">
                <th className="px-3 py-2 eyebrow">Task</th>
                <th className="px-3 py-2 eyebrow">Dommer</th>
                <th className="px-3 py-2 eyebrow text-right">Menneske</th>
                <th className="px-3 py-2 eyebrow text-right">Dommer</th>
                <th className="px-3 py-2 eyebrow text-right">Δ</th>
                <th className="px-3 py-2 eyebrow">Av</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-b hairline border-b-[var(--tenki-subtle)] last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{r.task_id}</td>
                  <td className="px-3 py-2 text-[var(--tenki-muted)]">{r.judge_name}</td>
                  <td className="px-3 py-2 text-right font-mono">{(Number(r.human_score) * 100).toFixed(0)}%</td>
                  <td className="px-3 py-2 text-right font-mono">{(Number(r.judge_score) * 100).toFixed(0)}%</td>
                  <td className={`px-3 py-2 text-right font-mono ${Math.abs(Number(r.delta)) > 0.15 ? "text-red-700" : ""}`}>
                    {Number(r.delta) > 0 ? "+" : ""}{(Number(r.delta) * 100).toFixed(0)}%
                  </td>
                  <td className="px-3 py-2 text-[var(--tenki-muted)] text-xs">{r.rated_by ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
