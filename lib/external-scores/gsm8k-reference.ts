/**
 * GSM8K referanse-data (HuggingFace).
 *
 * TenkiBench kjører IKKE GSM8K selv — vi henter bare ~50
 * eksempel-oppgaver til /sammenlign-benchmarks for show-and-tell.
 *
 * Datasett: openai/gsm8k, config "main", split "test"
 * (Datasettet ble flyttet fra `gsm8k` til `openai/gsm8k`
 * sommeren 2024 — datasets-server returnerer 404 på det gamle navnet.)
 * Endpoint: https://datasets-server.huggingface.co/rows
 */

const HF_BASE = "https://datasets-server.huggingface.co";
const DATASET = "openai/gsm8k";
const CONFIG = "main";
const SPLIT = "test";

export interface Gsm8kSample {
  question: string;
  answer: string;        // hele løsningstrinnet inkl. "#### <tall>"
  final_answer?: string; // bare det numeriske svaret etter "####"
}

interface HFRow {
  row_idx: number;
  row: Record<string, unknown>;
}

interface HFResponse {
  rows?: HFRow[];
}

export async function fetchGsm8kSamples(limit = 50): Promise<Gsm8kSample[]> {
  const samples: Gsm8kSample[] = [];
  let offset = 0;
  const pageSize = Math.min(limit, 100);

  while (samples.length < limit) {
    const remaining = limit - samples.length;
    const length = Math.min(pageSize, remaining);
    const url = `${HF_BASE}/rows?dataset=${encodeURIComponent(DATASET)}&config=${CONFIG}&split=${SPLIT}&offset=${offset}&length=${length}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`GSM8K HF ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as HFResponse;
    const rows = json.rows ?? [];
    if (rows.length === 0) break;

    for (const r of rows) {
      const s = toSample(r.row);
      if (s) samples.push(s);
      if (samples.length >= limit) break;
    }
    if (rows.length < length) break;
    offset += length;
  }

  return samples;
}

function toSample(row: Record<string, unknown>): Gsm8kSample | null {
  const question = typeof row.question === "string" ? row.question.trim() : "";
  const answer = typeof row.answer === "string" ? row.answer : "";
  if (!question || !answer) return null;
  const idx = answer.lastIndexOf("####");
  const final_answer = idx >= 0 ? answer.slice(idx + 4).trim() : undefined;
  return { question, answer, ...(final_answer ? { final_answer } : {}) };
}
