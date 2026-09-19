from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.models import orm

router = APIRouter()


@router.get("/images")
def list_images(image_type: str | None = None, db: Session = Depends(get_db)):
    q = db.query(orm.DimImage, orm.DimSample) \
          .join(orm.DimSample, orm.DimImage.sample_key == orm.DimSample.sample_key)
    if image_type:
        q = q.filter(orm.DimImage.image_type == image_type)
    return [{
        "image_id": i.image_id, "sample_id": s.sample_id,
        "type": i.image_type, "tissue": i.tissue, "label": i.label,
        "source": i.source, "path": i.path,
    } for i, s in q.all()]
