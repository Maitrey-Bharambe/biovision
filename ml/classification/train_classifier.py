"""Train the diagnostic classifier on the Wisconsin Diagnostic Breast Cancer
dataset (real 569 patient samples, 30 real cell-nuclei features, real
malignant/benign labels — same dataset published on Kaggle as
"Breast Cancer Wisconsin (Diagnostic)" and on the UCI ML Repository).

Also loads the Wisconsin feature matrix into a sample-level features table
for the clustering + anomaly + fusion modules.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, confusion_matrix,
    roc_curve, auc,
)
import joblib

ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / "models_saved"
MODEL_DIR.mkdir(exist_ok=True)


def build_features(db=None) -> pd.DataFrame:
    """Return real WDBC features + sample_key + biological_condition label.

    `db` kept for API compatibility with previous scripts — not used because
    the WDBC data is loaded from sklearn's bundled copy.
    """
    ds = load_breast_cancer(as_frame=True)
    frame = ds.frame.copy()                      # 569 × 31
    frame["sample_key"] = np.arange(1, len(frame) + 1)
    frame["biological_condition"] = np.where(ds.target == 1, "healthy", "diseased")
    frame = frame.drop(columns=["target"])
    return frame


def train(save: bool = True) -> dict:
    df = build_features()

    y = (df["biological_condition"] == "diseased").astype(int)
    X = df.drop(columns=["sample_key", "biological_condition"])

    feature_cols = list(X.columns)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y,
    )

    candidates = {
        "RandomForest":       RandomForestClassifier(n_estimators=250, random_state=42),
        "DecisionTree":       DecisionTreeClassifier(random_state=42),
        "LogisticRegression": LogisticRegression(max_iter=5000),
        "SVM":                SVC(probability=True, random_state=42),
        "KNN":                KNeighborsClassifier(n_neighbors=5),
    }

    results = {}
    best_name, best_model, best_f1 = None, None, -1
    for name, model in candidates.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        results[name] = dict(
            accuracy=round(accuracy_score(y_test, y_pred), 4),
            precision=round(precision_score(y_test, y_pred, zero_division=0), 4),
            recall=round(recall_score(y_test, y_pred, zero_division=0), 4),
            f1=round(f1_score(y_test, y_pred, zero_division=0), 4),
            confusion_matrix=confusion_matrix(y_test, y_pred).tolist(),
        )
        if results[name]["f1"] > best_f1:
            best_f1, best_name, best_model = results[name]["f1"], name, model

    # ROC on the best model
    roc = None
    if hasattr(best_model, "predict_proba"):
        probs = best_model.predict_proba(X_test)[:, 1]
        fpr, tpr, _ = roc_curve(y_test, probs)
        roc_auc = float(auc(fpr, tpr))
        # sample down to 40 points for the UI
        idx = np.linspace(0, len(fpr) - 1, min(40, len(fpr))).astype(int)
        roc = dict(
            fpr=[round(float(v), 4) for v in fpr[idx]],
            tpr=[round(float(v), 4) for v in tpr[idx]],
            auc=round(roc_auc, 4),
        )

    importances = None
    if hasattr(best_model, "feature_importances_"):
        importances = dict(zip(feature_cols,
                               [round(float(v), 4) for v in best_model.feature_importances_]))

    payload = dict(
        dataset="Wisconsin Diagnostic Breast Cancer (WDBC)",
        source="UCI ML Repository · Kaggle 'Breast Cancer Wisconsin (Diagnostic)'",
        n_samples=int(len(df)),
        n_features=len(feature_cols),
        best=best_name,
        results=results,
        feature_importances=importances,
        features=feature_cols,
        roc=roc,
        class_balance={
            "healthy":  int((y == 0).sum()),
            "diseased": int((y == 1).sum()),
        },
    )

    if save:
        joblib.dump({"model": best_model, "features": feature_cols},
                    MODEL_DIR / "genomic_classifier.pkl")
        (MODEL_DIR / "genomic_classifier_report.json").write_text(json.dumps(payload, indent=2))
    return payload


if __name__ == "__main__":
    print(json.dumps(train(), indent=2))
