import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import yaml from "js-yaml";
import { TaskSchema, type Task } from "./schema";

const TASKS_DIR = join(process.cwd(), "tasks");
const HOLDOUT_DIR = join(process.cwd(), "tasks-holdout");

/**
 * Load all valid tasks from disk.
 *
 * Per-file validation: a malformed task throws a descriptive error rather than
 * being silently skipped. Authors get loud feedback at `pnpm tasks:validate`.
 *
 * @param includeHoldout if true, also reads tasks-holdout/. Hold-out tasks are
 *                       gitignored and only present on the production VPS.
 */
export function loadAllTasks(includeHoldout = false): Task[] {
  const tasks: Task[] = [];
  loadFromDir(TASKS_DIR, tasks);
  if (includeHoldout && existsSync(HOLDOUT_DIR)) {
    loadFromDir(HOLDOUT_DIR, tasks);
  }
  return tasks;
}

export function loadHoldoutTasks(): Task[] {
  if (!existsSync(HOLDOUT_DIR)) return [];
  const tasks: Task[] = [];
  loadFromDir(HOLDOUT_DIR, tasks);
  return tasks;
}

function loadFromDir(root: string, tasks: Task[]): void {
  const categoryDirs = readdirSync(root).filter((name) => {
    const p = join(root, name);
    try { return statSync(p).isDirectory(); } catch { return false; }
  });

  for (const category of categoryDirs) {
    const dir = join(root, category);
    const files = readdirSync(dir).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
    for (const file of files) {
      const path = join(dir, file);
      const raw = readFileSync(path, "utf8");
      let parsed: unknown;
      try {
        parsed = yaml.load(raw);
      } catch (e) {
        throw new Error(`YAML parse error in ${path}: ${(e as Error).message}`);
      }
      const result = TaskSchema.safeParse(parsed);
      if (!result.success) {
        throw new Error(`Invalid task ${path}: ${JSON.stringify(result.error.flatten(), null, 2)}`);
      }
      const task = result.data;
      if (task.category !== category) {
        throw new Error(
          `Task ${path} is in directory '${category}' but declares category '${task.category}'`,
        );
      }
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

export function loadCategory(category: string): Task[] {
  return loadAllTasks().filter((t) => t.category === category);
}

export function loadTask(id: string): Task | null {
  return loadAllTasks(true).find((t) => t.id === id) ?? null;
}
