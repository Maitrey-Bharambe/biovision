"""BioVision FastAPI entry point."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database.db import engine, Base
from backend.api.routers import (
    overview, genome, rna, protein, mutation, samples, images, ml_router,
    olap, warehouse, etl_router, cv_router, alpha_router, olap_domains,
    olap_cube,
)

app = FastAPI(
    title="BioVision API",
    description="Multi-Omics Data Warehouse · Data Mining · Computer Vision",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    Base.metadata.create_all(bind=engine)


app.include_router(overview.router,   prefix="",                tags=["Overview"])
app.include_router(genome.router,     prefix="",                tags=["Genome"])
app.include_router(rna.router,        prefix="",                tags=["RNA"])
app.include_router(protein.router,    prefix="",                tags=["Protein"])
app.include_router(mutation.router,   prefix="",                tags=["Mutation"])
app.include_router(samples.router,    prefix="",                tags=["Samples"])
app.include_router(images.router,     prefix="",                tags=["Images"])
app.include_router(ml_router.router,  prefix="/analytics",      tags=["ML / Mining"])
app.include_router(cv_router.router,  prefix="/cv",             tags=["Computer Vision"])
app.include_router(olap.router,       prefix="/olap",           tags=["OLAP"])
app.include_router(olap_domains.router, prefix="/olap",         tags=["OLAP Cross-Domain"])
app.include_router(olap_cube.router,    prefix="/olap",         tags=["OLAP 3D Cube"])
app.include_router(warehouse.router,  prefix="/warehouse",      tags=["Warehouse"])
app.include_router(etl_router.router, prefix="/etl",            tags=["ETL"])
app.include_router(alpha_router.router, prefix="/alpha",        tags=["AlphaGenome Lab"])


@app.get("/", tags=["Health"])
def root():
    return {"service": "biovision", "status": "ok"}
