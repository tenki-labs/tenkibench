import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import yaml from "js-yaml";
import { TaskSchema, type Task } from "./schema";

const TASKS_DIR = join(process.cwd(), "tasks");
const HOLDOUT_DIR = join(process.cwd(), "tasks-holdout");

/**
 * Tasks live at tasks/<bench>/<category>/<id>.yaml.
 *
 * Per-file validation: malformed → loud error from `pnpm tasks:validate`.
 *
 * @param includeHoldout if true, also reads tasks-holdout/. Hold-out tasks
 *                       are gitignored and only present on the production VPS.
 */
export function loadAllTasks(includeHoldout = false): Task[] {
  const tasks: Task[] = [];
  loadFromRoot(TASKS_DIR, tasks);
  if (includeHoldout && existsSync(HOLDOUT_DIR)) {
    loadFromRoot(HOLDOUT_DIR, tasks);
  }
  return tasks;
}

export function loadHoldoutTasks(): Task[] {
  if (!existsSync(HOLDOUT_DIR)) return [];
  const tasks: Task[] = [];
  loadFromRoot(HOLDOUT_DIR, tasks);
  return tasks;
}

/**
 * Walk a tasks-root directory expecting tasks/<bench>/<category>/ structure.
 */
function loadFromRoot(root: string, tasks: Task[]): void {
  const benches = readdirSync(root).filter((name) => isDir(join(root, name)));

  for (const bench of benches) {
    const benchDir = join(root, bench);
    const categories = readdirSync(benchDir).filter((name) => isDir(join(benchDir, name)));

    for (const category of categories) {
      const catDir = join(benchDir, category);
      const files = readdirSync(catDir).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
      for (const file of files) {
        const path = join(catDir, file);
        const raw = readFileSync(path, "utf8");
        let parsed: unknown;
        try {
          parsed = yaml.load(raw);
        } catch (e) {
          throw new Error(`YAML parse error in ${path}: ${(e as Error).message}`);
        }
        const result = TaskSchema.safeParse(parsed);
        if (!result.success) {
          throw new Error(
            `Invalid task ${path}: ${JSON.stringify(result.error.flatten(), null, 2)}`,
          );
        }
        const task = result.data;

        // Authoritative: file path. Override schema fields if author was sloppy.
        task.bench = bench;
        task.category = category;

        const expectedId = basename(file, file.endsWith(".yaml") ? ".yaml" : ".yml");
        if (task.id !== expectedId) {
          throw new Error(
            `Task file ${path} has id '${task.id}' but filename suggests '${expectedId}'`,
          );
        }
        tasks.push(task);
      }
    }
  }
}

function isDir(p: string): boolean {
  try { return statSync(p).isDirectory(); } catch { return false; }
}

export function loadCategory(category: string): Task[] {
  return loadAllTasks().filter((t) => t.category === category);
}

export function loadBench(bench: string): Task[] {
  return loadAllTasks().filter((t) => t.bench === bench);
}

export function loadTask(id: string): Task | null {
  return loadAllTasks(true).find((t) => t.id === id) ?? null;
}
