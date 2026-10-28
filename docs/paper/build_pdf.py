"""Build biovision.pdf directly, no TeX needed.

Reproduces an IEEE two-column conference layout with reportlab and
renders the four TikZ figures (architecture, star schema, OLAP cube,
DNA pipeline) with matplotlib.  Prose is kept verbatim from biovision.tex.
"""
from __future__ import annotations
import io, os
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, StyleSheet1
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Image,
    Table, TableStyle, KeepTogether, PageBreak, NextPageTemplate,
    FrameBreak,
)
from reportlab.platypus.flowables import HRFlowable
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyArrowPatch, Polygon, Rectangle
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "biovision.pdf")

INK      = "#111111"
ACCENT   = "#CC0000"
PAPER    = "#FFFFFF"
PROSE    = "#525252"
META     = "#737373"
SUBTLE   = "#F5F5F5"


# ------------------------------------------------------------------
# FIGURES
# ------------------------------------------------------------------
def fig_arch() -> bytes:
    fig, ax = plt.subplots(figsize=(7.0, 3.1))
    ax.set_xlim(0, 100); ax.set_ylim(0, 100); ax.axis("off")

    ui_pages = ["Front page", "Genome", "Transcript.", "Proteomics",
                "Mutations", "Vision+CAM", "OLAP Cube", "DNA Editor"]
    api = ["/overview", "/genes", "/rna-expr", "/proteins",
           "/mutations", "/cv/*", "/olap/*", "/alpha/*"]

    def box(x, y, w, h, text, fill=PAPER, tc=INK, bold=False):
        ax.add_patch(Rectangle((x, y), w, h, linewidth=0.8,
                               edgecolor=INK, facecolor=fill))
        ax.text(x + w/2, y + h/2, text,
                ha="center", va="center",
                fontsize=7, color=tc,
                fontweight="bold" if bold else "normal")

    # UI tier
    gap, bw, bh = 1.2, 11.0, 7.0
    tot = len(ui_pages) * bw + (len(ui_pages)-1) * gap
    x0 = (100 - tot) / 2
    y_ui = 78
    for i, t in enumerate(ui_pages):
        box(x0 + i*(bw+gap), y_ui, bw, bh, t)
    ax.text(50, y_ui + bh + 3,
            "NEWSPRINT UI  (Next.js 14 · Tailwind · Recharts · R3F)",
            ha="center", fontsize=7.5, fontweight="bold", color=INK)
    ax.add_patch(Rectangle((x0-1.5, y_ui-1.5), tot+3, bh+3,
                           linewidth=0.4, edgecolor=INK,
                           facecolor="none", linestyle=(0,(2,2))))

    # API tier
    y_api = 46
    for i, t in enumerate(api):
        box(x0 + i*(bw+gap), y_api, bw, bh, t)
    ax.text(50, y_api + bh + 3, "FASTAPI ROUTERS",
            ha="center", fontsize=7.5, fontweight="bold", color=INK)
    ax.add_patch(Rectangle((x0-1.5, y_api-1.5), tot+3, bh+3,
                           linewidth=0.4, edgecolor=INK,
                           facecolor="none", linestyle=(0,(2,2))))

    # UI -> API arrows
    for i in range(len(ui_pages)):
        cx = x0 + i*(bw+gap) + bw/2
        ax.annotate("", xy=(cx, y_api+bh), xytext=(cx, y_ui),
                    arrowprops=dict(arrowstyle="-|>", color=INK, lw=0.4))

    # Warehouse row
    fact_w = 24; fact_h = 11
    fact_x = 50 - fact_w/2; fact_y = 15
    ax.add_patch(Rectangle((fact_x, fact_y), fact_w, fact_h,
                           linewidth=0.8, edgecolor=INK, facecolor=INK))
    ax.text(50, fact_y + fact_h/2,
            "FACT\nBIOLOGICAL_OBSERVATION",
            ha="center", va="center", fontsize=7, color=PAPER,
            fontweight="bold")

    # ETL + ML + sources
    box(fact_x-24, fact_y+1, 18, 9, "ETL", fill=SUBTLE)
    box(fact_x+fact_w+6, fact_y+1, 18, 9,
        "Trained models\n(CNN, RF, KM, IF)", fill=SUBTLE)
    ax.text(fact_x-15, fact_y-5,
            "Ensembl · UniProt · ClinVar\nCOSMIC · GTEx · TCGA-BRCA\nUCI WDBC · MedMNIST",
            ha="center", fontsize=6, color=META, style="italic")

    # API -> fact arrows (all)
    for i in range(len(api)):
        cx = x0 + i*(bw+gap) + bw/2
        tx = fact_x + fact_w/2
        ax.annotate("", xy=(tx, fact_y+fact_h), xytext=(cx, y_api),
                    arrowprops=dict(arrowstyle="-|>",
                                    color=INK, lw=0.3, alpha=0.6,
                                    connectionstyle="arc3,rad=0.0"))
    # ETL -> fact + sources -> ETL
    ax.annotate("", xy=(fact_x, fact_y + fact_h/2),
                xytext=(fact_x-6, fact_y+5.5),
                arrowprops=dict(arrowstyle="-|>", color=INK, lw=0.4))

    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight",
                pad_inches=0.05, dpi=300)
    plt.close(fig)
    return buf.getvalue()


