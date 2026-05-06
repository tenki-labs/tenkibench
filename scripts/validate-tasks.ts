/**
 * Load all task YAML files and validate against TaskSchema.
 * Exits non-zero if any task is malformed. Used in CI.
 */
import { loadAllTasks } from "@/lib/tasks/loader";

try {
  const tasks = loadAllTasks();
  console.log(`✓ ${tasks.length} tasks valid`);
  // Count by category
  const counts: Record<string, number> = {};
  for (const t of tasks) {
    counts[t.category] = (counts[t.category] ?? 0) + 1;
  }
  for (const [cat, n] of Object.entries(counts).sort()) {
    console.log(`  ${cat.padEnd(20)} ${n}`);
  }
} catch (e) {
  console.error("✗", (e as Error).message);
  process.exit(1);
}
