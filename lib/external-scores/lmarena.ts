import type { LmArenaScore } from "./types";

/**
 * LMArena (Chatbot Arena) Elo-rangeringer.
 * Henter via HuggingFace datasets-server — ingen API-nøkkel nødvendig.
 *
 * Datasett: lmarena-ai/chatbot-arena-leaderboard
 * Endpoint: https://datasets-server.huggingface.co/rows
 *
 * Felt vi forventer (kan variere over tid):
 *   - "Model" eller "model_name" — modellnavn
 *   - "Arena Score" eller "rating" — Elo
 *   - "Votes" — antall stemmer
 *   - "Rank" eller derivert posisjon
 */

const HF_BASE = "https://datasets-server.huggingface.co";
const DATASET = "lmarena-ai/chatbot-arena-leaderboard";

interface HFRow {
  row_idx: number;
  row: Record<string, string | number | null>;
  truncated_cells?: string[];
}

interface HFResponse {
  features?: Array<{ name: string; type?: string }>;
  rows?: HFRow[];
  num_rows_total?: number;
}

/**
 * Henter alle rader. HF datasets-server returnerer 100 rader per request,
 * så vi pagineres til vi har alt. LMArena-leaderboardet har typisk ~150 modeller.
 */
export async function fetchLmArena(): Promise<Map<string, LmArenaScore>> {
  const all: HFRow[] = [];
  let offset = 0;
  const length = 100;

  for (let page = 0; page < 10; page++) {
    const url = `${HF_BASE}/rows?dataset=${encodeURIComponent(DATASET)}&config=default&split=train&offset=${offset}&length=${length}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`HuggingFace datasets-server ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as HFResponse;
    const rows = json.rows ?? [];
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < length) break;
    offset += length;
  }

  const map = new Map<string, LmArenaScore>();
  const fetched_at = new Date().toISOString();

  for (const r of all) {
    const row = r.row;
    // Felt-navn varierer over tid; sjekk vanlige varianter.
    const modelName = (row.Model ?? row.model_name ?? row.model ?? row.Name ?? "")
      .toString()
      .trim();
    if (!modelName) continue;

    const elo =
      asNumber(row["Arena Score"]) ??
      asNumber(row.rating) ??
      asNumber(row.elo) ??
      asNumber(row.Score);
    const votes = asNumber(row.Votes ?? row.votes ?? row["Total Votes"]);
    const rank = asNumber(row.Rank ?? row.rank);

    if (elo === undefined && votes === undefined) continue;

    map.set(normalizeName(modelName), {
      fetched_at,
      elo,
      votes,
      rank,
    });
  }

  return map;
}

function asNumber(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * LMArena bruker sine egne navn ("GPT-5", "Claude 4.7 Opus", etc.).
 * Vår mapping i models.external_ids.lmarena bør sette eksakt streng,
 * men vi normaliserer for å gjøre matching mindre skjør.
 */
function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
