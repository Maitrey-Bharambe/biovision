"""Multidimensional OLAP-cube endpoint.

Every response includes:

* `dimensions`   which warehouse dimension each cube axis maps to
* `axes`         ordered list of tick labels per axis (drives the 3-D grid)
* `cells`        aggregated fact rows placed at (x_idx, y_idx, z_idx)
* `aggregation`  human-readable description
* `sql`          the SQL-ish query that produced the result
* `insight`      one-sentence data-derived summary
* `stats`        record counts before/after aggregation
* `operation`    which OLAP op the caller asked for

The frontend Live-OLAP-Cube consumes this JSON directly.  No raw fact rows
are shipped to the browser; aggregation happens in SQLAlchemy first.
"""
from __future__ import annotations

from typing import Optional
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import func, and_
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.models import orm

router = APIRouter()

# --------------------------------------------------------------------- #
# Dimension registry                                                     #
# --------------------------------------------------------------------- #

# level → (ORM column,  human label,  SQL expression for display)
GENE_LEVELS = {
    "organism":    (orm.DimOrganism.common_name,     "Organism",   "o.common_name"),
    "genome":      (orm.DimGenome.genome_id,         "Genome",     "g.genome_id"),
    "chromosome":  (orm.DimChromosome.chromosome_number, "Chromosome", "chr.chromosome_number"),
    "gene":        (orm.DimGene.gene_name,           "Gene",       "gene.gene_name"),
}
TIME_LEVELS = {
    "year":    (orm.DimTime.year,    "Year",    "t.year"),
    "quarter": (orm.DimTime.quarter, "Quarter", "t.quarter"),
    "month":   (orm.DimTime.month,   "Month",   "t.month"),
}
DISEASE_LEVELS = {
    "disease_category": (orm.DimDisease.disease_category, "Disease Category", "d.disease_category"),
    "disease":          (orm.DimDisease.disease_name,     "Disease",          "d.disease_name"),
}

HIERARCHIES = {"gene": GENE_LEVELS, "time": TIME_LEVELS, "disease": DISEASE_LEVELS}

# Parent → child, for rollup / drilldown
GENE_UP    = {"gene": "chromosome", "chromosome": "genome", "genome": "organism"}
GENE_DOWN  = {"organism": "genome", "genome": "chromosome", "chromosome": "gene"}
TIME_UP    = {"month": "quarter", "quarter": "year"}
TIME_DOWN  = {"year": "quarter", "quarter": "month"}
DIS_UP     = {"disease": "disease_category"}
DIS_DOWN   = {"disease_category": "disease"}
UP   = {"gene": GENE_UP,   "time": TIME_UP,   "disease": DIS_UP}
DOWN = {"gene": GENE_DOWN, "time": TIME_DOWN, "disease": DIS_DOWN}

METRICS = {
    "observation_count":  ("Observations",       func.count(orm.FactBiologicalObservation.observation_id), "COUNT(*)"),
    "avg_expression":     ("Avg Expression",     func.avg(orm.FactBiologicalObservation.expression_value), "AVG(expression_value)"),
    "avg_protein":        ("Avg Protein",        func.avg(orm.FactBiologicalObservation.protein_abundance), "AVG(protein_abundance)"),
    "mutation_count":     ("Mutation Count",     func.sum(orm.FactBiologicalObservation.mutation_count),   "SUM(mutation_count)"),
    "avg_cv_score":       ("Avg CV Score",       func.avg(orm.FactBiologicalObservation.cv_score),         "AVG(cv_score)"),
    "avg_ml_confidence":  ("Avg ML Confidence",  func.avg(orm.FactBiologicalObservation.ml_confidence),    "AVG(ml_confidence)"),
}


def _resolve_level(dim: str, level: str) -> tuple:
    reg = HIERARCHIES[dim]
    if level not in reg:
        # fall back to the finest level of the requested hierarchy
        level = list(reg.keys())[-1]
    return level, *reg[level]


def _apply_slice(q, filters: dict):
    """Apply optional dimension filters to a SQLAlchemy query."""
    conds = []
    if filters.get("genes"):
        conds.append(orm.DimGene.gene_name.in_(filters["genes"]))
    if filters.get("chromosomes"):
        conds.append(orm.DimChromosome.chromosome_number.in_(filters["chromosomes"]))
    if filters.get("diseases"):
        conds.append(orm.DimDisease.disease_name.in_(filters["diseases"]))
    if filters.get("years"):
        conds.append(orm.DimTime.year.in_(filters["years"]))
    if filters.get("tissues"):
        conds.append(orm.DimSample.tissue.in_(filters["tissues"]))
    if conds:
        q = q.filter(and_(*conds))
    return q


def _split_csv(v: Optional[str]) -> list:
    if not v:
        return []
    return [s.strip() for s in v.split(",") if s.strip()]


