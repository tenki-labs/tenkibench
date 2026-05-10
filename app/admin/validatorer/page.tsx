import Link from "next/link";
import { query } from "@/lib/db";
import { requireStaff } from "@/lib/admin-auth";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ValidatorRow {
  id: number;
  name: string;
  email: string;
  title: string | null;
  employer: string | null;
  expertise_areas: string[];
  status: string;
  applied_at: string;
  reviewed_at: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Venter",
  approved: "Godkjent",
  rejected: "Avvist",
  inactive: "Inaktiv",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "text-tenki-muted",
  approved: "text-tenki-good",
  rejected: "text-tenki-bad",
  inactive: "text-tenki-muted",
};

export default async function ValidatorerAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; ok?: string; err?: string }>;
}) {
  // Page is rendered through admin layout, but we also gate explicitly.
  await requireStaff();

  const { status, ok, err } = await searchParams;
  const filterStatus = status?.trim() || null;

  const sql = filterStatus
    ? `select id, name, email, title, employer, expertise_areas, status, applied_at, reviewed_at
         from validator_applications
        where status = $1
        order by applied_at desc`
    : `select id, name, email, title, employer, expertise_areas, status, applied_at, reviewed_at
         from validator_applications
        order by applied_at desc`;
  const params = filterStatus ? [filterStatus] : [];
  const { rows } = await query<ValidatorRow>(sql, params);

  const { rows: counts } = await query<{ status: string; n: string }>(
    `select status, count(*)::text as n
       from validator_applications
      group by status`,
  );
  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c.n]));

  return (
    <>
      <div className="eyebrow mb-3">Validatorer</div>
      <h1 className="h1 mb-2">Validator-søknader</h1>
      <p className="text-sm text-tenki-muted mb-8 max-w-2xl">
        Norske fagfolk som har søkt om å validere TenkiBench-oppgaver.
        Godkjenn for å gi tilgang og kreditere dem på offentlige sider.
      </p>

      {ok && (
        <div className="mb-6 rounded-xl border border-tenki-good bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          Lagret.
        </div>
      )}
      {err && (
        <div className="mb-6 rounded-xl border border-tenki-bad bg-red-50 px-4 py-2 text-sm text-red-900">
          {err}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <FilterPill href="/admin/validatorer" label="Alle" total={rows.length} active={!filterStatus} />
        {(["pending", "approved", "rejected", "inactive"] as const).map((s) => (
          <FilterPill
            key={s}
            href={`/admin/validatorer?status=${s}`}
            label={STATUS_LABEL[s]}
            total={Number(countByStatus[s] ?? 0)}
            active={filterStatus === s}
          />
        ))}
      </div>

      <div className="rounded-xl border border-tenki-subtle bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-tenki-subtle text-left">
              <th className="px-4 py-3 eyebrow">Navn</th>
              <th className="px-4 py-3 eyebrow">E-post</th>
              <th className="px-4 py-3 eyebrow">Fagområder</th>
              <th className="px-4 py-3 eyebrow">Status</th>
              <th className="px-4 py-3 eyebrow text-right">Søkt</th>
              <th className="px-4 py-3 eyebrow text-right"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-tenki-muted">
                  Ingen søknader{filterStatus ? ` med status «${STATUS_LABEL[filterStatus] ?? filterStatus}»` : ""} ennå.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-tenki-subtle last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.name}</div>
                    {(r.title || r.employer) && (
                      <div className="text-xs text-tenki-muted">
                        {[r.title, r.employer].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-tenki-muted text-xs font-mono">{r.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.expertise_areas.slice(0, 3).map((a) => (
                        <span
                          key={a}
                          className="font-mono text-[10px] uppercase tracking-eyebrow text-tenki-muted border border-tenki-subtle rounded-full px-2 py-0.5"
                        >
                          {a}
                        </span>
                      ))}
                      {r.expertise_areas.length > 3 && (
                        <span className="text-xs text-tenki-muted">+{r.expertise_areas.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-xs font-mono uppercase tracking-eyebrow ${STATUS_CLASS[r.status] ?? ""}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-tenki-muted">
                    {formatDate(r.applied_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/validatorer/${r.id}`}
                      className="text-sm underline"
                    >
                      Se detaljer →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FilterPill({
  href, label, total, active,
}: {
  href: string;
  label: string;
  total: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-full px-3 py-1 text-xs font-mono uppercase tracking-eyebrow border " +
        (active
          ? "border-tenki-ink bg-tenki-ink text-tenki-bg"
          : "border-tenki-subtle text-tenki-muted hover:border-tenki-ink")
      }
    >
      {label} <span className="opacity-60">({total})</span>
    </Link>
  );
}

