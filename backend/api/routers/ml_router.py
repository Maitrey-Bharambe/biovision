"""Endpoints backed by the trained ML modules."""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()
ROOT = Path(__file__).resolve().parents[3]
MODEL_DIR = ROOT / "models_saved"


def _read(name: str) -> dict:
    path = MODEL_DIR / name
    if not path.exists():
        raise HTTPException(404, f"{name} not found — run the corresponding training script")
    return json.loads(path.read_text())


class PredictInput(BaseModel):
    mean_expression: float = 40.0
    mean_protein_abundance: float = 50.0
    total_mutations: int = 10
    gc_content: float = 42.0
    n_high_expression_genes: int = 5
    n_low_expression_genes: int = 5
    n_snp: int = 3
    n_ins: int = 1
    n_del: int = 1
    n_sub: int = 1


@router.get("/classification")
def classification_report():
    return _read("genomic_classifier_report.json")


@router.post("/classification/predict")
def classification_predict(inp: PredictInput):
    import joblib
    path = MODEL_DIR / "genomic_classifier.pkl"
    if not path.exists():
        raise HTTPException(404, "Train the classifier first")
    bundle = joblib.load(path)
    model = bundle["model"]; features = bundle["features"]
    row = [getattr(inp, f, 0) for f in features]
    proba = getattr(model, "predict_proba", None)
    pred = int(model.predict([row])[0])
    payload = {"prediction": "diseased" if pred == 1 else "healthy"}
    if proba is not None:
        p = proba([row])[0]
        payload["probabilities"] = {"healthy": round(float(p[0]), 4),
                                    "diseased": round(float(p[1]), 4)}
    return payload


@router.get("/clusters")
def clusters(): return _read("clustering_report.json")


@router.get("/associations")
def associations(): return _read("association_report.json")


@router.get("/anomalies")
def anomalies(): return _read("anomaly_report.json")


@router.get("/mutations")
def mutation_analytics():
    """Simple analytics: mutation count per type, per chromosome."""
    from backend.database.db import SessionLocal
    from backend.models import orm
    from sqlalchemy import func

    db = SessionLocal()
    try:
        by_type = db.query(orm.DimMutation.mutation_type,
                           func.count(orm.DimMutation.mutation_key)) \
                    .group_by(orm.DimMutation.mutation_type).all()
        by_consequence = db.query(orm.DimMutation.consequence,
                                  func.count(orm.DimMutation.mutation_key)) \
                            .group_by(orm.DimMutation.consequence).all()
    finally:
        db.close()
    return {
        "by_type": [{"type": t, "count": int(n)} for t, n in by_type],
        "by_consequence": [{"consequence": c, "count": int(n)} for c, n in by_consequence],
    }


@router.get("/expression")
def expression_analytics():
    from backend.database.db import SessionLocal
    from backend.models import orm
    from sqlalchemy import func

    db = SessionLocal()
    try:
        by_cat = db.query(orm.DimRna.expression_category,
                          func.count(orm.DimRna.rna_key)) \
                   .group_by(orm.DimRna.expression_category).all()
        by_tissue = db.query(orm.DimRna.tissue,
                             func.avg(orm.DimRna.expression_value)) \
                       .group_by(orm.DimRna.tissue).all()
    finally:
        db.close()
    return {
        "by_category": [{"category": c, "count": int(n)} for c, n in by_cat],
        "by_tissue":   [{"tissue": t, "mean_expression": round(float(v or 0), 3)} for t, v in by_tissue],
    }
