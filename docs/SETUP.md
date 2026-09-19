# Setup — Windows / macOS / Linux

## 1. Backend

```bash
cd biovision
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r backend/requirements.txt

# From the project root so package imports resolve:
python -m backend.etl.run_etl                        # ETL + seed
python -m ml.classification.train_classifier         # classifier + report
python -m ml.clustering.train_clustering             # KMeans + DBSCAN + PCA
python -m ml.association.train_association           # FP-Growth
python -m ml.anomaly.train_anomaly                   # Isolation Forest
python -m cv.training.train_cnn                      # TinyCNN

uvicorn backend.api.main:app --reload --port 8000
```

Interactive docs: <http://localhost:8000/docs>.

## 2. Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:3000
```

Set a different backend URL with `NEXT_PUBLIC_API_URL` if needed.

## 3. Switching to PostgreSQL

Set the env var before running the ETL:

```bash
setx BIOVISION_DB_URL "postgresql+psycopg://user:pass@host:5432/biovision"   # Windows
export BIOVISION_DB_URL="postgresql+psycopg://user:pass@host:5432/biovision"  # bash
```

Then run `psql -f warehouse/schema/star_schema.sql` and re-run the ETL.

## 4. Demo flow

1. `/` — Overview totals and charts.
2. `/genome` — pick chromosome 17, click TP53.
3. `/rna`, `/protein`, `/mutation` — per-modality explorers.
4. `/biovision` — CNN prediction + Grad-CAM, and DNA-to-image experiment.
5. `/ai-lab` — classifier metrics, clusters, association rules, anomalies.
6. `/olap` — roll-up / drill-down / slice / dice.
7. `/warehouse` — schema map, run ETL from the UI.
8. `/sample/S001` — combined multi-modal view for one sample.
9. `/demo` — animated pipeline for a live audience.
