"""
groq_review.py — Curated PR Review via Groq LLM

Reads ML prediction results from prediction_result.json and sends them
to Groq's API (Llama 3.3 70B) to generate a detailed, actionable
PR review with specific suggestions to improve merge chances.

Usage:
    python groq_review.py
    python groq_review.py path/to/prediction_result.json
"""

import sys
import json
from pathlib import Path
from datetime import datetime

try:
    from groq import Groq
except ImportError:
    print("[ERROR] Groq SDK not installed. Run: pip install groq")
    sys.exit(1)

BASE_DIR    = Path(__file__).parent
OUTPUT_TXT  = BASE_DIR / "groq_review_result.txt"
OUTPUT_JSON = BASE_DIR / "groq_review_result.json"

# ─────────────────────────────────────────────
# 1. LOAD PREDICTION DATA
# ─────────────────────────────────────────────

def load_prediction(path: str | None = None) -> dict:
    """Load the ML prediction result JSON."""
    if path:
        p = Path(path)
    else:
        p = BASE_DIR / "prediction_result.json"

    if not p.exists():
        print(f"[ERROR] Prediction file not found: {p}")
        print("  Run predict_live.py first to generate prediction_result.json")
        sys.exit(1)

    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


# ─────────────────────────────────────────────
# 2. BUILD THE LLM PROMPT
# ─────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are a warm, experienced senior developer and trusted mentor. Think of yourself \
as that one senior engineer on the team who always has time for a quick chat, \
who genuinely wants every contributor to grow and succeed.

You personally reviewed a GitHub Pull Request. You will receive the detailed \
analysis you did — the numbers, the patterns, the risk signals you spotted. \
Now you're sitting down with the contributor over coffee to share your honest take.

CRITICAL: You are a HUMAN advisor. You personally reviewed this code. \
NEVER say "model", "ML", "machine learning", "algorithm", "prediction engine", \
"our system", or anything that implies automated analysis. Everything you say \
comes from YOUR experience and YOUR review of the code.

Follow this EXACT structure in your response:

## 🔍 Hey, Here's Where Your PR Stands
Open with the merge chance naturally, like: "After looking through your PR, \
I'd say there's about a XX.X% chance of it getting merged." Then explain what \
that means in plain terms. Use "your PR" and "you" — speak directly to them. \
Lead with the percentage.

## 📊 Let's Walk Through the Numbers Together
Go through the key metrics (code size, test coverage, complexity, keyword signals, \
review engagement) and explain what they mean for THIS PR. Reference actual numbers. \
Use phrases like "I noticed that...", "One thing that stands out is...", \
"This is actually a good sign because..."

## ⚠️ A Few Things to Keep an Eye On
Gently point out 3-5 areas that could be stronger. Frame them as opportunities, \
not failures. Be specific with numbers. Use language like "One area where you \
could level up is...", "Something that might raise a reviewer's eyebrow is..."

## 💡 Here's What I'd Suggest
Provide 5-7 concrete, numbered steps they can take RIGHT NOW. Frame each one as \
friendly advice from someone who's been there:
- Reference the specific metric or concern
- Tell them exactly what to do, step by step
- Explain WHY it helps (share the wisdom behind it)

## 🏆 What You're Doing Well
End on a high note! Highlight 2-3 genuine strengths. Make them feel good about \
what's working so they keep doing it.

Rules:
- NEVER mention a model, ML, algorithm, prediction, or any automated system.
- Speak as if YOU personally reviewed the code and arrived at these conclusions.
- NEVER be generic. Always reference specific numbers from the data.
- Be warm and encouraging, but always honest. Sugar-coating doesn't help anyone.
- Use "you/your" throughout — speak directly to the contributor.
- Share wisdom naturally, like "In my experience..." or "What I've seen work well is..."
- Keep the total response under 600 words for readability.
- No jargon-heavy lecturing. Keep it conversational and approachable.
"""


def build_user_prompt(data: dict) -> str:
    """Build a detailed user prompt from prediction data."""
    pred = data["prediction"]
    top_feats = data.get("top_features", [])
    patch = data.get("patch_analysis", {})
    kw = data.get("keyword_signals", {})

    # Format top features
    feat_lines = []
    for i, f in enumerate(top_feats, 1):
        feat_lines.append(f"  {i}. {f['feature']} = {f['value']} (importance: {f['importance']:.1%})")

    # Format keyword signals
    active_kw = [k.replace("contains_", "") for k, v in kw.items() if v == 1]
    inactive_kw = [k.replace("contains_", "") for k, v in kw.items() if v == 0]

    prompt = f"""Here are your notes from reviewing this GitHub Pull Request:

