"""Cross-domain OLAP endpoints.

Extends the traditional star-schema OLAP (`/olap/…`) with two new aggregation
domains — the AlphaGenome variant catalog and the Computer-Vision test set —
so a user can slice / roll-up / drill-down across every part of the platform,
not only the warehouse.
"""
from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path

from fastapi import APIRouter, HTTPException
from backend.etl.real_data import MUTATION_HOTSPOTS

router = APIRouter()
ROOT = Path(__file__).resolve().parents[3]
MODEL_DIR = ROOT / "models_saved"


# --------------------------------------------------------------------- #
#  AlphaGenome domain — aggregations over MUTATION_HOTSPOTS               #
# --------------------------------------------------------------------- #

def _hotspot_rows():
    """Rowset over the real ClinVar/COSMIC hotspot catalog."""
    return [
        dict(gene=g, chromosome=chrom, position=pos, ref=ref, alt=alt,
             mutation_type=mtype, consequence=cons, disease=disease,
             frequency=freq, protein_change=pc)
        for (g, chrom, pos, ref, alt, mtype, cons, freq, disease, pc)
        in MUTATION_HOTSPOTS
    ]


@router.get("/alpha/rollup")
def alpha_rollup(level: str = "gene"):
    """Roll-up variant counts up the biological hierarchy.

    level ∈ {gene, chromosome, consequence, disease, mutation_type}
    """
    rows = _hotspot_rows()
    valid = {"gene", "chromosome", "consequence", "disease", "mutation_type"}
    if level not in valid:
        raise HTTPException(400, f"level must be one of {valid}")

    grouped = Counter(r[level] for r in rows)
    freq_sum = defaultdict(float)
    for r in rows:
        freq_sum[r[level]] += r.get("frequency", 0) or 0

    return {
        "level": level,
        "rows": [
            dict(key=k, variant_count=int(n), sum_frequency=round(freq_sum[k], 4))
            for k, n in sorted(grouped.items(), key=lambda kv: -kv[1])
        ],
    }


@router.get("/alpha/dice")
def alpha_dice(disease: str | None = None,
               mutation_type: str | None = None,
               consequence: str | None = None):
    """Filter the variant catalog on multiple axes at once."""
    rows = _hotspot_rows()
    if disease:       rows = [r for r in rows if r["disease"] == disease]
    if mutation_type: rows = [r for r in rows if r["mutation_type"] == mutation_type]
    if consequence:   rows = [r for r in rows if r["consequence"] == consequence]
    return {
        "filters": dict(disease=disease, mutation_type=mutation_type,
                        consequence=consequence),
        "rows": rows,
    }


@router.get("/alpha/pivot")
def alpha_pivot(row_dim: str = "gene", col_dim: str = "consequence"):
    """Two-dimensional cross-tab over the variant catalog."""
    rows = _hotspot_rows()
    dims = {"gene", "chromosome", "consequence", "disease", "mutation_type"}
    if row_dim not in dims or col_dim not in dims:
        raise HTTPException(400, f"row_dim/col_dim must be one of {dims}")
    matrix: dict[tuple[str,str], int] = defaultdict(int)
    for r in rows:
        matrix[(r[row_dim], r[col_dim])] += 1
    row_keys = sorted({r[row_dim] for r in rows})
    col_keys = sorted({r[col_dim] for r in rows})
    return {
        "row_dim": row_dim, "col_dim": col_dim,
        "row_keys": row_keys, "col_keys": col_keys,
        "cells": [
            dict(row=rk, col=ck, count=int(matrix[(rk, ck)]))
            for rk in row_keys for ck in col_keys
        ],
    }


# --------------------------------------------------------------------- #
#  Computer-Vision domain — aggregations over the CNN report              #
# --------------------------------------------------------------------- #

def _cnn_report() -> dict:
    p = MODEL_DIR / "cnn_report.json"
    if not p.exists():
        raise HTTPException(404, "cnn_report.json not found — train the CNN first")
    return json.loads(p.read_text())


@router.get("/cv/rollup")
def cv_rollup():
    """Summarise the CNN test-set performance across classes."""
    rep = _cnn_report()
    conf = rep["confusion_matrix"]              # [[TN,FP],[FN,TP]] here
    classes = rep["classes"]
    total = sum(sum(row) for row in conf) or 1
    per_class = []
    for i, c in enumerate(classes):
        row_total = sum(conf[i])
        col_total = sum(r[i] for r in conf)
        tp = conf[i][i]
        acc = tp / row_total if row_total else 0
        prec = tp / col_total if col_total else 0
        per_class.append(dict(
            class_=c,
            support=int(row_total),
            true_positive=int(tp),
            accuracy=round(acc, 4),
            precision=round(prec, 4),
        ))
    return {
        "test_accuracy": rep["test_accuracy"],
        "n_test": int(total),
        "epochs": rep["epochs"],
        "per_class": per_class,
    }


@router.get("/cv/confidence-bins")
def cv_confidence_bins():
    """Bucket the gallery predictions into confidence bins."""
    from cv.inference.gallery import build
    try:
        items = build(n=48, size=64)
    except Exception as e:
        raise HTTPException(500, f"gallery build failed: {e}")

    bins = [(0.0, 0.5), (0.5, 0.7), (0.7, 0.85), (0.85, 1.01)]
    result = []
    for lo, hi in bins:
        subset = [it for it in items if lo <= it["confidence"] < hi]
        correct = sum(1 for it in subset if it["correct"])
        result.append(dict(
            range=f"{int(lo*100)}–{int(hi*100)}%",
            n=len(subset),
            correct=correct,
            wrong=len(subset) - correct,
            accuracy=round(correct / len(subset), 4) if subset else 0,
        ))
    return {"bins": result, "n_total": len(items)}


@router.get("/cv/errors")
def cv_errors(n: int = 12):
    """Drill-down into the CNN's mis-classifications."""
    from cv.inference.gallery import build
    items = build(n=n, size=112)
    return {
        "errors": [it for it in items if not it["correct"]],
        "corrects": [it for it in items if it["correct"]],
    }
