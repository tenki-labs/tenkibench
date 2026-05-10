import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query, one } from "@/lib/db";
import { requireStaff } from "@/lib/admin-auth";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ValidatorDetail {
  id: number;
  name: string;
  email: string;
  title: string | null;
  employer: string | null;
  linkedin_url: string | null;
  expertise_areas: string[];
  bio: string | null;
  hourly_rate_nok: number | null;
  status: string;
  applied_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_notes: string | null;
}

interface AssignmentRow {
  task_id: string;
  assigned_at: string;
  completed_at: string | null;
  validation_status: string;
  validation_comments: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Venter",
  approved: "Godkjent",
  rejected: "Avvist",
  inactive: "Inaktiv",
};

// --- Server actions -------------------------------------------------------

async function reviewApplication(formData: FormData) {
  "use server";
  const claims = await requireStaff();

  const id = Number(formData.get("id"));
  const action = String(formData.get("action") ?? "");
  const notes = String(formData.get("admin_notes") ?? "").trim() || null;

  if (!id || !["approve", "reject", "needs-revision", "inactive"].includes(action)) {
    redirect(`/admin/validatorer/${id}?err=invalid`);
  }

  // 'needs-revision' is a comment-only action that keeps status=pending but
  // attaches admin notes — use it to ask the candidate for more info.
  let nextStatus: string;
  if (action === "approve") nextStatus = "approved";
  else if (action === "reject") {
    if (!notes) redirect(`/admin/validatorer/${id}?err=reject-needs-notes`);
    nextStatus = "rejected";
  } else if (action === "inactive") nextStatus = "inactive";
  else nextStatus = "pending";

  const reviewer = claims.email ?? claims.sub ?? "ukjent";

  await query(
    `update validator_applications
        set status = $1,
            admin_notes = coalesce($2, admin_notes),
            reviewed_at = now(),
            reviewed_by = $3
      where id = $4`,
    [nextStatus, notes, reviewer, id],
  );

  revalidatePath(`/admin/validatorer/${id}`);
  revalidatePath("/admin/validatorer");
  revalidatePath("/validatorer");
  redirect(`/admin/validatorer/${id}?ok=reviewed`);
}

async function assignTask(formData: FormData) {
  "use server";
  await requireStaff();

  const id = Number(formData.get("id"));
  const task_id = String(formData.get("task_id") ?? "").trim();
  if (!id || !task_id) {
    redirect(`/admin/validatorer/${id}?err=missing-task`);
  }

  await query(
    `insert into validator_task_assignments (validator_id, task_id)
       values ($1, $2)
       on conflict (validator_id, task_id) do nothing`,
    [id, task_id],
  );

  revalidatePath(`/admin/validatorer/${id}`);
  redirect(`/admin/validatorer/${id}?ok=assigned`);
}

async function removeAssignment(formData: FormData) {
  "use server";
  await requireStaff();

  const id = Number(formData.get("id"));
  const task_id = String(formData.get("task_id") ?? "").trim();
  if (!id || !task_id) redirect(`/admin/validatorer/${id}?err=missing-task`);

  await query(
    `delete from validator_task_assignments
        where validator_id = $1 and task_id = $2`,
    [id, task_id],
  );

  revalidatePath(`/admin/validatorer/${id}`);
  redirect(`/admin/validatorer/${id}?ok=removed`);
}

// --- Page -----------------------------------------------------------------

