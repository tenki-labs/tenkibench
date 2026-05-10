"""
TenkiBench scorer for EleutherAI lm-evaluation-harness.

This module implements a *simplified* version of the TenkiBench scoring rules.
The real evaluator (in the TenkiBench repo) supports JSON-schema validation
and LLM-as-judge with a rubric model — neither of which fits cleanly into a
stand-alone Python module without external services.

What we DO support out of the box:
    - exact_string  : trimmed case-insensitive string equality
    - regex         : at least one regex pattern parsed from the gold answer
                      must match the prediction
    - regex_all     : every regex pattern from the gold answer must match
    - numeric_exact : numeric value equality with Norwegian-locale parsing
                      (12 437,50  -> 12437.50)

What we approximate:
    - json_schema   : we parse the gold_answer as JSON and check the
                      prediction is parseable JSON with the same top-level
                      keys (a soft check; the real scorer validates types).
    - llm_judge     : returns 0.5 as a placeholder. A full TenkiBench score
                      requires the official runner with a rubric model.
                      Documented in the README.

The scorer is intentionally dependency-free: only Python stdlib. Drop into
any lm-eval-harness install without pulling extra packages.
"""

from __future__ import annotations

import json
import re
import unicodedata
from typing import Any


# ---------------------------------------------------------------------------
# Public lm-eval hooks
# ---------------------------------------------------------------------------

def doc_to_text(doc: dict[str, Any]) -> str:
    """
    Build the prompt that goes to the model.

    TenkiBench rows have an optional `system_prompt`. When it's empty we just
    return the user_prompt; otherwise we prefix with a labeled system block so
    the prompt remains legible on chat-tuned models that don't have a
    distinct "system" channel exposed by lm-eval's HF wrapper.
    """
    system_prompt = (doc.get("system_prompt") or "").strip()
    user_prompt = (doc.get("user_prompt") or "").strip()
    if system_prompt:
        return f"{system_prompt}\n\n{user_prompt}"
    return user_prompt


def process_results(doc: dict[str, Any], results: list[str]) -> dict[str, float]:
    """
    Score a single example.

    `results` is whatever the model returned for `generate_until`. We take
    the first generation, score it against doc.gold_answer using the method
    declared in doc.eval_method, and return a single metric in [0, 1].
    """
    if not results:
        return {"tenkibench_score": 0.0}
    prediction = results[0] if isinstance(results[0], str) else str(results[0])
    score = tenkibench_score(
        prediction=prediction,
        reference=doc.get("gold_answer", "") or "",
        eval_method=(doc.get("eval_method") or "exact_string").strip(),
    )
    return {"tenkibench_score": float(score)}


# ---------------------------------------------------------------------------
# Core scorer
# ---------------------------------------------------------------------------

def tenkibench_score(
    prediction: str,
    reference: str,
    eval_method: str,
    **_: Any,
) -> float:
    """
    Score one (prediction, reference) pair under a given eval_method.

    Returns a float in [0, 1]. 1.0 = perfect, 0.0 = no credit.
    """
    method = (eval_method or "exact_string").lower().strip()
    pred = _strip_codeblock(prediction or "")

    if method == "exact_string":
        return _score_exact_string(pred, reference)
    if method == "regex":
        return _score_regex(pred, reference, require_all=False)
    if method == "regex_all":
        return _score_regex(pred, reference, require_all=True)
    if method == "numeric_exact":
        return _score_numeric_exact(pred, reference)
    if method == "json_schema":
        return _score_json_schema(pred, reference)
    if method == "llm_judge":
        # Cannot evaluate without a judge model; placeholder so the run
        # doesn't crash. Document this clearly in the README.
        return 0.5

    # Unknown method — degrade gracefully to substring match so the run
    # still produces a number.
    return _score_exact_string(pred, reference)


# ---------------------------------------------------------------------------
# Method implementations
# ---------------------------------------------------------------------------

def _score_exact_string(prediction: str, reference: str) -> float:
    """Trimmed, NFC-normalized, case-insensitive equality."""
    p = _normalize(prediction)
    r = _normalize(reference)
    if not r:
        return 0.0
    if p == r:
        return 1.0
    # Substring fallback handles models that wrap the answer in extra prose.
    if r in p:
        return 1.0
    return 0.0


