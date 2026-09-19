from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.models import orm

router = APIRouter()


@router.get("/samples")
def list_samples(db: Session = Depends(get_db)):
    rows = db.query(orm.DimSample).all()
    return [{
        "sample_id": s.sample_id, "tissue": s.tissue,
        "condition": s.biological_condition,
        "age_bucket": s.donor_age_bucket, "sex": s.donor_sex,
    } for s in rows]


@router.get("/samples/{sample_id}")
def sample_detail(sample_id: str, db: Session = Depends(get_db)):
    sample = db.query(orm.DimSample).filter(orm.DimSample.sample_id == sample_id).first()
    if not sample:
        raise HTTPException(404, "Sample not found")

    facts = db.query(orm.FactBiologicalObservation).filter_by(sample_key=sample.sample_key).all()

    gene_ids = [f.gene_key for f in facts if f.gene_key]
    gene_map = {g.gene_key: g for g in db.query(orm.DimGene).filter(orm.DimGene.gene_key.in_(gene_ids)).all()} if gene_ids else {}

    mut_ids = [f.mutation_key for f in facts if f.mutation_key]
    mut_map = {m.mutation_key: m for m in db.query(orm.DimMutation).filter(orm.DimMutation.mutation_key.in_(mut_ids)).all()} if mut_ids else {}

    protein_ids = [f.protein_key for f in facts if f.protein_key]
    prot_map = {p.protein_key: p for p in db.query(orm.DimProtein).filter(orm.DimProtein.protein_key.in_(protein_ids)).all()} if protein_ids else {}

    rna_ids = [f.rna_key for f in facts if f.rna_key]
    rna_map = {r.rna_key: r for r in db.query(orm.DimRna).filter(orm.DimRna.rna_key.in_(rna_ids)).all()} if rna_ids else {}

    disease_ids = [f.disease_key for f in facts if f.disease_key]
    dis_map = {d.disease_key: d for d in db.query(orm.DimDisease).filter(orm.DimDisease.disease_key.in_(disease_ids)).all()} if disease_ids else {}

    image = db.query(orm.DimImage).filter_by(sample_key=sample.sample_key).first()

    genes, mutations, rna_expression, proteins, disease_predictions = [], [], [], [], []
    seen_g, seen_m, seen_r, seen_p, seen_d = set(), set(), set(), set(), set()
    for f in facts:
        g = gene_map.get(f.gene_key)
        if g and g.gene_key not in seen_g:
            genes.append({"gene": g.gene_name, "gene_id": g.gene_id}); seen_g.add(g.gene_key)
        m = mut_map.get(f.mutation_key)
        if m and m.mutation_key not in seen_m:
            mutations.append({
                "mutation_id": m.mutation_id, "gene": gene_map.get(m.gene_key).gene_name if gene_map.get(m.gene_key) else None,
                "type": m.mutation_type, "consequence": m.consequence,
                "position": m.position,
            })
            seen_m.add(m.mutation_key)
        r = rna_map.get(f.rna_key)
        if r and r.rna_key not in seen_r:
            rna_expression.append({
                "gene": gene_map.get(r.gene_key).gene_name if gene_map.get(r.gene_key) else None,
                "expression": float(r.expression_value) if r.expression_value else 0,
                "category": r.expression_category,
            })
            seen_r.add(r.rna_key)
        p = prot_map.get(f.protein_key)
        if p and p.protein_key not in seen_p:
            proteins.append({
                "protein_id": p.protein_id,
                "gene": gene_map.get(p.gene_key).gene_name if gene_map.get(p.gene_key) else None,
                "abundance": float(p.abundance) if p.abundance else 0,
                "location": p.cellular_location,
            })
            seen_p.add(p.protein_key)
        d = dis_map.get(f.disease_key)
        if d and d.disease_key not in seen_d:
            disease_predictions.append({"disease": d.disease_name, "category": d.disease_category})
            seen_d.add(d.disease_key)

    return {
        "sample_id": sample.sample_id, "tissue": sample.tissue,
        "condition": sample.biological_condition,
        "age_bucket": sample.donor_age_bucket, "sex": sample.donor_sex,
        "genes": genes,
        "mutations": mutations,
        "rna_expression": rna_expression,
        "proteins": proteins,
        "disease_predictions": disease_predictions,
        "image": {
            "image_id": image.image_id, "type": image.image_type,
            "label": image.label, "path": image.path,
        } if image else None,
        "n_observations": len(facts),
    }
