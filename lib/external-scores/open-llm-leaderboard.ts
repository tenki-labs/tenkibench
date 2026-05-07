/**
 * Open LLM Leaderboard (HuggingFace).
 * Dekker primært åpne modeller — Llama, Mistral, Qwen, DeepSeek osv.
 * Kommersielle modeller (GPT, Claude, Gemini) er normalt IKKE her.
 *
 * Datasett: open-llm-leaderboard/contents
 * Endpoint: https://datasets-server.huggingface.co/rows
 *
 * Returnerer Map<normalisert-modell-id, scores>.
 */

const HF_BASE = "https://datasets-server.huggingface.co";
const DATASET = "open-llm-leaderboard/contents";

export interface OpenLlmScore {
  fetched_at: string;
  hf_id: string;                  // f.eks. "meta-llama/Llama-3.3-70B-Instruct"
  rank?: number;
  scores?: {
    average?: number;             // 0-100 i HF, 0-1 normalisert under
    ifeval?: number;
    bbh?: number;
    math?: number;
    gpqa?: number;
    musr?: number;
    mmlu_pro?: number;
  };
}

interface HFRow {
  row_idx: number;
  row: Record<string, string | number | null | boolean>;
}

interface HFResponse {
  rows?: HFRow[];
}

export async function fetchOpenLlmLeaderboard(): Promise<Map<string, OpenLlmScore>> {
  const all: HFRow[] = [];
  let offset = 0;
  const length = 100;

  // Tar maks 1000 rader (10 sider) — datasettet har typisk ~1500 modeller men vi
  // bare bryr oss om de største kommersielle, ikke long-tail community-finetunes.
  for (let page = 0; page < 10; page++) {
    const url = `${HF_BASE}/rows?dataset=${encodeURIComponent(DATASET)}&config=default&split=train&offset=${offset}&length=${length}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Open LLM Leaderboard HF ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as HFResponse;
    const rows = json.rows ?? [];
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < length) break;
    offset += length;
  }

  const map = new Map<string, OpenLlmScore>();
  const fetched_at = new Date().toISOString();

  for (let i = 0; i < all.length; i++) {
    const row = all[i]!.row;
    const fullname = (row.fullname ?? row.eval_name ?? row.Model ?? "").toString().trim();
    if (!fullname) continue;

    map.set(normalize(fullname), {
      fetched_at,
      hf_id: fullname,
      rank: i + 1,
      scores: {
        average:  asPercent(row["Average ⬆️"] ?? row.average),
        ifeval:   asPercent(row.IFEval ?? row.ifeval),
        bbh:      asPercent(row.BBH ?? row.bbh),
        math:     asPercent(row["MATH Lvl 5"] ?? row.math),
        gpqa:     asPercent(row.GPQA ?? row.gpqa),
        musr:     asPercent(row.MUSR ?? row.musr),
        mmlu_pro: asPercent(row.MMLU_PRO ?? row.mmlu_pro),
      },
    });
  }

  return map;
}

function asPercent(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return undefined;
  // HF lagrer typisk 0-100; normaliser til 0-1
  return n > 1 ? n / 100 : n;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
