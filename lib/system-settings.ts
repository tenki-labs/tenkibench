import { query } from "@/lib/db";

/**
 * Typed accessors for the `system_settings` table — JSONB key/value store
 * used for runtime feature flags, kill-switches, and small operational config.
 *
 * Values are stored as JSONB so booleans, numbers, strings and small objects
 * round-trip without explicit serialization.
 */

interface SettingRow<T> {
  value: T;
}

/**
 * Read a single setting. Returns null if the key is not present.
 * Caller picks the type — we trust the schema seeded in migrations.
 */
export async function getSetting<T>(key: string): Promise<T | null> {
  const { rows } = await query<SettingRow<T>>(
    `select value from public.system_settings where key = $1`,
    [key],
  );
  if (rows.length === 0) return null;
  return rows[0]!.value;
}

/**
 * Upsert a setting. Stamps updated_at + updated_by every write.
 */
export async function setSetting(
  key: string,
  value: unknown,
  updatedBy: string,
): Promise<void> {
  await query(
    `insert into public.system_settings (key, value, updated_by, updated_at)
       values ($1, $2::jsonb, $3, now())
     on conflict (key) do update
       set value = excluded.value,
           updated_by = excluded.updated_by,
           updated_at = now()`,
    [key, JSON.stringify(value), updatedBy],
  );
}

/**
 * Convenience flag used by the cron route + admin toggle.
 * Defaults to true if the key is missing — fail-open so a fresh DB still gets
 * its nightly refresh until an operator explicitly turns it off.
 */
export async function isAutoRefreshEnabled(): Promise<boolean> {
  const v = await getSetting<boolean>("external_scores_auto_refresh_enabled");
  if (v === null) return true;
  return v === true;
}
