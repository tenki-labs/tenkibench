import { query } from "@/lib/db";
import { redirect } from "next/navigation";

async function startRunAction(formData: FormData) {
  "use server";
  const modelId = Number(formData.get("model_id"));
  const category = String(formData.get("category") ?? "") || undefined;
  if (!modelId) redirect("/admin/kjor?err=no-model");

  // Hit our own /api/admin/run endpoint to fire-and-forget
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/admin/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `tenkibench_admin=${process.env.ADMIN_TOKEN}`,
    },
    body: JSON.stringify({ modelId, category }),
  });
  const body = await res.json();
  redirect(`/admin/runs/${body.runId}`);
}

export default async function RunPage() {
  const { rows: models } = await query<{
    id: number; slug: string; display_name: string; provider: string; is_active: boolean;
  }>(`select id, slug, display_name, provider, is_active from models
       where is_active = true order by display_name`);

  const { rows: cats } = await query<{ slug: string; name: string }>(
    `select slug, name from categories order by name`,
  );

  return (
    <>
      <div className="eyebrow mb-3">Kjør</div>
      <h1 className="h1 mb-8">Kjør benchmark</h1>

      <form action={startRunAction} className="space-y-5 max-w-xl">
        <div>
          <label className="eyebrow block mb-1">Modell *</label>
          <select
            name="model_id"
            required
            className="w-full border hairline border-[var(--tenki-subtle)] px-3 py-2 bg-white"
          >
            <option value="">Velg modell…</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name} ({m.provider})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="eyebrow block mb-1">Kategori (la stå tom for alle)</label>
          <select name="category" className="w-full border hairline border-[var(--tenki-subtle)] px-3 py-2 bg-white">
            <option value="">Alle</option>
            {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>

        <button type="submit" className="border hairline border-[var(--tenki-ink)] px-4 py-2 text-sm">
          Start kjøring
        </button>
      </form>

      <p className="mt-6 text-sm text-[var(--tenki-muted)] max-w-xl">
        Kjøringen starter umiddelbart i bakgrunn. Du blir omdirigert til run-status-siden hvor
        framdrift oppdateres hvert få sekunder.
      </p>
    </>
  );
}
