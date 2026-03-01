"""
fetch_prs.py — Collect Pull Requests from GitHub repos with rich metrics.
Fetches PR details, file changes, reviews, and performs lightweight diff analysis.
Saves structured metadata to pr_data.csv.
Loads GITHUB_TOKEN from .env file in the same directory if not in environment.
"""

import os
import csv
import time
import requests
from pathlib import Path
from datetime import datetime, timezone

# ── Configuration ─────────────────────────────────────────────────────────────
MAX_PRS        = 400          # PRs to collect per repo
OUTPUT_FILE    = "pr_data.csv"
REQUEST_DELAY  = 0.3          # seconds between API calls
BASE_DIR       = Path(__file__).parent

# Repos to collect. Each entry: (owner, repo)
# 400 PRs per repo = 1200 total
REPOS = [
    ("microsoft",  "vscode"),
    ("facebook",   "react"),
    ("tensorflow", "tensorflow"),
]

# Patterns that indicate a test file
TEST_PATTERNS = ["test", "spec", "__test__", "_test", ".test."]

FIELDS = [
    "id", "number", "state", "merged",
    # ── Lines of code ──
    "additions", "deletions", "changed_files",
    "total_changes", "net_line_change",
    # ── Complexity proxies ──
    "commits", "avg_changes_per_file", "max_file_changes",
    # ── Test coverage proxies ──
    "test_files_changed", "test_change_ratio",
    # ── Diff-based structural features ──
    "control_statements_count", "function_definitions_count",
    "class_definitions_count", "todo_count",
    "structural_change_score",
    # ── Keyword-based risk signals ──
    "contains_refactor", "contains_rewrite", "contains_breaking",
    "contains_deprecated", "contains_fix", "contains_bug",
    # ── Branch staleness ──
    "created_at", "closed_at", "pr_age_hours",
    # ── Reviewer history / workload ──
    "comments", "review_comments",
    "num_reviewers", "approvals",
    # ── Metadata ──
    "title", "body",
    "description_length", "title_length",
    "repo",
]

# ── Load token (env var first, then .env file) ────────────────────────────────
def _load_token() -> str | None:
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        return token.strip()
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("GITHUB_TOKEN"):
                _, _, value = line.partition("=")
                value = value.strip().strip('"').strip("'")
                if value:
                    print("[INFO] Loaded GITHUB_TOKEN from .env file.")
                    return value
    return None

TOKEN = _load_token()
if not TOKEN:
    print("[WARNING] GITHUB_TOKEN not found. Rate limit: 60 req/hr.")
    print("[WARNING] Add GITHUB_TOKEN=<your_pat> to environment variables.")

HEADERS = {
    "Accept": "application/vnd.github+json",
    "Authorization": f"Bearer {TOKEN}",
}


# ── Helpers ───────────────────────────────────────────────────────────────────
def _check_rate_limit(resp: requests.Response) -> None:
    """Proactively sleep when fewer than 20 requests remain in the window."""
    remaining = int(resp.headers.get("X-RateLimit-Remaining", 999))
    reset_ts  = int(resp.headers.get("X-RateLimit-Reset", time.time()))
    if 0 < remaining <= 20:
        wait = max(reset_ts - int(time.time()), 1)
        print(f"[WARN] Only {remaining} API calls left. Sleeping {wait}s for reset …")
        time.sleep(wait)


def _get(url: str, params: dict | None = None, retries: int = 4) -> requests.Response | None:
    """GET with retry for 5xx and rate-limit 403."""
    for attempt in range(1, retries + 1):
        try:
            resp = requests.get(url, headers=HEADERS, params=params, timeout=30)
        except requests.RequestException as exc:
            print(f"[ERROR] Network error (attempt {attempt}/{retries}): {exc}")
            time.sleep(5 * attempt)
            continue

        if resp.status_code == 200:
            _check_rate_limit(resp)
            return resp

        if resp.status_code == 403:
            reset_ts = int(resp.headers.get("X-RateLimit-Reset", time.time() + 60))
            wait = max(reset_ts - int(time.time()), 5)
            print(f"[WARN] Rate limit hit. Sleeping {wait}s … (attempt {attempt}/{retries})")
            time.sleep(wait)
            continue

        if resp.status_code in (500, 502, 503, 504):
            wait = 5 * attempt
            print(f"[WARN] HTTP {resp.status_code} on {url}. Retry in {wait}s … ({attempt}/{retries})")
            time.sleep(wait)
            continue

        print(f"[ERROR] HTTP {resp.status_code} on {url}: {resp.text[:120]}")
        return None   # non-retryable

    print(f"[ERROR] All {retries} attempts failed for {url}. Skipping.")
    return None