def _score_regex(prediction: str, reference: str, require_all: bool) -> float:
    """
    Reference may be either a single pattern or one pattern per line.
    Blank lines and lines starting with # are ignored.
    """
    patterns = [
        line.strip()
        for line in (reference or "").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    if not patterns:
        return 0.0

    matches = 0
    for pat in patterns:
        try:
            if re.search(pat, prediction, flags=re.IGNORECASE | re.DOTALL):
                matches += 1
        except re.error:
            # Malformed pattern — skip, don't crash the whole run.
            continue

    if require_all:
        return 1.0 if matches == len(patterns) else 0.0
    return 1.0 if matches > 0 else 0.0


def _score_numeric_exact(prediction: str, reference: str) -> float:
    """Compare numeric values with Norwegian-locale parsing."""
    p_num = _parse_norwegian_number(prediction)
    r_num = _parse_norwegian_number(reference)
    if p_num is None or r_num is None:
        return 0.0
    # Tolerance of 1e-6 absolute; the real scorer in TenkiBench uses
    # method-specific tolerances which we don't have access to here.
    return 1.0 if abs(p_num - r_num) < 1e-6 else 0.0


def _score_json_schema(prediction: str, reference: str) -> float:
    """
    Soft JSON-schema check: prediction must be parseable JSON whose top-level
    keys match the reference's. Type checks are *not* performed here — that
    requires the official scorer. Returns 0.5 partial credit when JSON parses
    but keys differ, so models that get the structure right but mislabel a
    field don't end up with the same 0.0 as a model that returns prose.
    """
    pred_obj = _try_parse_json(prediction)
    ref_obj = _try_parse_json(reference)
    if pred_obj is None or ref_obj is None:
        return 0.0
    if not isinstance(ref_obj, dict) or not isinstance(pred_obj, dict):
        # Reference isn't a keyed object — fall back to deep equality.
        return 1.0 if pred_obj == ref_obj else 0.0
    pred_keys = set(pred_obj.keys())
    ref_keys = set(ref_obj.keys())
    if pred_keys == ref_keys:
        return 1.0
    if ref_keys.issubset(pred_keys):
        # All required keys present, plus extras — partial credit.
        return 0.75
    overlap = len(pred_keys & ref_keys)
    if overlap == 0:
        return 0.0
    # Proportional partial credit on key overlap.
    return 0.5 * (overlap / len(ref_keys))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_CODEBLOCK_RE = re.compile(r"^```(?:json|JSON|nb|nn|no)?\s*(.*?)```\s*$", re.DOTALL)


def _strip_codeblock(text: str) -> str:
    """Strip a single surrounding fenced code block if present."""
    s = (text or "").strip()
    m = _CODEBLOCK_RE.match(s)
    if m:
        return m.group(1).strip()
    return s


def _normalize(text: str) -> str:
    """NFC + lowercase + collapse internal whitespace."""
    s = unicodedata.normalize("NFC", text or "").strip().lower()
    return re.sub(r"\s+", " ", s)


def _parse_norwegian_number(text: str) -> float | None:
    """
    Parse a Norwegian-formatted number into a float.

    Examples accepted:
        '12 437,50'      -> 12437.50  (NBSP or regular space as thousands sep)
        '1.234,56'       -> 1234.56   (period as thousands sep, comma as decimal)
        '12437.50'       -> 12437.50  (already English-formatted)
        'kr 1 200,-'     -> 1200.0    (kroner prefix + ',-' suffix common on receipts)
        '-42,5'          -> -42.5
    """
    if text is None:
        return None
    s = str(text).strip()
    if not s:
        return None

    # First, pick the first numeric-looking run from the string. This handles
    # models that include the unit ("12 437,50 kr") or write the answer in a
    # sentence ("Svaret er 12 437,50.").
    m = re.search(r"[-+]?[\d][\d\.,\s  ]*", s)
    if not m:
        return None
    raw = m.group(0)

    # Strip ',-' kroner suffix (1 200,-)
    raw = re.sub(r",-+$", "", raw)
    # Drop NBSP, narrow NBSP, regular space (thousands separators in NO)
    raw = raw.replace(" ", "").replace(" ", "").replace(" ", "")

    # If both '.' and ',' appear, the comma is the decimal separator (NO style).
    if "." in raw and "," in raw:
        raw = raw.replace(".", "").replace(",", ".")
    elif "," in raw:
        # Comma is decimal (NO).
        raw = raw.replace(",", ".")
    # else: only '.' — already English decimal style, leave alone.

    try:
        return float(raw)
    except ValueError:
        return None


def _try_parse_json(text: str) -> Any:
    """Best-effort JSON parse. Returns None when parsing fails."""
    s = _strip_codeblock(text or "").strip()
    if not s:
        return None
    try:
        return json.loads(s)
    except (json.JSONDecodeError, ValueError):
        # Try to locate the first balanced { ... } block.
        start = s.find("{")
        end = s.rfind("}")
        if 0 <= start < end:
            candidate = s[start : end + 1]
            try:
                return json.loads(candidate)
            except (json.JSONDecodeError, ValueError):
                return None
        return None


# ---------------------------------------------------------------------------
# Self-test (run `python utils.py`)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    cases: list[tuple[str, str, str, float]] = [
        ("exact_string", "Oslo", "oslo", 1.0),
        ("exact_string", "The capital is Oslo.", "Oslo", 1.0),
        ("exact_string", "Bergen", "Oslo", 0.0),
        ("regex", "Org.nr: 919 845 311", r"\d{3}\s\d{3}\s\d{3}", 1.0),
        ("regex_all", "AS Tenki Labs (org.nr 919 845 311)",
         r"AS\nTenki Labs\n919", 1.0),
        ("numeric_exact", "Svaret er 12 437,50 kr.", "12437.50", 1.0),
        ("numeric_exact", "kr 1 200,-", "1200", 1.0),
        ("numeric_exact", "1.234,56", "1234.56", 1.0),
        ("numeric_exact", "ti tusen", "10000", 0.0),
        ("json_schema", '{"navn":"Tenki","org":"919"}', '{"navn":"x","org":"y"}', 1.0),
        ("json_schema", '{"navn":"Tenki"}', '{"navn":"x","org":"y"}', 0.25),
        ("llm_judge", "anything", "anything", 0.5),
    ]
    failures = 0
    for method, pred, ref, want in cases:
        got = tenkibench_score(pred, ref, method)
        ok = abs(got - want) < 1e-6
        marker = "OK " if ok else "FAIL"
        print(f"  {marker}  method={method:14s} want={want:.2f}  got={got:.2f}")
        if not ok:
            failures += 1
    print(f"\n{len(cases) - failures}/{len(cases)} self-test cases passed.")
    if failures:
        raise SystemExit(1)
