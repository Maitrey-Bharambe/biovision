from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.models import orm

router = APIRouter()


@router.get("/rna-expression")
def rna_expression(gene: str | None = None, tissue: str | None = None,
                   limit: int = 200, db: Session = Depends(get_db)):
    q = db.query(orm.DimRna, orm.DimGene) \
          .join(orm.DimGene, orm.DimRna.gene_key == orm.DimGene.gene_key)
    if gene:
        q = q.filter(orm.DimGene.gene_name == gene)
    if tissue:
        q = q.filter(orm.DimRna.tissue == tissue)
    rows = q.limit(limit).all()
    return [{
        "rna_sample_id": r.rna_sample_id,
        "gene": g.gene_name, "tissue": r.tissue,
        "condition": r.condition_label,
        "read_count": r.read_count,
        "tpm": float(r.tpm) if r.tpm else None,
        "fpkm": float(r.fpkm) if r.fpkm else None,
        "expression": float(r.expression_value) if r.expression_value else None,
        "category": r.expression_category,
    } for r, g in rows]


@router.get("/rna-expression/top")
def top_expression(direction: str = "up", limit: int = 15, db: Session = Depends(get_db)):
    """direction: 'up' (highest mean) or 'down' (lowest mean)."""
    q = db.query(orm.DimGene.gene_name, func.avg(orm.DimRna.expression_value).label("avg_expr")) \
          .join(orm.DimRna, orm.DimRna.gene_key == orm.DimGene.gene_key) \
          .group_by(orm.DimGene.gene_name)
    q = q.order_by(desc("avg_expr") if direction == "up" else "avg_expr")
    return [{"gene": g, "mean_expression": round(float(a or 0), 3)} for g, a in q.limit(limit).all()]


@router.get("/rna-expression/heatmap")
def heatmap(db: Session = Depends(get_db)):
    """Return a gene × tissue matrix of mean expression."""
    rows = db.query(orm.DimGene.gene_name, orm.DimRna.tissue,
                    func.avg(orm.DimRna.expression_value)) \
             .join(orm.DimRna, orm.DimRna.gene_key == orm.DimGene.gene_key) \
             .group_by(orm.DimGene.gene_name, orm.DimRna.tissue).all()
    return [{"gene": g, "tissue": t, "value": round(float(v or 0), 3)} for g, t, v in rows]
