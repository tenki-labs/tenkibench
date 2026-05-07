import { query } from "@/lib/db";
import { fetchArtificialAnalysis } from "./artificial-analysis";
import type { ArtificialAnalysisScore } from "./types";

/**
 * Orkestrerer en refresh av eksterne benchmark-scores.
 * Henter fra én kilde av gangen, oppdaterer per modell, logger resultat
 * i `external_score_refreshes`.
 */
export async function refreshArtificialAnalysisScores(): Promise<{
  refreshId: number;
  modelsUpdated: number;
  modelsSkipped: number;
}> {
  const { rows: refreshRows } = await query<{ id: number }>(
    `insert into external_score_refreshes (source, status) values ($1, 'running')
     returning id`,
    ["artificial_analysis"],
  );
  const refreshId = refreshRows[0]!.id;

  let modelsUpdated = 0;
  let modelsSkipped = 0;

  try {
    const aaScores = await fetchArtificialAnalysis();

    // Hent alle modeller med en mapping for AA
    const { rows: models } = await query<{
      id: number;
      slug: string;
      external_ids: Record<string, string>;
    }>(`select id, slug, external_ids from models`);

    for (const m of models) {
      // Bruk eksplisitt external_id om satt, ellers bruk vår slug.
      const aaId = m.external_ids?.["artificial_analysis"] ?? m.slug;
      const score = aaScores.get(aaId);
      if (!score) {
        modelsSkipped += 1;
        continue;
      }
      await query(
        `update models set
           external_scores = jsonb_set(external_scores, '{artificial_analysis}', $1::jsonb, true),
           external_scores_updated_at = now()
         where id = $2`,
        [JSON.stringify(score), m.id],
      );
      modelsUpdated += 1;
    }

    await query(
      `update external_score_refreshes
         set status = 'finished', finished_at = now(),
             models_updated = $1, models_skipped = $2
       where id = $3`,
      [modelsUpdated, modelsSkipped, refreshId],
    );
  } catch (err) {
    await query(
      `update external_score_refreshes
         set status = 'failed', finished_at = now(), error = $1
       where id = $2`,
      [(err as Error).message.slice(0, 1000), refreshId],
    );
    throw err;
  }

  return { refreshId, modelsUpdated, modelsSkipped };
}

/** Manuell entry — admin paster inn én score for én modell. */
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
