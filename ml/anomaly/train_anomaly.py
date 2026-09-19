"""Isolation Forest anomaly detection over sample-level features."""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from backend.database.db import SessionLocal
from ml.classification.train_classifier import build_features

ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / "models_saved"
MODEL_DIR.mkdir(exist_ok=True)


def train(contamination: float = 0.15) -> dict:
    db = SessionLocal()
    try:
        df = build_features(db)
    finally:
        db.close()

    X = df.drop(columns=["sample_key", "biological_condition"]).fillna(0).values
    scaler = StandardScaler().fit(X)
    Xs = scaler.transform(X)

    model = IsolationForest(contamination=contamination, random_state=42).fit(Xs)
    scores = -model.score_samples(Xs)                                # higher = more anomalous
    is_anomaly = model.predict(Xs) == -1

    top = np.argsort(-scores)[:15]
    payload = dict(
        contamination=contamination,
        n_samples=int(len(df)),
        n_anomalies=int(is_anomaly.sum()),
        samples=[
            dict(
                sample_id=f"S{str(int(df.iloc[i]['sample_key'])).zfill(3)}",
                score=round(float(scores[i]), 4),
                anomaly=bool(is_anomaly[i]),
                condition=str(df.iloc[i]["biological_condition"]),
            )
            for i in range(len(df))
        ],
        top_anomalous=[
            dict(sample_id=f"S{str(int(df.iloc[i]['sample_key'])).zfill(3)}",
                 score=round(float(scores[i]), 4))
            for i in top
        ],
    )
    joblib.dump({"model": model, "scaler": scaler}, MODEL_DIR / "anomaly_model.pkl")
    (MODEL_DIR / "anomaly_report.json").write_text(json.dumps(payload, indent=2))
    return payload


if __name__ == "__main__":
    print(json.dumps(train(), indent=2))
