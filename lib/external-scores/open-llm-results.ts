/**
 * Open LLM Leaderboard "results" dataset (HuggingFace).
 *
 * Skiller seg fra `open-llm-leaderboard/contents` (det aggregerte leaderboardet
 * vi henter i `open-llm-leaderboard.ts`) ved å eksponere mer granulære per-task-
 * scores per modell — nyttig for å vise hvilke spesifikke benchmark-oppgaver
 * hver modell utmerker seg eller faller på.
 *
 * Datasett: open-llm-leaderboard/results
 * Endpoint: https://datasets-server.huggingface.co/rows
 *
 * Returnerer Map<normalisert-modell-id, OpenLlmDetailedScore>.
 */

const HF_BASE = "https://datasets-server.huggingface.co";
const DATASET = "open-llm-leaderboard/results";

export interface OpenLlmDetailedScore {
  fetched_at: string;
  hf_id: string;
  results: Record<string, number>;
  eval_metadata?: Record<string, unknown>;
}

interface HFRow {
  row_idx: number;
  row: Record<string, unknown>;
  truncated_cells?: string[];
}

interface HFResponse {
  features?: Array<{ name: string; type?: unknown }>;
  rows?: HFRow[];
  num_rows_total?: number;
}

/**
 * Henter inntil ~1000 rader fra results-datasettet (10 sider à 100).
 * Long-tail community-finetunes blir kuttet — kun toppen telles.
 */
export async function fetchOpenLlmResults(): Promise<Map<string, OpenLlmDetailedScore>> {
  const all: HFRow[] = [];
  let offset = 0;
  const length = 100;

  for (let page = 0; page < 10; page++) {
    const url = `${HF_BASE}/rows?dataset=${encodeURIComponent(DATASET)}&config=default&split=train&offset=${offset}&length=${length}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Open LLM Results HF ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as HFResponse;
    const rows = json.rows ?? [];
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < length) break;
    offset += length;
  }

  const map = new Map<string, OpenLlmDetailedScore>();
  const fetched_at = new Date().toISOString();

  for (const r of all) {
    const row = r.row;
    const fullname = pickString(
      row.fullname,
      row.eval_name,
      row.model,
      row.Model,
      row.model_name,
    );
    if (!fullname) continue;

    const results: Record<string, number> = {};

    // Datasettet har typisk en `results`-kolonne med per-task-scores
    // (kan være object eller stringified JSON). Vi støtter begge.
    const rawResults = row.results;
    const resultObj = parseMaybeJsonObject(rawResults);
    if (resultObj) {
      for (const [taskName, value] of Object.entries(resultObj)) {
        const n = asPercent(value);
        if (n !== undefined) results[taskName] = n;
      }
    }

    // Fallback: noen versjoner av datasettet har én kolonne per task
    // (f.eks. "ifeval", "bbh", "math", "gpqa", "musr", "mmlu_pro").
    const taskKeys = ["ifeval", "bbh", "math", "gpqa", "musr", "mmlu_pro"] as const;
    for (const k of taskKeys) {
      if (results[k] !== undefined) continue;
      const v = asPercent(row[k]);
      if (v !== undefined) results[k] = v;
    }

    if (Object.keys(results).length === 0) continue;

    const evalMetadata: Record<string, unknown> = {};
    const meta = parseMaybeJsonObject(row.eval_metadata) ?? parseMaybeJsonObject(row.metadata);
    if (meta) Object.assign(evalMetadata, meta);
    if (typeof row.precision === "string") evalMetadata.precision = row.precision;
    if (typeof row.weight_type === "string") evalMetadata.weight_type = row.weight_type;
    if (typeof row.architecture === "string") evalMetadata.architecture = row.architecture;

    map.set(normalize(fullname), {
      fetched_at,
      hf_id: fullname,
      results,
      ...(Object.keys(evalMetadata).length > 0 ? { eval_metadata: evalMetadata } : {}),
    });
  }

  return map;
}

function pickString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function asPercent(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return undefined;
  return n > 1 ? n / 100 : n;
}

function parseMaybeJsonObject(v: unknown): Record<string, unknown> | undefined {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed.startsWith("{")) return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
