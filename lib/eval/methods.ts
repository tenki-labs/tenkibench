import type { Task } from "@/lib/tasks/schema";
import type { LLMClient } from "@/lib/llm/types";

export interface EvalResult {
  score: number; // 0..1
  parsedAnswer: string;
  judgeRationale?: string;
  judgeRubric?: Array<{ criterion: string; score: number; max: number; comment?: string }>;
  judgeModelSlug?: string;
  judgeTokensIn?: number;
  judgeTokensOut?: number;
  judgeCostUsd?: number;
}

/**
 * Each eval method is deterministic and stateless given (task, output).
 * The LLM-judge method takes a judge client to score open-ended outputs.
 */

export function evaluateNumericExact(task: Task, output: string): EvalResult {
  const extracted = extractFirst(task, output);
  const parsed = parseNorwegianNumber(extracted);
  const gold = parseNorwegianNumber(task.gold_answer);
  if (parsed === null || gold === null) {
    return { score: 0, parsedAnswer: extracted ?? output };
  }
  const tolerance = task.eval.tolerance ?? 0.01;
  const score = Math.abs(parsed - gold) <= tolerance ? 1 : 0;
  return { score, parsedAnswer: String(parsed) };
}

export function evaluateRegex(task: Task, output: string): EvalResult {
  const extracted = extractFirst(task, output) ?? output;
  const flags = task.eval.flags ?? "";
  const re = new RegExp(task.eval.pattern!, flags);
  const matched = re.test(extracted);
  return { score: matched ? 1 : 0, parsedAnswer: extracted };
}

export function evaluateRegexAll(task: Task, output: string): EvalResult {
  const extracted = extractFirst(task, output) ?? output;
  const flags = task.eval.flags ?? "";
  const patterns = task.eval.patterns ?? [];
  if (patterns.length === 0) return { score: 0, parsedAnswer: extracted };
  let hits = 0;
  for (const p of patterns) {
    if (new RegExp(p, flags).test(extracted)) hits += 1;
  }
  return { score: hits / patterns.length, parsedAnswer: extracted };
}

export function evaluateExactString(task: Task, output: string): EvalResult {
  const cleaned = (extractFirst(task, output) ?? output).trim();
  const goldClean = task.gold_answer.trim();
  const equal = task.eval.case_sensitive
    ? cleaned === goldClean
    : cleaned.toLowerCase() === goldClean.toLowerCase();
  return { score: equal ? 1 : 0, parsedAnswer: cleaned };
}

export function evaluateJsonSchema(task: Task, output: string): EvalResult {
  // Lean validator: parse JSON, check that every key in gold appears with matching
  // value (string equality or recursive). We avoid pulling in ajv for now.
  const cleaned = stripJsonFence(output);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { score: 0, parsedAnswer: cleaned };
  }
  const gold = JSON.parse(task.gold_answer);
  const score = compareDeep(parsed, gold);
  return { score, parsedAnswer: JSON.stringify(parsed) };
}

export async function evaluateLlmJudge(
  task: Task,
  output: string,
  judge: LLMClient,
): Promise<EvalResult> {
  const rubric = task.eval.rubric ?? [];
  if (rubric.length === 0) {
    return { score: 0, parsedAnswer: output };
  }

  const totalWeight = rubric.reduce((s, r) => s + r.weight, 0);
  const judgePrompt = buildJudgePrompt(task, output);

  const response = await judge.invoke({
    systemPrompt:
      "Du er en streng, rettferdig norsk dommer som vurderer KI-svar mot en gitt fasit og rubrikk. " +
      "Svar kun i gyldig JSON. Ikke kommenter utenfor JSON-objektet.",
    userPrompt: judgePrompt,
    temperature: 0,
    maxTokens: 1500,
    responseFormat: "json",
  });

  let parsed: { scores: Array<{ criterion: string; score: number; comment?: string }>; rationale?: string };
  try {
    parsed = JSON.parse(stripJsonFence(response.text));
  } catch {
    return { score: 0, parsedAnswer: output, judgeRationale: "Judge returned invalid JSON: " + response.text.slice(0, 200) };
  }

  const rubricResults = rubric.map((r) => {
    const found = parsed.scores.find((s) => s.criterion === r.criterion);
    const raw = found?.score ?? 0;
    const clamped = Math.max(0, Math.min(1, raw));
    return { criterion: r.criterion, score: clamped, max: 1, comment: found?.comment };
  });

  const weighted =
    rubricResults.reduce(
      (sum, rr, i) => sum + rr.score * (rubric[i]?.weight ?? 0),
      0,
    ) / totalWeight;

  return {
    score: weighted,
    parsedAnswer: output,
    judgeRationale: parsed.rationale,
    judgeRubric: rubricResults,
    judgeModelSlug: judge.modelSlug,
    judgeTokensIn: response.tokensIn,
    judgeTokensOut: response.tokensOut,
    judgeCostUsd: response.costUsd,
  };
}

// ---------- helpers ----------

function extractFirst(task: Task, output: string): string | null {
  const pattern = task.eval.extract_pattern;
  if (!pattern) return output.trim();
  const re = new RegExp(pattern, task.eval.flags ?? "");
  const m = output.match(re);
  if (!m) return null;
  return (m[1] ?? m[0]).trim();
}

function parseNorwegianNumber(s: string | null): number | null {
  if (s == null) return null;
  // Norwegian: thousand sep = space or '.', decimal = ','
  // Strip currency markers (kr, NOK), spaces (incl. nbsp), then normalize.
  const cleaned = s
    .replace(/(kr|NOK|nok)/gi, "")
    .replace(/ /g, " ")
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function stripJsonFence(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
}

function compareDeep(actual: unknown, expected: unknown): number {
  if (typeof expected !== "object" || expected === null) {
    return actual === expected ? 1 : 0;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return 0;
    if (actual.length === 0 && expected.length === 0) return 1;
    let total = 0;
    for (let i = 0; i < expected.length; i++) {
      total += compareDeep(actual[i], expected[i]);
    }
    return total / Math.max(expected.length, actual.length);
  }
  // object
  const keys = Object.keys(expected as object);
  if (keys.length === 0) return 1;
  let total = 0;
  const obj = actual as Record<string, unknown>;
  const exp = expected as Record<string, unknown>;
  for (const k of keys) {
    if (!(k in (obj ?? {}))) continue;
    total += compareDeep(obj?.[k], exp[k]);
  }
  return total / keys.length;
}

function buildJudgePrompt(task: Task, output: string): string {
  const rubricText = (task.eval.rubric ?? [])
    .map(
      (r, i) =>
        `${i + 1}. **${r.criterion}** (vekt ${r.weight}): ${r.description}`,
    )
    .join("\n");

  return `Du skal vurdere svar fra en KI-modell på en norsk SMB-relevant oppgave.

OPPGAVE:
${task.user_prompt}

GULL-STANDARD-SVAR (referanse, modellen skulle treffe noe nær dette):
${task.gold_answer}

KI-MODELLENS SVAR:
${output}

RUBRIKK (gi hver et tall mellom 0.0 og 1.0):
${rubricText}

Returner kun et JSON-objekt på dette eksakte formatet:
{
  "scores": [
    {"criterion": "<navn>", "score": <0..1>, "comment": "<kort begrunnelse>"}
  ],
  "rationale": "<2-3 setninger om totalvurdering>"
}`;
}
