/**
 * CLI: pnpm bench:run --model=<slug> [--category=<slug>] [--holdout]
 *
 * Executes a single model against either all tasks or a single category.
 * Used both by humans and by cron.
 *
 * Flags:
 *   --model=<slug>      (required) Model slug from `models` table.
 *   --category=<slug>   Run only tasks in this category.
 *   --holdout           Run ONLY the secret hold-out set (skip all public tasks).
 *                       Requires tasks-holdout/ to be present (only on the VPS).
 */
import { query } from "@/lib/db";
import { startRun, executeRun } from "@/lib/eval/runner";
import { execSync } from "node:child_process";

interface CliArgs {
  model: string;
  category?: string;
  holdout: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const model = arg(args, "--model");
  if (!model) {
    console.error(
      "Usage: pnpm bench:run --model=<slug> [--category=<slug>] [--holdout]",
    );
    process.exit(1);
  }
  return {
    model,
    category: arg(args, "--category"),
    holdout: args.includes("--holdout"),
  };
}

function arg(args: string[], name: string): string | undefined {
  const a = args.find((x) => x.startsWith(name + "="));
  return a?.split("=")[1];
}

async function main() {
  const { model, category, holdout } = parseArgs();

  const { rows } = await query<{ id: number; display_name: string }>(
    `select id, display_name from models where slug = $1`,
    [model],
  );
  const modelRow = rows[0];
  if (!modelRow) {
    console.error(`Model '${model}' not found in database`);
    process.exit(1);
  }

  let benchVersion = "dev";
  try {
    benchVersion = execSync("git rev-parse --short HEAD").toString().trim();
  } catch {}

  const label = holdout ? " [HOLDOUT]" : "";
  console.log(
    `▸ Starting run for ${modelRow.display_name}${category ? " (" + category + ")" : ""}${label}`,
  );

  // When --holdout is set, we want to run ONLY the secret tasks. The runner's
  // includeHoldout flag merges holdout into the public set; to run holdout-only
  // we lean on a custom task ID list built from loadHoldoutTasks().
  let taskIds: string[] | undefined;
  if (holdout) {
    const { loadHoldoutTasks } = await import("@/lib/tasks/loader");
    const holdoutTasks = loadHoldoutTasks();
    if (holdoutTasks.length === 0) {
      console.error(
        "No holdout tasks found in tasks-holdout/. " +
          "This directory is gitignored and only present on the VPS.",
      );
      process.exit(1);
    }
    taskIds = holdoutTasks.map((t) => t.id);
    console.log(`  holdout task count: ${taskIds.length}`);
  }

  const runOpts = {
    modelId: modelRow.id,
    category,
    benchVersion,
    includeHoldout: holdout,
    taskIds,
  };

  const runId = await startRun(runOpts);
  console.log(`  run_id=${runId}`);

  await executeRun(
    runId,
    runOpts,
    (done, total, taskId) => {
      process.stdout.write(`\r  ${done}/${total} ${taskId.padEnd(30)}`);
    },
  );
  process.stdout.write("\n");

  const { rows: results } = await query<{ total_score: string }>(
    `select total_score from run_total_scores where run_id = $1`,
    [runId],
  );
  console.log(`✓ Done. Total score: ${results[0]?.total_score ?? "—"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
