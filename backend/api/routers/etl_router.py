"""ETL trigger endpoint."""
from __future__ import annotations

from fastapi import APIRouter

from backend.etl.run_etl import run_etl

router = APIRouter()


@router.post("/run")
def run(reset: bool = True):
    return run_etl(reset=reset)
