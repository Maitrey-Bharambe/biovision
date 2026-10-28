"""BioVision Nexus — analytical planner + grounded explainer.

The LLM never touches the database.  It is only allowed to:
  (a) choose from an allowlist of tools (name + parameter dict), and
  (b) explain the structured results the backend produced.

Everything else — SQL, model inference, warehouse metadata — runs
through this module's typed tool executor.  Group pattern:

    plan(question) -> AnalyticalPlan
    execute(plan)  -> list of ToolResult   (backend-only; no LLM)
    explain(question, results) -> ExplanationBlock

If GROQ_API_KEY is unset or the provider errors, we skip the LLM
steps and return deterministic fallbacks that are honest about the
missing capability.
"""
from __future__ import annotations

import json
import os
import re
import time
from dataclasses import dataclass, field, asdict
from typing import Any, Callable, Dict, List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

try:
    import httpx  # already a dep of FastAPI starlette; use for Groq HTTP
except Exception:  # pragma: no cover - diagnostic only
    httpx = None  # type: ignore


# ---------------------------------------------------------------
# Tool allowlist
# ---------------------------------------------------------------
#
# Each tool is a tiny function (session, params) -> dict.  The dict is
# serialisable JSON only.  Params are validated against ALLOWED_PARAMS
# before the function runs.
#
# NO tool accepts raw SQL from the caller.  Filters, measures and
# dimension values are checked against the known vocabulary below.

ALLOWED_GENES: Optional[set] = None  # lazy-loaded from DB on first call
ALLOWED_DIMS = {"gene", "chromosome", "genome", "organism",
                "disease", "tissue", "year", "sample"}
ALLOWED_MEASURES = {"observation_count", "mutation_count",
                    "avg_expression", "avg_cv_score",
                    "avg_ml_confidence"}


def _load_allowed_genes(session: Session) -> set:
    global ALLOWED_GENES
    if ALLOWED_GENES is None:
        try:
            rows = session.execute(text("SELECT gene_name FROM dim_gene")).fetchall()
            ALLOWED_GENES = {r[0] for r in rows if r[0]}
        except Exception:
            ALLOWED_GENES = set()
    return ALLOWED_GENES


def _safe_int(v, default=None):
    try:
        return int(v)
    except Exception:
        return default


def _safe_str(v, maxlen=64):
    if v is None:
        return None
    s = str(v).strip()[:maxlen]
    if not re.match(r"^[A-Za-z0-9_\-\.\s]+$", s):
        return None
    return s


# ---------------- tool implementations ----------------
def tool_overview(session: Session, params: dict) -> dict:
    """Warehouse snapshot — totals per entity."""
    sql = ("SELECT 'genes' AS k, COUNT(*) AS v FROM dim_gene UNION ALL "
           "SELECT 'mutations', COUNT(*) FROM dim_mutation UNION ALL "
           "SELECT 'proteins',  COUNT(*) FROM dim_protein UNION ALL "
           "SELECT 'rna_samples', COUNT(*) FROM dim_rna UNION ALL "
           "SELECT 'samples',   COUNT(*) FROM dim_sample")
    rows = session.execute(text(sql)).fetchall()
    totals = {r[0]: r[1] for r in rows}
    return {"sql": sql, "totals": totals}


def tool_mutations_by_type(session: Session, params: dict) -> dict:
    sql = ("SELECT mutation_type AS type, COUNT(*) AS count "
           "FROM dim_mutation GROUP BY mutation_type ORDER BY count DESC")
    rows = session.execute(text(sql)).fetchall()
    return {"sql": sql, "rows": [{"type": r[0], "count": r[1]} for r in rows]}


def tool_rna_by_tissue(session: Session, params: dict) -> dict:
    gene = _safe_str(params.get("gene"))
    allowed = _load_allowed_genes(session)
    if gene and allowed and gene.upper() not in {g.upper() for g in allowed}:
        return {"error": f"Gene '{gene}' is not in the warehouse."}
    gene = gene.upper() if gene else None
    where = "WHERE UPPER(g.gene_name) = :gene" if gene else ""
    sql = (
        "SELECT r.tissue AS tissue, r.condition_label AS condition, "
        "       AVG(r.tpm) AS mean_tpm, COUNT(*) AS n "
        "FROM dim_rna r JOIN dim_gene g ON r.gene_key = g.gene_key "
        f"{where} "
        "GROUP BY r.tissue, r.condition_label "
        "ORDER BY r.tissue, r.condition_label"
    )
    rows = session.execute(text(sql), {"gene": gene} if gene else {}).fetchall()
    return {
        "sql": sql,
        "params": {"gene": gene} if gene else {},
        "rows": [
            {"tissue": r[0], "condition": r[1],
             "mean_tpm": float(r[2] or 0), "n": r[3]} for r in rows
        ],
    }


