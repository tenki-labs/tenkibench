import OpenAI from "openai";
import type { LLMClient, LLMRequest, LLMResponse, ModelRow } from "./types";

/**
 * Generic OpenAI-compatible client.
 *
 * Works for:
 *  - OpenAI proper (api.openai.com)
 *  - Mammouth.ai (api.mammouth.ai/v1) — gives us GPT, Claude, Gemini, Mistral, DeepSeek, Grok, Qwen, Llama
 *  - Local mlx_lm.server (mlx.tenki.no/v1)
 *  - Any other vendor exposing /chat/completions
 *
 * Mammouth is our default gateway because one bearer token = access to ~30 models.
 */

// Approximate per-1M-token pricing (USD). When the gateway doesn't return actual
// cost, we estimate from these. Update quarterly.
const PRICE_TABLE: Record<string, { in: number; out: number }> = {
  "gpt-5":              { in: 5.00, out: 15.00 },
  "gpt-5-mini":         { in: 0.40, out: 1.60 },
  "claude-opus-4-7":    { in: 15.00, out: 75.00 },
  "claude-sonnet-4-6":  { in: 3.00, out: 15.00 },
  "claude-haiku-4-5":   { in: 0.80, out: 4.00 },
  "gemini-3-pro":       { in: 2.50, out: 10.00 },
  "gemini-3-flash":     { in: 0.30, out: 1.20 },
  "mistral-large-3":    { in: 2.00, out: 6.00 },
  "deepseek-v3-1":      { in: 0.27, out: 1.10 },
  "grok-4":             { in: 5.00, out: 15.00 },
  "qwen-3-72b":         { in: 0.50, out: 1.50 },
  "llama-3-3-70b":      { in: 0.60, out: 0.90 },
};

function estimateCost(modelSlug: string, tokensIn: number, tokensOut: number): number {
  const p = PRICE_TABLE[modelSlug];
  if (!p) return 0;
  return (tokensIn * p.in + tokensOut * p.out) / 1_000_000;
}

export function makeOpenAICompatibleClient(model: ModelRow): LLMClient {
  const apiKey = resolveApiKey(model.provider);
  const baseURL = model.base_url ?? undefined;

  const client = new OpenAI({
    apiKey,
    baseURL,
    timeout: 120_000,
    maxRetries: 1,
  });

  return {
    modelSlug: model.slug,
    providerName: model.provider,
    async invoke(req: LLMRequest): Promise<LLMResponse> {
      const messages: OpenAI.ChatCompletionMessageParam[] = [];
      if (req.systemPrompt) messages.push({ role: "system", content: req.systemPrompt });
      messages.push({ role: "user", content: req.userPrompt });

      const start = Date.now();

      const completion = await client.chat.completions.create({
        model: model.provider_model,
        messages,
        temperature: req.temperature ?? 0,
        max_tokens: req.maxTokens ?? 2048,
        seed: req.seed,
        response_format:
          req.responseFormat === "json" ? { type: "json_object" } : undefined,
      });

      const latencyMs = Date.now() - start;
      const choice = completion.choices[0];
      const text = choice?.message?.content ?? "";
      const tokensIn = completion.usage?.prompt_tokens ?? 0;
      const tokensOut = completion.usage?.completion_tokens ?? 0;

      return {
        text,
        tokensIn,
        tokensOut,
        costUsd: estimateCost(model.slug, tokensIn, tokensOut),
        latencyMs,
        finishReason: choice?.finish_reason ?? null,
        raw: completion,
      };
    },
  };
}

function resolveApiKey(provider: string): string {
  switch (provider) {
    case "mammouth":
      return required("MAMMOUTH_API_KEY");
    case "openai":
      return required("OPENAI_API_KEY");
    case "local":
      return process.env.LOCAL_LLM_API_KEY ?? "no-key";
    default:
      // Fallback: try a $UPPER_PROVIDER_API_KEY env var
      return process.env[`${provider.toUpperCase()}_API_KEY`] ?? "no-key";
  }
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}
