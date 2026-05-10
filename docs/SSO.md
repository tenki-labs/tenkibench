# SSO i TenkiBench

bench.tenki.no støtter **to varianter av Tenki SSO** parallelt. Begge skriver de
samme cookies (`tenki_session`, `tenki_refresh`) på `Domain=.tenki.no`, så
nedstrøms-koden (middleware, `lib/admin-auth.ts`, alle admin-ruter) ser samme
JWT uavhengig av hvilken vei brukeren kom inn.

## 1. Cookie-shared SSO (legacy / default)

Den enkle modellen som fungerte fra dag én.

- Bruker logger inn på `auth.tenki.no` (Supabase GoTrue under tenki.no).
- tenki.no skriver `tenki_session` + `tenki_refresh` med `Domain=.tenki.no`.
- bench.tenki.no leser cookie-en og verifiserer JWT lokalt med delt
  `SUPABASE_JWT_SECRET`. Refresh går mot `auth.tenki.no/auth/v1/token`.
- Ingen registrering. Bryter aldri.

Kode: [`lib/tenki-sso.ts`](../lib/tenki-sso.ts) + [`middleware.ts`](../middleware.ts).

**Aktiv når:** `TENKI_OIDC_CLIENT_ID` IKKE er satt i `.env.production`.

## 2. OIDC Authorization Code + PKCE (proper)

Bench er registrert som ekte OIDC-klient på `tenki.no/admin/sso`. Brukere
sendes via `auth.tenki.no/oauth/authorize`, code byttes mot tokens, og
samme `tenki_session`-cookie skrives.

```
bench /admin (uten cookie)
  → middleware redirecter til /api/auth/login
  → /api/auth/login lagrer state + code_verifier i oidc_state
  → redirect til auth.tenki.no/oauth/authorize?response_type=code&...
  → bruker logger inn på auth.tenki.no
  → IdP redirecter til https://bench.tenki.no/api/auth/callback?code=...&state=...
  → callback slår opp state, exchange code → tokens, verifiser id_token
  → setter tenki_session/tenki_refresh på Domain=.tenki.no
  → redirect tilbake til /admin
```

Kode:
- [`lib/oidc-client.ts`](../lib/oidc-client.ts) — PKCE, authorize-URL, token-utveksling, JWT-verifisering, webhook-signatur
- [`app/api/auth/login/route.ts`](../app/api/auth/login/route.ts) — start
- [`app/api/auth/callback/route.ts`](../app/api/auth/callback/route.ts) — sluttfør
- [`app/api/auth/webhook/route.ts`](../app/api/auth/webhook/route.ts) — IdP push (logout, role_change, user_deleted)
- [`migrations/0008_oidc_state.sql`](../migrations/0008_oidc_state.sql) — state + event-log

**Aktiv når:** `TENKI_OIDC_CLIENT_ID` ER satt i `.env.production` (sammen med
de andre `TENKI_OIDC_*`-variablene). Middleware sjekker dette per request.

## Sammenligning

| Egenskap | Cookie-shared | OIDC |
|---|---|---|
| Krever registrering på tenki.no | Nei | Ja (`/admin/sso`) |
| Krever `SUPABASE_JWT_SECRET` på bench | Ja | Ja (id_token verifiseres med samme HS256) |
| Funker for `*.tenki.no`-domener | Ja | Ja |
| Funker for andre domener | Nei (cookie-domain begrenser) | Ja (kan registreres med vilkårlig redirect_uri) |
| Refresh-rotasjon | Ja, mot `auth.tenki.no/auth/v1/token` | Ja, refresh_token returneres fra token-endepunkt |
| Webhook-events fra IdP | Nei | Ja (`/api/auth/webhook`) |
| Standard | Defaulten i dag | Foretrukket på sikt |

Cookie-shared blir igjen som fallback inntil videre. OIDC er forskjellet
nyttig fordi det gir oss webhook-events (logout-fanout, sletting) og legger
grunnlaget for at bench skal kunne flyttes vekk fra `.tenki.no`-domenet.

## Registrering på tenki.no/admin/sso

Når OIDC-klienten registreres skal feltene være:

