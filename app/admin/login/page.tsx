import { redirect } from "next/navigation";
import { cookies } from "next/headers";

async function login(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  if (token === process.env.ADMIN_TOKEN) {
    const c = await cookies();
    c.set("tenkibench_admin", token, {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
    });
    redirect("/admin");
  }
  redirect("/admin/login?err=1");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const { err } = await searchParams;
  return (
    <main className="max-w-md mx-auto px-6 py-24">
      <div className="eyebrow mb-3">Admin</div>
      <h1 className="h1 mb-6">Logg inn</h1>
      <form action={login} className="space-y-4">
        <input
          name="token"
          type="password"
          placeholder="ADMIN_TOKEN"
          autoFocus
          className="tenki-input"
        />
        <button type="submit" className="border hairline border-[var(--tenki-ink)] px-4 py-2">
          Logg inn
        </button>
        {err && <p className="text-sm text-red-600">Feil token.</p>}
      </form>
      <p className="mt-6 text-xs text-[var(--tenki-muted)]">
        Setter <code>ADMIN_TOKEN</code> i .env.local. Cookie varer 30 dager.
      </p>
    </main>
  );
}
