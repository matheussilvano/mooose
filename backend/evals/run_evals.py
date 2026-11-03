"""Evaluate the grading pipeline against a labelled dataset.

    python -m evals.run_evals --provider openrouter --model <id> --samples 3

Dataset line: {"id", "tema", "texto", "expected_total_range": [min, max], "expected_annulled": bool}
Bring REAL human-graded essays (with consent) to get meaningful numbers; the bundled sample is synthetic.
Reports: in-range rate, MAE vs. range midpoint, and run-to-run stability (std-dev over --repeat runs).
Set LANGSMITH_TRACING=true + LANGSMITH_API_KEY to trace every run in LangSmith.
"""
import argparse
import asyncio
import json
import statistics
from pathlib import Path

from mooose_ai import LLMConfig, build_chat_model, grade_essay


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default=str(Path(__file__).with_name("dataset.jsonl")))
    ap.add_argument("--provider", default="openrouter")
    ap.add_argument("--model")
    ap.add_argument("--samples", type=int, default=1)
    ap.add_argument("--repeat", type=int, default=1)
    args = ap.parse_args()

    llm = build_chat_model(LLMConfig(provider=args.provider, model=args.model))
    rows = [json.loads(line) for line in Path(args.dataset).read_text().splitlines() if line.strip()]
    in_range, errors, stds = 0, [], []
    for row in rows:
        totals = [
            (await grade_essay(llm, row["tema"], row["texto"], samples=args.samples)).nota_final for _ in range(args.repeat)
        ]
        lo, hi = row["expected_total_range"]
        ok = all(lo <= t <= hi for t in totals)
        in_range += ok
        errors.append(abs(statistics.mean(totals) - (lo + hi) / 2))
        if len(totals) > 1:
            stds.append(statistics.pstdev(totals))
        print(f"{row['id']:<24} totals={totals} expected={lo}-{hi} {'OK' if ok else 'MISS'}")
    print(f"\nin-range: {in_range}/{len(rows)}  MAE: {statistics.mean(errors):.1f}" + (f"  mean std-dev: {statistics.mean(stds):.1f}" if stds else ""))


if __name__ == "__main__":
    asyncio.run(main())
