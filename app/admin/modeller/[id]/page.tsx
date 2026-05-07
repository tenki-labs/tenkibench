import { query } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { formatDate, formatScore, formatCost } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function updateModel(modelId: number, formData: FormData) {
  "use server";
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const display_name = get("display_name");
  const provider = get("provider");
  const provider_model = get("provider_model");
  const base_url = get("base_url") || null;
  const family = get("family") || null;
  const parameter_count = get("parameter_count");
  const is_open_weights = formData.get("is_open_weights") === "on";
  const is_active = formData.get("is_active") === "on";
  const notes = get("notes") || null;

  await query(
    `update models set display_name = $1, provider = $2, provider_model = $3,
     base_url = $4, family = $5, parameter_count = $6, is_open_weights = $7,
     is_active = $8, notes = $9 where id = $10`,
    [display_name, provider, provider_model, base_url, family,
     parameter_count ? Number(parameter_count) : null, is_open_weights, is_active, notes, modelId],
  );
  redirect(`/admin/modeller/${modelId}`);
}

async function deleteModel(modelId: number) {
  "use server";
  await query(`delete from models where id = $1`, [modelId]);
  redirect(`/admin/modeller`);
}

export default async function ModelDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const modelId = Number(id);

  const { rows } = await query<{
    id: number; slug: string; display_name: string; provider: string;
    provider_model: string; base_url: string | null; family: string | null;
    parameter_count: string | null; is_open_weights: boolean; is_active: boolean;
    notes: string | null; added_at: string;
  }>(`select * from models where id = $1`, [modelId]);
  const model = rows[0];
  if (!model) notFound();

  const { rows: runs } = await query<{
    id: number; status: string; started_at: string; finished_at: string | null;
    total_score: string | null; total_cost_usd: string;
  }>(`select r.id, r.status, r.started_at, r.finished_at, rts.total_score, r.total_cost_usd
       from runs r left join run_total_scores rts on rts.run_id = r.id
       where r.model_id = $1 order by r.started_at desc limit 30`, [modelId]);

  const updateAction = updateModel.bind(null, modelId);
  const deleteAction = deleteModel.bind(null, modelId);

  return (
    <>
      <div className="eyebrow mb-3">Modell · {model.slug}</div>
      <h1 className="h1 mb-8">{model.display_name}</h1>

      <div className="grid lg:grid-cols-2 gap-8">
        <section>
          <div className="eyebrow mb-3">Konfigurasjon</div>
          <form action={updateAction} className="space-y-4">
            <Field name="display_name" label="Visningsnavn" defaultValue={model.display_name} />
            <Field name="provider" label="Provider" defaultValue={model.provider} />
            <Field name="provider_model" label="Provider model ID" defaultValue={model.provider_model} />
            <Field name="base_url" label="Base URL" defaultValue={model.base_url ?? ""} />
            <Field name="family" label="Familie" defaultValue={model.family ?? ""} />
            <Field name="parameter_count" label="Parameter count" defaultValue={model.parameter_count ?? ""} />
            <Field name="notes" label="Notater" defaultValue={model.notes ?? ""} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_open_weights" defaultChecked={model.is_open_weights} /> Åpne vekter
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_active" defaultChecked={model.is_active} /> Aktiv
            </label>
            <button type="submit" className="border hairline border-[var(--tenki-ink)] px-4 py-2 text-sm">
              Lagre endringer
            </button>
          </form>

          <form action={deleteAction} className="mt-8">
            <button
              type="submit"
              className="text-xs text-red-700 underline"
            >
              Slett modell (alle runs blir slettet)
            </button>
          </form>
        </section>

        <section>
          <div className="eyebrow mb-3">Run-historikk</div>
          <div className="rounded-xl border border-tenki-subtle bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b hairline border-b-[var(--tenki-subtle)] text-left">
                  <th className="px-3 py-2 eyebrow">#</th>
                  <th className="px-3 py-2 eyebrow">Status</th>
                  <th className="px-3 py-2 eyebrow text-right">Score</th>
                  <th className="px-3 py-2 eyebrow text-right">Kostnad</th>
                  <th className="px-3 py-2 eyebrow text-right">Tid</th>
                </tr>
              </thead>
              <tbody>
                {runs.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-4 text-center text-[var(--tenki-muted)]">Ingen runs ennå</td></tr>
                ) : runs.map((r) => (
                  <tr key={r.id} className="border-b hairline border-b-[var(--tenki-subtle)] last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link href={`/admin/runs/${r.id}`}>#{r.id}</Link>
                    </td>
                    <td className="px-3 py-2 text-xs">{r.status}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatScore(r.total_score)}</td>
                    <td className="px-3 py-2 text-right text-[var(--tenki-muted)] text-xs">{formatCost(r.total_cost_usd)}</td>
                    <td className="px-3 py-2 text-right text-[var(--tenki-muted)] text-xs">{formatDate(r.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <div>
      <label className="eyebrow block mb-1">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        className="tenki-input"
      />
    </div>
  );
}
