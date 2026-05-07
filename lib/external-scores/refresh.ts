import { query } from "@/lib/db";
import { fetchArtificialAnalysis } from "./artificial-analysis";
import { fetchLmArena } from "./lmarena";
import { fetchOpenLlmLeaderboard } from "./open-llm-leaderboard";

export type SourceSlug = "artificial_analysis" | "lmarena" | "open_llm";

interface RefreshResult {
  refreshId: number;
  source: SourceSlug;
  modelsUpdated: number;
  modelsSkipped: number;
}

async function runRefresh(
  source: SourceSlug,
  update: () => Promise<{ modelsUpdated: number; modelsSkipped: number }>,
): Promise<RefreshResult> {
  const { rows } = await query<{ id: number }>(
    `insert into external_score_refreshes (source, status) values ($1, 'running') returning id`,
    [source],
  );
  const refreshId = rows[0]!.id;
  try {
    const r = await update();
    await query(
      `update external_score_refreshes
         set status = 'finished', finished_at = now(), models_updated = $1, models_skipped = $2
       where id = $3`,
      [r.modelsUpdated, r.modelsSkipped, refreshId],
    );
    return { refreshId, source, ...r };
  } catch (err) {
    await query(
      `update external_score_refreshes
         set status = 'failed', finished_at = now(), error = $1
       where id = $2`,
      [(err as Error).message.slice(0, 1000), refreshId],
    );
    throw err;
  }
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function refreshArtificialAnalysis(): Promise<RefreshResult> {
  return runRefresh("artificial_analysis", async () => {
    const aaScores = await fetchArtificialAnalysis();
    const { rows: models } = await query<{
      id: number; slug: string; external_ids: Record<string, string>;
    }>(`select id, slug, external_ids from models`);
    let updated = 0, skipped = 0;
    for (const m of models) {
      const aaId = m.external_ids?.artificial_analysis ?? m.slug;
      const score = aaScores.get(aaId);
      if (!score) { skipped += 1; continue; }
      await query(
        `update models set
           external_scores = jsonb_set(external_scores, '{artificial_analysis}', $1::jsonb, true),
           external_scores_updated_at = now()
         where id = $2`,
        [JSON.stringify(score), m.id],
      );
      updated += 1;
    }
    return { modelsUpdated: updated, modelsSkipped: skipped };
  });
}

export async function refreshLmArena(): Promise<RefreshResult> {
  return runRefresh("lmarena", async () => {
    const arenaScores = await fetchLmArena();
    const { rows: models } = await query<{
      id: number; slug: string; display_name: string;
      external_ids: Record<string, string>;
    }>(`select id, slug, display_name, external_ids from models`);
    let updated = 0, skipped = 0;
    for (const m of models) {
      const candidates = [m.external_ids?.lmarena, m.display_name, m.slug]
        .filter((c): c is string => Boolean(c));
      const score = candidates.map(c => arenaScores.get(normalize(c))).find(Boolean);
      if (!score) { skipped += 1; continue; }
      await query(
        `update models set
           external_scores = jsonb_set(external_scores, '{lmarena}', $1::jsonb, true),
           external_scores_updated_at = now()
         where id = $2`,
        [JSON.stringify(score), m.id],
      );
      updated += 1;
    }
    return { modelsUpdated: updated, modelsSkipped: skipped };
  });
}

export async function refreshOpenLlmLeaderboard(): Promise<RefreshResult> {
  return runRefresh("open_llm", async () => {
    const olScores = await fetchOpenLlmLeaderboard();
    const { rows: models } = await query<{
      id: number; slug: string; display_name: string;
      external_ids: Record<string, string>; is_open_weights: boolean;
    }>(`select id, slug, display_name, external_ids, is_open_weights from models`);
    let updated = 0, skipped = 0;
    for (const m of models) {
      if (!m.is_open_weights && !m.external_ids?.open_llm) { skipped += 1; continue; }
      const candidates = [m.external_ids?.open_llm, m.display_name, m.slug]
        .filter((c): c is string => Boolean(c));
      const score = candidates.map(c => olScores.get(normalize(c))).find(Boolean);
      if (!score) { skipped += 1; continue; }
      await query(
        `update models set
           external_scores = jsonb_set(external_scores, '{open_llm}', $1::jsonb, true),
           external_scores_updated_at = now()
         where id = $2`,
        [JSON.stringify(score), m.id],
      );
      updated += 1;
    }
    return { modelsUpdated: updated, modelsSkipped: skipped };
  });
}

export async function manuallySetScore(
  modelId: number,
  source: string,
  payload: Record<string, unknown>,
  addedBy: string,
): Promise<void> {
  const wrapped = {
    fetched_at: new Date().toISOString(),
    added_by: addedBy,
    ...payload,
  };
  await query(
    `update models set
       external_scores = jsonb_set(external_scores, $1::text[], $2::jsonb, true),
       external_scores_updated_at = now()
     where id = $3`,
    [`{${source}}`, JSON.stringify(wrapped), modelId],
  );
}

export async function refreshAll(): Promise<{
  results: Array<RefreshResult | { source: SourceSlug; error: string }>;
}> {
  const sources: Array<{ slug: SourceSlug; fn: () => Promise<RefreshResult> }> = [
    { slug: "artificial_analysis", fn: refreshArtificialAnalysis },
    { slug: "lmarena",             fn: refreshLmArena },
    { slug: "open_llm",            fn: refreshOpenLlmLeaderboard },
  ];
  const results: Array<RefreshResult | { source: SourceSlug; error: string }> = [];
  for (const s of sources) {
    try {
      results.push(await s.fn());
    } catch (err) {
      results.push({ source: s.slug, error: (err as Error).message });
    }
  }
  return { results };
}

export const refreshArtificialAnalysisScores = refreshArtificialAnalysis;