def fig_schema() -> bytes:
    fig, ax = plt.subplots(figsize=(3.4, 3.4))
    ax.set_xlim(-45, 45); ax.set_ylim(-45, 45); ax.axis("off")
    # fact
    ax.add_patch(Rectangle((-15, -8), 30, 16, linewidth=1.0,
                           edgecolor=INK, facecolor=INK))
    ax.text(0, 0, "FACT\nBIOLOGICAL\n_OBSERVATION", ha="center", va="center",
            color=PAPER, fontsize=6.3, fontweight="bold")

    dims = ["SAMPLE","GENE","GENOME","CHROMOSOME","RNA","PROTEIN",
            "MUTATION","DISEASE","IMAGE","ORGANISM","TIME"]
    angles = np.linspace(90, 90-360, len(dims), endpoint=False)
    coords = {}
    for name, a in zip(dims, angles):
        rad = np.deg2rad(a)
        x, y = 32*np.cos(rad), 32*np.sin(rad)
        coords[name] = (x, y)
        ax.add_patch(Rectangle((x-9, y-3), 18, 6, linewidth=0.6,
                               edgecolor=INK, facecolor=PAPER))
        ax.text(x, y, "DIM_"+name, ha="center", va="center",
                fontsize=5.3, color=INK, fontweight="bold")
        ax.annotate("", xy=(x*0.55, y*0.55), xytext=(0, 0),
                    arrowprops=dict(arrowstyle="-|>", color=INK, lw=0.35))

    # snowflake edges
    for a, b in [("GENE","CHROMOSOME"),
                 ("CHROMOSOME","GENOME"),
                 ("GENOME","ORGANISM")]:
        xa, ya = coords[a]; xb, yb = coords[b]
        ax.annotate("", xy=(xb, yb), xytext=(xa, ya),
                    arrowprops=dict(arrowstyle="-|>",
                                    color=ACCENT, lw=0.5,
                                    connectionstyle="arc3,rad=0.18"))
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=300, bbox_inches="tight", pad_inches=0.05)
    plt.close(fig)
    return buf.getvalue()


def fig_cube() -> bytes:
    fig, ax = plt.subplots(figsize=(3.4, 2.8))
    ax.set_xlim(-1.5, 4.0); ax.set_ylim(-1.5, 3.5); ax.axis("off")
    s = 0.75
    # draw 3x3x3 voxels, back-to-front
    for k in (2,1,0):
        for j in (0,1,2):
            for i in (0,1,2):
                x = i*s + 0.4*k*s
                y = j*s + 0.4*k*s
                sel = (i==1 and j==1 and k==1)
                face = ACCENT if sel else PAPER
                ax.add_patch(Rectangle((x, y), 0.7*s, 0.7*s,
                                       linewidth=0.35,
                                       edgecolor=INK, facecolor=face))
    # axes
    ax.annotate("", xy=(3.3, -0.4), xytext=(-0.2, -0.4),
                arrowprops=dict(arrowstyle="-|>", color=INK, lw=0.6))
    ax.text(3.4, -0.4, "X  TIME", fontsize=7, va="center", color=INK)
    ax.annotate("", xy=(-0.4, 3.3), xytext=(-0.4, -0.2),
                arrowprops=dict(arrowstyle="-|>", color=INK, lw=0.6))
    ax.text(-0.4, 3.5, "Y  GENE", fontsize=7, ha="left", color=INK)
    ax.annotate("", xy=(1.2, 1.2), xytext=(-0.4, -0.4),
                arrowprops=dict(arrowstyle="-|>", color=INK, lw=0.6))
    ax.text(1.3, 1.3, "Z  DISEASE", fontsize=7, color=INK)
    # slice plane
    xs = [-0.3, 3.0, 3.4, 0.1]
    ys = [0.9, 0.9, 1.3, 1.3]
    ax.add_patch(Polygon(list(zip(xs,ys)), closed=True,
                         facecolor=ACCENT, alpha=0.10,
                         edgecolor=ACCENT, linewidth=0.4))
    ax.text(2.7, 1.4, "slice", fontsize=7, color=ACCENT, style="italic")
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=300, bbox_inches="tight", pad_inches=0.05)
    plt.close(fig)
    return buf.getvalue()


def fig_dnapipe() -> bytes:
    fig, ax = plt.subplots(figsize=(3.4, 2.2))
    ax.set_xlim(0, 100); ax.set_ylim(0, 100); ax.axis("off")
    def tbox(x, y, w, h, t):
        ax.add_patch(Rectangle((x,y), w, h, linewidth=0.6,
                               edgecolor=INK, facecolor=PAPER))
        ax.text(x+w/2, y+h/2, t, ha="center", va="center",
                fontsize=6.3, color=INK, fontweight="bold")
    tbox(2,  70, 22, 14, "DNA variant")
    tbox(39, 70, 22, 14, "Genomic\nannotation")
    tbox(76, 70, 22, 14, "Variant\nconsequence")
    tbox(39, 40, 22, 14, "Warehouse\nobservations")
    tbox(76, 40, 22, 14, "Analytical\nvisualisation")
    tbox(76, 10, 22, 14, "Research\ninterpretation")

    def arr(x1,y1,x2,y2):
        ax.annotate("", xy=(x2,y2), xytext=(x1,y1),
                    arrowprops=dict(arrowstyle="-|>", color=INK, lw=0.5))
    arr(24,77, 39,77)
    arr(61,77, 76,77)
    arr(87,70, 87,54); arr(87,54, 61,54); arr(61,47, 50,47); arr(50,47, 50,54); arr(61,47, 61,54)
    arr(76,47, 61,47)   # redundant but ok
    arr(61,47, 61,54)
    # cleaner single arrows
    arr(87,70, 87,54)
    arr(87,54, 76,47)
    arr(76,47, 61,47)
    arr(87,40, 87,24)
    arr(76,47, 76,24)
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=300, bbox_inches="tight", pad_inches=0.05)
    plt.close(fig)
    return buf.getvalue()


# ------------------------------------------------------------------
# TEXT (verbatim from biovision.tex, with LaTeX stripped)
# ------------------------------------------------------------------
TITLE = "BioVision: an Editorial Multi-Omics Data Intelligence Platform with a Live 3-D OLAP Cube and DNA Editing Bench"
AUTHORS = "Maitrey Bharambe · Soham Gaikwad · Om Wagale · Harsh Savnerkar"
AFFIL   = ("Department of Computer Engineering  —  "
           "Undergraduate Research Project, 2026")

