/**
 * MMLU referanse-data (HuggingFace).
 *
 * TenkiBench kjører IKKE MMLU selv — vi henter bare et lite utvalg
 * eksempel-oppgaver fra benchmarken slik at /sammenlign-benchmarks
 * kan vise leseren hva slags spørsmål MMLU faktisk inneholder.
 *
 * Datasett: cais/mmlu, config "all", split "test"
 * Endpoint: https://datasets-server.huggingface.co/rows
 */

const HF_BASE = "https://datasets-server.huggingface.co";
const DATASET = "cais/mmlu";
const CONFIG = "all";
const SPLIT = "test";

export interface MmluSample {
  question: string;
  choices: string[];
  answer: number;          // index inn i choices
  subject?: string;        // f.eks. "abstract_algebra", "anatomy", ...
}

interface HFRow {
  row_idx: number;
  row: Record<string, unknown>;
}

interface HFResponse {
  rows?: HFRow[];
  num_rows_total?: number;
}

/**
 * Henter et utvalg på `limit` rader fra MMLU. Standard 50.
 * Vi tar fra forskjellige offsets for å spre over emner.
 */
export async function fetchMmluSamples(limit = 50): Promise<MmluSample[]> {
  const samples: MmluSample[] = [];
  const pageSize = Math.min(limit, 100);
  let offset = 0;

  while (samples.length < limit) {
    const remaining = limit - samples.length;
    const length = Math.min(pageSize, remaining);
    const url = `${HF_BASE}/rows?dataset=${encodeURIComponent(DATASET)}&config=${CONFIG}&split=${SPLIT}&offset=${offset}&length=${length}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`MMLU HF ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as HFResponse;
    const rows = json.rows ?? [];
    if (rows.length === 0) break;

    for (const r of rows) {
      const sample = toSample(r.row);
      if (sample) samples.push(sample);
      if (samples.length >= limit) break;
    }

    if (rows.length < length) break;
    offset += length;
  }

  return samples;
}

function toSample(row: Record<string, unknown>): MmluSample | null {
  const question = typeof row.question === "string" ? row.question.trim() : "";
  if (!question) return null;

  const rawChoices = row.choices;
  let choices: string[] | null = null;
  if (Array.isArray(rawChoices)) {
    choices = rawChoices.map((c) => String(c));
  } else if (typeof rawChoices === "string") {
    try {
      const parsed = JSON.parse(rawChoices);
      if (Array.isArray(parsed)) choices = parsed.map((c) => String(c));
    } catch {
      // fall through
    }
  }
  if (!choices || choices.length === 0) return null;

  const answer = Number(row.answer);
  if (!Number.isFinite(answer)) return null;

  const subject = typeof row.subject === "string" ? row.subject : undefined;

  return { question, choices, answer, subject };
}