def _sql_preview(metric_expr: str, gene_expr: str, time_expr: str, dis_expr: str,
                 filters: dict) -> str:
    where = []
    for k, v in filters.items():
        if not v: continue
        col = {"genes":"gene.gene_name","chromosomes":"chr.chromosome_number",
               "diseases":"d.disease_name","years":"t.year",
               "tissues":"s.tissue"}.get(k)
        if col:
            vals = ", ".join(repr(x) for x in v)
            where.append(f"{col} IN ({vals})")
    where_clause = ("\nWHERE " + "\n  AND ".join(where)) if where else ""
    return (
        f"SELECT\n"
        f"  {time_expr} AS x,\n"
        f"  {gene_expr} AS y,\n"
        f"  {dis_expr}  AS z,\n"
        f"  {metric_expr} AS metric,\n"
        f"  COUNT(*)  AS observation_count\n"
        f"FROM FACT_BIOLOGICAL_OBSERVATION f\n"
        f"JOIN DIM_TIME    t   ON f.time_key      = t.time_key\n"
        f"JOIN DIM_GENE    gene ON f.gene_key     = gene.gene_key\n"
        f"JOIN DIM_CHROMOSOME chr ON gene.chromosome_key = chr.chromosome_key\n"
        f"JOIN DIM_GENOME    g  ON chr.genome_key = g.genome_key\n"
        f"JOIN DIM_ORGANISM  o  ON g.organism_key = o.organism_key\n"
        f"JOIN DIM_DISEASE   d  ON f.disease_key  = d.disease_key\n"
        f"JOIN DIM_SAMPLE    s  ON f.sample_key   = s.sample_key"
        f"{where_clause}\n"
        f"GROUP BY x, y, z"
    )


# --------------------------------------------------------------------- #
# Main endpoint                                                          #
# --------------------------------------------------------------------- #