ABSTRACT = (
    "We present <b>BioVision</b>, a self-hosted biomedical data "
    "intelligence platform that unifies a dimensional multi-omics "
    "warehouse, a live multidimensional OLAP engine, a convolutional "
    "model for medical imagery and an AlphaGenome-inspired DNA editing "
    "bench behind a single editorial interface. The warehouse is a "
    "Kimball-style star schema with one fact table, "
    "<font face='Courier'>FACT_BIOLOGICAL_OBSERVATION</font>, and eleven "
    "conformed dimensions sourced from Ensembl, UniProt, ClinVar/COSMIC, "
    "GTEx, TCGA-BRCA, MedMNIST and the UCI Wisconsin Diagnostic Breast "
    "Cancer dataset. On top of this schema we implement the five canonical "
    "OLAP operations — roll-up, drill-down, slice, dice and pivot — as "
    "real server-side SQL aggregations, surfaced through an interactive 3-D "
    "voxel cube rendered with React Three Fiber whose cells update in step "
    "with the query state. A separate editing laboratory lets a user mutate "
    "a single nucleotide of a real gene and watches the computed consequence "
    "propagate to matching warehouse records; an experimental variant-effect "
    "scorer and a precision-remedy module reuse the same catalogue. The entire "
    "interface — homepage, explorers and the cube — is laid out as a "
    "newsprint-style editorial, with a Newsprint design system that trades "
    "glassmorphism for sharp borders, Playfair / Lora / Inter / JetBrains Mono "
    "typography and a single accent red reserved for selections and critical "
    "findings. We describe the architecture, dimensional model, OLAP state "
    "machine, DNA pipeline and the editorial design language, and we discuss "
    "the engineering decisions, limitations and failure modes of the system."
)

KEYWORDS = ("multi-omics; data warehouse; OLAP; dimensional modelling; "
            "variant analysis; computer vision; Grad-CAM; editorial "
            "information design.")