PR INFORMATION:
- Repository: {data.get('repo', 'unknown')}
- PR #{data.get('pr_number', '?')}: "{data.get('title', 'N/A')}"
- Current State: {data.get('state', 'unknown')}
- Actually Merged: {'Yes' if data.get('actual_merged') else 'No'}

CODE METRICS:
- Additions: +{data.get('additions', 0)}
- Deletions: -{data.get('deletions', 0)}
- Files Changed: {data.get('changed_files', 0)}
- Commits: {data.get('commits', 0)}

TEST COVERAGE:
- Test Files Modified: {data.get('test_files_changed', 0)}
- Test Change Ratio: {data.get('test_change_ratio', 0):.1%}

DIFF STRUCTURAL ANALYSIS:
- Control Statements (if/for/while): {patch.get('control_statements_count', 0)}
- Function Definitions: {patch.get('function_definitions_count', 0)}
- Class Definitions: {patch.get('class_definitions_count', 0)}
- TODO/FIXME Comments: {patch.get('todo_count', 0)}
- Structural Change Score: {data.get('structural_change_score', 0)}

KEYWORD RISK SIGNALS:
- Active risk keywords: {', '.join(active_kw) if active_kw else 'None'}
- Not triggered: {', '.join(inactive_kw) if inactive_kw else 'None'}

YOUR ASSESSMENT:
- Estimated Merge Chance: {pred.get('merge_probability', 0):.1%}
- Overall Take: {pred.get('verdict', 'N/A')}
- Confidence in Assessment: {pred.get('confidence', 'N/A')}

KEY FACTORS YOU NOTICED (most impactful on merge outcome):
{chr(10).join(feat_lines)}

Now share your review with the contributor, following the required structure."""

    return prompt


# ─────────────────────────────────────────────
# 3. CALL GROQ API
# ─────────────────────────────────────────────

def _load_api_key() -> str:
    """Load GROQ_API_KEY from .env file."""
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("GROQ_API_KEY"):
                _, _, value = line.partition("=")
                value = value.strip().strip('"').strip("'")
                if value:
                    return value

    print("[ERROR] GROQ_API_KEY not found in .env file.")
    print("  Add GROQ_API_KEY=gsk_... to your .env file.")
    print("  Get a free key at: https://console.groq.com/keys")
    sys.exit(1)


def call_groq(system_prompt: str, user_prompt: str) -> str:
    """Send prompts to Groq API and return the LLM response."""
    api_key = _load_api_key()
    client = Groq(api_key=api_key)

    print("[INFO] Sending data to Groq LLM (llama-3.3-70b-versatile) …")

    chat_completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        temperature=0.7,
        max_tokens=1024,
        top_p=0.9,
    )

    return chat_completion.choices[0].message.content


# ─────────────────────────────────────────────
# 4. MAIN
# ─────────────────────────────────────────────

def main():
    # Load prediction data
    json_path = sys.argv[1] if len(sys.argv) >= 2 else None
    data = load_prediction(json_path)

    print(f"[1/3] Loaded prediction for PR #{data.get('pr_number', '?')} "
          f"({data.get('repo', 'unknown')})")

    # Build prompts
    user_prompt = build_user_prompt(data)

    # Call Groq
    print("[2/3] Requesting curated review from Groq LLM …")
    review = call_groq(SYSTEM_PROMPT, user_prompt)

    # Save results
    print("[3/3] Saving results …\n")

    # ── Text output ──
    W = 62
    header = [
        "=" * W,
        "  CURATED PR REVIEW (powered by Groq + Llama 3.3 70B)",
        f"  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"  PR: {data.get('repo', '')}#{data.get('pr_number', '')}",
        "=" * W,
        "",
    ]
    report = "\n".join(header) + review + "\n" + "=" * W

    with open(OUTPUT_TXT, "w", encoding="utf-8") as f:
        f.write(report)

    # ── JSON output ──
    json_result = {
        "pr_url":           data.get("url", ""),
        "repo":             data.get("repo", ""),
        "pr_number":        data.get("pr_number", 0),
        "title":            data.get("title", ""),
        "merge_probability": data["prediction"]["merge_probability"],
        "verdict":          data["prediction"]["verdict"],
        "confidence":       data["prediction"]["confidence"],
        "llm_review":       review,
        "model_used":       "llama-3.3-70b-versatile",
        "provider":         "groq",
        "timestamp":        datetime.now().isoformat(),
    }

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(json_result, f, indent=2, ensure_ascii=False)

    # ── Console output ──
    print(report)
    print(f"\n[SAVED] Results written to:")
    print(f"  Text : {OUTPUT_TXT}")
    print(f"  JSON : {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
