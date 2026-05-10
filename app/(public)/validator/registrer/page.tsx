import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Pill } from "@/components/ui/pill";
import { query } from "@/lib/db";

export const metadata = { title: "Bli validator · TenkiBench" };
export const dynamic = "force-dynamic";

// Eleven canonical bench-slug options offered as expertise areas.
// These match `migrations/0003_all_benches.sql` and are the focus areas
// where we most need external sign-off.
const EXPERTISE_OPTIONS = [
  { slug: "norwegian-smb",          label: "Norsk SMB (faktura, MVA, kontrakt, HR)" },
  { slug: "eu-ai-act",              label: "EU AI Act" },
  { slug: "hallucination",          label: "Hallusinasjon (juridisk fakta)" },
  { slug: "tool-use",               label: "Verktøysbruk (Brreg, Lovdata, Altinn)" },
  { slug: "norwegian-construction", label: "Bygg og anlegg (NS-kontrakter, HMS)" },
  { slug: "norwegian-healthcare",   label: "Helse og omsorg" },
  { slug: "norwegian-finance",      label: "Finans og bank" },
  { slug: "gdpr-advanced",          label: "GDPR avansert" },
  { slug: "norwegian-language",     label: "Norsk språk og dialekter" },
  { slug: "competition-aml",        label: "Konkurranse og hvitvasking" },
  { slug: "accessibility",          label: "Universell utforming (WCAG, EU AA)" },
] as const;

async function submitApplication(formData: FormData) {
  "use server";

  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const name = get("name");
  const email = get("email").toLowerCase();
  const title = get("title") || null;
  const employer = get("employer") || null;
  const linkedin_url = get("linkedin_url") || null;
  const bio = get("bio") || null;
  const rateRaw = get("hourly_rate_nok");
  const hourly_rate_nok = rateRaw ? Number(rateRaw) : null;

  // expertise_areas comes as a list of checked values
  const expertise_areas = formData
    .getAll("expertise_areas")
    .map((v) => String(v).trim())
    .filter(Boolean);

  if (!name || !email || expertise_areas.length === 0) {
    redirect("/validator/registrer?err=missing");
  }
  // Light email sanity-check.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/validator/registrer?err=email");
  }

  try {
    await query(
      `insert into validator_applications
         (name, email, title, employer, linkedin_url, expertise_areas, bio, hourly_rate_nok)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [name, email, title, employer, linkedin_url, expertise_areas, bio, hourly_rate_nok],
    );
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("validator_applications_email_key")) {
      redirect("/validator/registrer?err=duplicate");
    }
    redirect(`/validator/registrer?err=${encodeURIComponent(msg.slice(0, 120))}`);
  }

  redirect("/validator/registrer?ok=1");
}

export default async function ValidatorRegistrerPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;

  if (ok) {
    return (
      <>
        <SiteHeader />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 md:px-10 py-16">
          <div className="eyebrow mb-3">Søknad mottatt</div>
          <h1 className="h1 mb-6">Takk for søknaden</h1>
          <p className="text-lg leading-relaxed mb-4">
            Vi har registrert søknaden din. Du hører fra oss innen tre virkedager.
          </p>
          <p className="text-[var(--tenki-muted)] leading-relaxed mb-10">
            Hvis du blir godkjent får du tilgang til oppgavene innenfor ditt
            fagområde, kreditt på hver oppgave du signerer av, og — hvis du
            ønsker det — vises offentlig på <a className="underline" href="/validatorer">/validatorer</a>.
          </p>
          <Pill href="/" variant="ghost">Tilbake til forsiden</Pill>
        </main>
        <SiteFooter />
      </>
    );
  }

  const errMessage = errToText(err);

  return (
    <>
      <SiteHeader />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-16">
        <div className="eyebrow mb-3">Validator-program</div>
        <h1 className="h1 mb-8">Bli validator</h1>

        <p className="text-lg leading-relaxed mb-4">
          TenkiBench rekrutterer norske fagfolk — advokater, revisorer, leger,
          ingeniører, regnskapsførere, HR-rådgivere og språkvitere — til å
          validere benchmark-oppgavene.
        </p>
        <p className="text-[var(--tenki-muted)] leading-relaxed mb-4">
          Validering er en kvalitetskontroll. Du gjennomgår oppgaver i ditt
          fagområde, sjekker at fasiten stemmer, og signerer av eller ber om
          revisjon. Tidsbruk: typisk 1–4 timer per kategori. Du krediteres
          per oppgave på offentlige sider.
        </p>
        <p className="text-[var(--tenki-muted)] leading-relaxed mb-10">
          Send inn skjemaet under, så ser vi på det og melder fra innen tre
          virkedager.
        </p>

        {errMessage && (
          <div className="mb-6 rounded-xl border border-tenki-bad bg-red-50 px-4 py-3 text-sm text-red-900">
            {errMessage}
          </div>
        )}

        <form action={submitApplication} className="space-y-6">
          <Field name="name" label="Navn" required placeholder="Kari Nordmann" />
          <Field name="email" label="E-post" type="email" required placeholder="kari@firma.no" />
          <Field name="title" label="Tittel / yrke" placeholder="Advokat, regnskapsfører, lege …" />
          <Field name="employer" label="Arbeidsgiver / firma" placeholder="" />
          <Field name="linkedin_url" label="LinkedIn (valgfritt)" type="url" placeholder="https://linkedin.com/in/…" />

          <div>
            <label className="eyebrow block mb-2">Fagområder du kan validere *</label>
            <p className="text-xs text-[var(--tenki-muted)] mb-3">
              Velg ett eller flere. Du blir kun tilegnet oppgaver innenfor dette.
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {EXPERTISE_OPTIONS.map((opt) => (
                <label
                  key={opt.slug}
                  className="flex items-start gap-2 rounded-xl border border-tenki-subtle bg-white px-3 py-2 text-sm cursor-pointer hover:border-tenki-ink transition-colors"
                >
                  <input
                    type="checkbox"
                    name="expertise_areas"
                    value={opt.slug}
                    className="mt-1"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="eyebrow block mb-1">Kort om deg / relevant erfaring</label>
            <textarea
              name="bio"
              rows={4}
              placeholder="Stikkord om utdannelse, fagområde, antall års erfaring …"
              className="tenki-input"
            />
          </div>

          <Field
            name="hourly_rate_nok"
            label="Forventet timesats (NOK, valgfritt)"
            type="number"
            placeholder="1200"
          />

          <div className="pt-4">
            <Pill as="button" type="submit" arrow>
              Send søknad
            </Pill>
          </div>
        </form>
      </main>
      <SiteFooter />
    </>
  );
}

function Field({
  name, label, placeholder, required, type = "text",
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="eyebrow block mb-1">{label}{required ? " *" : ""}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="tenki-input"
      />
    </div>
  );
}

function errToText(err: string | undefined): string | null {
  if (!err) return null;
  if (err === "missing") return "Navn, e-post og minst ett fagområde må fylles ut.";
  if (err === "email") return "E-postadressen ser ikke gyldig ut.";
  if (err === "duplicate") return "Vi har allerede en søknad fra denne e-postadressen. Send oss en e-post hvis du tror dette er feil.";
  return err;
}
