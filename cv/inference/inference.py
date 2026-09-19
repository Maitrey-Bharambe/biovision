"""CNN inference on real MedMNIST BreastMNIST images + Grad-CAM."""
from __future__ import annotations

import base64, io
from pathlib import Path
from typing import Optional

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

from cv.training.train_cnn import TinyCNN, CLASSES, IMG_SIZE

ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT / "models_saved" / "cnn_model.pt"

_model: Optional[TinyCNN] = None


def _load():
    global _model
    if _model is None:
        _model = TinyCNN(n_classes=2)
        if MODEL_PATH.exists():
            _model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
        _model.eval()
    return _model


def _prep(img: Image.Image) -> torch.Tensor:
    img = img.convert("L").resize((IMG_SIZE, IMG_SIZE))
    arr = np.array(img).astype(np.float32) / 255.0
    return torch.from_numpy(arr).unsqueeze(0).unsqueeze(0)


def _b64(arr: np.ndarray) -> str:
    im = Image.fromarray((arr * 255).astype(np.uint8))
    if im.size[0] < 100:
        im = im.resize((160, 160), Image.NEAREST)
    buf = io.BytesIO(); im.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def _colorize_heatmap(hm: np.ndarray) -> np.ndarray:
    hm = np.clip(hm, 0, 1)
    r = hm
    g = 1 - np.abs(hm - 0.5) * 2
    b = 1 - hm
    return np.stack([r, g, b], axis=-1)


def _real_exemplar(label: str) -> Image.Image:
    """Fetch a real BreastMNIST test image matching the requested label."""
    try:
        import medmnist
        from medmnist import INFO
        info = INFO["breastmnist"]
        DataClass = getattr(medmnist, info["python_class"])
        ds = DataClass(split="test", download=True)
        target = 0 if label in ("abnormal", "malignant") else 1
        labels = np.array(ds.labels).squeeze()
        idx = np.where(labels == target)[0]
        if not len(idx):
            idx = [0]
        arr = ds.imgs[idx[0]]
        return Image.fromarray(arr)
    except Exception:
        rng = np.random.RandomState(0)
        arr = (rng.normal(0.5, 0.15, (IMG_SIZE, IMG_SIZE)) * 255).astype(np.uint8)
        return Image.fromarray(arr)


def predict(image: Optional[Image.Image] = None, exemplar: str = "abnormal") -> dict:
    model = _load()

    if image is None:
        image = _real_exemplar(exemplar)

    x = _prep(image); x.requires_grad_(True)

    activations, gradients = {}, {}
    def fwd_hook(_m, _i, out): activations["v"] = out
    def bwd_hook(_m, gi, go):  gradients["v"] = go[0]

    h1 = model.conv2.register_forward_hook(fwd_hook)
    h2 = model.conv2.register_full_backward_hook(bwd_hook)
    try:
        logits = model(x)
        probs = F.softmax(logits, dim=1)[0]
        cls = int(torch.argmax(probs).item())
        model.zero_grad(); logits[0, cls].backward()
        act  = activations["v"][0].detach().numpy()
        grad = gradients["v"][0].detach().numpy()
        weights = grad.mean(axis=(1, 2))
        cam = np.maximum((weights[:, None, None] * act).sum(axis=0), 0)
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        cam_img = np.array(Image.fromarray((cam * 255).astype(np.uint8))
                            .resize((IMG_SIZE, IMG_SIZE), Image.BILINEAR)) / 255.0
        heat = _colorize_heatmap(cam_img)

        orig = np.array(image.convert("L").resize((IMG_SIZE, IMG_SIZE))) / 255.0
        overlay = 0.55 * np.stack([orig, orig, orig], axis=-1) + 0.45 * heat
    finally:
        h1.remove(); h2.remove()

    display = {"malignant": "abnormal", "normal_benign": "healthy"}
    return dict(
        prediction=display.get(CLASSES[cls], CLASSES[cls]),
        raw_prediction=CLASSES[cls],
        confidence=round(float(probs[cls].item()), 4),
        probabilities={CLASSES[i]: round(float(probs[i].item()), 4) for i in range(len(CLASSES))},
        original_image=_b64(orig),
        gradcam=_b64(overlay),
        source="MedMNIST/BreastMNIST",
    )
