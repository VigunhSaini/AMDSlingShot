"""
analyze.py — Flask Blueprint for PR Analysis

POST /api/analyze
  Body: { "pr_url": "https://github.com/owner/repo/pull/123" }

Pipeline: Parse URL → Train ML model → Fetch live PR → ML predict → Groq LLM review
Returns a unified JSON matching the frontend's expected data shape.
"""

import re
import sys
import traceback
from pathlib import Path
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify

# ── Add Services directory to sys.path so we can import the ML/LLM modules ──
SERVICES_DIR = str(Path(__file__).resolve().parent.parent / "Services")
if SERVICES_DIR not in sys.path:
    sys.path.insert(0, SERVICES_DIR)

from fetch_prs import (
    fetch_pr_detail, fetch_pr_files, fetch_pr_reviews,
    analyze_patches, extract_keyword_signals, process_pr,
)
from model_ml import build_pipeline, predict_pr_merge_probability, FEATURE_DESCRIPTIONS
from groq_review import SYSTEM_PROMPT, build_user_prompt, call_groq

# ─────────────────────────────────────────────
# Blueprint
# ─────────────────────────────────────────────
analyze_bp = Blueprint("analyze", __name__)

# Module-level flag: has the model been built yet this process?
_model_ready = False


def _ensure_model():
    """Train the ML model once per process (lazy init)."""
    global _model_ready
    if not _model_ready:
        build_pipeline(csv_path="pr_data.csv")
        _model_ready = True


def _parse_pr_url(url: str):
    """Return (owner, repo, number) or raise ValueError."""
    match = re.match(r"https?://github\.com/([^/]+)/([^/]+)/pull/(\d+)", url)
    if not match:
        raise ValueError(f"Invalid GitHub PR URL: {url}")
    return match.group(1), match.group(2), int(match.group(3))


def _time_ago(iso_str: str) -> str:
    """Convert ISO datetime string to a human-readable 'X ago' string."""
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff = now - dt
        seconds = int(diff.total_seconds())
        if seconds < 60:
            return "just now"
        minutes = seconds // 60
        if minutes < 60:
            return f"{minutes} min ago"
        hours = minutes // 60
        if hours < 24:
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        days = hours // 24
        if days < 30:
            return f"{days} day{'s' if days != 1 else ''} ago"
        months = days // 30
        return f"{months} month{'s' if months != 1 else ''} ago"
    except Exception:
        return "recently"


def _build_risk_factors(prediction_data: dict, top_features: list) -> list:
    """Generate risk factors from ML prediction data."""
    factors = []
    prob = prediction_data["prediction"]["merge_probability"]
    additions = prediction_data.get("additions", 0)
    deletions = prediction_data.get("deletions", 0)
    total = additions + deletions
    test_ratio = prediction_data.get("test_change_ratio", 0)
    test_files = prediction_data.get("test_files_changed", 0)
    kw = prediction_data.get("keyword_signals", {})
    patch = prediction_data.get("patch_analysis", {})
    commits = prediction_data.get("commits", 0)
    changed_files = prediction_data.get("changed_files", 0)

    # 1. Lines of code risk
    if total > 300:
        severity = "high" if total > 600 else "medium"
        impact = -min(20, int(total / 50))
        factors.append({
            "id": "loc",
            "label": "High Lines of Code",
            "impact": impact,
            "severity": severity,
            "description": f"This PR modifies {total} lines ({additions} added, {deletions} removed). Large PRs are harder to review and more likely to be rejected.",
            "suggestion": "Split into smaller, focused PRs under 300 LOC each for faster reviews.",
        })
    elif total > 0:
        factors.append({
            "id": "loc",
            "label": "Manageable PR Size",
            "impact": -2,
            "severity": "low",
            "description": f"This PR modifies {total} lines — within a comfortable review range.",
            "suggestion": "Keep up the practice of small, focused changes.",
        })

    # 2. Test coverage risk
    if test_files == 0:
        factors.append({
            "id": "tests",
            "label": "Missing Test Coverage",
            "impact": -14,
            "severity": "high",
            "description": "No test files were modified in this PR. Reviewers often require test coverage for new code.",
            "suggestion": "Add unit tests covering the new or changed functionality.",
        })
    elif test_ratio < 0.2:
        factors.append({
            "id": "tests",
            "label": "Low Test Ratio",
            "impact": -8,
            "severity": "medium",
            "description": f"Test change ratio is {test_ratio:.0%} — relatively low compared to best practices (>30%).",
            "suggestion": "Increase test coverage to at least 30% of the total changes.",
        })

    # 3. Complexity risk
    ctrl = patch.get("control_statements_count", 0)
    funcs = patch.get("function_definitions_count", 0)
    classes = patch.get("class_definitions_count", 0)
    structural_score = ctrl + (funcs * 2) + (classes * 3)
    if structural_score > 10:
        factors.append({
            "id": "complexity",
            "label": "High Structural Complexity",
            "impact": -min(12, structural_score),
            "severity": "high" if structural_score > 20 else "medium",
            "description": f"Structural change score of {structural_score} ({ctrl} control statements, {funcs} functions, {classes} classes). Complex diffs take longer to review.",
            "suggestion": "Refactor into smaller, single-responsibility functions.",
        })

    # 4. Description quality
    desc_len = prediction_data.get("description_length", 0)
    if not desc_len:
        # Try to compute from body
        body = prediction_data.get("body", "") or ""
        desc_len = len(body)
    if desc_len < 50:
        factors.append({
            "id": "desc",
            "label": "Weak PR Description",
            "impact": -8,
            "severity": "medium",
            "description": f"The description is only {desc_len} characters. Under-described PRs take longer to review.",
            "suggestion": "Add motivation, architecture decision, and link to related issue.",
        })

    # 5. Keyword risk signals
    active_kw = [k.replace("contains_", "") for k, v in kw.items() if v == 1]
    if active_kw:
        kw_str = ", ".join(active_kw)
        factors.append({
            "id": "keywords",
            "label": f"Risk Keywords Detected",
            "impact": -len(active_kw) * 3,
            "severity": "medium" if len(active_kw) <= 2 else "high",
            "description": f"Found risk keywords in title/body: {kw_str}. These may signal potentially disruptive changes.",
            "suggestion": "Clearly document why these changes are needed and how they've been validated.",
        })

    # 6. Review engagement
    comments = prediction_data.get("comments", 0)
    review_comments = prediction_data.get("review_comments", 0)
    if comments == 0 and review_comments == 0:
        factors.append({
            "id": "engagement",
            "label": "No Review Engagement",
            "impact": -5,
            "severity": "low",
            "description": "No comments or review comments yet. Early engagement signals help merge velocity.",
            "suggestion": "Tag specific reviewers and provide context to encourage engagement.",
        })

    # Sort by absolute impact (most impactful first)
    factors.sort(key=lambda f: f["impact"])
    return factors


