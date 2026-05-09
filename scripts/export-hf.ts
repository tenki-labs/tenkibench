/**
 * Export TenkiBench tasks to a HuggingFace-compatible dataset directory.
 *
 * Output: dist/tenkibench-hf/
 *   - dataset_info.json     (HF DatasetInfo with features schema)
 *   - README.md             (dataset card with YAML frontmatter)
 *   - data/<bench>/train.jsonl   (one config per bench)
 *   - data/all/train.jsonl       (every non-holdout task combined)
 *
 * Hold-out tasks are intentionally excluded — they live in tasks-holdout/ on
 * the production VPS and must never leave the box.
 *
 * Run with:  npx tsx scripts/export-hf.ts
 */
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadAllTasks } from "@/lib/tasks/loader";
import type { Task } from "@/lib/tasks/schema";

const OUT_DIR = join(process.cwd(), "dist", "tenkibench-hf");

// HF features schema — describes the columns of each row in JSONL.
// Reference: https://huggingface.co/docs/datasets/about_dataset_features
const FEATURES = {
  id: { dtype: "string", _type: "Value" },
  bench: { dtype: "string", _type: "Value" },
  category: { dtype: "string", _type: "Value" },
  title: { dtype: "string", _type: "Value" },
  difficulty: { dtype: "string", _type: "Value" },
  rationale: { dtype: "string", _type: "Value" },
  system_prompt: { dtype: "string", _type: "Value" },
  user_prompt: { dtype: "string", _type: "Value" },
  gold_answer: { dtype: "string", _type: "Value" },
  eval_method: { dtype: "string", _type: "Value" },
  tags: { feature: { dtype: "string", _type: "Value" }, _type: "Sequence" },
  source: { dtype: "string", _type: "Value" },
} as const;

interface HfRow {
  id: string;
  bench: string;
  category: string;
  title: string;
  difficulty: string;
  rationale: string;
  system_prompt: string;
  user_prompt: string;
  gold_answer: string;
  eval_method: string;
  tags: string[];
  source: string;
}

function taskToRow(t: Task): HfRow {
  return {
    id: t.id,
    bench: t.bench,
    category: t.category,
    title: t.title,
    difficulty: t.difficulty,
    rationale: t.rationale,
    system_prompt: t.system_prompt ?? "",
    user_prompt: t.user_prompt,
    gold_answer: t.gold_answer,
    eval_method: t.eval.method,
    tags: t.tags ?? [],
    source: t.source,
  };
}

function writeJsonl(path: string, rows: HfRow[]): void {
  const body = rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : "");
  writeFileSync(path, body, "utf8");
}

function buildReadme(
  totalCount: number,
  benches: { bench: string; count: number; categories: Set<string> }[],
): string {
  const configsList = ["all", ...benches.map((b) => b.bench)];
  const configsYaml = configsList
    .map(
      (name) =>
        `  - config_name: ${name}\n    data_files:\n      - split: train\n        path: data/${name}/train.jsonl`,
    )
    .join("\n");

  const benchTable = benches
    .map(
      (b) =>
        `| \`${b.bench}\` | ${b.count} | ${[...b.categories].sort().map((c) => `\`${c}\``).join(", ")} |`,
    )
    .join("\n");

  // YAML frontmatter is what populates the HF dataset viewer.
  return `---
language:
  - 'no'
  - nb
  - nn
license: cc-by-4.0
task_categories:
  - text-classification
  - question-answering
  - text-generation
multilinguality: monolingual
size_categories:
  - n<1K
tags:
  - norwegian
  - bokmal
  - nynorsk
  - smb
  - business
  - gdpr
  - eu-ai-act
pretty_name: TenkiBench
configs:
${configsYaml}
---

# TenkiBench

Norsk SMB-evaluering for store språkmodeller. Live leaderboard: <https://bench.tenki.no>.

TenkiBench tester hvor godt språkmodeller faktisk fungerer for norske små og
mellomstore bedrifters arbeid: faktura-tolkning, kontrakts-analyse, MVA og
skatt, lovreferanser, Brønnøysund-spørringer, HR-saker, kundeservice-tone,
oversettelse mellom Bokmål og Nynorsk, samt EU AI Act-, GDPR- og
sikkerhetsoppgaver.

Alle ${totalCount} oppgavene i dette datasettet er åpne (CC BY 4.0). Et eget
hold-out-sett brukes for å hindre overtilpasning og blir aldri publisert.

## Beskrivelse

