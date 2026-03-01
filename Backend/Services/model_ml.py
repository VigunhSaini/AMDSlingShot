"""
model_ml.py - PR Merge Probability Predictor (Dual-Model Architecture)

Trains TWO separate RandomForestClassifiers:
    1. CODE MODEL (65% weight) - Analyzes code quality, complexity, and structure
    2. METADATA MODEL (35% weight) - Analyzes PR hygiene, engagement, and communication

The final prediction combines both models using weighted average.
This architecture prevents metadata (like description length) from overshadowing
actual code analysis signals.

Code Model Features:
    - Lines of code: total_changes, net_line_change
    - Test coverage: test_files_changed, test_change_ratio
    - Complexity: avg_changes_per_file, max_file_changes
    - Diff structural: control/function/class counts, structural_change_score
    - Code metrics: commits, changed_files, todo_count

Metadata Model Features:
    - PR description: description_length, title_length
    - Keyword signals: refactor, rewrite, breaking, deprecated, fix, bug
    - Engagement: review_engagement (comments + review comments)
"""

import sys
import io

# Fix Windows console encoding for Unicode characters
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, classification_report,
    confusion_matrix, precision_recall_fscore_support,
)

BASE_DIR = Path(__file__).parent


# ─────────────────────────────────────────────
# 1. DATA LOADING
# ─────────────────────────────────────────────

def load_data(csv_path: str) -> pd.DataFrame:
    """Load PR data from CSV."""
    full_path = BASE_DIR / csv_path
    print(f"[INFO] Loading PR data from {full_path}")
    df = pd.read_csv(full_path, low_memory=False)
    print(f"[INFO] Dataset shape: {df.shape}")
    print(f"[INFO] Merge rate: {df['merged'].mean():.1%}")
    return df


# ─────────────────────────────────────────────
# 2. FEATURE ENGINEERING
# ─────────────────────────────────────────────