def _build_suggestions(risk_factors: list) -> list:
    """Generate actionable suggestions from risk factors."""
    suggestions = []
    risk_ids = {f["id"] for f in risk_factors}

    if "tests" in risk_ids:
        suggestions.append({
            "id": "add_tests",
            "label": "Add Test Coverage",
            "delta": 14,
            "description": "Write targeted unit tests covering the changed functionality.",
            "effort": "Medium",
            "effortColor": "amber",
        })

    if "desc" in risk_ids:
        suggestions.append({
            "id": "improve_desc",
            "label": "Improve PR Description",
            "delta": 8,
            "description": "Add motivation, architecture notes, and link to related issue.",
            "effort": "Low",
            "effortColor": "green",
        })

    if "loc" in risk_ids:
        loc_factor = next((f for f in risk_factors if f["id"] == "loc"), None)
        if loc_factor and loc_factor["severity"] in ("high", "medium"):
            suggestions.append({
                "id": "reduce_size",
                "label": "Reduce PR Size",
                "delta": 12,
                "description": "Split into smaller, focused PRs under 300 LOC each.",
                "effort": "High",
                "effortColor": "red",
            })

    # Ensure we always have at least one suggestion
    if not suggestions:
        suggestions.append({
            "id": "add_tests",
            "label": "Add Test Coverage",
            "delta": 10,
            "description": "Adding tests always strengthens merge confidence.",
            "effort": "Medium",
            "effortColor": "amber",
        })

    return suggestions


# ─────────────────────────────────────────────
# Route
# ─────────────────────────────────────────────

