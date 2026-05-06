/**
 * Apply migrations in numeric order from migrations/.
 * Idempotent — every migration must use `if not exists` / `on conflict`.
 */
import { Pool } from "pg";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

async function main() {
  const dir = join(process.cwd(), "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const sql = readFileSync(join(dir, f), "utf8");
    process.stdout.write(`Applying ${f} ... `);
    try {
      await pool.query(sql);
      console.log("ok");
    } catch (e) {
      console.error("FAILED");
      console.error((e as Error).message);
      process.exit(1);
    }
  }
  await pool.end();
}

main();
