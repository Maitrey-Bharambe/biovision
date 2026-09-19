"""Warehouse metadata endpoints."""
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()

SCHEMA = {
    "fact": {
        "name": "FACT_BIOLOGICAL_OBSERVATION",
        "columns": [
            "observation_id", "sample_key", "gene_key", "genome_key", "rna_key",
            "protein_key", "mutation_key", "disease_key", "image_key", "time_key",
            "expression_value", "protein_abundance", "mutation_count",
            "cv_score", "ml_prediction", "ml_confidence",
        ],
    },
    "dimensions": [
        {"name": "DIM_SAMPLE",     "grain": "one row per biological sample"},
        {"name": "DIM_GENE",       "grain": "one row per gene"},
        {"name": "DIM_GENOME",     "grain": "one row per genome assembly"},
        {"name": "DIM_CHROMOSOME", "grain": "one row per chromosome (snowflakes off DIM_GENOME)"},
        {"name": "DIM_RNA",        "grain": "one row per RNA sample × gene measurement"},
        {"name": "DIM_PROTEIN",    "grain": "one row per protein"},
        {"name": "DIM_MUTATION",   "grain": "one row per called mutation"},
        {"name": "DIM_DISEASE",    "grain": "one row per disease category"},
        {"name": "DIM_IMAGE",      "grain": "one row per biological image"},
        {"name": "DIM_ORGANISM",   "grain": "one row per organism species"},
        {"name": "DIM_TIME",       "grain": "one row per calendar day"},
    ],
    "snowflake_edges": [
        {"from": "DIM_CHROMOSOME", "to": "DIM_GENOME"},
        {"from": "DIM_GENE",       "to": "DIM_CHROMOSOME"},
    ],
    "measures": [
        "expression_value", "protein_abundance", "mutation_count",
        "cv_score", "ml_confidence",
    ],
}


@router.get("/schema")
def schema():
    return SCHEMA
