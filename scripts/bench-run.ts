/**
 * CLI: pnpm bench:run --model=<slug> [--category=<slug>]
 *
 * Executes a single model against either all tasks or a single category.
 * Used both by humans and by cron.
 */
import { query } from "@/lib/db";
import { startRun, executeRun } from "@/lib/eval/runner";
import { execSync } from "node:child_process";

function parseArgs(): { model: string; category?: string } {
  const args = process.argv.slice(2);
  const model = arg(args, "--model");
  if (!model) {
    console.error("Usage: pnpm bench:run --model=<slug> [--category=<slug>]");
    process.exit(1);
  }
  return { model, category: arg(args, "--category") };
}

function arg(args: string[], name: string): string | undefined {
  const a = args.find((x) => x.startsWith(name + "="));
  return a?.split("=")[1];
}

async function main() {
  const { model, category } = parseArgs();

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

  console.log(`▸ Starting run for ${modelRow.display_name}${category ? " (" + category + ")" : ""}`);
  const runId = await startRun({ modelId: modelRow.id, category, benchVersion });
  console.log(`  run_id=${runId}`);

  await executeRun(
    runId,
    { modelId: modelRow.id, category, benchVersion },
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
