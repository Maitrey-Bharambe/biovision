from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.models import orm
from backend.etl.real_data import gene_dna as sample_dna

router = APIRouter()


@router.get("/genomes")
def list_genomes(db: Session = Depends(get_db)):
    rows = db.query(orm.DimGenome, orm.DimOrganism) \
             .outerjoin(orm.DimOrganism, orm.DimGenome.organism_key == orm.DimOrganism.organism_key) \
             .all()
    return [{
        "genome_id": g.genome_id,
        "assembly_version": g.assembly_version,
        "build_date": str(g.build_date) if g.build_date else None,
        "organism": o.common_name if o else None,
    } for g, o in rows]


@router.get("/chromosomes")
def list_chromosomes(genome_id: str | None = None, db: Session = Depends(get_db)):
    q = db.query(orm.DimChromosome, orm.DimGenome) \
          .join(orm.DimGenome, orm.DimChromosome.genome_key == orm.DimGenome.genome_key)
    if genome_id:
        q = q.filter(orm.DimGenome.genome_id == genome_id)
    return [{
        "chromosome_number": c.chromosome_number,
        "length_bp": c.length_bp,
        "gc_content": float(c.gc_content) if c.gc_content else None,
        "genome_id": g.genome_id,
    } for c, g in q.all()]


@router.get("/genes")
def list_genes(chromosome: str | None = None, db: Session = Depends(get_db)):
    q = db.query(orm.DimGene, orm.DimChromosome) \
          .join(orm.DimChromosome, orm.DimGene.chromosome_key == orm.DimChromosome.chromosome_key)
    if chromosome:
        q = q.filter(orm.DimChromosome.chromosome_number == chromosome)
    return [{
        "gene_id": g.gene_id,
        "gene_name": g.gene_name,
        "chromosome": c.chromosome_number,
        "start": g.start_position, "end": g.end_position,
        "strand": g.strand, "biotype": g.biotype,
        "description": g.description,
    } for g, c in q.all()]


@router.get("/genes/{gene_id}")
def gene_detail(gene_id: str, db: Session = Depends(get_db)):
    row = db.query(orm.DimGene, orm.DimChromosome) \
            .join(orm.DimChromosome, orm.DimGene.chromosome_key == orm.DimChromosome.chromosome_key) \
            .filter((orm.DimGene.gene_id == gene_id) | (orm.DimGene.gene_name == gene_id)) \
            .first()
    if not row:
        raise HTTPException(404, "Gene not found")
    gene, chrom = row

    proteins = db.query(orm.DimProtein).filter(orm.DimProtein.gene_key == gene.gene_key).all()
    mutations = db.query(orm.DimMutation).filter(orm.DimMutation.gene_key == gene.gene_key).all()
    rna = db.query(orm.DimRna).filter(orm.DimRna.gene_key == gene.gene_key).limit(30).all()

    return {
        "gene_id": gene.gene_id, "gene_name": gene.gene_name,
        "chromosome": chrom.chromosome_number,
        "start": gene.start_position, "end": gene.end_position,
        "strand": gene.strand, "biotype": gene.biotype,
        "description": gene.description,
        "dna_sequence_sample": sample_dna(gene.gene_name),
        "proteins": [{
            "protein_id": p.protein_id, "protein_name": p.protein_name,
            "length": p.amino_acid_length,
            "molecular_weight": float(p.molecular_weight) if p.molecular_weight else None,
            "abundance": float(p.abundance) if p.abundance else None,
            "location": p.cellular_location,
            "function": p.function_summary,
        } for p in proteins],
        "mutations": [{
            "mutation_id": m.mutation_id, "type": m.mutation_type,
            "consequence": m.consequence, "position": m.position,
            "ref": m.ref_allele, "alt": m.alt_allele,
            "frequency": float(m.frequency) if m.frequency else None,
        } for m in mutations],
        "rna_expression": [{
            "rna_sample_id": r.rna_sample_id, "tissue": r.tissue,
            "condition": r.condition_label,
            "expression": float(r.expression_value) if r.expression_value else None,
            "category": r.expression_category,
        } for r in rna],
    }