def tool_mutations_for_gene(session: Session, params: dict) -> dict:
    gene = _safe_str(params.get("gene"))
    if not gene:
        return {"error": "Missing or invalid 'gene' parameter."}
    allowed = _load_allowed_genes(session)
    if allowed and gene.upper() not in {g.upper() for g in allowed}:
        return {"error": f"Gene '{gene}' is not in the warehouse."}
    sql = (
        "SELECT m.mutation_id, m.mutation_type, m.consequence, "
        "       m.position, m.ref_allele, m.alt_allele, m.frequency "
        "FROM dim_mutation m "
        "JOIN dim_gene g ON m.gene_key = g.gene_key "
        "WHERE UPPER(g.gene_name) = :gene "
        "ORDER BY m.frequency DESC"
    )
    rows = session.execute(text(sql), {"gene": gene.upper()}).fetchall()
    return {
        "sql": sql,
        "params": {"gene": gene.upper()},
        "rows": [
            {"id": r[0], "type": r[1], "consequence": r[2],
             "position": r[3], "ref": r[4], "alt": r[5],
             "frequency": float(r[6] or 0)} for r in rows
        ],
    }


def tool_gene_card(session: Session, params: dict) -> dict:
    gene = _safe_str(params.get("gene"))
    if not gene:
        return {"error": "Missing 'gene' parameter."}
    sql = (
        "SELECT g.gene_name, g.gene_id, g.biotype, c.chromosome_number, "
        "       g.start_position, g.end_position, g.strand, g.description "
        "FROM dim_gene g LEFT JOIN dim_chromosome c "
        "       ON g.chromosome_key = c.chromosome_key "
        "WHERE UPPER(g.gene_name) = :gene"
    )
    r = session.execute(text(sql), {"gene": gene.upper()}).fetchone()
    if not r:
        return {"error": f"No gene '{gene}' in the warehouse."}
    return {
        "sql": sql,
        "params": {"gene": gene.upper()},
        "card": {
            "gene_name": r[0], "gene_id": r[1], "biotype": r[2],
            "chromosome": r[3], "start": r[4], "end": r[5],
            "strand": r[6], "description": r[7],
        },
    }


def tool_data_sources(session: Session, params: dict) -> dict:
    """Static metadata — the sources behind the warehouse snapshot."""
    sources = [
        {"name": "Ensembl",              "modality": "Genome / gene coordinates",
         "role": "DIM_GENE, DIM_CHROMOSOME, DIM_GENOME"},
        {"name": "UniProt",              "modality": "Protein sequence + metadata",
         "role": "DIM_PROTEIN"},
        {"name": "ClinVar",              "modality": "Curated clinical variants",
         "role": "DIM_MUTATION"},
        {"name": "COSMIC",               "modality": "Somatic cancer mutations",
         "role": "DIM_MUTATION"},
        {"name": "GTEx",                 "modality": "RNA expression (healthy)",
         "role": "DIM_RNA"},
        {"name": "TCGA-BRCA",            "modality": "RNA expression (cancer)",
         "role": "DIM_RNA, DIM_SAMPLE"},
        {"name": "UCI WDBC",             "modality": "Diagnostic feature table",
         "role": "DIM_SAMPLE (classification/clustering)"},
        {"name": "MedMNIST / BreastMNIST","modality": "Breast ultrasound patches",
         "role": "DIM_IMAGE, CV model"},
    ]
    return {"sources": sources}


def tool_warehouse_health(session: Session, params: dict) -> dict:
    status = {"connected": False, "tables": [], "errors": []}
    try:
        rows = session.execute(text(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )).fetchall()
        status["connected"] = True
        for (name,) in rows:
            try:
                cnt = session.execute(text(f"SELECT COUNT(*) FROM {name}")).scalar()
                status["tables"].append({"name": name, "rows": int(cnt or 0)})
            except Exception as e:
                status["tables"].append({"name": name, "rows": None,
                                         "error": str(e)[:160]})
    except Exception as e:
        status["errors"].append(str(e)[:200])
    return status


