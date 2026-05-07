# TenkiBench — VPS-oppsett

Eitt-gangs bootstrap av tenki-VPS-en for å kjøre TenkiBench. Etter dette deployes via GitHub Actions automatisk på push til `main`.

> Forutsetter at tenki-marketing-stacken (`tenki-web-1`, `supabase-db`, `edge-caddy-1`) allerede kjører på samme VPS. Hvis ikke — sett opp den først (følg `tenki-labs/website` sin CLAUDE.md).

---

## 1. Forutsetninger

VPS: `100.126.214.4` (via Tailscale) / `192.168.1.67:2040` (via VPN)

- Docker + Docker Compose installert
- `supabase-db` kjører på Docker
- `edge-caddy-1` kjører på `edge_net`-Docker-network med `/opt/edge/` mountet
- Tailscale installert og innlogget på VPS

---

## 2. SSH-nøkkel for GitHub Actions (på din lokale maskin)

GitHub Actions bruker en SSH-nøkkel for å logge inn — passordbasert SSH virker ikke i CI.

```bash
# Generer ny nøkkel dedikert til CI-deploy (ikke gjenbruk personlig)
ssh-keygen -t ed25519 -f ~/.ssh/tenkibench_ci -C "tenkibench-ci@github-actions" -N ""

# Vis offentlig nøkkel — kopier hele linjen
cat ~/.ssh/tenkibench_ci.pub
```

Logg inn på VPS-en (gjennom Tailscale eller VPN), og legg til den offentlige nøkkelen:

```bash
ssh tenki@100.126.214.4

# På VPS:
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "ssh-ed25519 AAAAC3... tenkibench-ci@github-actions" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Privat nøkkel lagrer du som GitHub Secret senere (steg 7).

---

## 3. Tailscale OAuth-klient (for at GitHub Actions kan koble til tailnet)

I Tailscale admin-konsollen:

1. Gå til **Settings → OAuth clients**
2. Klikk **Generate OAuth client**
3. Beskrivelse: `github-actions-tenkibench`
4. Tildel scope: `auth_keys` (write)
5. Tags: `tag:ci`
6. Klikk **Generate client**
7. Kopier ned **Client ID** og **Client secret** — du ser secret kun én gang

I Tailscale admin → **ACL** (`tailnet policy file`), legg til hvis ikke der:

```jsonc
{
  "tagOwners": {
    "tag:ci": ["autogroup:admin"],
  },
  "acls": [
    {
      "action": "accept",
      "src": ["tag:ci"],
      "dst": ["100.126.214.4:22"],
    },
  ],
}
```

Dette lar `tag:ci`-noden (GitHub Actions runner) SSH-e til VPS-en, men ingenting annet.

---

## 4. Bootstrap mappestruktur på VPS

SSH inn og kjør:

```bash
ssh tenki@100.126.214.4

sudo mkdir -p /opt/tenkibench/{repo,env,data}
sudo chown -R $(whoami):$(whoami) /opt/tenkibench
chmod 750 /opt/tenkibench
chmod 700 /opt/tenkibench/env
```

---

## 5. Lag `/opt/tenkibench/env/.env.production`

Generer hemmelige tokens lokalt eller på VPS:

```bash
# Kjør disse på VPS-en og kopier output
echo "ADMIN_TOKEN=$(openssl rand -hex 32)"
echo "CRON_TOKEN=$(openssl rand -hex 32)"
```

Hent Postgres-passordet fra eksisterende tenki-stack:

```bash
grep POSTGRES_PASSWORD /opt/tenki/env/supabase.env
```

Lag fila med riktig modus:

```bash
cat > /opt/tenkibench/env/.env.production <<'EOF'
# Database — egen DB i delt supabase-db-instans
DATABASE_URL=postgres://postgres:DIN_POSTGRES_PASSWORD@supabase-db:5432/tenkibench
POSTGRES_PASSWORD=DIN_POSTGRES_PASSWORD

# Public
NEXT_PUBLIC_SITE_URL=https://bench.tenki.no
NEXT_PUBLIC_SITE_NAME=TenkiBench

# Mammouth.ai — primær LLM-gateway
MAMMOUTH_API_KEY=DIN_MAMMOUTH_NØKKEL
MAMMOUTH_BASE_URL=https://api.mammouth.ai/v1

# Lokal LLM (Mac Mini)
LOCAL_LLM_BASE_URL=https://mlx.tenki.no/v1
LOCAL_LLM_API_KEY=DIN_LOCAL_LLM_BEARER

# Admin auth
ADMIN_TOKEN=GENERER_OVENFOR

# Cron auth
CRON_TOKEN=GENERER_OVENFOR

# Judge
JUDGE_MODEL=claude-opus-4-7
JUDGE_PROVIDER=mammouth
EOF

