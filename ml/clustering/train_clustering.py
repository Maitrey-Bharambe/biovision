"""Unsupervised clustering of biological samples.

Runs K-Means and DBSCAN over the sample-level feature matrix produced by the
classification module, then projects the result into 2-D via PCA for the UI.
"""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.cluster import KMeans, DBSCAN
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

from backend.database.db import SessionLocal
from ml.classification.train_classifier import build_features

ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / "models_saved"
MODEL_DIR.mkdir(exist_ok=True)


def train(k: int = 3) -> dict:
    db = SessionLocal()
    try:
        df = build_features(db)
    finally:
        db.close()

    X = df.drop(columns=["sample_key", "biological_condition"]).fillna(0).values
    scaler = StandardScaler().fit(X)
    Xs = scaler.transform(X)

    km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(Xs)
    kmeans_sil = float(silhouette_score(Xs, km.labels_)) if len(set(km.labels_)) > 1 else 0.0

    db_model = DBSCAN(eps=1.2, min_samples=3).fit(Xs)
    dbscan_labels = db_model.labels_
    n_clusters_dbscan = len(set(dbscan_labels)) - (1 if -1 in dbscan_labels else 0)

    pca = PCA(n_components=2, random_state=42).fit(Xs)
    coords = pca.transform(Xs)

    points = [
        dict(
            sample_id=f"S{str(int(sk)).zfill(3)}",
            x=float(x), y=float(y),
            kmeans_label=int(k_lab),
            dbscan_label=int(d_lab),
            condition=cond,
        )
        for sk, (x, y), k_lab, d_lab, cond
        in zip(df["sample_key"], coords, km.labels_, dbscan_labels, df["biological_condition"])
    ]

    payload = dict(
        kmeans=dict(
            k=k,
            silhouette=round(kmeans_sil, 4),
            inertia=round(float(km.inertia_), 3),
            cluster_sizes={int(c): int(np.sum(km.labels_ == c)) for c in set(km.labels_)},
        ),
        dbscan=dict(
            n_clusters=n_clusters_dbscan,
            n_noise=int(np.sum(dbscan_labels == -1)),
        ),
        pca_explained_variance=[round(float(v), 4) for v in pca.explained_variance_ratio_],
        points=points,
    )

    joblib.dump({"kmeans": km, "dbscan": db_model, "scaler": scaler, "pca": pca},
                MODEL_DIR / "clustering_models.pkl")
    (MODEL_DIR / "clustering_report.json").write_text(json.dumps(payload, indent=2))
    return payload


if __name__ == "__main__":
    print(json.dumps(train(), indent=2))
