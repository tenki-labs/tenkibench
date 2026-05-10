import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r hairline border-r-[var(--tenki-subtle)] p-6">
        <div className="eyebrow mb-6">TenkiBench Admin</div>
        <nav className="flex flex-col gap-2 text-sm">
          <Link href="/admin">Oversikt</Link>
          <Link href="/admin/modeller">Modeller</Link>
          <Link href="/admin/kjor">Kjør benchmark</Link>
          <Link href="/admin/runs">Run-historikk</Link>
          <Link href="/admin/oppgaver">Oppgaver</Link>
          <Link href="/admin/dommer-kalibrering">Dommer-kalibrering</Link>
          <Link href="/admin/eksterne-scores">Eksterne scores</Link>
          <Link href="/admin/validatorer">Validatorer</Link>
          <Link href="/" className="mt-6 text-[var(--tenki-muted)]">← Offentlig side</Link>
        </nav>
      </aside>
      <div className="flex-1 px-8 py-10">{children}</div>
    </div>
  );
}
