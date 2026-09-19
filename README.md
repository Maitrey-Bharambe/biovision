# BioVision

**Multi-Omics Data Warehouse · Data Mining · Computer Vision · AlphaGenome-inspired Variant Lab**

BioVision is a full-stack academic / research prototype that pipes real
public biomedical data through an ETL → warehouse → OLAP → ML/CV →
insight loop, then goes a step beyond prediction with a variant-to-therapy
lab inspired by Google DeepMind's AlphaGenome (2025).

> ⚠️ **Disclaimer:** This platform is an academic prototype. It is **not**
> a clinical diagnostic tool. Predictions must not be interpreted as
> medical advice.

---

## Feature Highlights

### 🧬 Genome Explorer
- Real GRCh38 gene coordinates for 20 cancer-driver genes
- Chromosome ideogram with G-banding + mutation marker
- Interactive DNA-sequence view with A/C/G/T colouring
- Gene detail card with proteins, mutations, RNA expression

### 🧪 RNA & Protein Explorers
- GTEx / TCGA-BRCA published mean expression per gene × tissue × condition
- Real UniProt IDs and reference protein sequences
- Healthy vs. cancer comparison bar charts, top up/down regulated genes, heatmaps

### ⛒ Mutation Explorer
- 33 real ClinVar / COSMIC cancer hotspots (TP53 R175H, BRAF V600E, KRAS G12C, EGFR L858R, PIK3CA H1047R, BRCA1 185delAG, etc.)
- Filter by gene, chromosome, mutation type
- Donut chart of variant-type distribution

### 👁 BioVision — Computer Vision
- CNN trained on **MedMNIST BreastMNIST** — real breast-ultrasound patches
  (Al-Dhabyani et al., 2020) auto-downloaded from medmnist.com
- Test-accuracy gauge, training-curve line chart, confusion-matrix **heatmap**
- Big side-by-side Original ↔ Grad-CAM attention view
- Live gallery of 12 real test scans with the CNN's live prediction,
  teal/red frames marking correct/wrong, confidence bar under each
- Experimental "DNA → 2-D image → CNN" encoding module

### 🧠 AI & Mining Lab
Four data-mining modules trained on the real Wisconsin Diagnostic Breast
Cancer (WDBC) dataset (569 patients × 30 features, UCI ML Repository /
Kaggle):

| Tab | Model | Highlight |
|---|---|---|
| **Classification** | Random Forest · Decision Tree · Logistic Regression · SVM · KNN | Test acc 95.8% · ROC-AUC 0.947 · confusion-matrix heatmap · ROC curve · feature-importance chart · live prediction with 10 real feature inputs |
| **Clustering** | K-Means (k=3) + DBSCAN + PCA | Silhouette 0.31 · cluster spotlights with progress bars · PCA scatter coloured by cluster |
| **Association** | FP-Growth | 50 rules mined from 569 transactions · **rule-network graph** with lift-scaled edge thickness and confidence-scaled opacity |
| **Anomaly** | Isolation Forest (contamination 15%) | Anomaly-rate gauge · score scatter · top-flagged patient list |

### ⚡ AlphaGenome Lab (Novelty layer)

Inspired by Google DeepMind's AlphaGenome — a variant-to-therapy workbench
that pushes past mere prediction. Every input is a **dropdown** loaded
from a real hotspot catalog; no manual typing.

**1. Live DNA Editor**
- Rotating **3-D SVG double helix** with the selected position glowing
- Pick a real gene, pick a real known hotspot from the dropdown (or click a
  base in the sequence), pick a substituted base → hit *Apply edit*
- The system computes codon translation using the real standard genetic
  code (64 codons → 20 amino acids) and displays:
  - Original codon → new codon (visual boxes, changed position highlighted)
  - Original amino acid → new amino acid (with full name)
  - Consequence class: **silent / conservative missense / missense /
    nonsense / stop-loss**
  - Protein sequence before/after with the changed residue highlighted

**2. Variant Effect Predictor**
- Transparent AlphaGenome-style pathogenicity scorer with a full rationale
  checklist (not a black-box neural net):
  - Consequence weight (silent 0.05 … nonsense 0.90)
  - +0.10 if the gene is a known tumor suppressor
  - +0.08 if the gene is a known oncogene
  - Exact match against real cancer hotspots → boosts to 0.85+
