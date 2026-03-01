"""
update_csv_features.py - Add missing features to existing pr_data.csv

This script:
1. Adds keyword signals (contains_fix, contains_bug, etc.) from title+body
2. Adds placeholder structural features (zeros for now - require re-fetch with diffs)
3. Optionally re-fetches diffs for structural analysis (if --fetch-diffs is passed)

Usage:
    python update_csv_features.py              # Quick update (keyword signals only)
    python update_csv_features.py --fetch-diffs  # Full update (fetch diffs from GitHub)
"""

import os
import sys
import time
import requests
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).parent
CSV_PATH = BASE_DIR / "pr_data.csv"

# Risk keywords for binary signals
RISK_KEYWORDS = ["refactor", "rewrite", "breaking", "deprecated", "fix", "bug"]

# Structural analysis patterns
CONTROL_KEYWORDS  = ["if ", "if(", "for ", "for(", "while ", "while(", "switch ", "switch(", "case "]
FUNCTION_KEYWORDS = ["function ", "def ", "=> ", "func "]
CLASS_KEYWORDS    = ["class "]
TODO_KEYWORDS     = ["TODO", "FIXME", "HACK", "XXX"]


def load_token() -> str | None:
    """Load GitHub token from environment or .env file."""
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
                    return value
    return None


def analyze_patch(patch: str) -> dict:
    """Analyze a patch string for structural features."""
    if not patch:
        return {
            "control_statements_count": 0,
            "function_definitions_count": 0,
            "class_definitions_count": 0,
            "todo_count": 0,
        }
    
    control = sum(patch.count(kw) for kw in CONTROL_KEYWORDS)
    functions = sum(patch.count(kw) for kw in FUNCTION_KEYWORDS)
    classes = sum(patch.count(kw) for kw in CLASS_KEYWORDS)
    todos = sum(patch.count(kw) for kw in TODO_KEYWORDS)
    
    return {
        "control_statements_count": control,
        "function_definitions_count": functions,
        "class_definitions_count": classes,
        "todo_count": todos,
    }


def fetch_pr_files(owner: str, repo: str, number: int, headers: dict) -> list[dict]:
    """Fetch files for a PR from GitHub API."""
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{number}/files"
    try:
        resp = requests.get(url, headers=headers, params={"per_page": 100}, timeout=30)
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 403:
            # Rate limited
            reset_ts = int(resp.headers.get("X-RateLimit-Reset", time.time() + 60))
            wait = max(reset_ts - int(time.time()), 5)
            print(f"[RATE LIMIT] Sleeping {wait}s...")
            time.sleep(wait)
            return fetch_pr_files(owner, repo, number, headers)
        else:
            print(f"[WARN] HTTP {resp.status_code} for PR #{number}")
            return []
    except Exception as e:
        print(f"[ERROR] {e}")
        return []


def add_keyword_signals(df: pd.DataFrame) -> pd.DataFrame:
    """Add keyword signal columns from title + body."""
    print("[INFO] Adding keyword signals from title + body...")
    
    # Combine title + body for keyword search
    text = (df["title"].fillna("") + " " + df["body"].fillna("")).str.lower()
    
    for kw in RISK_KEYWORDS:
        col = f"contains_{kw}"
        if col not in df.columns:
            df[col] = text.str.contains(kw, na=False).astype(int)
            print(f"  + Added {col}: {df[col].sum()} PRs contain '{kw}'")
        else:
            print(f"  - {col} already exists")
    
    return df


def add_structural_placeholders(df: pd.DataFrame) -> pd.DataFrame:
    """Add placeholder structural columns (zeros)."""
    print("[INFO] Adding structural feature placeholders...")
    
    struct_cols = [
        "control_statements_count",
        "function_definitions_count", 
        "class_definitions_count",
        "todo_count",
        "structural_change_score",
    ]
    
    for col in struct_cols:
        if col not in df.columns:
            df[col] = 0
            print(f"  + Added {col} (placeholder)")
        else:
            print(f"  - {col} already exists")
    
    return df


