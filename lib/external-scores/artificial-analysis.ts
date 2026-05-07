import type { ArtificialAnalysisScore } from "./types";

/**
 * Klient mot Artificial Analysis sin LLM API.
 * Endpoint: GET https://artificialanalysis.ai/api/v2/data/llms/models
 * Auth:     header `x-api-key`
 * Limit:    1000 req/døgn på gratis-tier
 * Docs:     https://artificialanalysis.ai/documentation
 */

const API_BASE = "https://artificialanalysis.ai/api/v2";

interface AAModelRow {
  id?: string;
  slug?: string;
  name?: string;
  artificial_analysis_intelligence_index?: number;
  artificial_analysis_coding_index?: number;
  artificial_analysis_math_index?: number;
  evaluations?: {
    mmlu_pro?: number;
    gpqa?: number;
    humaneval_python_pass_at_1?: number;
    math_500?: number;
    aime?: number;
    livecodebench_v6?: number;
    scicode?: number;
    hle?: number;
  };
  median_output_tokens_per_second?: number;
  median_time_to_first_token_seconds?: number;
  pricing?: {
    price_1m_input_tokens?: number;
    price_1m_output_tokens?: number;
    price_1m_blended_3_to_1?: number;
  };
}

interface AAResponse {
  status?: number | string;
  data?: AAModelRow[];
}

export async function fetchArtificialAnalysis(): Promise<Map<string, ArtificialAnalysisScore>> {
  const apiKey = process.env.ARTIFICIAL_ANALYSIS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ARTIFICIAL_ANALYSIS_API_KEY ikke satt i .env. " +
      "Hent en gratis nøkkel på artificialanalysis.ai/documentation."
    );
  }

  const res = await fetch(`${API_BASE}/data/llms/models`, {
    headers: { "x-api-key": apiKey },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Artificial Analysis API ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as AAResponse;
  const rows = json.data ?? [];

  const map = new Map<string, ArtificialAnalysisScore>();
  const fetched_at = new Date().toISOString();

  for (const row of rows) {
    const externalId = row.slug ?? row.id;
    if (!externalId) continue;

    map.set(externalId, {
      fetched_at,
      intelligence_index: row.artificial_analysis_intelligence_index,
      coding_index: row.artificial_analysis_coding_index,
      math_index: row.artificial_analysis_math_index,
      scores: row.evaluations
        ? {
            mmlu_pro: row.evaluations.mmlu_pro,
            gpqa_diamond: row.evaluations.gpqa,
            humaneval: row.evaluations.humaneval_python_pass_at_1,
            math_500: row.evaluations.math_500,
            aime: row.evaluations.aime,
            livecodebench: row.evaluations.livecodebench_v6,
            scicode: row.evaluations.scicode,
            hle: row.evaluations.hle,
          }
        : undefined,
      performance: {
        median_output_tps: row.median_output_tokens_per_second,
        time_to_first_token_s: row.median_time_to_first_token_seconds,
      },
      pricing: {
        input_per_1m_usd: row.pricing?.price_1m_input_tokens,
        output_per_1m_usd: row.pricing?.price_1m_output_tokens,
        blended_per_1m_usd: row.pricing?.price_1m_blended_3_to_1,
      },
    });
  }

  return map;
}
