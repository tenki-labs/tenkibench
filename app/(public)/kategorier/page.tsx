import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardEyebrow, CardTitle } from "@/components/ui/card";
import { query } from "@/lib/db";
import Link from "next/link";

export const revalidate = 60;

export default async function CategoriesIndex() {
  const { rows } = await query<{ slug: string; name: string; description: string; weight: string }>(
    `select slug, name, description, weight from categories order by weight desc, name`,
  );

  return (
    <>
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="eyebrow mb-3">Kategorier</div>
        <h1 className="h1 mb-10">8 kategorier som speiler norsk SMB-arbeid</h1>

        <div className="grid sm:grid-cols-2 gap-4">
          {rows.map((c, i) => (
            <Link key={c.slug} href={`/kategorier/${c.slug}`}>
              <Card className="hover:accent-strip transition-shadow h-full">
                <CardEyebrow>{String(i + 1).padStart(2, "0")} · vekt {c.weight}</CardEyebrow>
                <CardTitle>{c.name}</CardTitle>
                <p className="mt-2 text-sm text-[var(--tenki-muted)]">{c.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