# ── API fetch functions ───────────────────────────────────────────────────────
def fetch_pr_list(owner: str, repo: str) -> list[dict]:
    """Paginate /pulls?state=all and return PR stub dicts."""
    base_url  = f"https://api.github.com/repos/{owner}/{repo}/pulls"
    collected: list[dict] = []
    page = 1

    while len(collected) < MAX_PRS:
        per_page = min(100, MAX_PRS - len(collected))
        params   = {"state": "all", "per_page": per_page, "page": page}
        print(f"[INFO] [{owner}/{repo}] Fetching list page {page} ({per_page} PRs) …")

        resp = _get(base_url, params=params)
        if resp is None:
            break

        page_data = resp.json()
        if not page_data:
            print(f"[INFO] [{owner}/{repo}] No more PRs available.")
            break

        collected.extend(page_data[:MAX_PRS - len(collected)])
        print(f"[INFO] [{owner}/{repo}] Listed {len(collected)}/{MAX_PRS} PRs.")
        page += 1

    return collected


def fetch_pr_detail(owner: str, repo: str, number: int) -> dict | None:
    """Fetch individual PR detail (additions, deletions, commits, etc.)."""
    url  = f"https://api.github.com/repos/{owner}/{repo}/pulls/{number}"
    resp = _get(url)
    return resp.json() if resp else None


def fetch_pr_files(owner: str, repo: str, number: int) -> list[dict]:
    """Fetch list of files changed in a PR (for test coverage & complexity)."""
    url  = f"https://api.github.com/repos/{owner}/{repo}/pulls/{number}/files"
    resp = _get(url, params={"per_page": 100})
    return resp.json() if resp else []


def fetch_pr_reviews(owner: str, repo: str, number: int) -> list[dict]:
    """Fetch reviews for a PR (for reviewer history & workload)."""
    url  = f"https://api.github.com/repos/{owner}/{repo}/pulls/{number}/reviews"
    resp = _get(url, params={"per_page": 100})
    return resp.json() if resp else []


# ── Data processing ───────────────────────────────────────────────────────────
def _compute_pr_age_hours(created_at: str, closed_at: str | None) -> float:
    """Compute how many hours a PR has been open (branch staleness)."""
    if not created_at:
        return 0.0
    created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    if closed_at:
        end = datetime.fromisoformat(closed_at.replace("Z", "+00:00"))
    else:
        end = datetime.now(timezone.utc)
    return round((end - created).total_seconds() / 3600, 2)


def _is_test_file(filename: str) -> bool:
    """Check if a filename looks like a test file."""
    name_lower = filename.lower()
    return any(p in name_lower for p in TEST_PATTERNS)


# ── Diff-based structural analysis ──────────────────────────────────────────────

CONTROL_KEYWORDS  = ["if ", "for ", "while ", "switch ", "case "]
FUNCTION_KEYWORDS = ["function ", "def ", "=>"]
CLASS_KEYWORDS    = ["class "]
TODO_KEYWORDS     = ["TODO", "FIXME"]

RISK_KEYWORDS = [
    "refactor", "rewrite", "breaking",
    "deprecated", "fix", "bug",
]


def analyze_patches(pr_files: list[dict]) -> dict:
    """
    Lightweight structural analysis of PR diff patches.
    Counts control statements, function/class definitions, and TODOs
    from the patch text of each file. No AST parsing needed.
    """
    control = 0
    functions = 0
    classes = 0
    todos = 0

    for f in pr_files:
        patch = f.get("patch") or ""
        if not patch:
            continue
        for kw in CONTROL_KEYWORDS:
            control += patch.count(kw)
        for kw in FUNCTION_KEYWORDS:
            functions += patch.count(kw)
        for kw in CLASS_KEYWORDS:
            classes += patch.count(kw)
        for kw in TODO_KEYWORDS:
            todos += patch.count(kw)

    return {
        "control_statements_count":    control,
        "function_definitions_count":  functions,
        "class_definitions_count":     classes,
        "todo_count":                  todos,
    }


def extract_keyword_signals(title: str, body: str) -> dict:
    """
    Binary risk signals from PR title + body.
    Returns 0/1 for each keyword presence.
    """
    text = f"{title} {body}".lower()
    return {f"contains_{kw}": int(kw in text) for kw in RISK_KEYWORDS}


