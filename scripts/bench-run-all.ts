/**
 * Run all active models, sequentially.
 * Used by cron (or manually): pnpm bench:run-all
 */
import { query } from "@/lib/db";
import { startRun, executeRun } from "@/lib/eval/runner";
import { execSync } from "node:child_process";

async function main() {
  let benchVersion = "dev";
  try {
    benchVersion = execSync("git rev-parse --short HEAD").toString().trim();
  } catch {}

  const { rows: models } = await query<{ id: number; slug: string; display_name: string }>(
    `select id, slug, display_name from models where is_active = true order by display_name`,
  );

  console.log(`▸ Running benchmark against ${models.length} active models`);
  for (const m of models) {
    console.log(`\n▸ ${m.display_name}`);
    try {
      const runId = await startRun({ modelId: m.id, benchVersion });
      await executeRun(runId, { modelId: m.id, benchVersion }, (done, total, id) => {
        process.stdout.write(`\r  ${done}/${total} ${id.padEnd(30)}`);
      });
      process.stdout.write("\n");
      const { rows } = await query<{ total_score: string }>(
        `select total_score from run_total_scores where run_id = $1`,
        [runId],
      );
      console.log(`  ✓ ${rows[0]?.total_score ?? "—"}`);
    } catch (e) {
      console.error(`  ✗ FAILED: ${(e as Error).message}`);
    }
  }
  console.log("\n✓ All done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
