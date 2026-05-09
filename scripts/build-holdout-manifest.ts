/**
 * CLI: pnpm holdout:manifest
 *
 * Bygger holdout-manifest.json fra tasks-holdout/.
 *
 * - Hver task hashes som sha256("<id>|<user_prompt>|<gold_answer>")
 * - Hashene sorteres for determinisme
 * - Aggregater pr bench/category/difficulty inkluderes
 * - Hvis tasks-holdout/ ikke finnes, lages tomt manifest (count=0)
 *
 * Kun manifestet committes til git (tasks-holdout/ er gitignored).
 * Manifestet lar publikum verifisere at holdout-settet er stabilt
 * uten å avsløre selve oppgavene.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { loadHoldoutTasks } from "../lib/tasks/loader";
import type { Task } from "../lib/tasks/schema";

interface HoldoutManifest {
  version: string;
  generated_at: string;
  total_count: number;
  by_bench: Record<string, number>;
  by_category: Record<string, number>;
  by_difficulty: Record<string, number>;
  task_hashes: string[];
}

function hashTask(task: Task): string {
  const concat = `${task.id}|${task.user_prompt}|${task.gold_answer}`;
  return "sha256:" + createHash("sha256").update(concat).digest("hex");
}

function sortObjectKeys<T extends Record<string, number>>(obj: T): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of Object.keys(obj).sort()) out[k] = obj[k]!;
  return out;
}

function buildManifest(tasks: Task[]): HoldoutManifest {
  const by_bench: Record<string, number> = {};
  const by_category: Record<string, number> = {};
  const by_difficulty: Record<string, number> = {};

  for (const t of tasks) {
    by_bench[t.bench] = (by_bench[t.bench] ?? 0) + 1;
    by_category[t.category] = (by_category[t.category] ?? 0) + 1;
    by_difficulty[t.difficulty] = (by_difficulty[t.difficulty] ?? 0) + 1;
  }

  const task_hashes = tasks.map(hashTask).sort();

  return {
    version: "0.1",
    generated_at: new Date().toISOString(),
    total_count: tasks.length,
    by_bench: sortObjectKeys(by_bench),
    by_category: sortObjectKeys(by_category),
    by_difficulty: sortObjectKeys(by_difficulty),
    task_hashes,
  };
}

function main(): void {
  const tasks = loadHoldoutTasks();
  const manifest = buildManifest(tasks);
  const outPath = join(process.cwd(), "holdout-manifest.json");
  writeFileSync(outPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`Wrote ${outPath}`);
  console.log(`  total_count = ${manifest.total_count}`);
  if (manifest.total_count > 0) {
    console.log(`  by_bench    = ${JSON.stringify(manifest.by_bench)}`);
  }
}

main();
