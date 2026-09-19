"""Build a gallery of the CNN's predictions on real BreastMNIST test images.

Returns a list of {image_b64, true_label, predicted_label, confidence, correct}.
Used by the /cv/gallery endpoint to power the CV page's visual proof strip.
"""
from __future__ import annotations

import base64
import io
from typing import List

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image, ImageDraw

from cv.training.train_cnn import TinyCNN, CLASSES, IMG_SIZE
from cv.inference.inference import _load, _b64          # reuse the loaded model


DISPLAY = {"malignant": "Abnormal", "normal_benign": "Normal"}


def _test_split():
    """Return the real BreastMNIST test-set images + labels (uint8, N×28×28)."""
    import medmnist
    from medmnist import INFO
    info = INFO["breastmnist"]
    DataClass = getattr(medmnist, info["python_class"])
    ds = DataClass(split="test", download=True)
    return np.array(ds.imgs), np.array(ds.labels).squeeze().astype(int)


def build(n: int = 12, size: int = 128) -> List[dict]:
    imgs, labels = _test_split()
    model = _load()

    picks = np.arange(min(n, len(imgs)))                # first n test images
    out: List[dict] = []
    for i in picks:
        arr = imgs[i].astype(np.float32) / 255.0
        x = torch.from_numpy(arr).float().unsqueeze(0).unsqueeze(0)
        with torch.no_grad():
            probs = F.softmax(model(x), dim=1)[0]
            cls = int(torch.argmax(probs).item())
        true_lab = CLASSES[int(labels[i])]
        pred_lab = CLASSES[cls]
        conf = float(probs[cls].item())

        im = Image.fromarray((arr * 255).astype(np.uint8)).convert("RGB") \
              .resize((size, size), Image.BILINEAR)
        buf = io.BytesIO(); im.save(buf, format="PNG")
        b64 = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

        out.append(dict(
            index=int(i),
            true_label=DISPLAY[true_lab],
            predicted_label=DISPLAY[pred_lab],
            confidence=round(conf, 4),
            correct=bool(true_lab == pred_lab),
            image=b64,
        ))
    return out