- Circular pathogenicity gauge + band (Benign / Likely benign / Uncertain /
  Likely pathogenic / Pathogenic)
- Table of other known hotspots in the same gene for context

**3. Precision Remedy Recommender**
- Given a mutation profile → returns **FDA-approved targeted therapies**
  from a curated public precision-oncology drug-target map:
  - BRAF V600E → Vemurafenib · Dabrafenib · Dabrafenib+Trametinib
  - EGFR L858R / T790M / exon19del → Osimertinib · Erlotinib · Gefitinib
  - KRAS G12C → Sotorasib · Adagrasib
  - BRCA1/2 → Olaparib · Talazoparib · Rucaparib (PARP synthetic lethality)
  - PIK3CA H1047R → Alpelisib
  - IDH1 R132H → Ivosidenib
  - VHL → Belzutifan
  - NRAS → Binimetinib
  - PTEN loss → Capivasertib
- Each recommendation shows **drug class · mechanism · disease context ·
  evidence level · response-estimate gauge**
- Preset patient profiles: BRAF-mutant melanoma, EGFR-mutant NSCLC,
  BRCA-mutant breast, KRAS G12C lung

### 📊 OLAP — Cross-Domain Analytics
Three domain tabs, all with dropdown pickers (no manual typing):

- **Warehouse** — roll-up / drill-down / slice / dice over the star schema
  (fact `FACT_BIOLOGICAL_OBSERVATION` × 11 dimension tables)
- **AlphaGenome** — roll-up / dice / pivot over the real ClinVar/COSMIC
  hotspot catalog (18 missense, 8 nonsense, 4 frameshift, …). Pivot tab
  produces a 2-D cross-tab heatmap of gene × consequence.
- **Computer Vision** — class summary (per-class recall/precision),
  confidence-bin calibration bar chart, and error drill-down with grids
  of the CNN's correct vs. incorrect real ultrasound scans

### 🏗 Data Warehouse
- **Star schema** in PostgreSQL-compatible SQL (SQLite fallback for local runs)
- **Fact:** `FACT_BIOLOGICAL_OBSERVATION`
- **Dimensions:** `DIM_SAMPLE`, `DIM_GENE`, `DIM_GENOME`, `DIM_CHROMOSOME`,
  `DIM_RNA`, `DIM_PROTEIN`, `DIM_MUTATION`, `DIM_DISEASE`, `DIM_IMAGE`,
  `DIM_ORGANISM`, `DIM_TIME`
- **Snowflake edges:** `DIM_CHROMOSOME → DIM_GENOME`, `DIM_GENE → DIM_CHROMOSOME`
- **Materialized views** for common OLAP aggregates
- Warehouse page renders the radial schema map + an inline **Run ETL**
  button that streams a live report (records extracted, cleaned,
  duplicates removed, loaded)

### 🎬 Live Demo Mode
- One-click **Run Biological Analysis** — animated 8-step pipeline that
  loads the genome, processes RNA/protein/mutations, runs CV, mines
  associations, and prints the resulting biological profile
- Made for live college / lab presentations

---

## Data Provenance — every value is real

| Layer | Source |
|---|---|
| Gene coordinates & biotypes | Ensembl · NCBI RefSeq · Cancer Gene Census (Sanger) |
| Chromosome lengths & GC content | NCBI GRCh38.p14 assembly |
| Protein IDs & N-terminal sequences | UniProt (P04637 TP53, P38398 BRCA1, …) |
| Cancer hotspot mutations | ClinVar + COSMIC public hotspot lists |
| Disease vocabulary | OncoTree (Memorial Sloan Kettering) |
| Sample-level diagnostic features | **Wisconsin Diagnostic Breast Cancer** — 569 real patients × 30 features (UCI ML / Kaggle) |
| RNA expression means | GTEx v8 · TCGA-BRCA published values |
| Biological images | **MedMNIST BreastMNIST** — real breast-ultrasound patches |
| Precision-oncology drug map | Public FDA labelling + NCCN guideline knowledge |

None of these sources include private patient information.

---

## Architecture