SECTIONS = [
("I. Introduction", [
"Biomedical datasets rarely sit together in one place. Gene coordinates come "
"out of Ensembl, protein metadata out of UniProt, mutation evidence out of "
"ClinVar and COSMIC, expression counts out of GTEx and TCGA, and labelled "
"imagery out of initiatives like MedMNIST. A researcher who wants to look at, "
"say, how a TP53 missense mutation lines up with its expression across tissues "
"and with the model that reads the matching ultrasound patch, has to open four "
"or five separate tools and reconcile their vocabularies by hand.",

"<b>BioVision</b> is an attempt to put these layers under one roof, keep the "
"connections between them explicit, and present the result in a way that reads "
"like a scientific journal rather than a dashboard. The contribution of this "
"paper is less a new algorithm than a careful integration: a dimensional "
"multi-omics warehouse, a real OLAP engine with a live 3-D cube on top of it, "
"a DNA editing laboratory that walks a variant from sequence to a matching "
"warehouse record, and an editorial design language that treats information "
"density as a first-class constraint.",

"Three design commitments shape the work:",

"<b>1. Nothing is faked.</b> Every number the interface prints comes from a "
"backend aggregation over the warehouse. When a lookup fails — no matching "
"mutation record, no RNA observations for a gene — the view says so; it does "
"not interpolate a number to avoid an empty space.",

"<b>2. The cube is the warehouse.</b> The 3-D cube is not an animated "
"decoration. Its voxels, axes and metric encodings come from a parametric "
"SQL query (<font face='Courier'>GET /olap/cube</font>) and each OLAP "
"operation re-issues that query against a different dimension level, filter "
"set or axis permutation.",

"<b>3. The interface is a periodical.</b> The UI uses a single "
"Playfair/Lora/Inter/JetBrains Mono family, 0-radius geometry, hard borders "
"and a single accent red used sparingly for selection or pathogenic findings. "
"The intent is a reader who feels she is paging through a special issue "
"rather than wading through a SaaS admin tool."
]),

("II. Related Work", [
"Our dimensional model follows the practice described by Kimball and Ross [1], "
"in particular the preference for conformed dimensions and surrogate keys "
"over natural keys. The OLAP vocabulary — roll-up, drill-down, slice, dice, "
"pivot — is the one established by Codd, Codd and Salley [2] and refined for "
"data warehouse practice by Chaudhuri and Dayal [3].",

"For individual modalities we lean on canonical open resources: Ensembl [4], "
"UniProt [5], ClinVar [6] and COSMIC [7] for curated reference annotations; "
"GTEx [8] and TCGA-BRCA [9] for expression; the UCI Wisconsin Diagnostic "
"Breast Cancer dataset [10] and MedMNIST v2 [11] for structured and imaging "
"training data.",

"The variant pipeline is explicitly inspired by DeepMind's AlphaGenome [12]: "
"a sequence-aware model that predicts the regulatory effect of a "
"single-nucleotide substitution. We do not retrain AlphaGenome; instead we "
"build a transparent heuristic scorer that layers codon translation, "
"consequence classification and a lookup against the curated hotspots in "
"our catalogue. The intent is a research bench, not a clinical oracle.",

"For the explanation of the imaging model we use the standard Grad-CAM "
"procedure [13]. The clustering and association tabs rely on scikit-learn's "
"K-Means and DBSCAN [14], and the mlxtend Apriori implementation [15]. "
"Anomaly scoring uses Isolation Forest [16]."
]),

("III. System Architecture", [
"Figure 1 shows the runtime topology. The frontend is a Next.js 14 app "
"under the App Router. Pages are React server components by default; "
"interactive pages (the OLAP workspace, the DNA editor, the genome "
"ideogram) opt into client components only where interactivity requires it. "
"Static charts use Recharts; the 3-D cube and the DNA double-helix use "
"React Three Fiber on top of Three.js [19].",

"The backend is FastAPI [17] with SQLAlchemy ORM [18] over an SQLite file "
"in the repository (<font face='Courier'>biovision.db</font>). The router "
"layer is intentionally thin: a route accepts a small, strongly-typed set "
"of query parameters, resolves them into a SQL aggregation against the fact "
"table, and returns the aggregation together with its SQL as a string. The "
"frontend may inspect the SQL — surfacing exactly which query the cube just "
"ran — without the user having to open a separate tool.",

"Trained artefacts (the BreastMNIST CNN, the Random Forest, the K-Means and "
"DBSCAN partitions, and the Isolation Forest) live under "
"<font face='Courier'>models_saved/</font> and are loaded lazily on the first "
"request to <font face='Courier'>/cv/*</font> or "
"<font face='Courier'>/analytics/*</font>. No model is trained at request time."
]),

("IV. Dimensional Data Warehouse", [
"The star schema is sketched in Fig. 2. The single fact table "
"<font face='Courier'>FACT_BIOLOGICAL_OBSERVATION</font> stores one row per "
"observation of a biological entity for a given sample, under a given "
"condition, at a given time. Each row carries a surrogate foreign key into "
"every dimension plus a small set of pre-aggregated measures: observation "
"count, mean expression (TPM), mutation count, protein abundance, average "
"CV score, and a confidence quantity for ML-derived predictions.",

"Three snowflake edges extend the strict star: a gene belongs to a chromosome, "
"a chromosome belongs to a genome, and a genome belongs to an organism. This "
"gives the roll-up operation a meaningful hierarchy to climb and the "
"drill-down operation a meaningful hierarchy to descend — rather than letting "
"the UI invent levels that have no basis in the underlying model.",

"A representative snapshot of the warehouse, returned by the live "
"<font face='Courier'>GET /overview</font> endpoint, is given in Table I. "
"The numbers are small deliberately: the project is a research prototype, "
"not a production biobank, and the stress is on correctness and traceability "
"rather than cardinality."
]),

("V. The Live 3-D OLAP Cube", [
"The signature analytical surface of <b>BioVision</b> is a 3-D cube whose "
"axes are three warehouse dimensions and whose cells carry an aggregated "
"measure. The default assignment is X=TIME, Y=GENE and Z=DISEASE, with "
"observation count as the active measure. Figure 3 gives a 3×3×3 sketch.",

"<b>Operations as SQL.</b> Each of the five OLAP operations is a parametric "
"transformation of the shared query state. A tiny JavaScript reducer in the "
"frontend holds the state object { operation, gene_level, time_level, "
"disease_level, axis assignment, filters, metric }; every operation mutates "
"one field of this object and triggers a single call to "
"<font face='Courier'>GET /olap/cube</font>. The backend resolves the state "
"into:",

"• <b>Roll-up</b> climbs a dimension's hierarchy (GENE→CHROMOSOME→GENOME→"
"ORGANISM; DAY→MONTH→QUARTER→YEAR). The SQL replaces one GROUP BY column "
"with its parent.",

"• <b>Drill-down</b> is the symmetric descent; the group-by column is "
"replaced with its child.",

"• <b>Slice</b> adds a single-value WHERE clause on one dimension; in the "
"cube we also draw a translucent plane at the matching index and dim "
"non-matching voxels.",

"• <b>Dice</b> composes several WHERE IN (…) filters across dimensions.",

"• <b>Pivot</b> swaps the SELECT assignment of (x,y,z) dimensions and "
"animates a quarter-turn of the cube so the user can follow the "
"reorientation.",

"The resulting SQL is returned alongside the cells. The user can toggle a "
"<i>View SQL</i> panel beneath the cube to inspect what actually ran. "
"Choosing a different measure (observation count → average expression, "
"mutation count, average CV score, average ML confidence) rewrites the "
"projection and the aggregation function, with distinct-count semantics "
"reserved for the dimensions where summing an average would be meaningless. "
"The frontend state is purposely small — about ten fields — which keeps the "
"state transitions auditable.",

"<b>Cross-filtering.</b> The cube is not the only consumer of the shared "
"query state. The mutation donut, the chromosome bar chart and the top-genes "
"bar chart on the Mutation Analytics page are wired to the same state "
"object: clicking a slice of the donut adds a mutation-type WHERE clause to "
"the page's filter set; clicking a chromosome bar sets filters.chromosome. "
"The tables below are rendered from the filtered rows."
]),

("VI. DNA Editing Laboratory", [
"The <font face='Courier'>/alpha</font> page hosts a three-tab laboratory.",

"<b>Tab 1 — Live DNA Editor.</b> The user picks a gene and either a curated "
"hotspot or a free (position, alt base) pair. The server pulls the gene's "
"reference window from <font face='Courier'>/alpha/gene-reference</font>, "
"applies the single-nucleotide substitution, re-translates the affected "
"codon with the standard codon table, and classifies the consequence "
"(silent, conservative missense, missense, nonsense, stop-loss). On the "
"client the 3-D double helix (R3F) marks the edit site, and the connected "
"downstream views light up: a warehouse lookup against "
"<font face='Courier'>GET /mutations?gene=X</font> looks for a record whose "
"<font face='Courier'>protein_change</font> matches the computed "
"<font face='Courier'>p.XnnY</font> string. On a hit the row is drawn with "
"an accent-red background. On a miss the UI prints <i>“No warehouse "
"mutation record matches p.XnnY — this is a novel/un-catalogued variant.”</i> "
"We insist on this honest-failure behaviour: a DNA editor that silently "
"invents matches would make itself unusable for its stated purpose. A "
"parallel call to <font face='Courier'>/rna-expression?gene=X</font> returns "
"matching RNA samples; the connected-views banner states explicitly that "
"observed TPM is independent of the edit.",

"<b>Tab 2 — Variant Effect Predictor.</b> The same input shape is fed to a "
"transparent heuristic scorer that layers four contributions: coarse "
"consequence weight, a window-based conservation prior, a disease-context "
"prior derived from the catalogue, and an exact-match bonus against "
"ClinVar/COSMIC hotspots. The scorer returns a score, a pathogenicity band "
"and a free-text rationale list that enumerates every contribution. We label "
"this heuristic prominently in the UI; it is not a clinical prediction.",

"<b>Tab 3 — Precision Remedy.</b> Given a list of (gene, protein_change) "
"tuples, the module returns targeted therapies drawn from an in-repo FDA "
"table (BRAF inhibitors for V600E, EGFR TKIs for L858R/T790M, PARP "
"inhibitors for BRCA mutations, KRAS G12C inhibitors, …) along with a "
"dataset-derived response estimate. Each recommendation names its "
"matching variant. Figure 4 sketches the pipeline."
]),

("VII. Vision and Data Mining", [
"A convolutional network trained on BreastMNIST [11] exposes two endpoints: "
"<font face='Courier'>POST /cv/predict</font> returns the predicted class, "
"confidence, both an original image and a Grad-CAM overlay [13]; "
"<font face='Courier'>GET /cv/gallery</font> returns twelve test images with "
"their predictions and correctness flags. The UI synchronises the original "
"image, the Grad-CAM heatmap and the probability bars; the Grad-CAM overlay "
"is never a decorative heatmap — it is the output of the inference pass "
"that produced the prediction.",

"A separate <font face='Courier'>/analytics</font> router hosts four classical "
"data-mining modules trained on the warehouse's Wisconsin feature table "
"and the mutation / expression layers: Classification (Random Forest predicts "
"the diseased/healthy label; a prediction form issues real inference requests "
"on user-entered features); Clustering (K-Means with DBSCAN as a comparator "
"over a PCA projection of the Wisconsin features; cluster assignment and the "
"silhouette score come from the actual run); Association (Apriori rules "
"mined from the clinical layer with a visible-support, visible-confidence "
"threshold; the UI shows antecedent/consequent, support, confidence and "
"lift); and Anomaly (Isolation Forest with the contamination parameter "
"printed on the page; flagged points are drawn in accent red; the ranked "
"table and the scatter are cross-highlighted).",

"In every tab, the result the user sees is the artefact's actual output; "
"when a module cannot produce a result for an input, the view says so."
]),

("VIII. Newsprint: a UI Design System", [
"We treat the interface as part of the research artefact. The design system, "
"informally called <i>Newsprint</i>, has four pillars.",

"<b>Typography.</b> Playfair Display for editorial headlines, Lora for "
"descriptive text, Inter for navigation and controls, JetBrains Mono for "
"coordinates, SQL and numerical metrics. The mapping is strict: tables use "
"Inter in the header and JetBrains Mono in the cells; no decorative serif "
"appears in a dense table.",

"<b>Geometry.</b> Zero border-radius everywhere except small circular "
"indicators. Hard-offset shadows (a 4-px solid shadow in ink) appear only on "
"interactive hover, and the baseline card has a 1-px ink border instead of a "
"soft drop shadow. This is a direct rejection of glassmorphism: a 1-px line "
"survives screenshots, reprints and projector contrast; a blurred panel does "
"not.",

"<b>Palette.</b> Six core tokens — paper (#F9F9F7), ink (#111111), prose "
"(#525252), meta (#737373), subtle (#F5F5F5) and accent (#CC0000). The "
"accent is reserved: active selections, pathogenic findings, OLAP operation "
"badges, a few editorial pull-quotes. Scientific visualisations may use a "
"restrained categorical palette (ink, deep blue, dark green, amber, deep "
"purple, accent) when distinguishing biological categories requires it.",

"<b>Layout.</b> An editorial 12-column grid with asymmetric section spans. "
"Section labels use a mono eyebrow (§ 04 — OLAP LABORATORY); page headers "
"carry a two-line issue-style strip with the date in JetBrains Mono. "
"Table II lists the tokens."
]),

("IX. Implementation Notes", [
"The repository compiles cleanly on Node 20, Python 3.12, with 15 static and "
"dynamic routes on the frontend side and twelve routers on the backend. The "
"production bundle for the OLAP page is 9.4 kB (194 kB first-load JS), kept "
"small by lazy-loading React Three Fiber and the cube scene behind a dynamic "
"import.",

"The frontend state is deliberately not Redux. For the cube we keep a single "
"reducer with a one-field-at-a-time mutation API; cross-page selection "
"(gene, chromosome, disease, sample, mutation) is held in a small "
"session-scoped React context backed by sessionStorage and surfaced as a "
"persistent breadcrumb at the top of every page. The breadcrumb has a visible "
"<i>clear all</i> affordance; context is not cleared automatically when the "
"user navigates.",

"Reduced-motion preferences are honoured globally: the ticker on the front "
"page uses a CSS marquee that respects "
"<font face='Courier'>prefers-reduced-motion</font>, and the cube's pivot "
"animation is disabled when the preference is set."
]),

("X. Limitations and Future Work", [
"The warehouse is a small, hand-curated dataset. The OLAP engine scales to "
"warehouses several orders of magnitude larger than this one; the 3-D cube "
"renderer, however, is sized for human inspection, not for industrial fact "
"tables, and we aggressively subsample tick labels when either axis exceeds "
"about ten unique values. Scaling the cube to tens of thousands of cells "
"would need an LOD scheme and a different cell geometry.",

"The variant-effect scorer is a transparent heuristic. It is not a "
"replacement for a trained sequence model like AlphaGenome [12] or a "
"clinical interpretation pipeline; its value is explanatory, not predictive. "
"We label it accordingly in every surface it appears on.",

"The Grad-CAM procedure is applied over a model with modest capacity on a "
"small training set; its saliency maps should be read as attention cues, not "
"as clinical localisation. The project's permanent disclaimer appears at "
"the foot of every page.",

"Finally, the database is a single-file SQLite instance for ease of "
"reproduction. Moving to PostgreSQL would unlock parallel ETL and server-side "
"distinct-count aggregations that are currently expressed in Python."
]),

("XI. Conclusion", [
"<b>BioVision</b> is the integration project we wanted to find rather than "
"the one we found. It brings together a dimensional multi-omics warehouse, "
"a live OLAP cube, a DNA editing bench, a vision model with Grad-CAM "
"explanations, four classical data-mining modules and a restrained editorial "
"interface. The engineering value is in the plumbing: every number has a "
"source, every operation is a real aggregation, and the connections between "
"modules are kept explicit.",

"Beyond the code, the project is also a small argument about how scientific "
"software can look. Information density is not a drawback to be hidden "
"behind glass; it is a feature to be set in type. We hope the Newsprint "
"language is useful to others."
]),

("Author Contributions", [
"<b>M. Bharambe</b> led the dimensional model, the ETL pipeline and the "
"OLAP cube's parametric server-side query. <b>S. Gaikwad</b> built the 3-D "
"cube renderer, the state reducer and the cross-filtering layer, and led "
"the Newsprint design language. <b>O. Wagale</b> implemented the DNA editor, "
"the variant-effect scorer, the precision-remedy module and the helix "
"renderers. <b>H. Savnerkar</b> trained the imaging model and the four "
"data-mining modules, built the Grad-CAM pipeline and curated the "
"classification/clustering/association/anomaly interfaces. All four authors "
"share responsibility for the paper, the schema diagrams and the "
"integration review."
]),
]