chmod 600 /opt/tenkibench/env/.env.production
```

---

## 6. DNS

I domeneshop (eller hvor `tenki.no` administreres):

```
Type: A
Navn: bench
Verdi: 193.200.238.120  (samme offentlige IP som tenki.no)
TTL:   3600
```

Caddy plukker opp og utsteder TLS-sertifikat automatisk når første request kommer inn etter første deploy.

---

## 7. GitHub-secrets

Gå til <https://github.com/tenki-labs/tenkibench/settings/secrets/actions> og legg til:

| Secret | Verdi |
|---|---|
| `TS_OAUTH_CLIENT_ID` | Fra Tailscale (steg 3) |
| `TS_OAUTH_SECRET` | Fra Tailscale (steg 3) |
| `DEPLOY_SSH_KEY` | Innholdet i `~/.ssh/tenkibench_ci` (privat nøkkel — hele filen, inkl. BEGIN/END) |
| `DEPLOY_HOST` | `100.126.214.4` (Tailscale IP) |
| `DEPLOY_USER` | `tenki` |

Pluss en GitHub-environment ved navn `production`:

1. Settings → Environments → New environment
2. Navn: `production`
3. (Valgfritt) Required reviewers: Einar — slik at hver deploy må godkjennes manuelt med ett klikk

---

## 8. Første deploy (manuelt, for å validere)

På VPS:

```bash
# Klone repo og kjør deploy.sh manuelt første gang
cd /tmp
git clone https://github.com/tenki-labs/tenkibench.git
sudo cp -r tenkibench/* /opt/tenkibench/repo/
sudo chown -R tenki:tenki /opt/tenkibench/repo

cd /opt/tenkibench/repo
bash scripts/deploy.sh
```

Forventet output:

```
▸ Loading secrets
▸ Building image
▸ Ensuring shared edge network exists
▸ Setting up tenkibench database in shared Postgres
▸ Applying migrations
  ✓ 0001_init.sql
  ✓ 0002_benches.sql
  ✓ 0003_all_benches.sql
▸ Bringing up tenkibench-web
▸ Attaching tenkibench network to shared edge Caddy
▸ Syncing Caddy site fragment
▸ Health check
  ✓ healthy
▸ External smoke test
  https://bench.tenki.no/api/healthz → 200
✓ Deploy complete
```

Sjekk i nettleser: <https://bench.tenki.no>

---

## 9. Backup utvidelse

Eksisterende tenki-backup container (`tenki-backup-1`) håndterer bare tenki-databasen. Legg til tenkibench i samme nightly script.

I `tenki-labs/website` repo, oppdater `scripts/backup.sh` (eller hvor backup-koden ligger) til også å dumpe `tenkibench`-databasen:

```bash
# Eksisterende:
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" supabase-db \
  pg_dump -U postgres -d postgres > $OUT/tenki-postgres.sql.gz

# Legg til:
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" supabase-db \
  pg_dump -U postgres -d tenkibench > $OUT/tenkibench-postgres.sql.gz
```

(Eller kopier den eksisterende rclone-backupen som B2-uploader fanger automatisk hvis den tar hele `/opt/tenki/backups/`.)

---

## 10. Hold-out-oppgaver

`tasks-holdout/` er gitignored — må manuelt deployes:

```bash
# Fra din lokale maskin
scp -r tasks-holdout/ tenki@100.126.214.4:/opt/tenkibench/repo/
```

Deploy.sh plukker opp katalogen automatisk neste gang `tenkibench-web-1` rebuilds.

---

## 11. Cron — kvartalsvis full-kjøring av alle modeller

På VPS:

```bash
crontab -e
```

Legg til:

```
# TenkiBench: kvartalsvis run-all (1. dag i hver tredje måned, kl 03:00)
0 3 1 */3 * curl -fsS -H "Authorization: Bearer $CRON_TOKEN" https://bench.tenki.no/api/cron/run-all >> /var/log/tenkibench-cron.log 2>&1
```

Pass på at `$CRON_TOKEN` er satt i shell-environment eller lim inn verdien direkte.

---

## 12. Verifisering — sjekklist etter første deploy

- [ ] `curl -I https://bench.tenki.no/` → 200
- [ ] `curl -I https://bench.tenki.no/api/healthz` → 200 og `{"status":"ok"}`
- [ ] `curl -I https://bench.tenki.no/leaderboard` → 200
- [ ] `curl https://bench.tenki.no/api/public/leaderboard | jq` returnerer JSON
- [ ] Logg inn på `/admin/login` med `ADMIN_TOKEN` → kommer inn på admin
- [ ] Push en triviell endring til `main` → GitHub Actions kjører gjennom uten manual intervention
- [ ] `docker logs tenkibench-web-1` viser ingen kritiske feil
- [ ] `docker stats tenkibench-web-1` — < 500 MB RAM, < 5% CPU i idle

---

## Feilsøking

### `bench.tenki.no` returnerer 502
Edge-Caddy treffer ikke tenkibench-web. Sjekk:
```bash
docker network inspect tenkibench
docker inspect edge-caddy-1 | grep Networks
```
Begge må peke på `tenkibench`-nettet og `edge_net`. Hvis ikke:
```bash
docker network connect tenkibench edge-caddy-1
docker exec edge-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

### Postgres-tilkobling feiler
```bash
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" supabase-db \
  psql -U postgres -l | grep tenkibench
```
Hvis ikke listet, kjør deploy.sh på nytt — den oppretter databasen idempotent.

### TLS-sertifikat ikke utstedt
```bash
docker logs edge-caddy-1 | grep bench.tenki.no
```
ACME trenger DNS å peke riktig først. Vent 1–2 min etter DNS-oppdatering.

### Tailscale GitHub Action feiler
Sjekk i Tailscale admin → **Machines**: kommer en ny "ci"-tagget node opp ved deploy? Hvis ikke, dobbel-sjekk OAuth-secret + ACL `tag:ci`.
