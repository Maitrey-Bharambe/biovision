"""OLAP endpoints: roll-up, drill-down, slice, dice."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.models import orm

router = APIRouter()


@router.get("/rollup")
def rollup(level: str = "chromosome", db: Session = Depends(get_db)):
    """Roll-up mutation counts up the location hierarchy.

    level ∈ {gene, chromosome, genome}
    """
    if level == "gene":
        rows = db.query(orm.DimGene.gene_name,
                        func.count(orm.DimMutation.mutation_key)) \
                 .join(orm.DimMutation, orm.DimMutation.gene_key == orm.DimGene.gene_key) \
                 .group_by(orm.DimGene.gene_name).all()
        return {"level": "gene",
                "rows": [{"key": g, "mutation_count": int(n)} for g, n in rows]}
    if level == "chromosome":
        rows = db.query(orm.DimChromosome.chromosome_number,
                        func.count(orm.DimMutation.mutation_key)) \
                 .join(orm.DimMutation,
                       orm.DimMutation.chromosome_key == orm.DimChromosome.chromosome_key) \
                 .group_by(orm.DimChromosome.chromosome_number).all()
        return {"level": "chromosome",
                "rows": [{"key": c, "mutation_count": int(n)} for c, n in rows]}
    if level == "genome":
        rows = db.query(orm.DimGenome.genome_id,
                        func.count(orm.DimMutation.mutation_key)) \
                 .join(orm.DimChromosome,
                       orm.DimChromosome.genome_key == orm.DimGenome.genome_key) \
                 .join(orm.DimMutation,
                       orm.DimMutation.chromosome_key == orm.DimChromosome.chromosome_key) \
                 .group_by(orm.DimGenome.genome_id).all()
        return {"level": "genome",
                "rows": [{"key": g, "mutation_count": int(n)} for g, n in rows]}
    return {"error": "level must be gene|chromosome|genome"}


@router.get("/drilldown")
def drilldown(disease: str | None = None, tissue: str | None = None,
              gene: str | None = None, db: Session = Depends(get_db)):
    """Progressive drill-down: Disease → Tissue → Gene → Mutation."""
    q = db.query(
        orm.DimDisease.disease_name,
        orm.DimSample.tissue,
        orm.DimGene.gene_name,
        orm.DimMutation.mutation_type,
        func.count(orm.FactBiologicalObservation.observation_id),
        func.avg(orm.FactBiologicalObservation.expression_value),
    ).join(orm.DimDisease, orm.FactBiologicalObservation.disease_key == orm.DimDisease.disease_key) \
     .join(orm.DimSample,  orm.FactBiologicalObservation.sample_key  == orm.DimSample.sample_key) \
     .join(orm.DimGene,    orm.FactBiologicalObservation.gene_key    == orm.DimGene.gene_key) \
     .outerjoin(orm.DimMutation,
                orm.FactBiologicalObservation.mutation_key == orm.DimMutation.mutation_key)

    if disease: q = q.filter(orm.DimDisease.disease_name == disease)
    if tissue:  q = q.filter(orm.DimSample.tissue == tissue)
    if gene:    q = q.filter(orm.DimGene.gene_name == gene)

    q = q.group_by(orm.DimDisease.disease_name, orm.DimSample.tissue,
                   orm.DimGene.gene_name, orm.DimMutation.mutation_type)
    rows = q.limit(500).all()
    return {"rows": [{
        "disease": d, "tissue": t, "gene": g, "mutation_type": mt,
        "observations": int(n), "avg_expression": round(float(a or 0), 3),
    } for d, t, g, mt, n, a in rows]}


@router.get("/slice")
def slice_(disease: str, db: Session = Depends(get_db)):
    """Slice on a single disease → aggregate per gene."""
    rows = db.query(orm.DimGene.gene_name,
                    func.avg(orm.FactBiologicalObservation.expression_value),
                    func.avg(orm.FactBiologicalObservation.protein_abundance),
                    func.count(orm.FactBiologicalObservation.observation_id)) \
             .join(orm.FactBiologicalObservation,
                   orm.FactBiologicalObservation.gene_key == orm.DimGene.gene_key) \
             .join(orm.DimDisease,
                   orm.FactBiologicalObservation.disease_key == orm.DimDisease.disease_key) \
             .filter(orm.DimDisease.disease_name == disease) \
             .group_by(orm.DimGene.gene_name).all()
    return {"disease": disease,
            "rows": [{
                "gene": g, "avg_expression": round(float(e or 0), 3),
                "avg_protein_abundance": round(float(p or 0), 3),
                "n": int(n),
            } for g, e, p, n in rows]}


@router.get("/dice")
def dice(disease: str, chromosome: str, expression_category: str = "HIGH",
         db: Session = Depends(get_db)):
    """Dice: disease × chromosome × expression category."""
    rows = db.query(orm.DimGene.gene_name, orm.DimMutation.mutation_type,
                    func.count(orm.FactBiologicalObservation.observation_id)) \
             .join(orm.FactBiologicalObservation,
                   orm.FactBiologicalObservation.gene_key == orm.DimGene.gene_key) \
             .join(orm.DimChromosome,
                   orm.DimGene.chromosome_key == orm.DimChromosome.chromosome_key) \
             .join(orm.DimDisease,
                   orm.FactBiologicalObservation.disease_key == orm.DimDisease.disease_key) \
             .join(orm.DimRna,
                   orm.FactBiologicalObservation.rna_key == orm.DimRna.rna_key) \
             .outerjoin(orm.DimMutation,
                        orm.FactBiologicalObservation.mutation_key == orm.DimMutation.mutation_key) \
             .filter(orm.DimDisease.disease_name == disease,
                     orm.DimChromosome.chromosome_number == chromosome,
                     orm.DimRna.expression_category == expression_category) \
             .group_by(orm.DimGene.gene_name, orm.DimMutation.mutation_type).all()
    return {
        "disease": disease, "chromosome": chromosome,
        "expression_category": expression_category,
        "rows": [{"gene": g, "mutation_type": m, "n": int(n)} for g, m, n in rows],
    }
