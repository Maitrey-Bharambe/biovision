"""Precision-oncology remedy recommender.

Maps mutations to FDA-approved targeted therapies. All entries are from
public regulatory and NCCN guideline knowledge — no proprietary data.

The scoring formula is intentionally transparent so a reader can see WHY
a therapy was suggested (variant → mechanism → drug class → drug).
"""
from __future__ import annotations

# Each entry is:  (gene, variant_key, drug, drug_class, disease, response, evidence)
#   variant_key: substring of protein_change ('V600E', 'L858R', ...) or '*' for gene-level
#   response:    dataset-derived response probability, published range
#   evidence:    'FDA-approved' | 'Guideline-recommended' | 'Clinical trial'
REMEDY_MAP = [
    # Melanoma / colorectal / thyroid
    ("BRAF",  "V600E", "Vemurafenib",   "BRAF inhibitor",         "Melanoma",           0.53, "FDA-approved"),
    ("BRAF",  "V600E", "Dabrafenib",    "BRAF inhibitor",         "Melanoma",           0.50, "FDA-approved"),
    ("BRAF",  "V600E", "Dabrafenib + Trametinib", "BRAF+MEK combo","Melanoma",          0.68, "FDA-approved"),
    ("BRAF",  "V600K", "Dabrafenib + Trametinib", "BRAF+MEK combo","Melanoma",          0.60, "FDA-approved"),

    # Lung
    ("EGFR",  "L858R", "Osimertinib",   "3rd-gen EGFR TKI",       "NSCLC",              0.80, "FDA-approved"),
    ("EGFR",  "L858R", "Erlotinib",     "1st-gen EGFR TKI",       "NSCLC",              0.65, "FDA-approved"),
    ("EGFR",  "L858R", "Gefitinib",     "1st-gen EGFR TKI",       "NSCLC",              0.65, "FDA-approved"),
    ("EGFR",  "T790M", "Osimertinib",   "3rd-gen EGFR TKI",       "NSCLC (resistance)", 0.71, "FDA-approved"),
    ("EGFR",  "exon19del", "Osimertinib","3rd-gen EGFR TKI",      "NSCLC",              0.80, "FDA-approved"),

    # KRAS
    ("KRAS",  "G12C", "Sotorasib",      "KRAS G12C inhibitor",    "NSCLC",              0.37, "FDA-approved"),
    ("KRAS",  "G12C", "Adagrasib",      "KRAS G12C inhibitor",    "NSCLC",              0.43, "FDA-approved"),
    ("KRAS",  "G12D", "Investigational MRTX1133", "KRAS G12D inhibitor", "Pancreatic",  0.28, "Clinical trial"),

    # BRCA / PARP inhibitors — synthetic lethality
    ("BRCA1", "*",     "Olaparib",      "PARP inhibitor",         "Breast/Ovarian",     0.60, "FDA-approved"),
    ("BRCA1", "*",     "Talazoparib",   "PARP inhibitor",         "Breast",             0.63, "FDA-approved"),
    ("BRCA2", "*",     "Olaparib",      "PARP inhibitor",         "Breast/Ovarian",     0.60, "FDA-approved"),
    ("BRCA2", "*",     "Rucaparib",     "PARP inhibitor",         "Ovarian",            0.54, "FDA-approved"),

    # PI3K
    ("PIK3CA","H1047R","Alpelisib",     "PI3Kα inhibitor",        "HR+/HER2- Breast",   0.36, "FDA-approved"),
    ("PIK3CA","E545K", "Alpelisib",     "PI3Kα inhibitor",        "HR+/HER2- Breast",   0.31, "FDA-approved"),

    # IDH
    ("IDH1",  "R132H", "Ivosidenib",    "IDH1 inhibitor",         "AML/Cholangio",      0.42, "FDA-approved"),

    # Others
    ("NRAS",  "*",     "Binimetinib",   "MEK inhibitor",          "Melanoma",           0.30, "FDA-approved"),
    ("VHL",   "*",     "Belzutifan",    "HIF-2α inhibitor",       "VHL-associated RCC", 0.49, "FDA-approved"),

    # TP53 — currently no direct-targeted approvals, so recommend clinical strategies
    ("TP53",  "*",     "APR-246 / Eprenetapopt", "TP53 reactivator","MDS/AML (trial)",  0.30, "Clinical trial"),
    ("TP53",  "*",     "Consider standard chemotherapy + IO", "Chemo-immunotherapy",
                        "Broad", 0.25, "Guideline-recommended"),

    # PTEN loss → PI3K/AKT axis
    ("PTEN",  "*",     "Capivasertib",  "AKT inhibitor",          "Breast",             0.29, "FDA-approved"),

    # HER2 (not in our gene panel but classic example — keep for teaching)
]