@router.get("/cube")
def cube(
    operation: str = "load",
    # per-dimension hierarchy level
    gene_level: str    = "gene",
    time_level: str    = "year",
    disease_level: str = "disease",
    # axis mapping (for pivot)
    x_dim: str = "time",
    y_dim: str = "gene",
    z_dim: str = "disease",
    # cell metric
    metric: str = "observation_count",
    # filters (comma-separated)
    genes: str = "",
    chromosomes: str = "",
    diseases: str = "",
    years: str = "",
    tissues: str = "",
    db: Session = Depends(get_db),
):
    # ---- 1. resolve hierarchy levels -------------------------------- #
    gene_level, gene_col, gene_label, gene_expr = _resolve_level("gene", gene_level)
    time_level, time_col, time_label, time_expr = _resolve_level("time", time_level)
    dis_level,  dis_col,  dis_label,  dis_expr  = _resolve_level("disease", disease_level)

    # ---- 2. resolve metric ------------------------------------------ #
    if metric not in METRICS:
        metric = "observation_count"
    metric_label, metric_expr, metric_sql = METRICS[metric]

    # ---- 3. build filters ------------------------------------------- #
    filters = {
        "genes":       _split_csv(genes),
        "chromosomes": _split_csv(chromosomes),
        "diseases":    _split_csv(diseases),
        "years":       [int(y) for y in _split_csv(years) if y.isdigit()],
        "tissues":     _split_csv(tissues),
    }

    # ---- 4. build the aggregation query ----------------------------- #
    q = (
        db.query(
            gene_col.label("y_key"),
            time_col.label("x_key"),
            dis_col.label("z_key"),
            metric_expr.label("metric"),
            func.count(orm.FactBiologicalObservation.observation_id).label("observation_count"),
            func.avg(orm.FactBiologicalObservation.expression_value).label("avg_expression"),
            func.sum(orm.FactBiologicalObservation.mutation_count).label("mutation_count"),
            func.avg(orm.FactBiologicalObservation.protein_abundance).label("avg_protein"),
            func.avg(orm.FactBiologicalObservation.cv_score).label("avg_cv_score"),
            func.avg(orm.FactBiologicalObservation.ml_confidence).label("avg_ml_confidence"),
        )
        .join(orm.DimTime,      orm.FactBiologicalObservation.time_key   == orm.DimTime.time_key)
        .join(orm.DimGene,      orm.FactBiologicalObservation.gene_key   == orm.DimGene.gene_key)
        .join(orm.DimChromosome,orm.DimGene.chromosome_key                == orm.DimChromosome.chromosome_key)
        .join(orm.DimGenome,    orm.DimChromosome.genome_key              == orm.DimGenome.genome_key)
        .join(orm.DimOrganism,  orm.DimGenome.organism_key                == orm.DimOrganism.organism_key)
        .join(orm.DimDisease,   orm.FactBiologicalObservation.disease_key == orm.DimDisease.disease_key)
        .join(orm.DimSample,    orm.FactBiologicalObservation.sample_key  == orm.DimSample.sample_key)
        .group_by("y_key", "x_key", "z_key")
    )
    q = _apply_slice(q, filters)

    rows = q.all()

    # ---- 5. collect axis labels ------------------------------------- #
    x_vals = sorted({str(r.x_key) for r in rows if r.x_key is not None})
    y_vals = sorted({str(r.y_key) for r in rows if r.y_key is not None})
    z_vals = sorted({str(r.z_key) for r in rows if r.z_key is not None})

    x_idx = {v: i for i, v in enumerate(x_vals)}
    y_idx = {v: i for i, v in enumerate(y_vals)}
    z_idx = {v: i for i, v in enumerate(z_vals)}

    cells = []
    total_obs = 0
    for r in rows:
        obs = int(r.observation_count or 0)
        total_obs += obs
        cells.append(dict(
            x_key=str(r.x_key) if r.x_key is not None else "",
            y_key=str(r.y_key) if r.y_key is not None else "",
            z_key=str(r.z_key) if r.z_key is not None else "",
            x=x_idx.get(str(r.x_key), 0),
            y=y_idx.get(str(r.y_key), 0),
            z=z_idx.get(str(r.z_key), 0),
            metric=float(r.metric) if r.metric is not None else 0.0,
            observation_count=obs,
            avg_expression=round(float(r.avg_expression or 0), 3),
            mutation_count=int(r.mutation_count or 0),
            avg_protein=round(float(r.avg_protein or 0), 3),
            avg_cv_score=round(float(r.avg_cv_score or 0), 4),
            avg_ml_confidence=round(float(r.avg_ml_confidence or 0), 4),
        ))

    # ---- 6. summary + insight --------------------------------------- #
    axes_by_dim = {"time": {"vals": x_vals, "label": time_label},
                   "gene": {"vals": y_vals, "label": gene_label},
                   "disease": {"vals": z_vals, "label": dis_label}}

    top_cell = max(cells, key=lambda c: c["metric"], default=None)
    insight = None
    if top_cell and total_obs:
        insight = (
            f"After {operation.upper()} on the {gene_label}/{time_label}/{dis_label} cube, "
            f"the highest {metric_label.lower()} is at "
            f"{top_cell['y_key']} × {top_cell['x_key']} × {top_cell['z_key']} "
            f"({top_cell['metric']:.2f} · {top_cell['observation_count']} observations)."
        )
    elif not total_obs:
        insight = "No warehouse observations match the current analytical filters."

    stats = dict(
        rows_returned=len(cells),
        observations=total_obs,
        n_x=len(x_vals), n_y=len(y_vals), n_z=len(z_vals),
        groups=len(cells),
    )

    sql_text = _sql_preview(metric_sql, gene_expr, time_expr, dis_expr, filters)

    return dict(
        operation=operation,
        dimensions={
            "x": x_dim,
            "y": y_dim,
            "z": z_dim,
            "gene_level":    gene_level,
            "time_level":    time_level,
            "disease_level": dis_level,
        },
        axes={
            "x": {"dim": x_dim, "label": axes_by_dim[x_dim]["label"], "values": axes_by_dim[x_dim]["vals"]},
            "y": {"dim": y_dim, "label": axes_by_dim[y_dim]["label"], "values": axes_by_dim[y_dim]["vals"]},
            "z": {"dim": z_dim, "label": axes_by_dim[z_dim]["label"], "values": axes_by_dim[z_dim]["vals"]},
        },
        metric={"key": metric, "label": metric_label, "sql": metric_sql},
        filters=filters,
        aggregation=dict(
            function=metric_sql.split("(")[0] if "(" in metric_sql else metric_sql,
            source_granularity="gene · disease · time",
            target_granularity=f"{gene_label} · {dis_label} · {time_label}",
        ),
        cells=cells,
        stats=stats,
        sql=sql_text,
        insight=insight,
    )


@router.get("/cube/dimensions")
def cube_dimensions(db: Session = Depends(get_db)):
    """Return the picker options for filters (all real values from the DB)."""
    genes = [g[0] for g in db.query(orm.DimGene.gene_name).distinct().order_by(orm.DimGene.gene_name).all()]
    chroms = [c[0] for c in db.query(orm.DimChromosome.chromosome_number).distinct().all()]
    diseases = [d[0] for d in db.query(orm.DimDisease.disease_name).distinct().order_by(orm.DimDisease.disease_name).all()]
    disease_cats = [d[0] for d in db.query(orm.DimDisease.disease_category).distinct().all()]
    years = [int(y[0]) for y in db.query(orm.DimTime.year).distinct().order_by(orm.DimTime.year).all()]
    tissues = [t[0] for t in db.query(orm.DimSample.tissue).distinct().order_by(orm.DimSample.tissue).all()]
    return dict(
        genes=genes,
        chromosomes=sorted(chroms, key=lambda x: (len(x), x)),
        diseases=diseases,
        disease_categories=disease_cats,
        years=years,
        tissues=tissues,
        gene_hierarchy=["organism","genome","chromosome","gene"],
        time_hierarchy=["year","quarter","month"],
        disease_hierarchy=["disease_category","disease"],
        metrics=list(METRICS.keys()),
    )