@analyze_bp.route("/api/analyze", methods=["POST"])
def analyze_pr():
    """Full analysis pipeline: ML prediction → Groq LLM review → unified JSON."""
    body = request.get_json(silent=True) or {}
    pr_url = body.get("pr_url", "").strip()

    if not pr_url:
        return jsonify({"error": "Missing pr_url in request body"}), 400

    try:
        owner, repo, number = _parse_pr_url(pr_url)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    try:
        # ── Step 1: Ensure ML model is loaded ──
        print(f"[API] Analyzing PR: {pr_url}")
        _ensure_model()

        # ── Step 2: Fetch live PR data from GitHub ──
        print(f"[API] Fetching PR #{number} from {owner}/{repo} ...")
        detail = fetch_pr_detail(owner, repo, number)
        if detail is None:
            return jsonify({"error": f"Could not fetch PR #{number} from {owner}/{repo}. It may not exist or GitHub API rate limit hit."}), 404

        files = fetch_pr_files(owner, repo, number)
        reviews = fetch_pr_reviews(owner, repo, number)

        # ── Step 3: Process features ──
        print("[API] Extracting features ...")
        processed = process_pr(detail, files, reviews, owner, repo)
        patch_stats = analyze_patches(files)
        keyword_signals = extract_keyword_signals(
            processed.get("title", ""), processed.get("body", "")
        )

        pr_dict = {
            "additions": processed["additions"],
            "deletions": processed["deletions"],
            "changed_files": processed["changed_files"],
            "commits": processed["commits"],
            "review_comments": processed["review_comments"],
            "comments": processed["comments"],
            "title": processed["title"],
            "body": processed["body"],
            "test_files_changed": processed["test_files_changed"],
            "test_change_ratio": processed["test_change_ratio"],
            "max_file_changes": processed["max_file_changes"],
            **patch_stats,
        }

        # ── Step 4: ML Prediction ──
        print("[API] Running ML prediction ...")
        result = predict_pr_merge_probability(pr_dict)
        prob = result["merge_probability"]

        # Confidence level
        if prob >= 0.85:
            confidence = "Very High"
        elif prob >= 0.65:
            confidence = "Moderate"
        elif prob >= 0.45:
            confidence = "Borderline"
        else:
            confidence = "Low"

        # Structural change score
        ctrl = patch_stats.get("control_statements_count", 0)
        funcs = patch_stats.get("function_definitions_count", 0)
        cls = patch_stats.get("class_definitions_count", 0)
        structural_score = ctrl + (funcs * 2) + (cls * 3)

        # Build the prediction data dict (same shape as prediction_result.json)
        prediction_data = {
            "url": pr_url,
            "repo": f"{owner}/{repo}",
            "pr_number": number,
            "title": processed["title"],
            "state": processed["state"],
            "actual_merged": processed["merged"] == 1,
            "additions": processed["additions"],
            "deletions": processed["deletions"],
            "changed_files": processed["changed_files"],
            "commits": processed["commits"],
            "comments": processed["comments"],
            "review_comments": processed["review_comments"],
            "test_files_changed": processed["test_files_changed"],
            "test_change_ratio": processed["test_change_ratio"],
            "patch_analysis": patch_stats,
            "keyword_signals": keyword_signals,
            "structural_change_score": structural_score,
            "body": processed.get("body", ""),
            "prediction": {
                "merge_probability": prob,
                "verdict": result["prediction"],
                "confidence": confidence,
                "correct": (prob >= 0.5) == (processed["merged"] == 1),
            },
            "top_features": result["top_features"],
            "timestamp": datetime.now().isoformat(),
        }

        # ── Step 5: Groq LLM Review ──
        print("[API] Requesting LLM review from Groq ...")
        user_prompt = build_user_prompt(prediction_data)
        llm_review = call_groq(SYSTEM_PROMPT, user_prompt)

        # ── Step 6: Build unified response for frontend ──
        print("[API] Building response ...")

        # Extract author from the detail
        author = "unknown"
        if detail.get("user"):
            author = detail["user"].get("login", "unknown")

        # Extract branch info
        head_ref = detail.get("head", {}).get("ref", "feature")
        base_ref = detail.get("base", {}).get("ref", "main")
        branch = f"{head_ref} → {base_ref}"

        # Created at
        created_at = _time_ago(detail.get("created_at", ""))

        # Extract reviewers from review data
        reviewer_logins = list({
            r.get("user", {}).get("login", "")
            for r in (reviews or [])
            if r.get("user", {}).get("login")
        })
        if not reviewer_logins:
            reviewer_logins = ["none"]

        # Risk factors & suggestions
        risk_factors = _build_risk_factors(prediction_data, result["top_features"])
        suggestions = _build_suggestions(risk_factors)

        # Base probability as integer percentage
        base_prob = round(prob * 100)

        response = {
            "url": pr_url,
            "title": processed["title"],
            "author": author,
            "authorAvatar": author[:2].upper(),
            "repo": f"{owner}/{repo}",
            "branch": branch,
            "createdAt": created_at,
            "linesAdded": processed["additions"],
            "linesRemoved": processed["deletions"],
            "filesChanged": processed["changed_files"],
            "commits": processed["commits"],
            "reviewers": reviewer_logins[:5],
            "baseProbability": base_prob,
            "description": (processed.get("body") or "")[:200],
            "hasTests": processed["test_files_changed"] > 0,
            "testCoverage": round(processed["test_change_ratio"] * 100),
            "riskFactors": risk_factors,
            "suggestions": suggestions,
            "aiExplanation": llm_review,
            "prediction": prediction_data["prediction"],
            "topFeatures": result["top_features"],
            "patchAnalysis": patch_stats,
            "keywordSignals": keyword_signals,
        }

        print(f"[API] ✓ Analysis complete for PR #{number}")
        return jsonify(response), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500