TOOLS: Dict[str, Callable[[Session, dict], dict]] = {
    "overview":            tool_overview,
    "mutations_by_type":   tool_mutations_by_type,
    "rna_by_tissue":       tool_rna_by_tissue,
    "mutations_for_gene":  tool_mutations_for_gene,
    "gene_card":           tool_gene_card,
    "data_sources":        tool_data_sources,
    "warehouse_health":    tool_warehouse_health,
}

TOOL_SCHEMA = [
    {"name": "overview",
     "params": [],
     "desc": "Warehouse-wide totals (genes, mutations, proteins, RNA samples, samples)."},
    {"name": "mutations_by_type",
     "params": [],
     "desc": "Count of mutations grouped by variant type (SNP/DEL/INS/SUB)."},
    {"name": "rna_by_tissue",
     "params": [{"name": "gene", "type": "string", "required": False}],
     "desc": "Mean TPM by tissue × condition, optionally for one gene."},
    {"name": "mutations_for_gene",
     "params": [{"name": "gene", "type": "string", "required": True}],
     "desc": "Catalogue of mutations for a given gene."},
    {"name": "gene_card",
     "params": [{"name": "gene", "type": "string", "required": True}],
     "desc": "Metadata card for one gene (coordinates, biotype, description)."},
    {"name": "data_sources",
     "params": [],
     "desc": "Static list of the data sources used by the warehouse."},
    {"name": "warehouse_health",
     "params": [],
     "desc": "Table list + row counts; verifies DB connectivity."},
]


# ---------------------------------------------------------------
# Deterministic planner (used as fallback, and when LLM is off)
# ---------------------------------------------------------------
def deterministic_plan(question: str) -> dict:
    """Keyword-matched plan.  Never fabricates; falls back to overview."""
    q = (question or "").lower()
    plan: dict = {"question": question or "", "steps": [], "fallback": True}

    gene = None
    m = re.search(r"\b(tp53|brca1|brca2|egfr|kras|braf|myc|her2|pten|rb1|apc|p53)\b", q)
    if m:
        gene = m.group(1).upper()
        if gene == "P53":
            gene = "TP53"

    def push(tool, params=None, why=""):
        plan["steps"].append({"tool": tool, "params": params or {}, "why": why})

    if "source" in q or "where" in q and "data" in q:
        push("data_sources", why="list the sources behind the warehouse")
        return plan

    if "schema" in q or "health" in q or "status" in q:
        push("warehouse_health", why="inspect database connectivity and row counts")
        return plan

    if gene and ("mutation" in q or "variant" in q):
        push("gene_card", {"gene": gene}, why="look up the gene's coordinates")
        push("mutations_for_gene", {"gene": gene}, why="list the catalogue entries")
        return plan

    if gene and ("express" in q or "tpm" in q or "rna" in q or "tissue" in q):
        push("gene_card", {"gene": gene}, why="confirm the gene exists in the warehouse")
        push("rna_by_tissue", {"gene": gene}, why="aggregate TPM by tissue × condition")
        return plan

    if "mutation" in q and ("type" in q or "distribution" in q):
        push("mutations_by_type", why="count mutations by variant type")
        return plan

    if "express" in q or "rna" in q or "tissue" in q:
        push("rna_by_tissue", why="aggregate TPM by tissue × condition (all genes)")
        return plan

    if gene:
        push("gene_card", {"gene": gene}, why="look up the gene's basic record")
        push("mutations_for_gene", {"gene": gene}, why="attach the mutation catalogue")
        return plan

    # Default: show overview rather than fabricate.
    push("overview", why="no specific entity recognised; return warehouse totals")
    return plan


# ---------------------------------------------------------------
# Groq LLM client — plan + explain only
# ---------------------------------------------------------------
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_TIMEOUT = float(os.environ.get("GROQ_TIMEOUT", "15"))


def _groq_available() -> Tuple[bool, Optional[str]]:
    key = os.environ.get("GROQ_API_KEY")
    if not key:
        return False, "GROQ_API_KEY is not set on the server."
    if httpx is None:
        return False, "httpx is not installed on the server."
    return True, None


def _groq_chat(messages: List[dict], response_format: Optional[dict] = None,
               max_tokens: int = 900) -> dict:
    key = os.environ["GROQ_API_KEY"]
    body = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": max_tokens,
    }
    if response_format:
        body["response_format"] = response_format
    with httpx.Client(timeout=GROQ_TIMEOUT) as c:
        r = c.post(GROQ_URL,
                   headers={"Authorization": f"Bearer {key}",
                            "Content-Type": "application/json"},
                   json=body)
        r.raise_for_status()
        return r.json()


