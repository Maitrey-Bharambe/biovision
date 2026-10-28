"""BioVision Nexus — HTTP surface for the LLM investigation planner."""
from __future__ import annotations

import os
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.services import nexus as svc

router = APIRouter()


class InvestigationIn(BaseModel):
    question: str = Field(..., min_length=1, max_length=600)
    explain:  bool = True   # ask the LLM for an explanation after execution


class StepOut(BaseModel):
    tool:   str
    params: dict
    output: dict
    error:  Optional[str] = None
    elapsed_ms: int


class ExplanationOut(BaseModel):
    source: str
    text:   str
    note:   Optional[str] = None
    model:  Optional[str] = None
    usage:  Optional[dict] = None


class InvestigationOut(BaseModel):
    question:    str
    plan:        dict
    results:     List[StepOut]
    explanation: Optional[ExplanationOut] = None
    provider_available: bool
    provider_note: Optional[str] = None


@router.get("/status")
def nexus_status():
    ok, reason = svc._groq_available()
    return {
        "groq_available": ok,
        "note": reason,
        "model": svc.GROQ_MODEL,
        "tools": svc.TOOL_SCHEMA,
    }


@router.post("/investigate", response_model=InvestigationOut)
def nexus_investigate(body: InvestigationIn,
                      session: Session = Depends(get_db)):
    plan = svc.plan_investigation(body.question)
    results = svc.execute_plan(session, plan)

    explanation = None
    if body.explain:
        explanation = svc.explain_results(body.question, results)

    ok, note = svc._groq_available()
    return InvestigationOut(
        question=body.question,
        plan=plan,
        results=[StepOut(tool=r.tool, params=r.params, output=r.output,
                         error=r.error, elapsed_ms=r.elapsed_ms)
                 for r in results],
        explanation=ExplanationOut(**explanation) if explanation else None,
        provider_available=ok,
        provider_note=note,
    )
