# lm-eval-tenkibench changelog

Changes to this adapter that affect score interpretation. The benchmark
*data* lives in the main repo; this file only logs adapter-level changes.

When citing results, please record both the TenkiBench dataset revision
(HF commit SHA) and the adapter version below.

## 0.1.0 — 2026-05-10

Initial release.

- 11 bench task YAMLs auto-generated from `tasks/<bench>/` in the main repo.
- `tenkibench` group YAML with weighted-mean aggregation across benches.
- `utils.py` scorer supporting:
  - `exact_string` (NFC + lowercase + substring fallback)
  - `regex` and `regex_all`
  - `numeric_exact` with Norwegian-locale parsing
  - `json_schema` — soft check (top-level key match)
  - `llm_judge` — placeholder 0.5
- Documented divergences from the official scorer in `README.md`.

## Score-stability policy

- Patch bumps (0.1.x): fix bugs without changing how a passing answer is
  judged. Existing scores remain comparable.
- Minor bumps (0.x.0): may tweak normalization or add new methods. Will be
  documented here so paper readers can reconstruct prior numbers.
- Major bumps (x.0.0): may change scoring rules in ways that re-rank models.
  Old scores should be re-run before comparing.