PLANNER_SYSTEM = """You are the planner for BioVision, a biomedical research
workspace. Given a user question, you must choose a short sequence of tools
from the ALLOWED TOOLS list to answer it. You never invent tool names or
parameters. You never emit SQL or Python. You output JSON matching this
schema exactly:

{
  "interpretation": "<one-sentence restatement of the user's question>",
  "steps": [ {"tool": "<name>", "params": {...}, "why": "<short>"} ],
  "limitations": "<short note on what this plan does not do, if anything>"
}

Rules:
- `tool` must be one of the allowed names.
- `params` keys must match the tool's declared parameters; omit optional
  params if not needed.
- Prefer the smallest plan that answers the question (1-3 steps).
- If the question cannot be answered with the available tools, return a
  single step with `tool`: "overview" and set `limitations` to explain why.
"""


EXPLAINER_SYSTEM = """You explain structured analytical results from
BioVision in plain scientific English for a researcher.

Rules:
- You MUST base every claim on the structured results provided to you.
- You MUST NOT introduce numbers, entities, or statistical claims that
  are not present in those results.
- If a result contains an "error" field, say that the step failed and
  what the error was.
- Keep the explanation under ~120 words.
- End with one or two short "What you can look at next" suggestions
  phrased as questions.
- Return plain prose with no markdown headings.
"""


# ---------------------------------------------------------------
# Public entrypoints
# ---------------------------------------------------------------
@dataclass
class ToolResult:
    tool: str
    params: dict
    output: dict
    elapsed_ms: int = 0
    error: Optional[str] = None


def plan_investigation(question: str) -> dict:
    """Return a validated plan.  Uses Groq when available; falls back
    to a deterministic rule-based planner otherwise."""
    ok, reason = _groq_available()
    if not ok:
        p = deterministic_plan(question)
        p["source"] = "deterministic"
        p["note"] = reason
        return _validate_plan(p)

    try:
        tool_doc = "\n".join(
            f"- {t['name']}({', '.join(p['name'] for p in t['params']) or ''}): {t['desc']}"
            for t in TOOL_SCHEMA
        )
        content = (f"USER QUESTION:\n{question}\n\n"
                   f"ALLOWED TOOLS:\n{tool_doc}\n\n"
                   "Return the JSON plan now.")
        resp = _groq_chat(
            [
                {"role": "system", "content": PLANNER_SYSTEM},
                {"role": "user",   "content": content},
            ],
            response_format={"type": "json_object"},
            max_tokens=600,
        )
        raw = resp["choices"][0]["message"]["content"]
        plan = json.loads(raw)
        plan["source"] = "groq"
        plan.setdefault("question", question)
        return _validate_plan(plan)
    except Exception as e:
        p = deterministic_plan(question)
        p["source"] = "deterministic_fallback"
        p["note"] = f"LLM planner unavailable: {type(e).__name__}"
        return _validate_plan(p)


def _validate_plan(plan: dict) -> dict:
    """Keep only steps whose tool exists and whose params typecheck."""
    valid: List[dict] = []
    rejected: List[dict] = []
    for step in plan.get("steps") or []:
        name = step.get("tool")
        params = step.get("params") or {}
        if name not in TOOLS:
            rejected.append({"tool": name, "reason": "unknown tool"})
            continue
        schema = next((t for t in TOOL_SCHEMA if t["name"] == name), None)
        if schema is None:
            rejected.append({"tool": name, "reason": "no schema"})
            continue
        clean_params: dict = {}
        bad = False
        for spec in schema["params"]:
            v = params.get(spec["name"])
            if spec.get("required") and v in (None, ""):
                rejected.append({"tool": name, "reason": f"missing {spec['name']}"})
                bad = True
                break
            if v is None:
                continue
            if spec["type"] == "string":
                s = _safe_str(v)
                if s is None:
                    rejected.append({"tool": name,
                                     "reason": f"invalid {spec['name']}"})
                    bad = True
                    break
                clean_params[spec["name"]] = s
            elif spec["type"] == "int":
                i = _safe_int(v)
                if i is None:
                    rejected.append({"tool": name,
                                     "reason": f"invalid {spec['name']}"})
                    bad = True
                    break
                clean_params[spec["name"]] = i
        if not bad:
            valid.append({"tool": name,
                          "params": clean_params,
                          "why": step.get("why", "")})
    plan["steps"] = valid
    plan["rejected"] = rejected
    return plan