export default async function ValidatorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  await requireStaff();

  const { id } = await params;
  const { ok, err } = await searchParams;
  const numId = Number(id);
  if (!Number.isFinite(numId)) notFound();

  const v = await one<ValidatorDetail>(
    `select id, name, email, title, employer, linkedin_url, expertise_areas, bio,
            hourly_rate_nok, status, applied_at, reviewed_at, reviewed_by, admin_notes
       from validator_applications where id = $1`,
    [numId],
  );
  if (!v) notFound();

  const { rows: assignments } = await query<AssignmentRow>(
    `select task_id, assigned_at, completed_at, validation_status, validation_comments
       from validator_task_assignments
      where validator_id = $1
      order by assigned_at desc`,
    [numId],
  );

  return (
    <>
      <div className="eyebrow mb-3">
        <Link href="/admin/validatorer" className="hover:underline">Validatorer</Link>
        {" / "}#{v.id}
      </div>
      <h1 className="h1 mb-2">{v.name}</h1>
      <p className="text-sm text-tenki-muted mb-8">
        <a className="underline" href={`mailto:${v.email}`}>{v.email}</a>
        {" · status: "}
        <span className="font-mono uppercase tracking-eyebrow">
          {STATUS_LABEL[v.status] ?? v.status}
        </span>
      </p>

      {ok && (
        <div className="mb-6 rounded-xl border border-tenki-good bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          Lagret.
        </div>
      )}
      {err && (
        <div className="mb-6 rounded-xl border border-tenki-bad bg-red-50 px-4 py-2 text-sm text-red-900">
          {humanizeErr(err)}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-8">
          <Panel title="Søknad">
            <DLine label="Navn" value={v.name} />
            <DLine label="E-post" value={v.email} />
            <DLine label="Tittel" value={v.title} />
            <DLine label="Arbeidsgiver" value={v.employer} />
            <DLine
              label="LinkedIn"
              value={v.linkedin_url ? (
                <a className="underline" href={v.linkedin_url} target="_blank" rel="noopener">
                  {v.linkedin_url}
                </a>
              ) : null}
            />
            <DLine
              label="Fagområder"
              value={
                <div className="flex flex-wrap gap-1">
                  {v.expertise_areas.map((a) => (
                    <span
                      key={a}
                      className="font-mono text-[10px] uppercase tracking-eyebrow text-tenki-muted border border-tenki-subtle rounded-full px-2 py-0.5"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              }
            />
            <DLine label="Bio" value={v.bio} multiline />
            <DLine
              label="Forventet timesats"
              value={v.hourly_rate_nok ? `${v.hourly_rate_nok} NOK` : null}
            />
            <DLine label="Søkt" value={formatDate(v.applied_at)} />
          </Panel>

          <Panel title="Tildelte oppgaver">
            {assignments.length === 0 ? (
              <p className="text-sm text-tenki-muted">Ingen tildelinger ennå.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-tenki-subtle text-left">
                    <th className="py-2 eyebrow">Task ID</th>
                    <th className="py-2 eyebrow">Status</th>
                    <th className="py-2 eyebrow text-right">Tildelt</th>
                    <th className="py-2 eyebrow text-right">Fullført</th>
                    <th className="py-2 eyebrow text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.task_id} className="border-b border-tenki-subtle last:border-0">
                      <td className="py-2 font-mono text-xs">{a.task_id}</td>
                      <td className="py-2 text-xs">{a.validation_status}</td>
                      <td className="py-2 text-right text-xs text-tenki-muted">
                        {formatDate(a.assigned_at)}
                      </td>
                      <td className="py-2 text-right text-xs text-tenki-muted">
                        {formatDate(a.completed_at)}
                      </td>
                      <td className="py-2 text-right">
                        <form action={removeAssignment}>
                          <input type="hidden" name="id" value={v.id} />
                          <input type="hidden" name="task_id" value={a.task_id} />
                          <button
                            type="submit"
                            className="text-xs text-tenki-bad underline"
                          >
                            Fjern
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <form action={assignTask} className="mt-6 flex gap-2">
              <input type="hidden" name="id" value={v.id} />
              <input
                name="task_id"
                placeholder="task-id (f.eks. faktura-001)"
                className="tenki-input tenki-input-sm flex-1"
                required
              />
              <button
                type="submit"
                className="rounded-xl border border-tenki-ink px-4 py-2 text-sm hover:bg-tenki-ink hover:text-tenki-bg transition-colors"
              >
                Tildel
              </button>
            </form>
          </Panel>
        </section>

        <aside className="space-y-6">
          <Panel title="Vurdering">
            <form action={reviewApplication} className="space-y-3">
              <input type="hidden" name="id" value={v.id} />
              <div>
                <label className="eyebrow block mb-1">Admin-notater</label>
                <textarea
                  name="admin_notes"
                  rows={4}
                  defaultValue={v.admin_notes ?? ""}
                  placeholder="Hvorfor godkjent / avvist / hva mangler …"
                  className="tenki-input"
                />
                <p className="text-xs text-tenki-muted mt-1">
                  Påkrevd ved avvisning.
                </p>
              </div>
              <div className="grid gap-2">
                <button
                  name="action"
                  value="approve"
                  className="rounded-xl bg-tenki-ink text-tenki-bg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Godkjenn
                </button>
                <button
                  name="action"
                  value="needs-revision"
                  className="rounded-xl border border-tenki-subtle bg-white px-4 py-2 text-sm hover:border-tenki-ink"
                >
                  Trenger revisjon (be om mer info)
                </button>
                <button
                  name="action"
                  value="reject"
                  className="rounded-xl border border-tenki-bad text-tenki-bad px-4 py-2 text-sm hover:bg-red-50"
                >
                  Avvis
                </button>
                <button
                  name="action"
                  value="inactive"
                  className="rounded-xl border border-tenki-subtle text-tenki-muted px-4 py-2 text-sm hover:border-tenki-ink"
                >
                  Sett som inaktiv
                </button>
              </div>
            </form>
          </Panel>

          <Panel title="Audit-spor">
            <DLine label="Søkt" value={formatDate(v.applied_at)} />
            <DLine label="Sist vurdert" value={formatDate(v.reviewed_at)} />
            <DLine label="Vurdert av" value={v.reviewed_by} />
            <DLine label="Notater" value={v.admin_notes} multiline />
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-tenki-subtle bg-white p-5">
      <div className="eyebrow mb-4">{title}</div>
      <div className="space-y-3 text-sm">{children}</div>
    </div>
  );
}

function DLine({
  label, value, multiline,
}: {
  label: string;
  value: React.ReactNode;
  multiline?: boolean;
}) {
  if (value === null || value === undefined || value === "") {
    return (
      <div className="grid grid-cols-[140px_1fr] gap-3 items-baseline">
        <div className="eyebrow">{label}</div>
        <div className="text-tenki-muted">—</div>
      </div>
    );
  }
  if (multiline) {
    return (
      <div>
        <div className="eyebrow mb-1">{label}</div>
        <div className="whitespace-pre-wrap text-sm">{value}</div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 items-baseline">
      <div className="eyebrow">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function humanizeErr(err: string): string {
  if (err === "invalid") return "Ugyldig handling.";
  if (err === "reject-needs-notes") return "Du må fylle ut admin-notater når du avviser en søknad.";
  if (err === "missing-task") return "Mangler task-id.";
  return err;
}
