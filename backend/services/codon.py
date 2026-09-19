"""Real genetic code and codon utilities.

The tables here are the standard human genetic code (public biological
knowledge, RNA/DNA codon → amino acid). Used by the DNA-editor and
variant-effect endpoints.
"""
from __future__ import annotations

# DNA → amino acid (single-letter). Same as UniProt / NCBI.
CODON_TABLE = {
    "TTT":"F","TTC":"F","TTA":"L","TTG":"L",
    "CTT":"L","CTC":"L","CTA":"L","CTG":"L",
    "ATT":"I","ATC":"I","ATA":"I","ATG":"M",
    "GTT":"V","GTC":"V","GTA":"V","GTG":"V",
    "TCT":"S","TCC":"S","TCA":"S","TCG":"S",
    "CCT":"P","CCC":"P","CCA":"P","CCG":"P",
    "ACT":"T","ACC":"T","ACA":"T","ACG":"T",
    "GCT":"A","GCC":"A","GCA":"A","GCG":"A",
    "TAT":"Y","TAC":"Y","TAA":"*","TAG":"*",
    "CAT":"H","CAC":"H","CAA":"Q","CAG":"Q",
    "AAT":"N","AAC":"N","AAA":"K","AAG":"K",
    "GAT":"D","GAC":"D","GAA":"E","GAG":"E",
    "TGT":"C","TGC":"C","TGA":"*","TGG":"W",
    "CGT":"R","CGC":"R","CGA":"R","CGG":"R",
    "AGT":"S","AGC":"S","AGA":"R","AGG":"R",
    "GGT":"G","GGC":"G","GGA":"G","GGG":"G",
}

AA_FULL = {
    "A":"Alanine","R":"Arginine","N":"Asparagine","D":"Aspartic acid",
    "C":"Cysteine","E":"Glutamic acid","Q":"Glutamine","G":"Glycine",
    "H":"Histidine","I":"Isoleucine","L":"Leucine","K":"Lysine",
    "M":"Methionine","F":"Phenylalanine","P":"Proline","S":"Serine",
    "T":"Threonine","W":"Tryptophan","Y":"Tyrosine","V":"Valine",
    "*":"Stop",
}

# Physico-chemical grouping for a quick "how severe is this substitution" heuristic
AA_GROUP = {
    "A":"nonpolar","V":"nonpolar","L":"nonpolar","I":"nonpolar","P":"nonpolar",
    "F":"nonpolar","M":"nonpolar","W":"nonpolar","G":"nonpolar",
    "S":"polar","T":"polar","C":"polar","Y":"polar","N":"polar","Q":"polar",
    "K":"basic","R":"basic","H":"basic",
    "D":"acidic","E":"acidic",
    "*":"stop",
}


def translate(dna: str) -> str:
    """Translate a DNA string 5'→3' into amino acids. Unknown codons → 'X'."""
    dna = dna.upper().replace("U", "T")
    out = []
    for i in range(0, len(dna) - 2, 3):
        codon = dna[i:i+3]
        out.append(CODON_TABLE.get(codon, "X"))
    return "".join(out)


def substitute(dna: str, position: int, alt_base: str) -> str:
    if position < 0 or position >= len(dna):
        return dna
    return dna[:position] + alt_base.upper() + dna[position+1:]


def classify_substitution(ref_aa: str, alt_aa: str) -> str:
    if ref_aa == alt_aa:                     return "silent"
    if alt_aa == "*":                        return "nonsense"
    if ref_aa == "*":                        return "stop-loss"
    if AA_GROUP.get(ref_aa) == AA_GROUP.get(alt_aa):
        return "conservative missense"
    return "missense"


def analyze_point_mutation(reference_dna: str, position: int, alt_base: str) -> dict:
    """Full codon-level analysis of a single-nucleotide substitution."""
    reference_dna = reference_dna.upper()
    alt_base = alt_base.upper()
    if position < 0 or position >= len(reference_dna):
        return {"error": "position out of range"}
    ref_base = reference_dna[position]
    codon_start = (position // 3) * 3
    ref_codon = reference_dna[codon_start:codon_start + 3]
    if len(ref_codon) < 3:
        return {"error": "position too close to sequence end"}
    alt_codon = ref_codon[:position - codon_start] + alt_base + ref_codon[position - codon_start + 1:]
    ref_aa = CODON_TABLE.get(ref_codon, "X")
    alt_aa = CODON_TABLE.get(alt_codon, "X")
    consequence = classify_substitution(ref_aa, alt_aa)
    aa_pos = codon_start // 3 + 1
    return {
        "position": position,
        "ref_base": ref_base,
        "alt_base": alt_base,
        "codon_position": position - codon_start + 1,
        "ref_codon": ref_codon,
        "alt_codon": alt_codon,
        "ref_aa":  ref_aa,
        "alt_aa":  alt_aa,
        "ref_aa_full": AA_FULL.get(ref_aa, "?"),
        "alt_aa_full": AA_FULL.get(alt_aa, "?"),
        "aa_position": aa_pos,
        "protein_change": f"{ref_aa}{aa_pos}{alt_aa}",
        "consequence": consequence,
    }
