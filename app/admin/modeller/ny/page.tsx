import { redirect } from "next/navigation";
import { query } from "@/lib/db";

async function createModel(formData: FormData) {
  "use server";
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const slug = get("slug");
  const display_name = get("display_name");
  const provider = get("provider");
  const provider_model = get("provider_model");
  const base_url = get("base_url") || null;
  const family = get("family") || null;
  const parameter_count = get("parameter_count");
  const is_open_weights = formData.get("is_open_weights") === "on";
  const is_active = formData.get("is_active") === "on";
  const notes = get("notes") || null;

  if (!slug || !display_name || !provider || !provider_model) {
    redirect("/admin/modeller/ny?err=missing");
  }

  await query(
    `insert into models (slug, display_name, provider, provider_model, base_url, family,
                        parameter_count, is_open_weights, is_active, notes)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     on conflict (provider, provider_model) do update set
       display_name = excluded.display_name,
       base_url = excluded.base_url,
       family = excluded.family,
       is_active = excluded.is_active,
       notes = excluded.notes`,
    [slug, display_name, provider, provider_model, base_url, family,
     parameter_count ? Number(parameter_count) : null, is_open_weights, is_active, notes],
  );
  redirect("/admin/modeller");
}

export default function NewModelPage() {
  return (
    <>
      <div className="eyebrow mb-3">Modeller / Ny</div>
      <h1 className="h1 mb-8">Legg til modell</h1>

      <form action={createModel} className="space-y-5 max-w-xl">
        <Field name="slug" label="Slug" placeholder="claude-haiku-4-5" required />
        <Field name="display_name" label="Visningsnavn" placeholder="Claude Haiku 4.5" required />
        <Field name="provider" label="Provider" placeholder="mammouth | openai | anthropic | local" required />
        <Field name="provider_model" label="Provider model ID" placeholder="claude-haiku-4-5" required />
        <Field name="base_url" label="Base URL (override)" placeholder="https://api.mammouth.ai/v1" />
        <Field name="family" label="Familie" placeholder="claude" />
        <Field name="parameter_count" label="Parameter count (heltall)" placeholder="" />
        <Field name="notes" label="Notater" placeholder="" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_open_weights" /> Åpne vekter
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked /> Aktiv (inkludert i run-all)
        </label>
        <button type="submit" className="border hairline border-[var(--tenki-ink)] px-4 py-2 text-sm">
          Lagre
        </button>
      </form>
    </>
  );
}

function Field({ name, label, placeholder, required }: {
  name: string; label: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="eyebrow block mb-1">{label}{required ? " *" : ""}</label>
      <input
        name={name}
        placeholder={placeholder}
        required={required}
        className="tenki-input"
      />
    </div>
  );
}
