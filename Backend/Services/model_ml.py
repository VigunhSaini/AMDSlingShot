"""
model_ml.py — PR Merge Probability Predictor

Trains a RandomForestClassifier on PR metadata + diff analysis features
to predict whether a PR will be merged. Provides detailed evaluation
reports and inference capabilities.

Features cover 7 analysis dimensions:
    1. Lines of code        – total_changes, net_line_change
    2. Test coverage        – test_files_changed, test_change_ratio
    3. Complexity proxies   – avg_changes_per_file, max_file_changes
    4. Diff structural      – control/function/class counts, structural_change_score
    5. Keyword risk signals – 6 binary flags from title + body
    6. Engagement           – review_engagement
    7. Metadata             – description_length, title_length, commits, changed_files
"""

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

    # Keyword risk signals — compute from title + body if not in CSV
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


FEATURE_COLS = [
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
    # Keyword risk signals
    "contains_refactor",
    "contains_rewrite",
    "contains_breaking",
    "contains_deprecated",
    "contains_fix",
    "contains_bug",
    # Engagement
    "review_engagement",
    # Metadata
    "commits",
    "changed_files",
    "description_length",
    "title_length",
]


# ─────────────────────────────────────────────
# 3. DATA PREPROCESSING
# ─────────────────────────────────────────────

def preprocess(df: pd.DataFrame):
    """Split into train/test, return X/y splits and feature names."""
    X = df[FEATURE_COLS].fillna(0).astype(float)
    y = df["merged"].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )

    print(f"[INFO] Train size: {len(X_train)} | Test size: {len(X_test)}")
    print(f"[INFO] Train merge rate: {y_train.mean():.1%} | Test merge rate: {y_test.mean():.1%}")

    return X_train, X_test, y_train, y_test, list(X.columns)


# ─────────────────────────────────────────────
# 4. MODEL TRAINING
# ─────────────────────────────────────────────

def train_model(X_train: pd.DataFrame, y_train: pd.Series) -> RandomForestClassifier:
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
    print("[INFO] Model training complete.")
    return model


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
        print("  │  ⚠  OVERFITTING — model memorised training data.   │")
        print("  │     It performs much worse on unseen PRs.           │")
    elif gap > 0.05:
        print("  │  ⚡ MILD OVERFITTING — mostly fine, minor gap.      │")
    else:
        print("  │  ✅ HEALTHY — model generalises well to new PRs.    │")
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
# 6. INFERENCE
# ─────────────────────────────────────────────

# Module-level globals populated by `build_pipeline()`
_model: RandomForestClassifier | None = None
_feature_names: list[str] = []


def predict_pr_merge_probability(pr_dict: dict) -> dict:
    """
    Predict the merge probability for a single PR.

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
            "merge_probability": float,
            "prediction": str,
            "top_features": list[dict],
        }
    """
    if _model is None:
        raise RuntimeError("Model not trained. Call build_pipeline() first.")

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

    features = {
        # Lines of code
        "total_changes":                total_changes,
        "net_line_change":              additions - deletions,
        # Test coverage
        "test_files_changed":           pr_dict.get("test_files_changed", 0) or 0,
        "test_change_ratio":            pr_dict.get("test_change_ratio", 0.0) or 0.0,
        # Complexity proxies
        "avg_changes_per_file":         round(total_changes / max(changed_files, 1), 2),
        "max_file_changes":             pr_dict.get("max_file_changes", 0) or 0,
        # Diff structural
        "control_statements_count":     ctrl,
        "function_definitions_count":   funcs,
        "class_definitions_count":      cls,
        "todo_count":                   pr_dict.get("todo_count", 0) or 0,
        "structural_change_score":      ctrl + (funcs * 2) + (cls * 3),
        # Keyword risk signals
        "contains_refactor":            int("refactor" in text_lower),
        "contains_rewrite":             int("rewrite" in text_lower),
        "contains_breaking":            int("breaking" in text_lower),
        "contains_deprecated":          int("deprecated" in text_lower),
        "contains_fix":                 int("fix" in text_lower),
        "contains_bug":                 int("bug" in text_lower),
        # Engagement
        "review_engagement":            (pr_dict.get("review_comments", 0) or 0)
                                        + (pr_dict.get("comments", 0) or 0),
        # Metadata
        "commits":                      pr_dict.get("commits", 0) or 0,
        "changed_files":                changed_files,
        "description_length":           len(body),
        "title_length":                 len(title),
    }

    X_input = pd.DataFrame([features])[_feature_names]
    proba   = _model.predict_proba(X_input)[0][1]

    # Top contributing features
    importances = dict(zip(_feature_names, _model.feature_importances_))
    top_features = sorted(
        [{"feature": k, "importance": round(importances[k], 4), "value": round(v, 2)}
         for k, v in features.items()],
        key=lambda x: x["importance"],
        reverse=True,
    )[:5]  # top 5

    return {
        "merge_probability": round(float(proba), 4),
        "prediction": "Likely Merged" if proba >= 0.5 else "Likely Not Merged",
        "top_features": top_features,
    }


