"""AlphaGenome-inspired variant effect prediction.

Not a black-box neural net — instead, a transparent scoring function that
combines factual signals from our warehouse (known cancer hotspots) with
biological heuristics (consequence class, amino acid physicochemistry, allele
frequency).  The output is designed to feel like a real molecular-diagnostics
report, so a non-technical viewer can see WHY the model thinks a variant is
pathogenic.

Inspiration: Google DeepMind's AlphaGenome (announced 2025) predicts how
sequence variants affect molecular regulation across the genome. This
module is an academic mini-analogue for the BioVision teaching platform,
not a re-implementation.
"""
from __future__ import annotations

from typing import Optional

from backend.services.codon import (
    analyze_point_mutation, translate, AA_GROUP, AA_FULL,
)
from backend.etl.real_data import (
    MUTATION_HOTSPOTS, UNIPROT_SEQS, GENE_FACTS,
)

# Build fast lookups from the real hotspot list
_HOTSPOT_BY_PROT = {
    f"{gene}:{prot}": dict(
        gene=gene, protein_change=prot, mutation_type=mtype,
        consequence=cons, disease=disease, frequency=freq,
    )
    for (gene, _c, _pos, _ref, _alt, mtype, cons, freq, disease, prot) in MUTATION_HOTSPOTS
}
_HOTSPOTS_BY_GENE: dict[str, list[dict]] = {}
for (gene, _c, _pos, _ref, _alt, mtype, cons, freq, disease, prot) in MUTATION_HOTSPOTS:
    _HOTSPOTS_BY_GENE.setdefault(gene, []).append(dict(
        protein_change=prot, mutation_type=mtype, consequence=cons,
        disease=disease, frequency=freq,
    ))

_UNIPROT_BY_GENE: dict[str, str] = {}
for (name, _c, _s, _e, uniprot, _d) in GENE_FACTS:
    _UNIPROT_BY_GENE[name] = uniprot


# --------------------------------------------------------------------- #
# Scoring components                                                      #
# --------------------------------------------------------------------- #

def _consequence_weight(cons: str) -> float:
    """Higher = more damaging."""
    return {
        "silent": 0.05,
        "conservative missense": 0.35,
        "missense": 0.60,
        "nonsense": 0.90,
        "frameshift": 0.90,
        "stop-loss": 0.75,
        "amplification": 0.55,
        "fusion": 0.85,
        "splice_site": 0.80,
    }.get(cons.lower(), 0.5)


def _tumor_suppressor_boost(gene: str) -> float:
    """Loss-of-function in a tumor suppressor is especially bad."""
    TS = {"TP53", "BRCA1", "BRCA2", "PTEN", "APC", "RB1", "MLH1", "VHL",
          "NF1", "CDKN2A", "ATM", "CDH1", "SMAD4"}
    return 0.10 if gene in TS else 0.0


def _oncogene_boost(gene: str) -> float:
    """Gain-of-function in an oncogene is also strongly pathogenic."""
    ONC = {"EGFR", "KRAS", "MYC", "BRAF", "PIK3CA", "IDH1", "NRAS"}
    return 0.08 if gene in ONC else 0.0


def _frequency_signal(freq: float | None) -> float:
    """A high-frequency somatic hotspot ⇒ we've seen it many times.
    That's evidence of pathogenicity, not against it."""
    if not freq: return 0.0
    if freq > 0.10: return 0.10
    if freq > 0.03: return 0.05
    return 0.0


# --------------------------------------------------------------------- #
# Public entry point                                                     #
# --------------------------------------------------------------------- #

def predict_effect(gene: str, position: int, alt_base: str,
                   reference_dna: Optional[str] = None) -> dict:
    """Return an AlphaGenome-style report for a point mutation."""
    gene = gene.upper()
    if reference_dna is None:
        # fall back to the deterministic display sequence for that gene
        from backend.etl.real_data import gene_dna
        reference_dna = gene_dna(gene, length=480)

    codon_report = analyze_point_mutation(reference_dna, position, alt_base)
    if "error" in codon_report:
        return codon_report

    cons = codon_report["consequence"]

    # Base pathogenicity score
    score = _consequence_weight(cons)
    if cons in ("missense", "nonsense", "frameshift"):
        score += _tumor_suppressor_boost(gene)
        score += _oncogene_boost(gene)

    # Match against known hotspots
    same_position = None
    for hs in _HOTSPOTS_BY_GENE.get(gene, []):
        if hs["protein_change"] == codon_report["protein_change"]:
            same_position = hs
            break
    if same_position:
        score = max(score, 0.85) + _frequency_signal(same_position.get("frequency"))
    score = round(min(1.0, score), 4)

    band = ("Benign" if score < 0.20 else
            "Likely benign" if score < 0.40 else
            "Uncertain" if score < 0.60 else
            "Likely pathogenic" if score < 0.80 else
            "Pathogenic")

    # Rationale — what signals contributed to the score
    rationale = []
    rationale.append(f"Consequence: {cons} (base weight {_consequence_weight(cons):.2f})")
    if _tumor_suppressor_boost(gene):
        rationale.append(f"{gene} is a known tumor suppressor (+0.10)")
    if _oncogene_boost(gene):
        rationale.append(f"{gene} is a known oncogene (+0.08)")
    if same_position:
        rationale.append(
            f"Exact match to real cancer hotspot {gene} {same_position['protein_change']} "
            f"(disease: {same_position['disease']})"
        )

    # Peers — other hotspots in the same gene, for context
    peers = _HOTSPOTS_BY_GENE.get(gene, [])[:6]

    return dict(
        gene=gene,
        uniprot=_UNIPROT_BY_GENE.get(gene),
        input=dict(position=position, alt_base=alt_base.upper()),
        codon=codon_report,
        pathogenicity_score=score,
        pathogenicity_band=band,
        rationale=rationale,
        matched_hotspot=same_position,
        known_hotspots_in_gene=peers,
        disclaimer=("Academic scoring model — combines consequence class, "
                    "gene role and hotspot database evidence. NOT a clinical "
                    "molecular diagnostics tool."),
    )
