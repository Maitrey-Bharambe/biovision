from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.models import orm

router = APIRouter()


@router.get("/overview")
def overview(db: Session = Depends(get_db)) -> dict:
    def _count(model): return db.query(func.count()).select_from(model).scalar() or 0

    mutation_by_type = db.query(orm.DimMutation.mutation_type,
                                func.count(orm.DimMutation.mutation_key)) \
        .group_by(orm.DimMutation.mutation_type).all()

    disease_dist = db.query(orm.DimDisease.disease_name,
                            func.count(orm.FactBiologicalObservation.observation_id)) \
        .join(orm.FactBiologicalObservation,
              orm.FactBiologicalObservation.disease_key == orm.DimDisease.disease_key) \
        .group_by(orm.DimDisease.disease_name).all()

    expr_by_cat = db.query(orm.DimRna.expression_category,
                           func.count(orm.DimRna.rna_key)) \
        .group_by(orm.DimRna.expression_category).all()

    return {
        "totals": {
            "genomes":    _count(orm.DimGenome),
            "genes":      _count(orm.DimGene),
            "mutations":  _count(orm.DimMutation),
            "proteins":   _count(orm.DimProtein),
            "rna_samples":_count(orm.DimRna),
            "images":     _count(orm.DimImage),
            "samples":    _count(orm.DimSample),
        },
        "mutation_by_type":  [{"type": t, "count": c} for t, c in mutation_by_type],
        "disease_distribution":[{"disease": d, "count": c} for d, c in disease_dist],
        "expression_distribution":[{"category": e, "count": c} for e, c in expr_by_cat],
    }
