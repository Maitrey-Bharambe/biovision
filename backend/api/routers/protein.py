from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.models import orm
from backend.etl.real_data import protein_seq as sample_protein

router = APIRouter()


@router.get("/proteins")
def list_proteins(db: Session = Depends(get_db)):
    rows = db.query(orm.DimProtein, orm.DimGene) \
             .join(orm.DimGene, orm.DimProtein.gene_key == orm.DimGene.gene_key).all()
    return [{
        "protein_id": p.protein_id,
        "protein_name": p.protein_name,
        "gene": g.gene_name,
        "length": p.amino_acid_length,
        "molecular_weight": float(p.molecular_weight) if p.molecular_weight else None,
        "abundance": float(p.abundance) if p.abundance else None,
        "cellular_location": p.cellular_location,
        "ec_number": p.ec_number,
        "function": p.function_summary,
    } for p, g in rows]


@router.get("/proteins/{protein_id}")
def protein_detail(protein_id: str, db: Session = Depends(get_db)):
    row = db.query(orm.DimProtein, orm.DimGene) \
            .join(orm.DimGene, orm.DimProtein.gene_key == orm.DimGene.gene_key) \
            .filter(orm.DimProtein.protein_id == protein_id).first()
    if not row:
        return {"error": "not found"}
    p, g = row
    return {
        "protein_id": p.protein_id, "protein_name": p.protein_name,
        "gene": g.gene_name,
        "length": p.amino_acid_length,
        "molecular_weight": float(p.molecular_weight) if p.molecular_weight else None,
        "abundance": float(p.abundance) if p.abundance else None,
        "cellular_location": p.cellular_location,
        "ec_number": p.ec_number,
        "function": p.function_summary,
        "amino_acid_sequence": sample_protein(g.gene_name) or "",
    }