def process_pr(pr_detail: dict, pr_files: list[dict],
               pr_reviews: list[dict], owner: str, repo: str) -> dict:
    """Extract and derive all required fields from PR detail, files, and reviews."""
    title = pr_detail.get("title") or ""
    body  = pr_detail.get("body")  or ""

    # ── Lines of code ──
    additions     = pr_detail.get("additions", 0)
    deletions     = pr_detail.get("deletions", 0)
    changed_files = pr_detail.get("changed_files", 0)
    total_changes = additions + deletions
    net_line_change = additions - deletions

    # ── Cyclomatic complexity proxies ──
    avg_changes_per_file = round(total_changes / max(changed_files, 1), 2)
    max_file_changes = max(
        (f.get("changes", 0) for f in pr_files), default=0
    )

    # ── Test coverage proxies ──
    test_files = [f for f in pr_files if _is_test_file(f.get("filename", ""))]
    test_files_changed = len(test_files)
    test_lines = sum(f.get("changes", 0) for f in test_files)
    test_change_ratio = round(test_lines / max(total_changes, 1), 4)

    # ── Branch staleness ──
    created_at = pr_detail.get("created_at", "")
    closed_at  = pr_detail.get("closed_at")
    pr_age_hours = _compute_pr_age_hours(created_at, closed_at)

    # ── Reviewer history / workload ──
    unique_reviewers = set()
    approvals = 0
    for review in pr_reviews:
        user = review.get("user") or {}
        login = user.get("login", "")
        if login:
            unique_reviewers.add(login)
        if review.get("state") == "APPROVED":
            approvals += 1
    num_reviewers = len(unique_reviewers)

    # ── Diff-based structural features ──
    patch_stats = analyze_patches(pr_files)
    control  = patch_stats["control_statements_count"]
    funcs    = patch_stats["function_definitions_count"]
    classes  = patch_stats["class_definitions_count"]
    structural_change_score = control + (funcs * 2) + (classes * 3)

    # ── Keyword-based risk signals ──
    keyword_signals = extract_keyword_signals(title, body)

    return {
        "id":                   pr_detail.get("id"),
        "number":               pr_detail.get("number"),
        "state":                pr_detail.get("state"),
        "merged":               1 if pr_detail.get("merged_at") else 0,
        # Lines of code
        "additions":            additions,
        "deletions":            deletions,
        "changed_files":        changed_files,
        "total_changes":        total_changes,
        "net_line_change":      net_line_change,
        # Complexity proxies
        "commits":              pr_detail.get("commits", 0),
        "avg_changes_per_file": avg_changes_per_file,
        "max_file_changes":     max_file_changes,
        # Test coverage proxies
        "test_files_changed":   test_files_changed,
        "test_change_ratio":    test_change_ratio,
        # Diff structural
        **patch_stats,
        "structural_change_score": structural_change_score,
        # Keyword risk signals
        **keyword_signals,
        # Branch staleness
        "created_at":           created_at,
        "closed_at":            closed_at,
        "pr_age_hours":         pr_age_hours,
        # Reviewer history / workload
        "comments":             pr_detail.get("comments", 0),
        "review_comments":      pr_detail.get("review_comments", 0),
        "num_reviewers":        num_reviewers,
        "approvals":            approvals,
        # Metadata
        "title":                title,
        "body":                 body,
        "description_length":   len(body),
        "title_length":         len(title),
        "repo":                 f"{owner}/{repo}",
    }


def save_to_csv(rows: list[dict], path: Path) -> None:
    """Write processed PR rows to a UTF-8 CSV file (overwrites)."""
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"[INFO] Saved {len(rows)} PRs → '{path}'.")


# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> None:
    out_path = BASE_DIR / OUTPUT_FILE
    all_processed: list[dict] = []

    for owner, repo in REPOS:
        print(f"\n{'='*60}")
        print(f"  Fetching PRs from {owner}/{repo}")
        print(f"{'='*60}")

        # Step 1: Get PR list (lightweight — just stubs)
        stubs = fetch_pr_list(owner, repo)
        print(f"[INFO] Got {len(stubs)} PR stubs. Now fetching details …")

        # Step 2: For each PR, fetch detail + files + reviews
        for i, stub in enumerate(stubs):
            number = stub["number"]
            print(f"[{i+1}/{len(stubs)}] PR #{number} — fetching detail + files + reviews …")

            detail  = fetch_pr_detail(owner, repo, number)
            if detail is None:
                print(f"  ⚠ Skipping PR #{number} (detail fetch failed)")
                continue

            files   = fetch_pr_files(owner, repo, number)
            reviews = fetch_pr_reviews(owner, repo, number)

            processed = process_pr(detail, files, reviews, owner, repo)
            all_processed.append(processed)

            time.sleep(REQUEST_DELAY)

            # Progress every 50 PRs
            if (i + 1) % 50 == 0:
                print(f"[INFO] Progress: {i+1}/{len(stubs)} PRs processed.")

    # Step 3: Save everything
    save_to_csv(all_processed, out_path)
    print(f"\n[DONE] {len(all_processed)} PRs written to {OUTPUT_FILE}.")

    # Quick stats
    merged = sum(1 for r in all_processed if r["merged"] == 1)
    print(f"[STATS] Merged: {merged} | Not merged: {len(all_processed) - merged}")
    print(f"[STATS] Merge rate: {merged/max(len(all_processed),1):.1%}")


if __name__ == "__main__":
    main()