def execute_plan(session: Session, plan: dict) -> List[ToolResult]:
    out: List[ToolResult] = []
    for step in plan.get("steps") or []:
        name = step["tool"]
        params = step.get("params") or {}
        t0 = time.perf_counter()
        try:
            res = TOOLS[name](session, params)
            err = res.get("error") if isinstance(res, dict) else None
        except Exception as e:
            res = {"error": f"{type(e).__name__}: {e}"[:300]}
            err = res["error"]
        out.append(ToolResult(
            tool=name, params=params, output=res, error=err,
            elapsed_ms=int((time.perf_counter() - t0) * 1000),
        ))
    return out


def explain_results(question: str, results: List[ToolResult]) -> dict:
    """Return a grounded explanation.  LLM-free when GROQ is off."""
    structured = [
        {"tool": r.tool, "params": r.params, "output": r.output,
         "error": r.error, "elapsed_ms": r.elapsed_ms}
        for r in results
    ]
    ok, reason = _groq_available()
    if not ok:
        return {
            "source": "deterministic",
            "note": reason,
            "text": _fallback_explanation(question, results),
        }
    try:
        resp = _groq_chat(
            [
                {"role": "system", "content": EXPLAINER_SYSTEM},
                {"role": "user",
                 "content": "QUESTION:\n" + (question or "") +
                            "\n\nSTRUCTURED RESULTS:\n" +
                            json.dumps(structured, default=str)[:14000]},
            ],
            max_tokens=500,
        )
        return {
            "source": "groq",
            "model": resp.get("model") or GROQ_MODEL,
            "text":  resp["choices"][0]["message"]["content"].strip(),
            "usage": resp.get("usage"),
        }
    except Exception as e:
        return {
            "source": "deterministic_fallback",
            "note":   f"LLM explainer unavailable: {type(e).__name__}",
            "text":   _fallback_explanation(question, results),
        }


def _fallback_explanation(question: str, results: List[ToolResult]) -> str:
    """A deterministic summary built from the actual tool outputs."""
    if not results:
        return ("No analytical steps could be run for this question. "
                "Try one of the example prompts on the Overview page.")
    parts: List[str] = []
    for r in results:
        if r.error:
            parts.append(f"Step '{r.tool}' failed: {r.error}.")
            continue
        out = r.output or {}
        if r.tool == "overview":
            t = out.get("totals") or {}
            parts.append(
                f"Warehouse snapshot — "
                f"{t.get('genes','?')} genes, {t.get('mutations','?')} mutations, "
                f"{t.get('proteins','?')} proteins, "
                f"{t.get('rna_samples','?')} RNA samples, "
                f"{t.get('samples','?')} samples.")
        elif r.tool == "mutations_by_type":
            rows = out.get("rows") or []
            parts.append("Mutation types: " +
                         ", ".join(f"{x['type']} ({x['count']})" for x in rows) + ".")
        elif r.tool == "rna_by_tissue":
            rows = out.get("rows") or []
            if rows:
                top = max(rows, key=lambda x: x["mean_tpm"])
                parts.append(
                    f"Highest mean TPM: {top['tissue']} / {top['condition']}"
                    f" at {top['mean_tpm']:.1f}, across {len(rows)} tissue × condition cells.")
            else:
                parts.append("No RNA observations matched the query.")
        elif r.tool == "mutations_for_gene":
            rows = out.get("rows") or []
            g = r.params.get("gene") or "the selected gene"
            if rows:
                top = rows[0]
                parts.append(
                    f"{g} has {len(rows)} catalogued mutation(s); "
                    f"top entry: {top['id']} "
                    f"({top['type']}, {top['consequence']}, "
                    f"freq {top['frequency']:.4f}).")
            else:
                parts.append(f"No warehouse mutations for {g}.")
        elif r.tool == "gene_card":
            c = out.get("card") or {}
            if c:
                parts.append(
                    f"{c.get('gene_name')} is on chromosome {c.get('chromosome')} "
                    f"({c.get('start')}–{c.get('end')}, strand {c.get('strand')}).")
        elif r.tool == "data_sources":
            srcs = out.get("sources") or []
            parts.append("Sources: " + ", ".join(s["name"] for s in srcs) + ".")
        elif r.tool == "warehouse_health":
            tbls = out.get("tables") or []
            parts.append(f"Database reachable; {len(tbls)} table(s) found.")
        else:
            parts.append(f"Step '{r.tool}' completed.")
    parts.append("What you can look at next: open the related explorer "
                 "module to view individual records, or ask a follow-up "
                 "question that refines the selection.")
    return " ".join(parts)
