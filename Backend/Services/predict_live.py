"""
predict_live.py — Predict merge probability for a real GitHub PR.

Reads PR_URL from .env file or command line arg.
Saves results to prediction_result.txt and prediction_result.json.

Usage:
    1. Add PR_URL=https://github.com/owner/repo/pull/123 to .env
       Then run: python predict_live.py
    2. Or: python predict_live.py https://github.com/owner/repo/pull/123
"""

import sys
import re
import json
from pathlib import Path
from datetime import datetime

# Reuse existing modules
from fetch_prs import (
    fetch_pr_detail, fetch_pr_files, fetch_pr_reviews,
    analyze_patches, extract_keyword_signals, process_pr,
)
from model_ml import build_pipeline, predict_pr_merge_probability, FEATURE_DESCRIPTIONS

BASE_DIR    = Path(__file__).parent
OUTPUT_FILE = BASE_DIR / "prediction_result.txt"
OUTPUT_JSON = BASE_DIR / "prediction_result.json"


def parse_pr_url(url: str) -> tuple[str, str, int]:
    """Extract (owner, repo, number) from a GitHub PR URL."""
    match = re.match(r"https?://github\.com/([^/]+)/([^/]+)/pull/(\d+)", url)
    if not match:
        print(f"[ERROR] Invalid PR URL: {url}")
        print("        Expected: https://github.com/owner/repo/pull/123")
        sys.exit(1)
    return match.group(1), match.group(2), int(match.group(3))


def _load_pr_url() -> str | None:
    """Load PR_URL from .env file or command line."""
    if len(sys.argv) >= 2:
        return sys.argv[1].strip()

    env_file = BASE_DIR / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("PR_URL"):
                _, _, value = line.partition("=")
                value = value.strip().strip('"').strip("'")
                if value:
                    return value
    return None