| Felt | Verdi |
|---|---|
| Klientnavn | `tenkibench` |
| Redirect URI | `https://bench.tenki.no/api/auth/callback` (EKSAKT — også trailing slash + case må matche) |
| Allowed scopes | `openid profile email` |
| Webhook URL (valgfritt) | `https://bench.tenki.no/api/auth/webhook` |
| Token endpoint auth method | `client_secret_post` |
| PKCE | `S256` påkrevd |

Etter registrering får du `client_id` og `client_secret`. Skriv dem rett inn
i `/opt/tenkibench/env/.env.production` på VPS-en — aldri commit, aldri logg.
Force-recreate `tenkibench-web-1` etterpå:

```
ssh deploy@193.200.238.120
cd /opt/tenkibench/repo
docker compose -f compose.yml up -d --force-recreate web
```

## Test-prosedyre

### Manuelt — cookie-shared (default)

1. Åpne `https://bench.tenki.no/admin` i nettleser uten Tenki-sesjon.
2. Skal redirecte til `auth.tenki.no/admin/login?next=...`.
3. Logg inn på tenki.no. Du skal komme tilbake til `/admin`.
4. Cookie `tenki_session` skal være satt med `Domain=.tenki.no` (sjekk
   DevTools → Application → Cookies).

### Manuelt — OIDC

Forutsetter at `TENKI_OIDC_CLIENT_ID/SECRET/REDIRECT_URI` er satt og
klienten er registrert.

1. Åpne `https://bench.tenki.no/admin` i nettleser uten Tenki-sesjon.
2. Skal redirecte til `https://bench.tenki.no/api/auth/login?next=...`.
3. Skal videreredirecte til `auth.tenki.no/oauth/authorize?...&code_challenge=...&state=...`.
4. Logg inn — IdP redirecter til `bench.tenki.no/api/auth/callback?code=...&state=...`.
5. Etter callback skal du være på `/admin` med cookie satt.
6. Sjekk at `oidc_state`-raden er slettet:

   ```
   docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" supabase-db \
     psql -U postgres -d tenkibench -c "select count(*) from public.oidc_state;"
   ```

   Skal være 0 like etter en vellykket login (cleanup happens på vellykket exchange).

### Automatisert (TODO)

Playwright-spec under `tests/e2e/` som mock-er `auth.tenki.no` og verifiserer
hele flyten. Ikke implementert ennå — manuell smoke er fortsatt nok i v0.8.

### Webhook-test

Send en signert POST til `/api/auth/webhook`:

```bash
SECRET="<TENKI_OIDC_CLIENT_SECRET>"
BODY='{"event":"role_change","user_id":"abc-123","new_role":"admin"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $2}')
curl -sS https://bench.tenki.no/api/auth/webhook \
  -H "Content-Type: application/json" \
  -H "X-Tenki-Signature: sha256=$SIG" \
  -d "$BODY"
```

Skal returnere `{"ok":true}` og en rad i `auth_webhook_events`.

## Gotchas

- **PKCE er S256, ikke plain.** `code_challenge_method=S256` er hardkodet i
  `buildAuthorizeUrl`. Hvis IdP-en av en eller annen grunn ikke godtar S256,
  må vi droppe PKCE — IKKE bytte til `plain` (det er null sikkerhet).
- **state-validering må være single-use.** Vi sletter raden i `oidc_state`
  så snart code er byttet. En lekket `state` + `code` kan ikke brukes to ganger.
- **JWT verifiseres som HS256.** Hvis IdP-en migrerer til RS256 må
  `verifyIdToken` bytte til JWKS-basert verifisering — `TENKI_OIDC_JWKS_URL`
  er allerede klar i config-en.
- **`X-Tenki-Signature` HMAC over rå body.** Webhook-routen leser
  `req.text()` FØR `JSON.parse` — hvis du gjør `await req.json()` først kan
  Next.js cache-e det og du mister rå body, og signaturen vil aldri matche.
- **Open redirect-vern.** Callback-routen tillater bare interne paths eller
  `*.tenki.no`-hostnames i `redirect_to`. Alt annet faller tilbake til
  `/admin`.
- **Cookie-domain.** Vi skriver `Domain=.tenki.no` (med ledende punktum) —
  *ikke* `Domain=bench.tenki.no`. Sistnevnte ville logget brukeren ut på
  tenki.no etter første refresh.