Datasettet er strukturert som flere benches (konfigurasjoner). Bruk
\`config_name\` for å laste én bench av gangen, eller \`all\` for hele settet.

\`\`\`python
from datasets import load_dataset

# Hele datasettet
ds = load_dataset("tenki-labs/tenkibench", "all")

# Bare norsk SMB-bench
smb = load_dataset("tenki-labs/tenkibench", "norwegian-smb")
\`\`\`

## Benches

| Bench | Antall oppgaver | Kategorier |
|---|---:|---|
${benchTable}

## Format

Hver rad har følgende felter:

| Felt | Type | Beskrivelse |
|---|---|---|
| \`id\` | string | Unik oppgave-ID (lowercase-with-dashes) |
| \`bench\` | string | Bench-slug |
| \`category\` | string | Underkategori innen bench |
| \`title\` | string | Kort tittel |
| \`difficulty\` | string | \`easy\` / \`medium\` / \`hard\` / \`expert\` |
| \`rationale\` | string | Hvorfor oppgaven representerer reelt arbeid |
| \`system_prompt\` | string | System-prompt (kan være tom) |
| \`user_prompt\` | string | Selve oppgaven til modellen |
| \`gold_answer\` | string | Fasit-svar (referanse for evaluering) |
| \`eval_method\` | string | Hvordan svaret evalueres (\`numeric_exact\`, \`regex\`, \`regex_all\`, \`json_schema\`, \`exact_string\`, \`llm_judge\`) |
| \`tags\` | list[string] | Kryss-kategoriserende tagger |
| \`source\` | string | \`synthetic\` / \`anonymized\` / \`public-domain\` |

Merk: full evaluerings-konfigurasjon (regex-mønstre, JSON-skjemaer,
LLM-dommer-rubrikker, toleranser) ligger ikke i HF-datasettet — bare
metode-navnet. Den fullstendige eval-koden er åpen i
[tenkibench-repoet](https://github.com/tenki-labs/website).

## Lisens

Oppgaver: **CC BY 4.0**. Sitering kreves.
Evalueringskode (separat repo): MIT.
Hold-out-sett: ikke offentlig.

## Sitering

\`\`\`bibtex
@misc{tenkibench2026,
  title={TenkiBench: A Norwegian SMB Benchmark for Language Models},
  author={Holt, Einar and contributors},
  year={2026},
  url={https://bench.tenki.no},
  note={CC-BY 4.0}
}
\`\`\`

## Forfattere

**Tenki Labs AS** — Oslo, Norge. Kontakt: einar@tenki.no.

## Metodikk

Full metodikk inkludert task-design, eksperteringsvalidering, hold-out-policy
og leaderboard-regler: <https://bench.tenki.no/metodikk> og
[\`docs/TESTING_METHODOLOGY.md\`](https://github.com/tenki-labs/website/blob/main/docs/TESTING_METHODOLOGY.md)
i kildekoden.
`;
}

function main(): void {
  console.log("Loading non-holdout tasks...");
  const tasks = loadAllTasks(false);
  console.log(`  ${tasks.length} tasks loaded`);

  // Reset output directory so stale files don't linger between runs.
  if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(join(OUT_DIR, "data"), { recursive: true });

  // Group by bench
  const byBench = new Map<string, Task[]>();
  for (const t of tasks) {
    const list = byBench.get(t.bench) ?? [];
    list.push(t);
    byBench.set(t.bench, list);
  }

  const benchSummary: { bench: string; count: number; categories: Set<string> }[] = [];

  for (const [bench, items] of [...byBench.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const benchDir = join(OUT_DIR, "data", bench);
    mkdirSync(benchDir, { recursive: true });
    const rows = items.map(taskToRow);
    writeJsonl(join(benchDir, "train.jsonl"), rows);
    const cats = new Set(items.map((t) => t.category));
    benchSummary.push({ bench, count: items.length, categories: cats });
    console.log(`  data/${bench}/train.jsonl  (${items.length} rows, ${cats.size} categories)`);
  }

  // Combined "all" config — every task on the planet.
  const allDir = join(OUT_DIR, "data", "all");
  mkdirSync(allDir, { recursive: true });
  const allRows = tasks.map(taskToRow);
  writeJsonl(join(allDir, "train.jsonl"), allRows);
  console.log(`  data/all/train.jsonl  (${allRows.length} rows total)`);

  // dataset_info.json — points HF at the features schema for each config.
  const datasetInfo = {
    description: "TenkiBench — Norwegian SMB benchmark for language models.",
    citation:
      "@misc{tenkibench2026, title={TenkiBench: A Norwegian SMB Benchmark for Language Models}, author={Holt, Einar and contributors}, year={2026}, url={https://bench.tenki.no}, note={CC-BY 4.0}}",
    homepage: "https://bench.tenki.no",
    license: "cc-by-4.0",
    features: FEATURES,
    splits: {
      train: {
        name: "train",
        num_examples: tasks.length,
      },
    },
    download_size: 0,
    dataset_size: 0,
  };
  writeFileSync(
    join(OUT_DIR, "dataset_info.json"),
    JSON.stringify(datasetInfo, null, 2),
    "utf8",
  );

  // README dataset card
  const readme = buildReadme(tasks.length, benchSummary);
  writeFileSync(join(OUT_DIR, "README.md"), readme, "utf8");

  console.log(`\nWrote ${OUT_DIR}`);
  console.log(`Total: ${tasks.length} tasks across ${byBench.size} benches`);
}

main();
