# BioVision — Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│  Frontend  (Next.js 14, Tailwind, Recharts)                           │
│  - Overview, Explorers (Genome / RNA / Protein / Mutation)             │
│  - BioVision (CV), AI Mining Lab                                       │
│  - OLAP Analytics, Data Warehouse schema                               │
│  - Sample detail, Guided demo                                          │
└──────────────────────────────┬────────────────────────────────────────┘
                               │  REST / JSON
┌──────────────────────────────▼────────────────────────────────────────┐
│  Backend  (FastAPI, SQLAlchemy, Pandas)                                │
│  Routers: overview, genome, rna, protein, mutation, samples, images,  │
│           ml (analytics), cv, olap, warehouse, etl                    │
└──────┬──────────────────────────────────────────────────────┬──────────┘
       │                                                      │
       │   SQLAlchemy ORM                                     │  torch / sklearn / mlxtend
       │                                                      │
┌──────▼───────────────────────────────┐         ┌────────────▼──────────────┐
│  Warehouse (PostgreSQL / SQLite)     │         │  Model registry           │
│                                      │         │   models_saved/*.pkl      │
│  FACT_BIOLOGICAL_OBSERVATION         │         │   models_saved/cnn_model.pt│
│    ├── DIM_SAMPLE                    │         │                            │
│    ├── DIM_GENE                      │         │   Reports (JSON) live      │
│    │    └── DIM_CHROMOSOME           │         │   next to the artifacts.   │
│    │          └── DIM_GENOME         │         └────────────────────────────┘
│    ├── DIM_RNA                       │
│    ├── DIM_PROTEIN                   │
│    ├── DIM_MUTATION                  │
│    ├── DIM_DISEASE                   │
│    ├── DIM_IMAGE                     │
│    ├── DIM_ORGANISM                  │
│    └── DIM_TIME                      │
└──────────────────────────────────────┘
```

## Data flow

1. `backend/etl/run_etl.py` runs Extract → Validate → Clean → Transform → Load.
2. Every ML/CV training script consumes the warehouse via SQLAlchemy, saves
   trained artifacts to `models_saved/` and writes a JSON report next to them.
3. Router endpoints hydrate the trained reports for the frontend and re-run
   scoring for interactive predictions.
4. The `/cv/dna-encode-predict` endpoint composes two modules: the DNA-to-image
   encoder (`cv/preprocessing/dna_to_image.py`) and the CNN inference module
   (`cv/inference/inference.py`).
5. `backend/services/fusion.py` concatenates the DNA / RNA / protein / image
   feature vectors — the Sample Detail page shows the fused-feature view.

## Deployment

Local: SQLite fallback, `uvicorn api.main:app --reload` + `npm run dev`.
Production: set `BIOVISION_DB_URL=postgresql+psycopg://...` and any WSGI runner
(gunicorn + uvicorn workers). Static frontend can be built with `next build &&
next start`.
