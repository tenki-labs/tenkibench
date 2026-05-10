/**
 * HumanEval referanse-data (HuggingFace).
 *
 * TenkiBench kjører IKKE HumanEval selv — vi henter bare ~20
 * eksempel-oppgaver til /sammenlign-benchmarks for show-and-tell.
 *
 * Datasett: openai/openai_humaneval, config "openai_humaneval", split "test"
 * (Datasettet ble flyttet fra `openai_humaneval` til `openai/openai_humaneval`
 * sommeren 2024 — datasets-server returnerer 404 på det gamle navnet.)
 * Endpoint: https://datasets-server.huggingface.co/rows
 */

const HF_BASE = "https://datasets-server.huggingface.co";
const DATASET = "openai/openai_humaneval";
const CONFIG = "openai_humaneval";
const SPLIT = "test";

export interface HumanEvalSample {
  task_id: string;
  prompt: string;             // funksjonssignatur + docstring
  canonical_solution: string; // referanse-løsning
  test: string;               // testkode
  entry_point: string;        // navn på funksjon å kalle
}

interface HFRow {
  row_idx: number;
  row: Record<string, unknown>;
}

interface HFResponse {
  rows?: HFRow[];
}

export async function fetchHumanEvalSamples(limit = 20): Promise<HumanEvalSample[]> {
  const samples: HumanEvalSample[] = [];
  let offset = 0;
  const pageSize = Math.min(limit, 100);

  while (samples.length < limit) {
    const remaining = limit - samples.length;
    const length = Math.min(pageSize, remaining);
    const url = `${HF_BASE}/rows?dataset=${encodeURIComponent(DATASET)}&config=${CONFIG}&split=${SPLIT}&offset=${offset}&length=${length}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`HumanEval HF ${res.status}: ${await res.text()}`);
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

function toSample(row: Record<string, unknown>): HumanEvalSample | null {
  const task_id = pickString(row.task_id);
  const prompt = pickString(row.prompt);
  const canonical_solution = pickString(row.canonical_solution);
  const test = pickString(row.test);
  const entry_point = pickString(row.entry_point);
  if (!task_id || !prompt || !canonical_solution || !test || !entry_point) {
    return null;
  }
  return { task_id, prompt, canonical_solution, test, entry_point };
}

function pickString(v: unknown): string {
  return typeof v === "string" ? v : "";
}
