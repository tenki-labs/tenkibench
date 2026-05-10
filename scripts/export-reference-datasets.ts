/**
 * Henter et lite, kvalitet-sjekket utvalg fra de viktigste internasjonale
 * benchmark-datasettene (MMLU, HumanEval, GSM8K) og skriver dem til
 * `data/`. Filene committes til git og leses inn av
 * `app/(public)/sammenlign-benchmarks/page.tsx` for show-and-tell.
 *
 * Idempotent — kjør på nytt for å oppdatere.
 *
 *   npm run export:reference
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchMmluSamples, type MmluSample } from "../lib/external-scores/mmlu-reference";
import { fetchHumanEvalSamples, type HumanEvalSample } from "../lib/external-scores/humaneval-reference";
import { fetchGsm8kSamples, type Gsm8kSample } from "../lib/external-scores/gsm8k-reference";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");

interface ManifestEntry {
  slug: string;
  hf_dataset: string;
  hf_config: string;
  hf_split: string;
  count: number;
  file: string;
  description: string;
}

async function main(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const manifest: ManifestEntry[] = [];

  console.log("Henter MMLU-utvalg (cais/mmlu, all/test)…");
  const mmlu: MmluSample[] = await fetchMmluSamples(50);
  await writeJson("mmlu-sample.json", {
    source: "cais/mmlu",
    config: "all",
    split: "test",
    fetched_at: new Date().toISOString(),
    count: mmlu.length,
    samples: mmlu,
  });
  manifest.push({
    slug: "mmlu",
    hf_dataset: "cais/mmlu",
    hf_config: "all",
    hf_split: "test",
    count: mmlu.length,
    file: "mmlu-sample.json",
    description:
      "Massive Multitask Language Understanding — 57 emner fra grunnskole til ekspertnivå.",
  });
  console.log(`  → ${mmlu.length} rader`);

  console.log("Henter HumanEval-utvalg (openai_humaneval/test)…");
  const humaneval: HumanEvalSample[] = await fetchHumanEvalSamples(20);
  await writeJson("humaneval-sample.json", {
    source: "openai/openai_humaneval",
    config: "openai_humaneval",
    split: "test",
    fetched_at: new Date().toISOString(),
    count: humaneval.length,
    samples: humaneval,
  });
  manifest.push({
    slug: "humaneval",
    hf_dataset: "openai/openai_humaneval",
    hf_config: "openai_humaneval",
    hf_split: "test",
    count: humaneval.length,
    file: "humaneval-sample.json",
    description:
      "Python-koding: 164 håndskrevne funksjons-stubs med docstring og enhets-tester.",
  });
  console.log(`  → ${humaneval.length} rader`);

  console.log("Henter GSM8K-utvalg (gsm8k/main/test)…");
  const gsm8k: Gsm8kSample[] = await fetchGsm8kSamples(50);
  await writeJson("gsm8k-sample.json", {
    source: "openai/gsm8k",
    config: "main",
    split: "test",
    fetched_at: new Date().toISOString(),
    count: gsm8k.length,
    samples: gsm8k,
  });
  manifest.push({
    slug: "gsm8k",
    hf_dataset: "openai/gsm8k",
    hf_config: "main",
    hf_split: "test",
    count: gsm8k.length,
    file: "gsm8k-sample.json",
    description:
      "Grade-School Math 8K — flertrinns matte-tekstoppgaver med løsningstrinn.",
  });
  console.log(`  → ${gsm8k.length} rader`);

  await writeJson("reference-datasets-manifest.json", {
    generated_at: new Date().toISOString(),
    note:
      "TenkiBench kjører IKKE disse benchmarkene selv. Filene er rene referanse-utdrag for /sammenlign-benchmarks.",
    datasets: manifest,
  });

  console.log("\nFerdig. Skrev:");
  for (const m of manifest) {
    console.log(`  data/${m.file}  (${m.count} rader)`);
  }
  console.log("  data/reference-datasets-manifest.json");
}

async function writeJson(filename: string, data: unknown): Promise<void> {
  const target = path.join(DATA_DIR, filename);
  await fs.writeFile(target, JSON.stringify(data, null, 2) + "\n", "utf8");
}

main().catch((err) => {
  console.error("export-reference-datasets failed:", err);
  process.exit(1);
});
