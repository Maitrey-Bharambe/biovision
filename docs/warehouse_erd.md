# Warehouse ERD

```
                                ┌───────────────────┐
                                │   DIM_ORGANISM    │
                                │  organism_key PK  │
                                └────────┬──────────┘
                                         │
                                ┌────────▼──────────┐
                                │    DIM_GENOME     │
                                │  genome_key   PK  │
                                └────────┬──────────┘
                                         │           (snowflake)
                                ┌────────▼──────────┐
                                │  DIM_CHROMOSOME   │
                                │ chromosome_key PK │
                                └────────┬──────────┘
                                         │           (snowflake)
                                ┌────────▼──────────┐
                                │     DIM_GENE      │
                                │  gene_key    PK   │
                                └────────┬──────────┘
                                         │
   ┌───────────────┐   ┌───────────────┐ │ ┌───────────────┐   ┌───────────────┐
   │  DIM_SAMPLE   │   │   DIM_RNA     │ │ │  DIM_PROTEIN  │   │ DIM_MUTATION  │
   │ sample_key PK │   │ rna_key    PK │ │ │ protein_key PK│   │ mutation_key PK│
   └───────┬───────┘   └──────┬────────┘ │ └───────┬───────┘   └───────┬───────┘
           │                  │          │         │                   │
           │                  ▼          ▼         ▼                   ▼
           │            ┌──────────────────────────────────────────────────┐
           │            │        FACT_BIOLOGICAL_OBSERVATION                 │
           │            │  observation_id PK                                  │
           │            │  sample_key, gene_key, genome_key,                  │
           │            │  rna_key, protein_key, mutation_key,                │
           │            │  disease_key, image_key, time_key                   │
           │            │  expression_value, protein_abundance,               │
           │            │  mutation_count, cv_score,                          │
           │            │  ml_prediction, ml_confidence                       │
           │            └────────┬────────────┬────────────┬─────────────────┘
           │                     │            │            │
           │           ┌─────────▼─────┐ ┌────▼─────────┐ ┌▼──────────────┐
           │           │  DIM_DISEASE  │ │  DIM_IMAGE   │ │   DIM_TIME    │
           │           │ disease_key PK│ │ image_key PK │ │ time_key   PK │
           │           └───────────────┘ └──────┬───────┘ └───────────────┘
           │                                    │
           └────────────────────────────────────┘   (image ← sample)
```

Grain of the fact: one row per (sample × gene × time) observation. Each row is
optionally enriched with a mutation, an image, an RNA measurement, a protein
measurement, and a disease label; the CV / ML result columns are populated at
ETL time from the trained models where available.