def main():
    url = _load_pr_url()
    if not url:
        print("[ERROR] No PR URL found.")
        print("  Add PR_URL=https://github.com/owner/repo/pull/123 to .env")
        print("  Or run: python predict_live.py <url>")
        sys.exit(1)

    owner, repo, number = parse_pr_url(url)

    # ── Step 1: Train model ──
    print("[1/4] Loading model from pr_data.csv …")
    build_pipeline(csv_path="pr_data.csv")

    # ── Step 2: Fetch live PR data ──
    print(f"\n[2/4] Fetching PR #{number} from {owner}/{repo} …")
    detail = fetch_pr_detail(owner, repo, number)
    if detail is None:
        print("[ERROR] Could not fetch PR detail.")
        sys.exit(1)

    files   = fetch_pr_files(owner, repo, number)
    reviews = fetch_pr_reviews(owner, repo, number)

    # ── Step 3: Process ──
    print("[3/4] Extracting features …")
    processed = process_pr(detail, files, reviews, owner, repo)
    patch_stats     = analyze_patches(files)
    keyword_signals = extract_keyword_signals(processed.get("title", ""), processed.get("body", ""))

    pr_dict = {
        "additions":                    processed["additions"],
        "deletions":                    processed["deletions"],
        "changed_files":                processed["changed_files"],
        "commits":                      processed["commits"],
        "review_comments":              processed["review_comments"],
        "comments":                     processed["comments"],
        "title":                        processed["title"],
        "body":                         processed["body"],
        "test_files_changed":           processed["test_files_changed"],
        "test_change_ratio":            processed["test_change_ratio"],
        "max_file_changes":             processed["max_file_changes"],
        **patch_stats,
    }

    # ── Step 4: Predict ──
    print("[4/4] Running prediction …\n")
    result = predict_pr_merge_probability(pr_dict)
    prob   = result["merge_probability"]

    # Confidence level
    if prob >= 0.85:   confidence = "Very High"
    elif prob >= 0.65: confidence = "Moderate"
    elif prob >= 0.45: confidence = "Borderline"
    else:              confidence = "Low"

    # Active keywords
    active_kw = [k.replace("contains_", "") for k, v in keyword_signals.items() if v == 1]

    # Actual merge status
    merged_actual = processed["merged"] == 1
    actual_str    = "MERGED" if merged_actual else "NOT MERGED"

    # Correct prediction?
    predicted_merge = prob >= 0.5
    correct = (predicted_merge and merged_actual) or (not predicted_merge and not merged_actual)

    # ── Build report lines ──
    lines = []
    W = 62
    lines.append("=" * W)
    lines.append("  LIVE PR PREDICTION RESULT")
    lines.append(f"  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("=" * W)

    lines.append("")
    lines.append("  PR INFORMATION")
    lines.append("  " + "-" * 50)
    lines.append(f"  URL       : {url}")
    lines.append(f"  Repo      : {owner}/{repo}")
    lines.append(f"  PR #      : {number}")
    lines.append(f"  Title     : {processed['title']}")
    lines.append(f"  State     : {processed['state']}")
    lines.append(f"  Actual    : {actual_str}")

    lines.append("")
    lines.append("  CODE METRICS")
    lines.append("  " + "-" * 50)
    lines.append(f"  Additions       : +{processed['additions']}")
    lines.append(f"  Deletions       : -{processed['deletions']}")
    lines.append(f"  Total changes   : {processed['total_changes']}")
    lines.append(f"  Net line change : {processed['net_line_change']}")
    lines.append(f"  Files changed   : {processed['changed_files']}")
    lines.append(f"  Commits         : {processed['commits']}")
    lines.append(f"  Max file change : {processed['max_file_changes']} lines")

    lines.append("")
    lines.append("  DIFF STRUCTURAL ANALYSIS")
    lines.append("  " + "-" * 50)
    lines.append(f"  Control statements (if/for/while) : {patch_stats['control_statements_count']}")
    lines.append(f"  Function definitions              : {patch_stats['function_definitions_count']}")
    lines.append(f"  Class definitions                 : {patch_stats['class_definitions_count']}")
    lines.append(f"  TODO/FIXME comments               : {patch_stats['todo_count']}")
    ctrl  = patch_stats['control_statements_count']
    funcs = patch_stats['function_definitions_count']
    cls   = patch_stats['class_definitions_count']
    score = ctrl + (funcs * 2) + (cls * 3)
    lines.append(f"  Structural change score           : {score}")

    lines.append("")
    lines.append("  TEST COVERAGE")
    lines.append("  " + "-" * 50)
    lines.append(f"  Test files modified : {processed['test_files_changed']}")
    lines.append(f"  Test change ratio   : {processed['test_change_ratio']:.1%}")

    lines.append("")
    lines.append("  KEYWORD RISK SIGNALS")
    lines.append("  " + "-" * 50)
    for kw in ["refactor", "rewrite", "breaking", "deprecated", "fix", "bug"]:
        flag = "YES" if f"contains_{kw}" in keyword_signals and keyword_signals[f"contains_{kw}"] == 1 else "no"
        lines.append(f"  {kw:<15} : {flag}")

    lines.append("")
    lines.append("  REVIEW ENGAGEMENT")
    lines.append("  " + "-" * 50)
    lines.append(f"  Comments        : {processed['comments']}")
    lines.append(f"  Review comments : {processed['review_comments']}")

    lines.append("")
    lines.append("=" * W)
    lines.append("  MODEL PREDICTION")
    lines.append("=" * W)

    # Probability bar
    filled = int(prob * 30)
    bar = "#" * filled + "." * (30 - filled)

    lines.append(f"")
    lines.append(f"  Merge Probability : {prob:.1%}")
    lines.append(f"  [{bar}]")
    lines.append(f"  Verdict           : {result['prediction']}")
    lines.append(f"  Confidence        : {confidence}")

    lines.append("")
    lines.append("  TOP CONTRIBUTING FACTORS")
    lines.append("  " + "-" * 50)
    for i, feat in enumerate(result["top_features"], 1):
        desc = FEATURE_DESCRIPTIONS.get(feat["feature"], feat["feature"])
        lines.append(f"  {i}. {desc}")
        lines.append(f"     Value: {feat['value']:<10} Importance: {feat['importance']:.1%}")

    lines.append("")
    lines.append("=" * W)
    if correct:
        lines.append(f"  RESULT: Model CORRECT — predicted {'merge' if predicted_merge else 'not merge'}, actual: {actual_str}")
    else:
        lines.append(f"  RESULT: Model WRONG — predicted {'merge' if predicted_merge else 'not merge'}, actual: {actual_str}")
    lines.append("=" * W)

    # ── Write to file ──
    report = "\n".join(lines)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(report)

    # Also save as JSON for frontend consumption
    json_result = {
        "url":          url,
        "repo":         f"{owner}/{repo}",
        "pr_number":    number,
        "title":        processed["title"],
        "state":        processed["state"],
        "actual_merged": merged_actual,
        "additions":    processed["additions"],
        "deletions":    processed["deletions"],
        "changed_files": processed["changed_files"],
        "commits":      processed["commits"],
        "test_files_changed":   processed["test_files_changed"],
        "test_change_ratio":    processed["test_change_ratio"],
        "patch_analysis":       patch_stats,
        "keyword_signals":      keyword_signals,
        "structural_change_score": score,
        "prediction": {
            "merge_probability": prob,
            "verdict":           result["prediction"],
            "confidence":        confidence,
            "correct":           correct,
        },
        "top_features": result["top_features"],
        "timestamp":    datetime.now().isoformat(),
    }

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(json_result, f, indent=2, ensure_ascii=False)

    # ── Also print to console ──
    print(report)
    print(f"\n[SAVED] Results written to:")
    print(f"  Text : {OUTPUT_FILE}")
    print(f"  JSON : {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
