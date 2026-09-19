"""CV inference endpoints — biological image classification + DNA-to-image."""
from __future__ import annotations

import io
import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from PIL import Image

from cv.inference.inference import predict as cnn_predict
from cv.preprocessing.dna_to_image import encode_2d, to_rgb_image
from backend.etl.real_data import gene_dna as sample_dna
import base64

router = APIRouter()
ROOT = Path(__file__).resolve().parents[3]
MODEL_DIR = ROOT / "models_saved"


@router.get("/report")
def cnn_report():
    p = MODEL_DIR / "cnn_report.json"
    if not p.exists():
        raise HTTPException(404, "Train the CNN first")
    return json.loads(p.read_text())


@router.get("/gallery")
def cv_gallery(n: int = 12, size: int = 128):
    """Real BreastMNIST test images with the CNN's live predictions."""
    from cv.inference.gallery import build
    try:
        return {"items": build(n=n, size=size)}
    except Exception as e:
        raise HTTPException(500, f"gallery build failed: {e}")


@router.post("/predict")
async def cv_predict(image: UploadFile | None = File(None), exemplar: str = "abnormal"):
    """Predict on an uploaded image, or on a synthetic exemplar."""
    img = None
    if image is not None:
        img = Image.open(io.BytesIO(await image.read()))
    return cnn_predict(image=img, exemplar=exemplar)


class DnaInput(BaseModel):
    sequence: str | None = None
    gene: str | None = None
    size: int = 32


@router.post("/dna-encode-predict")
def dna_encode_predict(inp: DnaInput):
    """DNA → 2-D image → CNN prediction, all in one call."""
    seq = inp.sequence
    if not seq and inp.gene:
        seq = sample_dna(inp.gene)
    if not seq:
        raise HTTPException(400, "Provide 'sequence' or 'gene'")
    matrix = encode_2d(seq, size=inp.size)
    img = to_rgb_image(matrix)
    result = cnn_predict(image=img)

    buf = io.BytesIO(); img.save(buf, format="PNG")
    encoded = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    result["dna_image"] = encoded
    result["disclaimer"] = ("Computational visualization of sequence data. "
                             "This is NOT a physical image of DNA.")
    return result