# Human-readable mechanism explanations
MECHANISM_NOTES = {
    "BRAF inhibitor":  "Blocks the constitutively-active BRAF kinase produced by V600 mutations.",
    "BRAF+MEK combo":  "Combined inhibition delays MAPK-pathway reactivation and prolongs response.",
    "1st-gen EGFR TKI":"Reversibly binds ATP pocket of the mutant EGFR kinase.",
    "3rd-gen EGFR TKI":"Covalent binder that also overcomes the T790M resistance mutation.",
    "KRAS G12C inhibitor":"Covalently binds the mutant cysteine, locking KRAS in its GDP state.",
    "KRAS G12D inhibitor":"Investigational small molecule targeting the D12 pocket.",
    "PARP inhibitor":  "Synthetic-lethal with BRCA-deficient tumours that cannot repair DSBs.",
    "PI3Kα inhibitor": "Blocks the mutationally-activated p110α subunit of PI3K.",
    "IDH1 inhibitor":  "Reverses the neomorphic activity that produces 2-hydroxyglutarate.",
    "MEK inhibitor":   "Blocks MEK1/2 downstream of RAS/RAF.",
    "HIF-2α inhibitor":"Corrects HIF-2α over-activation from VHL loss.",
    "TP53 reactivator":"Restores wild-type-like conformation to mutant p53 (investigational).",
    "AKT inhibitor":   "Blocks the AKT node of the PI3K/AKT/mTOR pathway.",
}


def recommend(mutations: list[dict]) -> dict:
    """`mutations` is a list of {gene, protein_change} dicts.
    Returns ranked drug recommendations with mechanism + evidence."""
    ranked = []
    matched_variants = []
    for m in mutations:
        gene = str(m.get("gene", "")).upper()
        pc   = str(m.get("protein_change", ""))
        for (g, key, drug, cls, disease, resp, evid) in REMEDY_MAP:
            if g != gene: continue
            if key != "*" and key not in pc: continue
            score = resp
            if key == "*":                 # gene-level (weaker specificity)
                score *= 0.9
            ranked.append(dict(
                gene=gene, matched_on=(pc or gene),
                drug=drug, drug_class=cls, disease_context=disease,
                response_estimate=round(score, 3),
                mechanism=MECHANISM_NOTES.get(cls, ""),
                evidence=evid,
            ))
            matched_variants.append(f"{gene} {pc}".strip())

    ranked.sort(key=lambda r: r["response_estimate"], reverse=True)
    # dedupe by drug, keep best
    seen = set(); dedup = []
    for r in ranked:
        if r["drug"] in seen: continue
        seen.add(r["drug"]); dedup.append(r)

    return dict(
        input_variants=[dict(gene=m.get("gene"), protein_change=m.get("protein_change")) for m in mutations],
        matched=matched_variants,
        n_recommendations=len(dedup),
        recommendations=dedup[:15],
        disclaimer=("For education only. Real precision-oncology decisions "
                    "require molecular tumour board review, clinical context, "
                    "and up-to-date NCCN/FDA guidance."),
    )
