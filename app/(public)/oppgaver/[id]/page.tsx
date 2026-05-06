import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadTask } from "@/lib/tasks/loader";

export const revalidate = 300;

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = loadTask(id);
  if (!task) notFound();

  return (
    <>
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="eyebrow mb-3">{task.category} · {task.difficulty} · v{task.version}</div>
        <h1 className="h1 mb-2">{task.title}</h1>
        <p className="text-xs text-[var(--tenki-muted)] mb-10 font-mono">{task.id}</p>

        <section className="mb-8">
          <div className="eyebrow mb-2">Hvorfor denne oppgaven</div>
          <p className="text-[var(--tenki-ink)] leading-relaxed">{task.rationale}</p>
        </section>

        <section className="mb-8">
          <div className="eyebrow mb-2">Spørsmål til modellen</div>
          <pre className="border hairline border-[var(--tenki-subtle)] bg-white p-4 text-sm whitespace-pre-wrap font-sans">
{task.user_prompt}
          </pre>
        </section>

        {task.system_prompt && (
          <section className="mb-8">
            <div className="eyebrow mb-2">System-prompt</div>
            <pre className="border hairline border-[var(--tenki-subtle)] bg-white p-4 text-sm whitespace-pre-wrap font-sans">
{task.system_prompt}
            </pre>
          </section>
        )}

        <section className="mb-8">
          <div className="eyebrow mb-2">Gull-standard</div>
          <pre className="border hairline border-[var(--tenki-subtle)] bg-white p-4 text-sm whitespace-pre-wrap font-mono">
{task.gold_answer}
          </pre>
        </section>

        <section className="mb-8 grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="eyebrow mb-1">Eval-metode</div>
            <div className="font-mono">{task.eval.method}</div>
          </div>
          <div>
            <div className="eyebrow mb-1">Kilde</div>
            <div>{task.source}</div>
          </div>
          <div>
            <div className="eyebrow mb-1">Forfatter</div>
            <div>{task.authored_by}</div>
          </div>
          <div>
            <div className="eyebrow mb-1">Forfattet</div>
            <div className="font-mono text-xs">{task.authored_at}</div>
          </div>
        </section>

        {task.validated_by && task.validated_by.length > 0 && (
          <section className="mb-8">
            <div className="eyebrow mb-2">Validert av eksterne</div>
            <ul className="text-sm">
              {task.validated_by.map((v, i) => (
                <li key={i} className="border-b hairline border-b-[var(--tenki-subtle)] py-2 last:border-0">
                  <strong>{v.name}</strong>{" "}
                  <span className="text-[var(--tenki-muted)]">— {v.role}, {v.validated_at}</span>
                  {v.comments && <p className="text-[var(--tenki-muted)] mt-1">{v.comments}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {task.tags.length > 0 && (
          <section>
            <div className="eyebrow mb-2">Tags</div>
            <div className="flex gap-2 flex-wrap">
              {task.tags.map((t) => (
                <span key={t} className="surface px-2 py-1 text-xs font-mono">{t}</span>
              ))}
            </div>
          </section>
        )}

        <p className="mt-10 text-sm text-[var(--tenki-muted)]">
          <Link href={`https://github.com/tenki-labs/tenkibench/blob/main/tasks/${task.category}/${task.id}.yaml`} className="underline">
            Vis YAML-kilde på GitHub →
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