```
biovision/
├── frontend/                 Next.js 14 + Tailwind + Recharts
│   ├── app/
│   │   ├── page.js           Overview dashboard (hero + 8 stat cards)
│   │   ├── genome/           Genome Explorer
│   │   ├── rna/              RNA Explorer
│   │   ├── protein/          Protein Explorer
│   │   ├── mutation/         Mutation Explorer
│   │   ├── biovision/        CV — CNN + Grad-CAM + gallery
│   │   ├── ai-lab/           Classification · Clustering · Association · Anomaly
│   │   ├── alpha/            AlphaGenome Lab (novelty)
│   │   ├── olap/             Cross-domain OLAP
│   │   ├── warehouse/        Star-schema visualisation + ETL trigger
│   │   └── demo/             Guided live demo
│   ├── components/
│   │   ├── Sidebar.js, AppShell.js, BackButton.js, Hero.js …
│   │   ├── viz/              Reusable viz atoms
│   │   │   ├── ConfusionMatrix.js
│   │   │   ├── RocCurve.js
│   │   │   ├── CvGallery.js
│   │   │   ├── AssociationGraph.js
│   │   │   ├── Gauge.js
│   │   │   └── Dna3D.js      Rotating 3-D DNA helix (pure SVG)
│   │   └── dashboard/        ChromosomeIdeogram · MutationDonut · ProteinStructure …
│   └── lib/api.js
├── backend/                  FastAPI + SQLAlchemy + Pandas + scikit-learn + PyTorch
│   ├── api/
│   │   ├── main.py
│   │   └── routers/          overview · genome · rna · protein · mutation
│   │                         samples · images · ml · cv · olap · olap_domains
│   │                         alpha · warehouse · etl
│   ├── etl/
│   │   ├── real_data.py      Real gene facts + WDBC + hotspot catalog
│   │   └── run_etl.py        Extract → Validate → Clean → Transform → Load
│   ├── services/
│   │   ├── codon.py          Standard genetic code + codon translator
│   │   ├── variant_effect.py Transparent pathogenicity scorer
│   │   ├── remedy.py         Precision-oncology drug-target map
│   │   └── fusion.py         Multi-modal DNA + RNA + protein + image fusion
│   ├── models/orm.py         Star-schema SQLAlchemy models
│   └── database/db.py
├── ml/
│   ├── classification/       Trains 5 classifiers on real WDBC
│   ├── clustering/           K-Means + DBSCAN + PCA
│   ├── association/          FP-Growth (memory-capped)
│   └── anomaly/              Isolation Forest
├── cv/
│   ├── training/train_cnn.py TinyCNN on MedMNIST BreastMNIST
│   ├── inference/
│   │   ├── inference.py      + Grad-CAM
│   │   └── gallery.py        Real-image prediction gallery
│   └── preprocessing/        DNA-to-image encoder
├── warehouse/
│   ├── schema/star_schema.sql
│   └── olap/olap_queries.sql
├── models_saved/             .pkl / .pt + JSON reports
└── docs/                     architecture.md · warehouse_erd.md · SETUP.md
```

---

## API Surface

```
GET  /overview                          High-level counts
GET  /genomes, /chromosomes, /genes     Genome catalog
GET  /genes/{id}                        Gene detail with DNA/protein/mutations
GET  /rna-expression                    Expression rows
GET  /rna-expression/top?direction=up   Top up/down-regulated
GET  /rna-expression/heatmap
GET  /proteins, /proteins/{id}
GET  /mutations, /mutations/top-genes, /mutations/by-chromosome
GET  /samples, /samples/{id}
GET  /images

# Analytics / ML
GET  /analytics/classification
POST /analytics/classification/predict
GET  /analytics/clusters
GET  /analytics/associations
GET  /analytics/anomalies
GET  /analytics/mutations, /analytics/expression

# Computer Vision
GET  /cv/report
GET  /cv/gallery?n=12                   Live CNN predictions on real test images
POST /cv/predict                        Predict + Grad-CAM
POST /cv/dna-encode-predict             DNA → 2-D image → CNN

# AlphaGenome Lab
GET  /alpha/catalog                     Genes + real hotspots (for dropdowns)
GET  /alpha/gene-reference?gene=TP53
POST /alpha/dna-edit                    Live codon-level edit
POST /alpha/variant-effect              Transparent pathogenicity score
POST /alpha/remedy                      FDA drug recommendations
GET  /alpha/remedy/for-sample/{id}      Auto-recommend for a warehouse patient

# OLAP
GET  /olap/rollup, /drilldown, /slice, /dice        Warehouse
GET  /olap/alpha/rollup, /dice, /pivot              AlphaGenome catalog
GET  /olap/cv/rollup, /confidence-bins, /errors     Computer Vision

# Warehouse + ETL
GET  /warehouse/schema
POST /etl/run
```