REFERENCES = [
"[1] R. Kimball and M. Ross, <i>The Data Warehouse Toolkit: The Definitive "
"Guide to Dimensional Modeling</i>, 3rd ed. Hoboken, NJ, USA: Wiley, 2013.",

"[2] E. F. Codd, S. B. Codd, and C. T. Salley, “Providing OLAP (On-line "
"Analytical Processing) to User-Analysts: An IT Mandate,” E. F. Codd &amp; "
"Associates, White Paper, 1993.",

"[3] S. Chaudhuri and U. Dayal, “An overview of data warehousing and OLAP "
"technology,” <i>ACM SIGMOD Rec.</i>, vol. 26, no. 1, pp. 65–74, 1997.",

"[4] F. Martin <i>et al.</i>, “Ensembl 2023,” <i>Nucleic Acids Res.</i>, "
"vol. 51, no. D1, pp. D933–D941, 2023.",

"[5] The UniProt Consortium, “UniProt: the Universal Protein Knowledgebase "
"in 2023,” <i>Nucleic Acids Res.</i>, vol. 51, no. D1, pp. D523–D531, 2023.",

"[6] M. J. Landrum <i>et al.</i>, “ClinVar: improvements to accessing data,” "
"<i>Nucleic Acids Res.</i>, vol. 48, no. D1, pp. D835–D844, 2020.",

"[7] J. G. Tate <i>et al.</i>, “COSMIC: the Catalogue Of Somatic Mutations "
"In Cancer,” <i>Nucleic Acids Res.</i>, vol. 47, no. D1, pp. D941–D947, 2019.",

"[8] The GTEx Consortium, “The GTEx Consortium atlas of genetic regulatory "
"effects across human tissues,” <i>Science</i>, vol. 369, pp. 1318–1330, 2020.",

"[9] The Cancer Genome Atlas Network, “Comprehensive molecular portraits of "
"human breast tumours,” <i>Nature</i>, vol. 490, pp. 61–70, 2012.",

"[10] W. N. Street, W. H. Wolberg, and O. L. Mangasarian, “Nuclear feature "
"extraction for breast tumor diagnosis,” in <i>Proc. IS&amp;T/SPIE</i>, "
"vol. 1905, 1993, pp. 861–870.",

"[11] J. Yang <i>et al.</i>, “MedMNIST v2 — A large-scale lightweight "
"benchmark for 2D and 3D biomedical image classification,” <i>Sci. Data</i>, "
"vol. 10, no. 1, art. 41, 2023.",

"[12] Ž. Avsec <i>et al.</i>, “AlphaGenome: advancing regulatory variant "
"effect prediction with a unified DNA sequence model,” DeepMind, 2024.",

"[13] R. R. Selvaraju <i>et al.</i>, “Grad-CAM: Visual explanations from "
"deep networks via gradient-based localization,” in <i>Proc. IEEE ICCV</i>, "
"2017, pp. 618–626.",

"[14] F. Pedregosa <i>et al.</i>, “Scikit-learn: Machine learning in Python,” "
"<i>J. Mach. Learn. Res.</i>, vol. 12, pp. 2825–2830, 2011.",

"[15] S. Raschka, “MLxtend,” <i>J. Open Source Softw.</i>, vol. 3, no. 24, "
"art. 638, 2018.",

"[16] F. T. Liu, K. M. Ting, and Z.-H. Zhou, “Isolation forest,” in "
"<i>Proc. IEEE ICDM</i>, 2008, pp. 413–422.",

"[17] S. Ramírez, “FastAPI,” 2024. [Online]. "
"Available: https://fastapi.tiangolo.com",

"[18] M. Bayer, “SQLAlchemy,” 2024. [Online]. "
"Available: https://www.sqlalchemy.org",

"[19] R. Cabello <i>et al.</i>, “three.js,” 2024. [Online]. "
"Available: https://threejs.org",
]