def fetch_and_analyze_diffs(df: pd.DataFrame) -> pd.DataFrame:
    """Fetch diffs from GitHub and analyze for structural features."""
    token = load_token()
    if not token:
        print("[ERROR] GITHUB_TOKEN not found. Cannot fetch diffs.")
        print("[INFO] Add GITHUB_TOKEN=<your_pat> to Services/.env")
        return df
    
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
    }
    
    print(f"[INFO] Fetching diffs for {len(df)} PRs...")
    print("[INFO] This will take a while (respecting rate limits)...")
    
    # Initialize structural columns
    df["control_statements_count"] = 0
    df["function_definitions_count"] = 0
    df["class_definitions_count"] = 0
    df["todo_count"] = 0
    
    for idx, row in df.iterrows():
        repo = row["repo"]
        number = row["number"]
        owner, repo_name = repo.split("/")
        
        if (idx + 1) % 50 == 0:
            print(f"[INFO] Progress: {idx + 1}/{len(df)} PRs")
        
        files = fetch_pr_files(owner, repo_name, number, headers)
        
        total_control = 0
        total_funcs = 0
        total_classes = 0
        total_todos = 0
        
        for f in files:
            patch = f.get("patch") or ""
            stats = analyze_patch(patch)
            total_control += stats["control_statements_count"]
            total_funcs += stats["function_definitions_count"]
            total_classes += stats["class_definitions_count"]
            total_todos += stats["todo_count"]
        
        df.at[idx, "control_statements_count"] = total_control
        df.at[idx, "function_definitions_count"] = total_funcs
        df.at[idx, "class_definitions_count"] = total_classes
        df.at[idx, "todo_count"] = total_todos
        
        time.sleep(0.3)  # Rate limit protection
    
    # Compute structural change score
    df["structural_change_score"] = (
        df["control_statements_count"] + 
        (df["function_definitions_count"] * 2) + 
        (df["class_definitions_count"] * 3)
    )
    
    print("[INFO] Structural analysis complete!")
    print(f"  Control statements: mean={df['control_statements_count'].mean():.1f}")
    print(f"  Function defs: mean={df['function_definitions_count'].mean():.1f}")
    print(f"  Class defs: mean={df['class_definitions_count'].mean():.1f}")
    print(f"  TODOs: mean={df['todo_count'].mean():.1f}")
    
    return df


def main():
    fetch_diffs = "--fetch-diffs" in sys.argv
    
    print("=" * 60)
    print("  Updating pr_data.csv with missing features")
    print("=" * 60)
    
    # Load existing data
    df = pd.read_csv(CSV_PATH)
    print(f"[INFO] Loaded {len(df)} PRs from {CSV_PATH}")
    print(f"[INFO] Current columns: {len(df.columns)}")
    
    # Add keyword signals (always - computed from existing data)
    df = add_keyword_signals(df)
    
    # Add structural features
    if fetch_diffs:
        print("\n[INFO] --fetch-diffs flag detected. Fetching from GitHub...")
        df = fetch_and_analyze_diffs(df)
    else:
        print("\n[INFO] Using placeholder zeros for structural features.")
        print("[INFO] Run with --fetch-diffs to fetch actual diff analysis.")
        df = add_structural_placeholders(df)
    
    # Save updated CSV
    df.to_csv(CSV_PATH, index=False)
    print(f"\n[DONE] Updated CSV saved to {CSV_PATH}")
    print(f"[INFO] New columns: {len(df.columns)}")
    
    # Summary
    print("\n" + "=" * 60)
    print("  Summary")
    print("=" * 60)
    print(f"  PRs: {len(df)}")
    print(f"  Columns: {len(df.columns)}")
    
    # Check if structural features have data
    if df["control_statements_count"].sum() > 0:
        print("  Structural features: POPULATED")
    else:
        print("  Structural features: PLACEHOLDER (run with --fetch-diffs)")


if __name__ == "__main__":
    main()
