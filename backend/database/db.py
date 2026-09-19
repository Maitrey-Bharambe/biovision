"""SQLAlchemy engine + session factory.

Defaults to SQLite for zero-config local runs, but any PostgreSQL URL can be
supplied via BIOVISION_DB_URL to switch to the production warehouse. All the
star-schema tables in warehouse/schema/star_schema.sql are mirrored as
declarative models in backend/models/orm.py.
"""
from __future__ import annotations

import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SQLITE = f"sqlite:///{ROOT / 'biovision.db'}"
DB_URL = os.environ.get("BIOVISION_DB_URL", DEFAULT_SQLITE)

engine = create_engine(
    DB_URL,
    connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {},
    future=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
