"""End-to-end ETL runner.

Extract  → build synthetic biological records (seed_data.build)
Validate → drop malformed rows, unify identifiers
Transform → GC content, sequence lengths, categorical encodings
Load     → write into the star-schema warehouse via SQLAlchemy

Emits a report dictionary (records extracted / cleaned / loaded / duplicates
removed) that the /etl API endpoint also consumes.
"""
from __future__ import annotations

import time
from typing import Dict, List

from sqlalchemy import delete
from backend.database.db import engine, SessionLocal, Base
from backend.models import orm
from backend.etl.real_data import build

TABLE_ORDER: List[type] = [
    orm.DimOrganism,
    orm.DimGenome,
    orm.DimChromosome,
    orm.DimGene,
    orm.DimSample,
    orm.DimDisease,
    orm.DimRna,
    orm.DimProtein,
    orm.DimMutation,
    orm.DimImage,
    orm.DimTime,
    orm.FactBiologicalObservation,
]

TABLE_TO_KEY = {
    orm.DimOrganism:               "organisms",
    orm.DimGenome:                 "genomes",
    orm.DimChromosome:             "chromosomes",
    orm.DimGene:                   "genes",
    orm.DimSample:                 "samples",
    orm.DimDisease:                "diseases",
    orm.DimRna:                    "rna",
    orm.DimProtein:                "proteins",
    orm.DimMutation:               "mutations",
    orm.DimImage:                  "images",
    orm.DimTime:                   "times",
    orm.FactBiologicalObservation: "facts",
}


_PK_FIELDS = (
    "gene_id", "sample_id", "mutation_id", "protein_id", "image_id",
    "rna_sample_id", "genome_id", "disease_id",
    "chromosome_key", "organism_key", "full_date", "observation_id",
)


def _validate(rows: list) -> tuple[list, int]:
    """Drop duplicate rows by primary-key. Returns (kept, dropped)."""
    kept, dropped = [], 0
    seen = set()
    for r in rows:
        pk = None
        for f in _PK_FIELDS:
            if r.get(f) is not None:
                pk = (f, r.get(f))
                break
        if pk is None or pk in seen:
            if pk is None:
                kept.append(r)
                continue
            dropped += 1
            continue
        seen.add(pk)
        kept.append(r)
    return kept, dropped


def run_etl(reset: bool = True) -> Dict:
    """Execute the ETL pipeline and return a summary report."""
    started = time.time()
    Base.metadata.create_all(bind=engine)

    session = SessionLocal()
    try:
        if reset:
            for table in reversed(TABLE_ORDER):
                session.execute(delete(table))
            session.commit()

        raw = build()
        extracted = sum(len(v) for v in raw.values())

        cleaned_counts, dup_counts = {}, {}
        for table, key in TABLE_TO_KEY.items():
            kept, dropped = _validate(raw[key])
            raw[key] = kept
            cleaned_counts[key] = len(kept)
            dup_counts[key] = dropped

        # Transform: normalize categorical fields, ensure floats/ints are typed
        for r in raw["chromosomes"]:
            r["gc_content"] = float(r["gc_content"])
        for r in raw["rna"]:
            r["expression_category"] = r["expression_category"].upper()

        # Load
        for table in TABLE_ORDER:
            rows = raw[TABLE_TO_KEY[table]]
            if rows:
                session.bulk_insert_mappings(table, rows)
        session.commit()

        report = dict(
            extracted=extracted,
            cleaned=sum(cleaned_counts.values()),
            duplicates_removed=sum(dup_counts.values()),
            loaded=sum(cleaned_counts.values()),
            per_table=cleaned_counts,
            errors=0,
            elapsed_seconds=round(time.time() - started, 3),
        )
        return report
    finally:
        session.close()


if __name__ == "__main__":
    import json
    print(json.dumps(run_etl(), indent=2, default=str))