# ------------------------------------------------------------------
# LAYOUT
# ------------------------------------------------------------------
def build():
    page_w, page_h = LETTER
    margin = 0.6 * inch
    gutter = 0.25 * inch
    col_w  = (page_w - 2*margin - gutter) / 2
    col_h  = page_h - 2*margin

    # First page: a wide "banner" frame for the title + abstract + arch figure,
    # then two columns below.
    banner_h = 3.6 * inch
    banner_frame = Frame(margin, page_h - margin - banner_h,
                         page_w - 2*margin, banner_h,
                         leftPadding=0, rightPadding=0,
                         topPadding=0, bottomPadding=0,
                         id="banner", showBoundary=0)
    body_h_p1 = col_h - banner_h
    c1_p1 = Frame(margin, margin, col_w, body_h_p1,
                  leftPadding=0, rightPadding=0,
                  topPadding=0, bottomPadding=0,
                  id="c1p1", showBoundary=0)
    c2_p1 = Frame(margin + col_w + gutter, margin, col_w, body_h_p1,
                  leftPadding=0, rightPadding=0,
                  topPadding=0, bottomPadding=0,
                  id="c2p1", showBoundary=0)

    c1 = Frame(margin, margin, col_w, col_h,
               leftPadding=0, rightPadding=0,
               topPadding=0, bottomPadding=0,
               id="c1", showBoundary=0)
    c2 = Frame(margin + col_w + gutter, margin, col_w, col_h,
               leftPadding=0, rightPadding=0,
               topPadding=0, bottomPadding=0,
               id="c2", showBoundary=0)

    def draw_header(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica-Bold", 7.5)
        canvas.setFillColor(colors.HexColor(META))
        canvas.drawString(margin, page_h - margin + 10,
                          "BIOVISION  ·  THE DAILY OMICS")
        canvas.drawRightString(page_w - margin, page_h - margin + 10,
                               f"PAGE {doc.page}")
        canvas.setStrokeColor(colors.HexColor(INK))
        canvas.setLineWidth(0.4)
        canvas.line(margin, page_h - margin + 6,
                    page_w - margin, page_h - margin + 6)
        canvas.restoreState()

    first_tpl = PageTemplate(id="first",
                             frames=[banner_frame, c1_p1, c2_p1],
                             onPage=draw_header)
    body_tpl  = PageTemplate(id="body",
                             frames=[c1, c2],
                             onPage=draw_header)

    doc = BaseDocTemplate(OUT, pagesize=LETTER,
                          pageTemplates=[first_tpl, body_tpl],
                          leftMargin=margin, rightMargin=margin,
                          topMargin=margin, bottomMargin=margin,
                          title="BioVision", author="Bharambe et al.")

    # ---------------- styles ----------------
    styles = StyleSheet1()
    styles.add(ParagraphStyle("Title", fontName="Times-Bold",
                              fontSize=18, leading=22,
                              alignment=1, spaceAfter=6,
                              textColor=colors.HexColor(INK)))
    styles.add(ParagraphStyle("Authors", fontName="Times-Roman",
                              fontSize=10.5, leading=14, alignment=1,
                              spaceAfter=2))
    styles.add(ParagraphStyle("Affil", fontName="Times-Italic",
                              fontSize=9, leading=11, alignment=1,
                              spaceAfter=12, textColor=colors.HexColor(META)))
    styles.add(ParagraphStyle("AbstractHead", fontName="Times-Bold",
                              fontSize=9, leading=11, spaceAfter=2))
    styles.add(ParagraphStyle("Abstract", fontName="Times-Roman",
                              fontSize=8.4, leading=10.3,
                              alignment=4, spaceAfter=4))
    styles.add(ParagraphStyle("Keywords", fontName="Times-Italic",
                              fontSize=8.4, leading=10.3,
                              alignment=4, spaceAfter=10))
    styles.add(ParagraphStyle("Section", fontName="Times-Bold",
                              fontSize=10, leading=12, spaceBefore=6,
                              spaceAfter=3, textColor=colors.HexColor(INK)))
    styles.add(ParagraphStyle("Body", fontName="Times-Roman",
                              fontSize=9, leading=10.9,
                              alignment=4, spaceAfter=3,
                              firstLineIndent=10,
                              textColor=colors.HexColor(INK)))
    styles.add(ParagraphStyle("BodyNoIndent", fontName="Times-Roman",
                              fontSize=9, leading=10.9,
                              alignment=4, spaceAfter=3,
                              textColor=colors.HexColor(INK)))
    styles.add(ParagraphStyle("Caption", fontName="Times-Italic",
                              fontSize=8, leading=9.5, alignment=4,
                              spaceAfter=6, spaceBefore=2,
                              textColor=colors.HexColor(PROSE)))
    styles.add(ParagraphStyle("RefHead", fontName="Times-Bold",
                              fontSize=10, leading=12,
                              spaceBefore=6, spaceAfter=3))
    styles.add(ParagraphStyle("Ref", fontName="Times-Roman",
                              fontSize=7.5, leading=9,
                              alignment=4, spaceAfter=2,
                              leftIndent=12, firstLineIndent=-12))
    styles.add(ParagraphStyle("TableCell", fontName="Times-Roman",
                              fontSize=8, leading=10,
                              textColor=colors.HexColor(INK)))

    # --------------- flowables ---------------
    story = []
    story.append(Paragraph(TITLE, styles["Title"]))
    story.append(Paragraph(AUTHORS, styles["Authors"]))
    story.append(Paragraph(AFFIL, styles["Affil"]))
    story.append(HRFlowable(width="30%", thickness=0.6,
                            color=colors.HexColor(INK),
                            hAlign="CENTER", spaceBefore=0, spaceAfter=6))

    # Architecture figure spans the banner
    arch_pdf = fig_arch()
    arch_path = os.path.join(HERE, "_fig_arch.png")
    with open(arch_path, "wb") as f: f.write(arch_pdf)
    story.append(Image(arch_path, width=6.9*inch, height=2.0*inch))
    story.append(Paragraph(
        "<b>Fig. 1.</b> BioVision runtime architecture. Every UI explorer "
        "calls a FastAPI router; every router that returns observed values "
        "resolves against the same star schema.",
        styles["Caption"]))

    # ------- move into two-column body of page 1 -------
    story.append(FrameBreak())

    # Abstract + keywords in column 1
    story.append(Paragraph("<i>Abstract</i>", styles["AbstractHead"]))
    story.append(Paragraph(ABSTRACT, styles["Abstract"]))
    story.append(Paragraph("<b>Index Terms —</b> " + KEYWORDS, styles["Keywords"]))

    # Switch to body template for remaining pages
    story.append(NextPageTemplate("body"))

    # Section renderer
    schema_added = False
    cube_added   = False
    dnapipe_added = False
    for sec_title, paras in SECTIONS:
        story.append(Paragraph(sec_title, styles["Section"]))
        for p in paras:
            story.append(Paragraph(p, styles["Body"]))

        # Insert figures / tables after their relevant sections
        if sec_title.startswith("IV.") and not schema_added:
            schema_added = True
            # Table I totals
            tbl = Table(
                [["Entity", "Count", "Entity", "Count"],
                 ["Genomes", "1",  "Proteins", "20"],
                 ["Genes",   "20", "RNA samples", "280"],
                 ["Mutations","33","Indexed images", "120"],
                 ["Samples", "569","SNP/DEL/INS/SUB", "26/3/2/2"]],
                colWidths=[0.78*inch, 0.5*inch, 0.95*inch, 0.65*inch])
            tbl.setStyle(TableStyle([
                ("FONT",(0,0),(-1,-1),"Times-Roman", 7.6),
                ("FONT",(0,0),(-1,0),"Times-Bold", 7.6),
                ("LINEBELOW", (0,0),(-1,0), 0.8, colors.HexColor(INK)),
                ("LINEBELOW", (0,-1),(-1,-1), 0.8, colors.HexColor(INK)),
                ("LINEABOVE", (0,0),(-1,0), 0.8, colors.HexColor(INK)),
                ("TOPPADDING",(0,0),(-1,-1),2),
                ("BOTTOMPADDING",(0,0),(-1,-1),1.5),
                ("TEXTCOLOR",(0,0),(-1,-1), colors.HexColor(INK)),
            ]))
            story.append(Paragraph("<b>TABLE I.</b> Warehouse snapshot (live /overview).",
                                   styles["Caption"]))
            story.append(tbl)
            story.append(Spacer(1, 3))

            # Figure 2 — star schema (column-width)
            schema_pdf = fig_schema()
            schema_path = os.path.join(HERE, "_fig_schema.png")
            with open(schema_path, "wb") as f: f.write(schema_pdf)
            story.append(Image(schema_path, width=3.1*inch, height=3.1*inch))
            story.append(Paragraph(
                "<b>Fig. 2.</b> BioVision star schema with snowflake extensions. "
                "DIM_GENE snowflakes through DIM_CHROMOSOME and DIM_GENOME to "
                "DIM_ORGANISM, reflecting the biological hierarchy.",
                styles["Caption"]))

        if sec_title.startswith("V.") and not cube_added:
            cube_added = True
            cube_pdf = fig_cube()
            cube_path = os.path.join(HERE, "_fig_cube.png")
            with open(cube_path, "wb") as f: f.write(cube_pdf)
            story.append(Image(cube_path, width=3.1*inch, height=2.6*inch))
            story.append(Paragraph(
                "<b>Fig. 3.</b> A 3×3×3 sketch of the live cube. Voxel colour "
                "encodes the active metric; the translucent accent plane shows "
                "a <i>slice</i> operation fixing one dimension to a single value.",
                styles["Caption"]))

        if sec_title.startswith("VI.") and not dnapipe_added:
            dnapipe_added = True
            dpipe_pdf = fig_dnapipe()
            dpipe_path = os.path.join(HERE, "_fig_dnapipe.png")
            with open(dpipe_path, "wb") as f: f.write(dpipe_pdf)
            story.append(Image(dpipe_path, width=3.1*inch, height=1.9*inch))
            story.append(Paragraph(
                "<b>Fig. 4.</b> The DNA pipeline. Every arrow is a backend "
                "call; the interpretation node is explicitly labelled "
                "<i>research</i>, not <i>clinical</i>.",
                styles["Caption"]))

        if sec_title.startswith("VIII."):
            # Table II — tokens
            tbl2 = Table(
                [["Role", "Token", "Value"],
                 ["Background", "paper",  "#F9F9F7"],
                 ["Primary text", "ink",  "#111111"],
                 ["Body copy", "prose",   "#525252"],
                 ["Metadata",  "meta",    "#737373"],
                 ["Light neutral", "subtle", "#F5F5F5"],
                 ["Accent (sparing)", "accent", "#CC0000"],
                 ["Display heading", "Playfair Display", ""],
                 ["Prose",     "Lora",    ""],
                 ["UI / controls","Inter",""],
                 ["Numeric / code","JetBrains Mono",""]],
                colWidths=[1.15*inch, 1.15*inch, 0.65*inch])
            tbl2.setStyle(TableStyle([
                ("FONT",(0,0),(-1,-1),"Times-Roman", 7.4),
                ("FONT",(0,0),(-1,0),"Times-Bold", 7.4),
                ("LINEBELOW", (0,0),(-1,0), 0.8, colors.HexColor(INK)),
                ("LINEBELOW", (0,-1),(-1,-1), 0.8, colors.HexColor(INK)),
                ("LINEABOVE", (0,0),(-1,0), 0.8, colors.HexColor(INK)),
                ("LINEABOVE", (0,7),(-1,7), 0.4, colors.HexColor(META)),
                ("TOPPADDING",(0,0),(-1,-1),1.5),
                ("BOTTOMPADDING",(0,0),(-1,-1),1.2),
                ("TEXTCOLOR",(0,0),(-1,-1), colors.HexColor(INK)),
                ("FONT",(1,7),(1,-1),"Times-Italic", 7.4),
            ]))
            story.append(Paragraph("<b>TABLE II.</b> Newsprint design tokens.",
                                   styles["Caption"]))
            story.append(tbl2)
            story.append(Spacer(1, 3))

    # References
    story.append(Paragraph("References", styles["RefHead"]))
    for r in REFERENCES:
        story.append(Paragraph(r, styles["Ref"]))

    doc.build(story)

    # Clean the figure scratch files once embedded
    for f in ("_fig_arch.png", "_fig_schema.png", "_fig_cube.png", "_fig_dnapipe.png"):
        p = os.path.join(HERE, f)
        if os.path.exists(p):
            try: os.remove(p)
            except OSError: pass

    print(f"wrote {OUT}  ({os.path.getsize(OUT):,} bytes)")


if __name__ == "__main__":
    build()