RISK_KEYWORDS = ["refactor", "rewrite", "breaking", "deprecated", "fix", "bug"]


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transform raw PR columns into ML-ready features.

    Features cover 7 analysis dimensions:
        1. Lines of code        – total_changes, net_line_change
        2. Test coverage        – test_files_changed, test_change_ratio
        3. Complexity proxies   – avg_changes_per_file, max_file_changes
        4. Diff structural      – control/function/class counts, structural_change_score
        5. Keyword risk signals – 6 binary flags from title + body
        6. Engagement           – review_engagement
        7. Metadata             – description_length, title_length, commits, changed_files
    """
    df = df.copy()

    # Ensure computed columns exist (in case CSV was generated earlier)
    if "total_changes" not in df.columns:
        df["total_changes"] = df["additions"] + df["deletions"]
    if "net_line_change" not in df.columns:
        df["net_line_change"] = df["additions"] - df["deletions"]
    if "description_length" not in df.columns:
        df["description_length"] = df["body"].fillna("").apply(len)
    if "title_length" not in df.columns:
        df["title_length"] = df["title"].fillna("").apply(len)

    # Reviewer engagement (derived)
    df["review_engagement"] = df["review_comments"].fillna(0) + df["comments"].fillna(0)

    # Keyword risk signals - compute from title + body if not in CSV
    for kw in RISK_KEYWORDS:
        col = f"contains_{kw}"
        if col not in df.columns:
            text = (df["title"].fillna("") + " " + df["body"].fillna("")).str.lower()
            df[col] = text.str.contains(kw, na=False).astype(int)

    # Fill any missing new columns with 0
    for col in ["test_files_changed", "test_change_ratio",
                "avg_changes_per_file", "max_file_changes",
                "control_statements_count", "function_definitions_count",
                "class_definitions_count", "todo_count",
                "structural_change_score"]:
        if col not in df.columns:
            df[col] = 0

    print(f"[INFO] Feature engineering complete – {len(df)} rows, {len(FEATURE_COLS)} features")
    return df


# ─────────────────────────────────────────────
# DUAL-MODEL FEATURE SETS
# ─────────────────────────────────────────────

# CODE MODEL: Focuses on actual code changes and structure (65% weight)
CODE_FEATURES = [
    # Lines of code
    "total_changes",
    "net_line_change",
    # Test coverage
    "test_files_changed",
    "test_change_ratio",
    # Complexity proxies
    "avg_changes_per_file",
    "max_file_changes",
    # Diff-based structural features
    "control_statements_count",
    "function_definitions_count",
    "class_definitions_count",
    "todo_count",
    "structural_change_score",
    # Code-related metadata
    "commits",
    "changed_files",
]

# METADATA MODEL: Focuses on PR hygiene and communication (35% weight)
METADATA_FEATURES = [
    # PR description quality
    "description_length",
    "title_length",
    # Keyword risk signals
    "contains_refactor",
    "contains_rewrite",
    "contains_breaking",
    "contains_deprecated",
    "contains_fix",
    "contains_bug",
    # Engagement
    "review_engagement",
]

# Combined for backward compatibility
FEATURE_COLS = CODE_FEATURES + METADATA_FEATURES

# Model combination weights
CODE_WEIGHT = 0.65
METADATA_WEIGHT = 0.35


# ─────────────────────────────────────────────
# 3. DATA PREPROCESSING
# ─────────────────────────────────────────────

def preprocess(df: pd.DataFrame, feature_cols: list[str]):
    """Split into train/test for a given feature set, return X/y splits."""
    X = df[feature_cols].fillna(0).astype(float)
    y = df["merged"].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )

    print(f"[INFO] Train size: {len(X_train)} | Test size: {len(X_test)}")
    print(f"[INFO] Train merge rate: {y_train.mean():.1%} | Test merge rate: {y_test.mean():.1%}")

    return X_train, X_test, y_train, y_test, list(X.columns)


def preprocess_dual(df: pd.DataFrame):
    """
    Preprocess for dual-model architecture.
    Returns separate train/test splits for CODE and METADATA models.
    """
    y = df["merged"].astype(int)
    
    # Use same train/test indices for both models (important for fair comparison)
    from sklearn.model_selection import train_test_split
    indices = np.arange(len(df))
    train_idx, test_idx = train_test_split(
        indices, test_size=0.25, random_state=42, stratify=y
    )
    
    # Code features
    X_code = df[CODE_FEATURES].fillna(0).astype(float)
    X_code_train, X_code_test = X_code.iloc[train_idx], X_code.iloc[test_idx]
    
    # Metadata features
    X_meta = df[METADATA_FEATURES].fillna(0).astype(float)
    X_meta_train, X_meta_test = X_meta.iloc[train_idx], X_meta.iloc[test_idx]
    
    y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
    
    print(f"[INFO] Train size: {len(train_idx)} | Test size: {len(test_idx)}")
    print(f"[INFO] Code features: {len(CODE_FEATURES)} | Metadata features: {len(METADATA_FEATURES)}")
    print(f"[INFO] Train merge rate: {y_train.mean():.1%} | Test merge rate: {y_test.mean():.1%}")
    
    return {
        "code": (X_code_train, X_code_test),
        "metadata": (X_meta_train, X_meta_test),
        "y": (y_train, y_test),
    }


# ─────────────────────────────────────────────
# 4. MODEL TRAINING
# ─────────────────────────────────────────────

def train_model(X_train: pd.DataFrame, y_train: pd.Series, model_name: str = "model") -> RandomForestClassifier:
    """
    Train a RandomForestClassifier with moderate regularisation.
    More data (800+ PRs) is the best way to reduce the train-test gap.
    """
    model = RandomForestClassifier(
        n_estimators=300,        # More trees → better averaging
        max_depth=5,             # Shallower to reduce gap
        min_samples_split=15,    # Require enough samples to split
        min_samples_leaf=8,      # Larger leaves → less memorisation
        max_features="sqrt",     # Each tree sees √n features
        class_weight="balanced", # Handle imbalanced merge ratio
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    print(f"[INFO] {model_name} training complete.")
    return model


def train_dual_models(data: dict) -> tuple[RandomForestClassifier, RandomForestClassifier]:
    """
    Train both CODE and METADATA models.
    
    Returns:
        (code_model, metadata_model)
    """
    X_code_train, _ = data["code"]
    X_meta_train, _ = data["metadata"]
    y_train, _ = data["y"]
    
    print("\n" + "─" * 50)
    print("💻  TRAINING CODE MODEL (65% weight)")
    print("─" * 50)
    code_model = train_model(X_code_train, y_train, "Code Model")
    
    print("\n" + "─" * 50)
    print("📝  TRAINING METADATA MODEL (35% weight)")
    print("─" * 50)
    meta_model = train_model(X_meta_train, y_train, "Metadata Model")
    
    return code_model, meta_model


# ─────────────────────────────────────────────
# 5. EVALUATION
# ─────────────────────────────────────────────

# Human-readable descriptions for each feature
FEATURE_DESCRIPTIONS = {
    # Lines of code
    "total_changes":                "Total lines changed (additions + deletions)",
    "net_line_change":              "Net line difference (additions − deletions)",
    # Test coverage
    "test_files_changed":           "Number of test files modified",
    "test_change_ratio":            "Ratio of test-file changes to total changes",
    # Complexity proxies
    "avg_changes_per_file":         "Average lines changed per file (complexity proxy)",
    "max_file_changes":             "Largest single-file change (complexity hotspot)",
    # Diff structural
    "control_statements_count":     "Control flow statements in diff (if/for/while/switch)",
    "function_definitions_count":   "Function definitions in diff (def/function/=>)",
    "class_definitions_count":      "Class definitions in diff",
    "todo_count":                   "TODO/FIXME comments in diff",
    "structural_change_score":      "Weighted structural complexity (ctrl + fn*2 + cls*3)",
    # Keyword risk signals
    "contains_refactor":            "PR mentions 'refactor'",
    "contains_rewrite":             "PR mentions 'rewrite'",
    "contains_breaking":            "PR mentions 'breaking'",
    "contains_deprecated":          "PR mentions 'deprecated'",
    "contains_fix":                 "PR mentions 'fix'",
    "contains_bug":                 "PR mentions 'bug'",
    # Engagement
    "review_engagement":            "Total comments (review + general)",
    # Metadata
    "commits":                      "Number of commits in the PR",
    "changed_files":                "Number of files modified",
    "description_length":           "Length of the PR description (body text)",
    "title_length":                 "Length of the PR title",
}


def evaluate_model(
    model: RandomForestClassifier,
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    y_train: pd.Series,
    y_test: pd.Series,
    feature_names: list[str],
) -> None:
    """Print a comprehensive, human-readable evaluation report."""

    y_pred_train = model.predict(X_train)
    y_pred_test  = model.predict(X_test)

    train_acc = accuracy_score(y_train, y_pred_train)
    test_acc  = accuracy_score(y_test, y_pred_test)
    gap       = train_acc - test_acc

    prec, rec, f1, _ = precision_recall_fscore_support(
        y_test, y_pred_test, pos_label=1, average="binary"
    )
    cm = confusion_matrix(y_test, y_pred_test)
    tn, fp, fn, tp = cm.ravel()

    W = 62
    print("\n" + "═" * W)
    print("  📊  MODEL EVALUATION REPORT")
    print("═" * W)

    # ── Data summary ──
    print("\n  ┌─ DATA SUMMARY ─────────────────────────────────────┐")
    print(f"  │  Training samples   : {len(X_train):>6}  (75% of data)       │")
    print(f"  │  Testing samples    : {len(X_test):>6}  (25% of data)       │")
    print(f"  │  Total PRs used     : {len(X_train)+len(X_test):>6}                       │")
    print(f"  │  Features used      : {len(feature_names):>6}                       │")
    print(  "  └─────────────────────────────────────────────────────┘")

    # ── Accuracy ──
    print("\n  ┌─ ACCURACY ────────────────────────────────────────┐")
    print(f"  │  Train Accuracy : {train_acc:.2%}                            │")
    print(f"  │  Test  Accuracy : {test_acc:.2%}                            │")
    print(f"  │  Gap            : {gap:.2%}                             │")
    if gap > 0.10:
        print("  |  OVERFITTING - model memorised training data.     |")
        print("  │     It performs much worse on unseen PRs.           │")
    elif gap > 0.05:
        print("  |  MILD OVERFITTING - mostly fine, minor gap.       |")
    else:
        print("  |  HEALTHY - model generalises well to new PRs.     |")
    print(  "  └─────────────────────────────────────────────────────┘")
    print(f"\n  💡 What this means: Out of every 100 unseen PRs, the")
    print(f"     model correctly predicts ~{test_acc*100:.0f} of them.")

    # ── Confusion Matrix ──
    print("\n  ┌─ CONFUSION MATRIX (Test Set) ─────────────────────┐")
    print(f"  │                     Predicted:                      │")
    print(f"  │                 Not Merged    Merged                │")
    print(f"  │  Actual:                                            │")
    print(f"  │    Not Merged    {tn:>5}        {fp:>5}                 │")
    print(f"  │    Merged        {fn:>5}        {tp:>5}                 │")
    print(  "  └─────────────────────────────────────────────────────┘")
    print(f"\n  💡 Reading the matrix:")
    print(f"     ✅ {tn} PRs correctly predicted as NOT merged")
    print(f"     ✅ {tp} PRs correctly predicted as merged")
    print(f"     ❌ {fp} PRs wrongly predicted as merged (false alarm)")
    print(f"     ❌ {fn} merged PRs the model missed")

    # ── Key Metrics ──
    print("\n  ┌─ KEY METRICS (for 'Merged' class) ────────────────┐")
    print(f"  │  Precision : {prec:.2%}                                 │")
    print(f"  │  Recall    : {rec:.2%}                                 │")
    print(f"  │  F1 Score  : {f1:.2%}                                 │")
    print(  "  └─────────────────────────────────────────────────────┘")
    print(f"\n  💡 What these mean:")
    print(f"     • Precision ({prec:.0%}): When the model says 'will merge',")
    print(f"       it's right {prec:.0%} of the time.")
    print(f"     • Recall ({rec:.0%}): Of all PRs that actually merged,")
    print(f"       the model caught {rec:.0%} of them.")
    print(f"     • F1 ({f1:.0%}): The balanced average of precision & recall.")

    # ── Feature Importances ──
    importances = pd.Series(model.feature_importances_, index=feature_names)
    importances_sorted = importances.sort_values(ascending=False)

    print("\n  ┌─ FEATURE IMPORTANCES ──────────────────────────────┐")
    print(  "  │  How much each feature influences the prediction:   │")
    print(  "  └─────────────────────────────────────────────────────┘")
    for rank, (feat, imp) in enumerate(importances_sorted.items(), 1):
        bar = "█" * int(imp * 40)
        desc = FEATURE_DESCRIPTIONS.get(feat, "")
        pct = imp * 100
        print(f"    {rank}. {feat:<22} {pct:5.1f}%  {bar}")
        if desc:
            print(f"       ↳ {desc}")

    # ── Full Classification Report ──
    print("\n  ┌─ DETAILED CLASSIFICATION REPORT ──────────────────┐")
    print(classification_report(y_test, y_pred_test,
                                target_names=["Not Merged", "Merged"]))
    print("  └─────────────────────────────────────────────────────┘")


# ─────────────────────────────────────────────
# 6. INFERENCE (DUAL-MODEL)
# ─────────────────────────────────────────────

# Module-level globals populated by `build_pipeline()`
_code_model: RandomForestClassifier | None = None
_meta_model: RandomForestClassifier | None = None


def predict_pr_merge_probability(pr_dict: dict) -> dict:
    """
    Predict the merge probability for a single PR using DUAL-MODEL architecture.

    Args:
        pr_dict: Dictionary containing PR fields:
            - additions, deletions, changed_files, commits
            - review_comments, comments
            - title, body
            - test_files_changed, test_change_ratio
            - max_file_changes
            - control_statements_count, function_definitions_count
            - class_definitions_count, todo_count

    Returns:
        {
            "merge_probability": float,      # Combined weighted score
            "code_score": float,             # Code model score (65% weight)
            "metadata_score": float,         # Metadata model score (35% weight)
            "prediction": str,
            "top_code_features": list[dict],
            "top_metadata_features": list[dict],
        }
    """
    if _code_model is None or _meta_model is None:
        raise RuntimeError("Models not trained. Call build_pipeline() first.")

    # Build features from the incoming dict
    additions       = pr_dict.get("additions", 0) or 0
    deletions       = pr_dict.get("deletions", 0) or 0
    total_changes   = additions + deletions
    changed_files   = pr_dict.get("changed_files", 0) or 0
    body            = pr_dict.get("body") or ""
    title           = pr_dict.get("title") or ""

    # Keyword risk signals from title + body
    text_lower = f"{title} {body}".lower()

    # Diff structural values (passed in or default 0)
    ctrl   = pr_dict.get("control_statements_count", 0) or 0
    funcs  = pr_dict.get("function_definitions_count", 0) or 0
    cls    = pr_dict.get("class_definitions_count", 0) or 0

    # CODE FEATURES
    code_features = {
        "total_changes":                total_changes,
        "net_line_change":              additions - deletions,
        "test_files_changed":           pr_dict.get("test_files_changed", 0) or 0,
        "test_change_ratio":            pr_dict.get("test_change_ratio", 0.0) or 0.0,
        "avg_changes_per_file":         round(total_changes / max(changed_files, 1), 2),
        "max_file_changes":             pr_dict.get("max_file_changes", 0) or 0,
        "control_statements_count":     ctrl,
        "function_definitions_count":   funcs,
        "class_definitions_count":      cls,
        "todo_count":                   pr_dict.get("todo_count", 0) or 0,
        "structural_change_score":      ctrl + (funcs * 2) + (cls * 3),
        "commits":                      pr_dict.get("commits", 0) or 0,
        "changed_files":                changed_files,
    }

    # METADATA FEATURES
    metadata_features = {
        "description_length":           len(body),
        "title_length":                 len(title),
        "contains_refactor":            int("refactor" in text_lower),
        "contains_rewrite":             int("rewrite" in text_lower),
        "contains_breaking":            int("breaking" in text_lower),
        "contains_deprecated":          int("deprecated" in text_lower),
        "contains_fix":                 int("fix" in text_lower),
        "contains_bug":                 int("bug" in text_lower),
        "review_engagement":            (pr_dict.get("review_comments", 0) or 0)
                                        + (pr_dict.get("comments", 0) or 0),
    }

    # Get predictions from both models
    X_code = pd.DataFrame([code_features])[CODE_FEATURES]
    X_meta = pd.DataFrame([metadata_features])[METADATA_FEATURES]
    
    code_proba = _code_model.predict_proba(X_code)[0][1]
    meta_proba = _meta_model.predict_proba(X_meta)[0][1]
    
    # === FRESH PR ADJUSTMENT ===
    # New PRs with no engagement shouldn't be penalized as harshly
    # They haven't had time to accumulate comments/reviews yet
    review_engagement = metadata_features["review_engagement"]
    is_fresh_pr = review_engagement == 0
    
    if is_fresh_pr:
        # Boost metadata score for fresh PRs (no engagement yet)
        # The model was trained on PRs that had time to get reviews
        meta_proba = min(1.0, meta_proba + 0.20)
    
    # Apply a minimum floor to prevent overly pessimistic predictions
    # A well-structured PR with good code shouldn't score below 40%
    MIN_SCORE_FLOOR = 0.40
    code_proba = max(MIN_SCORE_FLOOR, code_proba)
    meta_proba = max(MIN_SCORE_FLOOR, meta_proba)
    
    # Weighted combination: 65% code + 35% metadata
    combined_proba = (CODE_WEIGHT * code_proba) + (METADATA_WEIGHT * meta_proba)
    
    # Apply sigmoid smoothing to avoid extreme predictions
    # This pulls extreme values (0.1 or 0.95) toward the middle
    def smooth_probability(p, strength=0.3):
        """Smooth extreme probabilities toward 0.5"""
        return p * (1 - strength) + 0.5 * strength
    
    combined_proba = smooth_probability(combined_proba, strength=0.15)

    # Top contributing features from CODE model
    code_importances = dict(zip(CODE_FEATURES, _code_model.feature_importances_))
    top_code_features = sorted(
        [{"feature": k, "importance": round(code_importances[k], 4), "value": round(v, 2)}
         for k, v in code_features.items()],
        key=lambda x: x["importance"],
        reverse=True,
    )[:5]

    # Top contributing features from METADATA model
    meta_importances = dict(zip(METADATA_FEATURES, _meta_model.feature_importances_))
    top_metadata_features = sorted(
        [{"feature": k, "importance": round(meta_importances[k], 4), "value": round(v, 2)}
         for k, v in metadata_features.items()],
        key=lambda x: x["importance"],
        reverse=True,
    )[:5]

    return {
        "merge_probability": round(float(combined_proba), 4),
        "code_score": round(float(code_proba), 4),
        "metadata_score": round(float(meta_proba), 4),
        "prediction": "Likely Merged" if combined_proba >= 0.5 else "Likely Not Merged",
        "is_fresh_pr": is_fresh_pr,  # Flag for new PRs with no engagement
        "top_code_features": top_code_features,
        "top_metadata_features": top_metadata_features,
        # For backward compatibility, combine top features
        "top_features": top_code_features[:3] + top_metadata_features[:2],
    }


# ─────────────────────────────────────────────
# 7. END-TO-END PIPELINE (DUAL-MODEL)
# ─────────────────────────────────────────────

def build_pipeline(
    csv_path: str = "pr_data.csv",
) -> tuple[RandomForestClassifier, RandomForestClassifier]:
    """
    End-to-end DUAL-MODEL pipeline:
        load CSV → engineer → preprocess → train TWO models → evaluate

    Architecture:
        - CODE MODEL (65% weight): Analyzes code complexity, structure, commits
        - METADATA MODEL (35% weight): Analyzes PR description, keywords, engagement

    Args:
        csv_path: filename of the CSV (expected in the same directory as this script)

    Returns:
        Tuple of (code_model, metadata_model) - also stored in module globals
    """
    global _code_model, _meta_model

    df = load_data(csv_path)
    df = engineer_features(df)
    
    # Preprocess for dual models
    data = preprocess_dual(df)
    
    # Train both models
    code_model, meta_model = train_dual_models(data)
    
    # Store in globals for inference
    _code_model = code_model
    _meta_model = meta_model
    
    # Evaluate both models
    X_code_train, X_code_test = data["code"]
    X_meta_train, X_meta_test = data["metadata"]
    y_train, y_test = data["y"]
    
    print("\n" + "\u2550" * 62)
    print("  💻  CODE MODEL EVALUATION")
    print("\u2550" * 62)
    evaluate_model(code_model, X_code_train, X_code_test, y_train, y_test, CODE_FEATURES)
    
    print("\n" + "\u2550" * 62)
    print("  📝  METADATA MODEL EVALUATION")
    print("\u2550" * 62)
    evaluate_model(meta_model, X_meta_train, X_meta_test, y_train, y_test, METADATA_FEATURES)
    
    # Print weight summary
    print("\n" + "\u2550" * 62)
    print("  ⚖️   DUAL-MODEL WEIGHT SUMMARY")
    print("\u2550" * 62)
    print(f"  ┌─ COMBINATION WEIGHTS ───────────────────────────────┐")
    print(f"  │  Code Model     : {CODE_WEIGHT:.0%}  (code analysis priority)     │")
    print(f"  │  Metadata Model : {METADATA_WEIGHT:.0%}  (PR hygiene)                  │")
    print(f"  └─────────────────────────────────────────────────────┘")
    print(f"\n  💡 Final Score = ({CODE_WEIGHT:.0%} × Code Score) + ({METADATA_WEIGHT:.0%} × Metadata Score)")
    print(f"     This ensures code quality has more influence than description length.")

    return code_model, meta_model




# ─────────────────────────────────────────────
# MAIN - Demo Run
# ─────────────────────────────────────────────

if __name__ == "__main__":
    # ── Build the pipeline ───────────────────────────────
    # Loads PR data from pr_data.csv (generated by fetch_prs.py)
    build_pipeline(csv_path="pr_data.csv")

    # ── Demo Inference ───────────────────────────────────
    sample_pr = {
        "additions":                    85,
        "deletions":                    20,
        "changed_files":                4,
        "commits":                      3,
        "review_comments":              3,
        "comments":                     5,
        "title":                        "Fix critical auth bug in login flow",
        "body":                         "Closes #1234. Resolves the authentication failure reported in prod.",
        "test_files_changed":           1,
        "test_change_ratio":            0.15,
        "max_file_changes":             50,
        # Diff structural
        "control_statements_count":     8,
        "function_definitions_count":   2,
        "class_definitions_count":      0,
        "todo_count":                   0,
    }

    result = predict_pr_merge_probability(sample_pr)
    prob = result["merge_probability"]
    code_score = result["code_score"]
    meta_score = result["metadata_score"]

    # Confidence level label
    if prob >= 0.85:
        confidence = "🟢 Very High"
    elif prob >= 0.65:
        confidence = "🟡 Moderate"
    elif prob >= 0.45:
        confidence = "🟠 Borderline"
    else:
        confidence = "🔴 Low"

    W = 62
    print("\n" + "═" * W)
    print("  INFERENCE DEMO - Sample PR Analysis (DUAL-MODEL)")
    print("═" * W)

    print("\n  ┌─ INPUT PR ────────────────────────────────────────┐")
    print(f"  │  Title          : {sample_pr['title'][:36]:<36}│")
    print(f"  │  +{sample_pr['additions']} / -{sample_pr['deletions']} lines in {sample_pr['changed_files']} files, {sample_pr['commits']} commits     │")
    print(f"  │  Test files     : {sample_pr['test_files_changed']}   (ratio: {sample_pr['test_change_ratio']:.0%})              │")
    print(f"  │  Diff structure : {sample_pr['control_statements_count']} ctrl, {sample_pr['function_definitions_count']} func, {sample_pr['class_definitions_count']} class, {sample_pr['todo_count']} TODO   │")
    print(f"  │  Comments       : {sample_pr['comments']} general + {sample_pr['review_comments']} review            │")
    print(  "  └─────────────────────────────────────────────────────┘")

    # Score bars
    code_filled = int(code_score * 20)
    meta_filled = int(meta_score * 20)
    combined_filled = int(prob * 20)
    
    code_bar = "█" * code_filled + "░" * (20 - code_filled)
    meta_bar = "█" * meta_filled + "░" * (20 - meta_filled)
    combined_bar = "█" * combined_filled + "░" * (20 - combined_filled)

    print(f"\n  ┌─ DUAL-MODEL SCORES ───────────────────────────────┐")
    print(f"  │  💻 Code Score     : {code_score:.1%}  [{code_bar}]   │")
    print(f"  │  📝 Metadata Score : {meta_score:.1%}  [{meta_bar}]   │")
    print(f"  │  ─────────────────────────────────────────────────  │")
    print(f"  │  ⚖️  Combined       : {prob:.1%}  [{combined_bar}]   │")
    print(f"  │     ({CODE_WEIGHT:.0%} × Code) + ({METADATA_WEIGHT:.0%} × Metadata)                   │")
    print(  "  └─────────────────────────────────────────────────────┘")

    print(f"\n  ┌─ PREDICTION ──────────────────────────────────────┐")
    print(f"  │  Verdict    : {result['prediction']:<36}│")
    print(f"  │  Confidence : {confidence:<36}│")
    print(  "  └─────────────────────────────────────────────────────┘")

    # Top CODE features
    print(f"\n  ┌─ TOP CODE FACTORS (65% weight) ──────────────────┐")
    for feat in result["top_code_features"][:3]:
        desc = FEATURE_DESCRIPTIONS.get(feat["feature"], feat["feature"])
        print(f"  │  {desc}")
        print(f"  │     Value: {feat['value']:<10} Importance: {feat['importance']:.1%}")
    print(  "  └─────────────────────────────────────────────────────┘")

    # Top METADATA features
    print(f"\n  ┌─ TOP METADATA FACTORS (35% weight) ───────────────┐")
    for feat in result["top_metadata_features"][:3]:
        desc = FEATURE_DESCRIPTIONS.get(feat["feature"], feat["feature"])
        print(f"  │  {desc}")
        print(f"  │     Value: {feat['value']:<10} Importance: {feat['importance']:.1%}")
    print(  "  └─────────────────────────────────────────────────────┘")

    # Interpretation
    if prob >= 0.65:
        print("\n  💡 Interpretation:")
        print("     This PR has strong signals for being merged.")
        print(f"     Code quality ({code_score:.0%}) and metadata ({meta_score:.0%}) both contribute.")
    elif prob >= 0.45:
        print("\n  💡 Interpretation:")
        print("     This PR is on the fence.")
        if code_score < meta_score:
            print("     Consider improving code structure or breaking into smaller changes.")
        else:
            print("     Consider improving description or getting more review engagement.")
    else:
        print("\n  💡 Interpretation:")
        print("     This PR has weak merge signals.")
        if code_score < meta_score:
            print("     Focus on: code complexity, test coverage, and structural changes.")
        else:
            print("     Focus on: better description, keywords, and review engagement.")

    print("\n" + "═" * W)
