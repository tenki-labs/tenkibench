/**
 * Strukturerte typer for eksterne benchmark-kilder.
 * Lagres som JSONB i `models.external_scores`.
 */

export interface ArtificialAnalysisScore {
  fetched_at: string;
  intelligence_index?: number;   // 0-100, AA's egen aggregat
  coding_index?: number;
  math_index?: number;
  scores?: {
    mmlu_pro?: number;            // 0-1
    gpqa_diamond?: number;
    humaneval?: number;
    math_500?: number;
    aime?: number;
    livecodebench?: number;
    scicode?: number;
    hle?: number;                 // Humanity's Last Exam
  };
  performance?: {
    median_output_tps?: number;
    time_to_first_token_s?: number;
  };
  pricing?: {
    input_per_1m_usd?: number;
    output_per_1m_usd?: number;
    blended_per_1m_usd?: number;
  };
}

export interface LmArenaScore {
  fetched_at: string;
  elo?: number;
  votes?: number;
  rank?: number;
}

export interface ManualScore {
  fetched_at: string;
  added_by: string;
  notes?: string;
  fields: Record<string, number | string>;
}

export interface ExternalScores {
  artificial_analysis?: ArtificialAnalysisScore;
  lmarena?: LmArenaScore;
  manual?: ManualScore;
  [other: string]: unknown;
}
