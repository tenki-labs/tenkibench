import type { LLMClient, ModelRow } from "./types";
import { makeOpenAICompatibleClient } from "./openai-compatible";

/**
 * Factory: given a model row from the DB, return a unified client.
 *
 * Today every supported provider speaks the OpenAI Chat Completions protocol
 * (Mammouth normalizes Anthropic/Google for us, mlx_lm.server is native, OpenAI
 * is itself). If we ever need a non-compatible provider we add a branch here.
 */
export function makeClient(model: ModelRow): LLMClient {
  return makeOpenAICompatibleClient(model);
}

export type { LLMClient, LLMRequest, LLMResponse, ModelRow } from "./types";
