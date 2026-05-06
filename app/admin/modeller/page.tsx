import { query } from "@/lib/db";
import Link from "next/link";

export default async function ModelsPage() {
  const { rows } = await query<{
    id: number; slug: string; display_name: string; provider: string;
    family: string | null; is_active: boolean; is_open_weights: boolean;
  }>(`select id, slug, display_name, provider, family, is_active, is_open_weights
       from models order by display_name`);

  return (
    <>
      <div className="eyebrow mb-3">Modeller</div>
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="h1">Konfigurerte modeller</h1>
        <Link href="/admin/modeller/ny" className="border hairline border-[var(--tenki-ink)] px-4 py-2 text-sm">
          + Legg til
        </Link>
      </div>

      <div className="border hairline border-[var(--tenki-subtle)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b hairline border-b-[var(--tenki-subtle)] text-left">
              <th className="px-4 py-3 eyebrow">Slug</th>
              <th className="px-4 py-3 eyebrow">Navn</th>
              <th className="px-4 py-3 eyebrow">Provider</th>
              <th className="px-4 py-3 eyebrow">Familie</th>
              <th className="px-4 py-3 eyebrow">Aktiv</th>
              <th className="px-4 py-3 eyebrow">Vekter</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-b hairline border-b-[var(--tenki-subtle)] last:border-0">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link href={`/admin/modeller/${m.id}`}>{m.slug}</Link>
                </td>
                <td className="px-4 py-3">{m.display_name}</td>
                <td className="px-4 py-3 text-[var(--tenki-muted)]">{m.provider}</td>
                <td className="px-4 py-3 text-[var(--tenki-muted)]">{m.family ?? "—"}</td>
                <td className="px-4 py-3">{m.is_active ? "✓" : "—"}</td>
                <td className="px-4 py-3 text-[var(--tenki-muted)]">{m.is_open_weights ? "Åpen" : "Lukket"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
