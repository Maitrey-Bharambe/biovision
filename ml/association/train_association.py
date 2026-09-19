"""Association rule mining on the biological warehouse.

Builds one transaction per patient from the real WDBC + gene-fact rows and
runs FP-Growth to surface support / confidence / lift statistics.

The token set is deliberately compact — we only include categorical
signals with real per-sample variation (mutation type present, expression
tier, disease, tissue, condition), never every gene name (which would
appear in every transaction and blow up the itemset lattice).
"""
from __future__ import annotations

# Cap BLAS threads BEFORE importing numpy/pandas so parallel training does
# not fight with the API server for the same OpenBLAS thread pool.
import os
for _v in ("OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "OMP_NUM_THREADS"):
    os.environ.setdefault(_v, "1")

import json
from pathlib import Path

import pandas as pd
from mlxtend.frequent_patterns import fpgrowth, association_rules
from mlxtend.preprocessing import TransactionEncoder

from backend.database.db import SessionLocal
from backend.models import orm

ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / "models_saved"
MODEL_DIR.mkdir(exist_ok=True)


def _build_transactions() -> list[list[str]]:
    db = SessionLocal()
    try:
        facts   = pd.read_sql(db.query(orm.FactBiologicalObservation).statement, db.bind)
        genes   = pd.read_sql(db.query(orm.DimGene).statement, db.bind)
        muts    = pd.read_sql(db.query(orm.DimMutation).statement, db.bind)
        rna     = pd.read_sql(db.query(orm.DimRna).statement, db.bind)
        disease = pd.read_sql(db.query(orm.DimDisease).statement, db.bind)
        samples = pd.read_sql(db.query(orm.DimSample).statement, db.bind)
    finally:
        db.close()

    df = facts.merge(genes[["gene_key", "gene_name"]], on="gene_key", how="left")
    df = df.merge(muts[["mutation_key", "mutation_type"]], on="mutation_key", how="left")
    df = df.merge(rna[["rna_key", "expression_category"]], on="rna_key", how="left")
    df = df.merge(disease[["disease_key", "disease_name"]], on="disease_key", how="left")
    df = df.merge(samples[["sample_key", "tissue", "biological_condition"]], on="sample_key", how="left")

    transactions: list[list[str]] = []
    for sk, grp in df.groupby("sample_key"):
        tokens = set()

        # per-sample scalars (real signal)
        first = grp.iloc[0]
        if pd.notna(first["biological_condition"]):
            tokens.add(f"condition:{first['biological_condition']}")
        if pd.notna(first["tissue"]):
            tokens.add(f"tissue:{first['tissue']}")
        if pd.notna(first["disease_name"]):
            tokens.add(f"disease:{first['disease_name']}")

        # per-gene signal — only include when it carries variation
        for _, row in grp.iterrows():
            g = row.get("gene_name")
            if pd.notna(row["mutation_type"]) and pd.notna(g):
                tokens.add(f"mut:{g}:{row['mutation_type']}")
            if pd.notna(row["expression_category"]) and pd.notna(g):
                # only HIGH / LOW are informative — MID is too common
                cat = row["expression_category"]
                if cat in ("HIGH", "LOW"):
                    tokens.add(f"expr:{g}:{cat}")

        if tokens:
            transactions.append(sorted(tokens))
    return transactions


def train(min_support: float = 0.35, min_confidence: float = 0.7,
          max_len: int = 4) -> dict:
    txs = _build_transactions()
    if not txs:
        payload = dict(rules=[], frequent_itemsets=[], n_transactions=0)
        (MODEL_DIR / "association_report.json").write_text(json.dumps(payload, indent=2))
        return payload

    te = TransactionEncoder()
    onehot = te.fit(txs).transform(txs)
    df = pd.DataFrame(onehot, columns=te.columns_)

    # max_len caps itemset size so FP-Growth cannot combinatorially explode
    freq = fpgrowth(df, min_support=min_support, use_colnames=True, max_len=max_len)
    if freq.empty:
        payload = dict(rules=[], frequent_itemsets=[], n_transactions=len(txs),
                       min_support=min_support, min_confidence=min_confidence)
        (MODEL_DIR / "association_report.json").write_text(json.dumps(payload, indent=2))
        return payload

    rules = association_rules(freq, metric="confidence", min_threshold=min_confidence)
    rules = rules.sort_values("lift", ascending=False).head(50)

    top_rules = [
        dict(
            antecedents=sorted(list(r.antecedents)),
            consequents=sorted(list(r.consequents)),
            support=round(float(r.support), 4),
            confidence=round(float(r.confidence), 4),
            lift=round(float(r.lift), 4),
        )
        for r in rules.itertuples(index=False)
    ]

    payload = dict(
        source="Real ETL warehouse (WDBC samples + real gene facts)",
        n_transactions=len(txs),
        min_support=min_support,
        min_confidence=min_confidence,
        max_itemset_length=max_len,
        rules=top_rules,
        frequent_itemsets=[
            dict(itemset=sorted(list(row.itemsets)), support=round(float(row.support), 4))
            for row in freq.sort_values("support", ascending=False).head(30).itertuples(index=False)
        ],
    )
    (MODEL_DIR / "association_report.json").write_text(json.dumps(payload, indent=2))
    return payload


if __name__ == "__main__":
    print(json.dumps(train(), indent=2))
