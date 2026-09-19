"""Reproducible synthetic biological dataset generator.

Generates realistic-looking (but entirely synthetic) genomic, transcriptomic,
proteomic, mutation and image-metadata records so BioVision can run end to end
without pulling private data. All identifiers, positions and expression values
are drawn from a fixed random seed for reproducibility.
"""
from __future__ import annotations

import random
import string
from dataclasses import dataclass, asdict
from datetime import date
from typing import List

SEED = 42
random.seed(SEED)

ORGANISMS = [
    ("Homo sapiens",     "Human", 9606),
    ("Mus musculus",     "Mouse", 10090),
    ("Rattus norvegicus","Rat",   10116),
]

CHROMOSOMES = [str(i) for i in range(1, 23)] + ["X", "Y"]

GENE_CATALOG = [
    ("TP53",   "17", "Tumor protein P53 — apoptosis regulator"),
    ("BRCA1",  "17", "DNA repair, breast cancer susceptibility"),
    ("BRCA2",  "13", "DNA repair, homologous recombination"),
    ("EGFR",   "7",  "Epidermal growth factor receptor"),
    ("KRAS",   "12", "GTPase, RAS signaling"),
    ("MYC",    "8",  "Transcription factor, proliferation"),
    ("PTEN",   "10", "Tumor suppressor, PI3K pathway"),
    ("APC",    "5",  "Adenomatous polyposis coli, Wnt signaling"),
    ("RB1",    "13", "Retinoblastoma tumor suppressor"),
    ("MLH1",   "3",  "Mismatch repair"),
    ("BRAF",   "7",  "Serine/threonine-protein kinase B-Raf"),
    ("VHL",    "3",  "Von Hippel-Lindau, hypoxia response"),
    ("NF1",    "17", "Neurofibromin 1, Ras GTPase activator"),
    ("PIK3CA", "3",  "PI3K catalytic subunit alpha"),
    ("CDKN2A", "9",  "Cyclin-dependent kinase inhibitor"),
    ("ATM",    "11", "DNA damage response kinase"),
    ("CDH1",   "16", "E-cadherin, cell adhesion"),
    ("SMAD4",  "18", "TGF-β signaling mediator"),
]

DISEASES = [
    ("D001", "Breast Cancer",     "Oncology"),
    ("D002", "Lung Adenocarcinoma","Oncology"),
    ("D003", "Colorectal Cancer", "Oncology"),
    ("D004", "Melanoma",          "Oncology"),
    ("D005", "Glioblastoma",      "Oncology"),
    ("D006", "Healthy Control",   "Reference"),
]

TISSUES = ["Breast", "Lung", "Colon", "Skin", "Brain", "Liver", "Blood"]
IMAGE_TYPES = ["karyotype", "microscopy", "cell_nuclei", "histopathology", "fluorescence"]
MUTATION_TYPES = ["SNP", "INS", "DEL", "SUB"]
CONSEQUENCES = ["missense", "synonymous", "nonsense", "frameshift", "splice_site"]


def _dna(n: int) -> str:
    return "".join(random.choices("ACGT", k=n))


def _protein(n: int) -> str:
    return "".join(random.choices("ACDEFGHIKLMNPQRSTVWY", k=n))


@dataclass
class SyntheticWarehouse:
    organisms: list
    genomes: list
    chromosomes: list
    genes: list
    samples: list
    rna: list
    proteins: list
    mutations: list
    diseases: list
    images: list
    times: list
    facts: list

    def to_dict(self):
        return {k: [asdict(x) if hasattr(x, "__dataclass_fields__") else x for x in v]
                for k, v in self.__dict__.items()}


