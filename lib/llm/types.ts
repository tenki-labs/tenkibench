export interface LLMRequest {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  seed?: number;
  responseFormat?: "text" | "json";
}

export interface LLMResponse {
  text: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  finishReason: string | null;
  raw: unknown;
}

export interface LLMClient {
  invoke(req: LLMRequest): Promise<LLMResponse>;
  modelSlug: string;
  providerName: string;
}

export interface ModelRow {
  id: number;
  slug: string;
  display_name: string;
  provider: string;
  provider_model: string;
  base_url: string | null;
  family: string | null;
  parameter_count: number | null;
  is_open_weights: boolean;
  is_active: boolean;
}
