from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.models import orm

router = APIRouter()


@router.get("/mutations")
def list_mutations(
    gene: str | None = None, chromosome: str | None = None,
    mutation_type: str | None = None, limit: int = 300,
    db: Session = Depends(get_db),
):
    q = db.query(orm.DimMutation, orm.DimGene, orm.DimChromosome) \
          .join(orm.DimGene, orm.DimMutation.gene_key == orm.DimGene.gene_key) \
          .join(orm.DimChromosome, orm.DimMutation.chromosome_key == orm.DimChromosome.chromosome_key)
    if gene:
        q = q.filter(orm.DimGene.gene_name == gene)
    if chromosome:
        q = q.filter(orm.DimChromosome.chromosome_number == chromosome)
    if mutation_type:
        q = q.filter(orm.DimMutation.mutation_type == mutation_type)
    rows = q.limit(limit).all()
    return [{
        "mutation_id": m.mutation_id, "gene": g.gene_name,
        "chromosome": c.chromosome_number, "position": m.position,
        "ref": m.ref_allele, "alt": m.alt_allele,
        "type": m.mutation_type, "consequence": m.consequence,
        "frequency": float(m.frequency) if m.frequency else None,
    } for m, g, c in rows]


@router.get("/mutations/top-genes")
def top_mutated_genes(limit: int = 10, db: Session = Depends(get_db)):
    rows = db.query(orm.DimGene.gene_name, func.count(orm.DimMutation.mutation_key).label("n")) \
             .join(orm.DimMutation, orm.DimMutation.gene_key == orm.DimGene.gene_key) \
             .group_by(orm.DimGene.gene_name) \
             .order_by(desc("n")).limit(limit).all()
    return [{"gene": g, "mutation_count": int(n)} for g, n in rows]


@router.get("/mutations/by-chromosome")
def by_chromosome(db: Session = Depends(get_db)):
    rows = db.query(orm.DimChromosome.chromosome_number,
                    func.count(orm.DimMutation.mutation_key)) \
             .join(orm.DimMutation,
                   orm.DimMutation.chromosome_key == orm.DimChromosome.chromosome_key) \
             .group_by(orm.DimChromosome.chromosome_number).all()
    return [{"chromosome": c, "mutation_count": int(n)} for c, n in rows]