# ─────────────────────────────────────────────
# 7. END-TO-END PIPELINE
# ─────────────────────────────────────────────

def build_pipeline(
    csv_path: str = "pr_data.csv",
) -> RandomForestClassifier:
    """
    End-to-end pipeline: load CSV → engineer → preprocess → train → evaluate.

    Reads pre-collected PR data from the CSV produced by fetch_prs.py.

    Args:
        csv_path: filename of the CSV (expected in the same directory as this script)

    Returns:
        Trained RandomForestClassifier (also stored in module globals for inference)
    """
    global _model, _feature_names

    df = load_data(csv_path)
    df = engineer_features(df)
    X_train, X_test, y_train, y_test, feature_names = preprocess(df)
    model = train_model(X_train, y_train)

    _model = model
    _feature_names = feature_names

    evaluate_model(model, X_train, X_test, y_train, y_test, feature_names)

    return model




# ─────────────────────────────────────────────
# MAIN — Demo Run
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
    print("  🔮  INFERENCE DEMO — Sample PR Analysis")
    print("═" * W)

    print("\n  ┌─ INPUT PR ────────────────────────────────────────┐")
    print(f"  │  Title          : {sample_pr['title'][:36]:<36}│")
    print(f"  │  +{sample_pr['additions']} / -{sample_pr['deletions']} lines in {sample_pr['changed_files']} files, {sample_pr['commits']} commits     │")
    print(f"  │  Test files     : {sample_pr['test_files_changed']}   (ratio: {sample_pr['test_change_ratio']:.0%})              │")
    print(f"  │  Diff structure : {sample_pr['control_statements_count']} ctrl, {sample_pr['function_definitions_count']} func, {sample_pr['class_definitions_count']} class, {sample_pr['todo_count']} TODO   │")
    print(f"  │  Comments       : {sample_pr['comments']} general + {sample_pr['review_comments']} review            │")
    print(  "  └─────────────────────────────────────────────────────┘")

    # Probability bar
    filled = int(prob * 30)
    bar = "█" * filled + "░" * (30 - filled)

    print(f"\n  ┌─ PREDICTION ──────────────────────────────────────┐")
    print(f"  │  Merge Probability : {prob:.1%}{'':>24}│")
    print(f"  │  [{bar}]         │")
    print(f"  │  Verdict    : {result['prediction']:<36}│")
    print(f"  │  Confidence : {confidence:<36}│")
    print(  "  └─────────────────────────────────────────────────────┘")

    # Top features
    print(f"\n  ┌─ TOP FACTORS INFLUENCING THIS PREDICTION ─────────┐")
    for feat in result["top_features"]:
        desc = FEATURE_DESCRIPTIONS.get(feat["feature"], feat["feature"])
        print(f"  │  {desc}")
        print(f"  │     Value: {feat['value']:<10} Importance: {feat['importance']:.1%}")
    print(  "  └─────────────────────────────────────────────────────┘")

    # Interpretation
    if prob >= 0.65:
        print("\n  💡 Interpretation:")
        print("     This PR has strong signals for being merged.")
        print("     A well-described PR with moderate changes tends to")
        print("     get reviewed and merged faster.")
    elif prob >= 0.45:
        print("\n  💡 Interpretation:")
        print("     This PR is on the fence. Consider adding more")
        print("     description or breaking it into smaller changes.")
    else:
        print("\n  💡 Interpretation:")
        print("     This PR has weak merge signals. It may need a better")
        print("     description, fewer changes, or more review engagement.")

    print("\n" + "═" * W)