Interactive Swagger docs at `http://127.0.0.1:8000/docs`.

---

## Trained Models — real metrics

| Model | Trained on | Result |
|---|---|---|
| Classifier | 569 real WDBC patients × 30 features | Best = Decision Tree · acc **95.8%** · F1 **0.94** · ROC-AUC **0.947** |
| Clustering | Same WDBC feature matrix | K-Means k=3 · silhouette **0.31** · clusters 110 / 359 / 100 |
| Anomaly | Same WDBC feature matrix | Isolation Forest · **86** anomalous patients flagged |
| CNN | Real MedMNIST BreastMNIST · 546 train / 78 val / 156 test | Test accuracy **76.9%** |
| Association | 569 real transactions built from WDBC + gene facts | **50** rules mined (FP-Growth, min-support 0.35, min-confidence 0.7) |

Artifacts land in `models_saved/*.pkl` / `*.pt`, JSON reports in
`models_saved/*_report.json`. Every `/analytics/*` and `/cv/report`
endpoint serves those reports live.

---

## UI Highlights

- **Dark-blue-on-aqua palette**, Space Grotesk display + Inter body
- **Full-viewport DNA / protein / cell background image** with frosted-glass cards floating over it
- **Collapsible sidebar** with animated width transition, remembered via localStorage
- **Back button** on every interior page
- **12+ visualisation components**: confusion matrix heatmap, ROC curve, gauge, association network graph, chromosome ideogram with G-banding, mutation donut with % breakdown, protein-structure ribbon, PCA scatter, live CV gallery, 3-D rotating DNA helix
- **Forced-colors CSS override** so Firefox / OS high-contrast mode keeps the design intact

---

## Setup

```bash
# 1. Backend
cd biovision
python -m venv .venv
.venv\Scripts\Activate.ps1                          # Windows
# source .venv/bin/activate                         # macOS / Linux

pip install -r backend/requirements.txt

# real ETL + real model training
python -m backend.etl.run_etl                       # WDBC + real gene facts
python -m ml.classification.train_classifier        # WDBC diagnostic classifier
python -m ml.clustering.train_clustering
python -m ml.association.train_association
python -m ml.anomaly.train_anomaly
python -m cv.training.train_cnn                     # MedMNIST BreastMNIST

# capped BLAS threads avoid a memory blow-up when the API runs alongside
$env:OPENBLAS_NUM_THREADS=1; $env:MKL_NUM_THREADS=1; $env:OMP_NUM_THREADS=1
python -m uvicorn backend.api.main:app --reload --port 8000

# 2. Frontend  (new terminal)
cd frontend
npm install
npm run dev                                         # http://localhost:3000
```

Swap to PostgreSQL by setting `BIOVISION_DB_URL=postgresql+psycopg://user:pw@host/db`
before running the ETL, and executing `warehouse/schema/star_schema.sql` first.

---

## Golden Demo Path (for a live presentation)

1. `/` — dashboard hero with the DNA/protein/cell backdrop and 20 real genes summarised
2. `/genome` — pick chromosome 17, click TP53, see its real DNA + protein + mutations
3. `/biovision` — press *Predict + Explain* → live Grad-CAM on a real ultrasound scan · scroll down for the 12-scan gallery
4. `/ai-lab → Classification` — ROC 0.947 + confusion heatmap · run a live prediction on custom feature values
5. `/ai-lab → Association` — the rule network graph
6. `/alpha → Live DNA Editor` — pick TP53, choose known hotspot R175H from the dropdown, hit **Apply edit** → watch the 3-D helix + codon boxes + consequence classification
7. `/alpha → Precision Remedy` — load *BRAF-mutant melanoma* preset → get Dabrafenib+Trametinib recommendation with mechanism explanation
8. `/olap → Computer Vision → Error drill-down` — the CNN's real mistakes side-by-side with its wins
9. `/demo` — the animated end-to-end pipeline finale

---

## License

Academic / research use only.
#   b i o v i s i o n  
 