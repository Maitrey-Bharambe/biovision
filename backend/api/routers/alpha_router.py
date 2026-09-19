"""AlphaGenome Lab endpoints — variant effect, DNA editor, remedy recommender."""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.services.codon import (
    translate, analyze_point_mutation, CODON_TABLE, AA_FULL,
)
from backend.services.variant_effect import predict_effect
from backend.services.remedy import recommend
from backend.etl.real_data import gene_dna, GENE_FACTS, MUTATION_HOTSPOTS

router = APIRouter()


@router.get("/catalog")
def catalog():
    """List genes + their real known hotspots + a suggested variant position.
    Used by the frontend to populate dropdowns instead of manual entry."""
    genes = [name for (name, *_r) in GENE_FACTS]
    hotspots_by_gene: dict[str, list[dict]] = {}
    for (g, chrom, pos, ref, alt, mtype, cons, freq, disease, pc) in MUTATION_HOTSPOTS:
        hotspots_by_gene.setdefault(g, []).append(dict(
            protein_change=pc, ref_base=ref, alt_base=alt,
            mutation_type=mtype, consequence=cons, disease=disease,
            frequency=freq,
        ))
    # simulate a deterministic display position for each real hotspot within
    # the 240-base display sequence (so the DNA editor can jump to it)
    display_positions = {}
    for g, hs in hotspots_by_gene.items():
        # use a stable spacing so different hotspots pick different positions
        display_positions[g] = [30 + (i * 30) % 200 for i in range(len(hs))]
    return dict(
        genes=genes,
        hotspots=hotspots_by_gene,
        display_positions=display_positions,
    )


# --------------------------------------------------------------------- #
#  1.  Gene reference sequence + translation                             #
# --------------------------------------------------------------------- #

@router.get("/gene-reference")
def gene_reference(gene: str, length: int = 240):
    """Return a display-length reference DNA + its amino-acid translation."""
    known = {name for (name,*_rest) in GENE_FACTS}
    if gene.upper() not in known:
        raise HTTPException(404, f"unknown gene: {gene}")
    dna = gene_dna(gene.upper(), length=length)
    return {
        "gene": gene.upper(),
        "length_bp": len(dna),
        "reference_dna": dna,
        "protein": translate(dna),
    }


# --------------------------------------------------------------------- #
#  2.  DNA live editor                                                    #
# --------------------------------------------------------------------- #

class EditInput(BaseModel):
    gene: str
    reference_dna: Optional[str] = None
    position: int
    alt_base: str


@router.post("/dna-edit")
def dna_edit(inp: EditInput):
    dna = inp.reference_dna or gene_dna(inp.gene.upper(), length=240)
    report = analyze_point_mutation(dna, inp.position, inp.alt_base)
    if "error" in report:
        raise HTTPException(400, report["error"])
    edited = dna[:inp.position] + inp.alt_base.upper() + dna[inp.position+1:]
    return {
        "gene": inp.gene.upper(),
        "reference_dna": dna,
        "edited_dna": edited,
        "protein_before": translate(dna),
        "protein_after":  translate(edited),
        **report,
    }


# --------------------------------------------------------------------- #
#  3.  Variant Effect Predictor                                           #
# --------------------------------------------------------------------- #

class VariantInput(BaseModel):
    gene: str
    position: int
    alt_base: str
    reference_dna: Optional[str] = None


@router.post("/variant-effect")
def variant_effect(inp: VariantInput):
    return predict_effect(inp.gene.upper(), inp.position, inp.alt_base, inp.reference_dna)


# --------------------------------------------------------------------- #
#  4.  Remedy recommender                                                 #
# --------------------------------------------------------------------- #

class MutationRef(BaseModel):
    gene: str
    protein_change: Optional[str] = None


class RemedyInput(BaseModel):
    mutations: list[MutationRef]


@router.post("/remedy")
def remedy(inp: RemedyInput):
    return recommend([m.model_dump() for m in inp.mutations])


@router.get("/remedy/for-sample/{sample_id}")
def remedy_for_sample(sample_id: str):
    """Return recommendations for the mutations observed in the given sample."""
    from backend.database.db import SessionLocal
    from backend.models import orm

    db = SessionLocal()
    try:
        sample = db.query(orm.DimSample).filter_by(sample_id=sample_id).first()
        if not sample:
            raise HTTPException(404, "sample not found")

        rows = (db.query(orm.DimMutation, orm.DimGene)
                  .join(orm.FactBiologicalObservation,
                        orm.FactBiologicalObservation.mutation_key == orm.DimMutation.mutation_key)
                  .join(orm.DimGene, orm.DimMutation.gene_key == orm.DimGene.gene_key)
                  .filter(orm.FactBiologicalObservation.sample_key == sample.sample_key)
                  .distinct().all())
    finally:
        db.close()

    muts = []
    for m, g in rows:
        # protein change comes from the mutation_id we minted (e.g. MUT_TP53_R175H)
        pc = m.mutation_id.split("_")[-1] if m.mutation_id else ""
        muts.append(dict(gene=g.gene_name, protein_change=pc))
    return recommend(muts)
