"""Multi-modal feature fusion.

Combines DNA-derived, RNA, protein and CV feature vectors into a single
concatenated representation that downstream ML models consume. Kept simple
on purpose so it can be traced in the UI.
"""
from __future__ import annotations

import numpy as np

from cv.preprocessing.dna_to_image import encode


def dna_features(seq: str) -> np.ndarray:
    v = encode(seq)
    if v.size == 0:
        return np.zeros(6)
    return np.array([
        (v == 0).mean(),          # A fraction
        (v == 1).mean(),          # C fraction
        (v == 2).mean(),          # G fraction
        (v == 3).mean(),          # T fraction
        ((v == 1) | (v == 2)).mean(),   # GC content
        v.std(),                  # complexity proxy
    ])


def rna_features(rna_values: list[float]) -> np.ndarray:
    a = np.array(rna_values, dtype=float) if rna_values else np.zeros(1)
    return np.array([a.mean(), a.std(), a.max(), a.min(), np.median(a)])


def protein_features(abundances: list[float], lengths: list[float]) -> np.ndarray:
    a = np.array(abundances, dtype=float) if abundances else np.zeros(1)
    l = np.array(lengths, dtype=float) if lengths else np.zeros(1)
    return np.array([a.mean(), a.max(), l.mean(), l.max()])


def image_features(cv_probabilities: dict[str, float]) -> np.ndarray:
    return np.array([cv_probabilities.get("healthy", 0.0),
                     cv_probabilities.get("abnormal", 0.0)])


def fuse(seq: str, rna_values: list[float], abundances: list[float],
         lengths: list[float], cv_probabilities: dict[str, float]) -> dict:
    d = dna_features(seq)
    r = rna_features(rna_values)
    p = protein_features(abundances, lengths)
    c = image_features(cv_probabilities)
    fused = np.concatenate([d, r, p, c])
    return {
        "dna": d.tolist(),
        "rna": r.tolist(),
        "protein": p.tolist(),
        "image": c.tolist(),
        "fused_vector": fused.tolist(),
        "fused_length": int(fused.size),
    }