def build(n_samples: int = 60, obs_per_sample: int = 30) -> dict:
    """Return dictionaries keyed by table name, ready to bulk-insert."""
    random.seed(SEED)

    organisms = [
        dict(organism_key=i + 1, scientific_name=s, common_name=c, taxonomy_id=t)
        for i, (s, c, t) in enumerate(ORGANISMS)
    ]

    genomes = [
        dict(genome_key=i + 1, genome_id=f"G{str(i+1).zfill(3)}",
             organism_key=(i % len(organisms)) + 1,
             assembly_version=f"v{random.randint(37,39)}.{random.randint(0,4)}",
             build_date=date(2021 + i % 5, 1 + i % 12, 1))
        for i in range(3)
    ]

    chromosomes = []
    ck = 1
    for g in genomes:
        for cn in CHROMOSOMES:
            chromosomes.append(dict(
                chromosome_key=ck, genome_key=g["genome_key"],
                chromosome_number=cn,
                length_bp=random.randint(50_000_000, 250_000_000),
                gc_content=round(random.uniform(37, 48), 2),
            ))
            ck += 1

    # Map (genome_key, chrom_number) -> chromosome_key for the primary human genome
    human_genome_key = 1
    chrom_lookup = {(c["genome_key"], c["chromosome_number"]): c["chromosome_key"]
                    for c in chromosomes}

    genes = []
    for i, (name, chrom, desc) in enumerate(GENE_CATALOG):
        start = random.randint(1_000_000, 200_000_000)
        genes.append(dict(
            gene_key=i + 1,
            gene_id=f"ENSG{str(i+1).zfill(11)}",
            gene_name=name,
            chromosome_key=chrom_lookup[(human_genome_key, chrom)],
            start_position=start,
            end_position=start + random.randint(1_000, 200_000),
            strand=random.choice(["+", "-"]),
            biotype="protein_coding",
            description=desc,
        ))

    samples = []
    for i in range(n_samples):
        cond = random.choice(["healthy", "diseased"])
        samples.append(dict(
            sample_key=i + 1,
            sample_id=f"S{str(i+1).zfill(3)}",
            tissue=random.choice(TISSUES),
            biological_condition=cond,
            donor_age_bucket=random.choice(["20-30", "30-40", "40-50", "50-60", "60-70"]),
            donor_sex=random.choice(["M", "F"]),
        ))

    diseases = [dict(disease_key=i + 1, disease_id=did, disease_name=dn, disease_category=dc)
                for i, (did, dn, dc) in enumerate(DISEASES)]

    rna = []
    rk = 1
    for s in samples:
        for g in genes:
            base = 20 if s["biological_condition"] == "healthy" else 60
            expr = round(max(0, random.gauss(base, 20)), 3)
            cat = "LOW" if expr < 15 else "MID" if expr < 60 else "HIGH"
            rna.append(dict(
                rna_key=rk,
                rna_sample_id=f"R{str(rk).zfill(4)}",
                gene_key=g["gene_key"],
                tissue=s["tissue"],
                condition_label=s["biological_condition"],
                read_count=int(expr * 100 + random.randint(0, 500)),
                tpm=expr,
                fpkm=round(expr * random.uniform(0.8, 1.2), 3),
                expression_value=expr,
                expression_category=cat,
            ))
            rk += 1

    proteins = []
    for i, g in enumerate(genes):
        L = random.randint(180, 720)
        proteins.append(dict(
            protein_key=i + 1,
            protein_id=f"P{str(random.randint(10000, 99999))}",
            gene_key=g["gene_key"],
            protein_name=f"{g['gene_name']} protein",
            amino_acid_length=L,
            molecular_weight=round(L * random.uniform(105, 118), 3),
            abundance=round(random.uniform(0.1, 100), 3),
            cellular_location=random.choice(["Nucleus", "Cytoplasm", "Membrane",
                                              "Mitochondrion", "ER"]),
            ec_number=f"{random.randint(1,6)}.{random.randint(1,20)}.{random.randint(1,50)}.{random.randint(1,300)}",
            function_summary=g["description"],
        ))

    mutations = []
    mk = 1
    for g in genes:
        for _ in range(random.randint(3, 8)):
            mtype = random.choice(MUTATION_TYPES)
            ref = random.choice("ACGT")
            alt = random.choice([c for c in "ACGT" if c != ref])
            mutations.append(dict(
                mutation_key=mk,
                mutation_id=f"MUT{str(mk).zfill(5)}",
                gene_key=g["gene_key"],
                chromosome_key=g["chromosome_key"],
                position=g["start_position"] + random.randint(0, 20000),
                ref_allele=ref if mtype == "SNP" else _dna(random.randint(1, 5)),
                alt_allele=alt if mtype == "SNP" else _dna(random.randint(1, 5)),
                mutation_type=mtype,
                consequence=random.choice(CONSEQUENCES),
                frequency=round(random.uniform(0.001, 0.35), 4),
            ))
            mk += 1

    images = []
    for i, s in enumerate(samples):
        label = "abnormal" if s["biological_condition"] == "diseased" and random.random() < 0.8 else "healthy"
        images.append(dict(
            image_key=i + 1,
            image_id=f"IMG{str(i+1).zfill(4)}",
            sample_key=s["sample_key"],
            image_type=random.choice(IMAGE_TYPES),
            tissue=s["tissue"],
            label=label,
            source="synthetic",
            path=f"/images/{s['sample_id']}.png",
        ))

    # Small time dimension
    times = []
    for i, y in enumerate(range(2021, 2027)):
        for m in range(1, 13):
            times.append(dict(
                time_key=len(times) + 1,
                full_date=date(y, m, 1),
                year=y, quarter=(m - 1) // 3 + 1, month=m, day=1,
                day_of_week=date(y, m, 1).weekday(),
            ))

    # Facts — every sample × sampled genes
    facts = []
    fid = 1
    for s in samples:
        picked_genes = random.sample(genes, k=obs_per_sample if obs_per_sample <= len(genes) else len(genes))
        for g in picked_genes:
            rna_row = next((r for r in rna
                            if r["gene_key"] == g["gene_key"]
                            and r["condition_label"] == s["biological_condition"]), None)
            protein_row = next((p for p in proteins if p["gene_key"] == g["gene_key"]), None)
            mut_row = next((m for m in mutations if m["gene_key"] == g["gene_key"]), None)
            image_row = next((im for im in images if im["sample_key"] == s["sample_key"]), None)
            disease_row = random.choice(diseases)
            expr = rna_row["expression_value"] if rna_row else 0
            abund = protein_row["abundance"] if protein_row else 0
            facts.append(dict(
                observation_id=fid,
                sample_key=s["sample_key"],
                gene_key=g["gene_key"],
                genome_key=human_genome_key,
                rna_key=rna_row["rna_key"] if rna_row else None,
                protein_key=protein_row["protein_key"] if protein_row else None,
                mutation_key=mut_row["mutation_key"] if mut_row else None,
                disease_key=disease_row["disease_key"],
                image_key=image_row["image_key"] if image_row else None,
                time_key=random.choice(times)["time_key"],
                expression_value=expr,
                protein_abundance=abund,
                mutation_count=random.randint(0, 5),
                cv_score=round(random.uniform(0.5, 0.98), 4),
                ml_prediction=disease_row["disease_name"],
                ml_confidence=round(random.uniform(0.6, 0.98), 4),
            ))
            fid += 1

    return dict(
        organisms=organisms, genomes=genomes, chromosomes=chromosomes,
        genes=genes, samples=samples, rna=rna, proteins=proteins,
        mutations=mutations, diseases=diseases, images=images,
        times=times, facts=facts,
    )


def sample_dna(gene_name: str, length: int = 480) -> str:
    random.seed(hash(gene_name) & 0xffff)
    return _dna(length)


def sample_protein(gene_name: str, length: int = 200) -> str:
    random.seed((hash(gene_name) >> 8) & 0xffff)
    return _protein(length)
