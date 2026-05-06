import { z } from "zod";

/**
 * TenkiBench task schema.
 *
 * Each task is a single YAML file in tasks/<category>/<id>.yaml.
 * Schema is intentionally rigid — every field is required so authors can't
 * silently ship under-specified tasks.
 */

export const EvalMethod = z.enum([
  "numeric_exact",   // Parse a number from output, compare with tolerance
  "regex",           // Match a regex against output
  "regex_all",       // Output must match ALL regexes in array
  "json_schema",     // Output must be valid JSON matching given schema
  "exact_string",    // Trimmed exact match
  "llm_judge",       // LLM-as-judge with rubric
]);
export type EvalMethod = z.infer<typeof EvalMethod>;

export const Difficulty = z.enum(["easy", "medium", "hard", "expert"]);
export type Difficulty = z.infer<typeof Difficulty>;

export const TaskSchema = z.object({
  // Identity
  id: z.string().regex(/^[a-z0-9-]+$/, "id must be lowercase-with-dashes"),
  bench: z.string().default("norwegian-smb"),
  category: z.string(),
  version: z.number().int().positive().default(1),

  // Display
  title: z.string().min(5),
  difficulty: Difficulty,

  // Pedagogical
  rationale: z.string().min(40), // Why this represents real Norwegian SMB work
  source: z.enum(["synthetic", "anonymized", "public-domain"]),
  source_notes: z.string().optional(),

  // The actual prompt
  system_prompt: z.string().optional(),
  user_prompt: z.string().min(10),

  // Expected answer
  gold_answer: z.string(),

  // Evaluation
  eval: z.object({
    method: EvalMethod,
    // numeric_exact:
    tolerance: z.number().nonnegative().optional(),
    // regex / regex_all:
    pattern: z.string().optional(),
    patterns: z.array(z.string()).optional(),
    flags: z.string().optional(), // regex flags, e.g. "i"
    // json_schema:
    json_schema: z.record(z.unknown()).optional(),
    // llm_judge:
    rubric: z.array(
      z.object({
        criterion: z.string(),
        weight: z.number().positive(),
        description: z.string(),
      }),
    ).optional(),
    // shared:
    extract_pattern: z.string().optional(), // optional regex to extract answer before comparing
    case_sensitive: z.boolean().optional(),
  }),

  // Metadata
  authored_by: z.string(),
  authored_at: z.string(), // ISO date
  validated_by: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      validated_at: z.string(),
      comments: z.string().optional(),
    }),
  ).optional(),

  // Tags for cross-cutting analysis (e.g. "mva-25", "nynorsk", "long-context")
  tags: z.array(z.string()).default([]),
});

export type Task = z.infer<typeof TaskSchema>;
