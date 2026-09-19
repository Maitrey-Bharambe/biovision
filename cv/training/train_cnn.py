"""Train a CNN on the BreastMNIST dataset (MedMNIST v2).

BreastMNIST is a real, public medical-image dataset derived from a dataset
of 780 breast ultrasound images from the "Breast Ultrasound Images Dataset"
by Al-Dhabyani et al., 2020. MedMNIST resamples it to 28×28×1 grayscale
patches with a binary label:
    0 = malignant
    1 = normal / benign

Reference:  Yang et al., "MedMNIST v2 - A large-scale lightweight benchmark
            for 2D and 3D biomedical image classification", Scientific Data
            (Nature), 2023. https://medmnist.com/

The dataset auto-downloads on first use (~10 MB) into ~/.medmnist.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader

ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / "models_saved"
MODEL_DIR.mkdir(exist_ok=True)

IMG_SIZE = 28                              # native BreastMNIST resolution
CLASSES  = ["malignant", "normal_benign"]


# --------------------------------------------------------------------- #
#  Dataset loader — real BreastMNIST if medmnist is available            #
# --------------------------------------------------------------------- #

def _load_medmnist():
    """Load MedMNIST BreastMNIST splits. Auto-downloads on first call."""
    import medmnist
    from medmnist import INFO

    info = INFO["breastmnist"]
    DataClass = getattr(medmnist, info["python_class"])
    train_ds = DataClass(split="train",  download=True)
    val_ds   = DataClass(split="val",    download=True)
    test_ds  = DataClass(split="test",   download=True)
    return train_ds, val_ds, test_ds


class TorchMedMNIST(Dataset):
    def __init__(self, mm_ds, augment: bool = False):
        self.imgs   = np.array(mm_ds.imgs)             # (N,28,28) uint8
        self.labels = np.array(mm_ds.labels).squeeze() # (N,)
        self.augment = augment

    def __len__(self): return len(self.labels)

    def __getitem__(self, i):
        img = self.imgs[i].astype(np.float32) / 255.0
        lab = int(self.labels[i])
        if self.augment:
            if np.random.rand() < 0.5: img = np.fliplr(img).copy()
            if np.random.rand() < 0.5: img = np.flipud(img).copy()
        t = torch.from_numpy(img).float().unsqueeze(0)
        return t, lab


# --------------------------------------------------------------------- #
#  Model                                                                 #
# --------------------------------------------------------------------- #

class TinyCNN(nn.Module):
    def __init__(self, n_classes: int = 2):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 16, 3, padding=1)
        self.conv2 = nn.Conv2d(16, 32, 3, padding=1)
        self.pool  = nn.MaxPool2d(2)
        self.fc1   = nn.Linear(32 * (IMG_SIZE // 4) * (IMG_SIZE // 4), 64)
        self.fc2   = nn.Linear(64, n_classes)

    def forward(self, x):
        x = self.pool(F.relu(self.conv1(x)))
        x = self.pool(F.relu(self.conv2(x)))
        x = x.flatten(1)
        x = F.relu(self.fc1(x))
        return self.fc2(x)


# --------------------------------------------------------------------- #
#  Fallback synthetic dataset — only used if medmnist unavailable       #
# --------------------------------------------------------------------- #

def _make_healthy(rng):
    img = rng.normal(0.5, 0.05, (IMG_SIZE, IMG_SIZE))
    return np.clip(img, 0, 1)

def _make_abnormal(rng):
    img = _make_healthy(rng)
    cx, cy = rng.randint(5, IMG_SIZE-5, size=2)
    yy, xx = np.ogrid[:IMG_SIZE, :IMG_SIZE]
    mask = (xx-cx)**2 + (yy-cy)**2 <= 25
    img[mask] = rng.uniform(0.9, 1.0)
    return np.clip(img, 0, 1)


# --------------------------------------------------------------------- #
#  Training entry point                                                  #
# --------------------------------------------------------------------- #

def train(epochs: int = 8, batch_size: int = 64) -> dict:
    torch.manual_seed(42); np.random.seed(42)

    try:
        tr_mm, va_mm, te_mm = _load_medmnist()
        dataset_name = "MedMNIST/BreastMNIST (real breast ultrasound)"
        source = "https://medmnist.com/ · Al-Dhabyani et al. 2020"
        tr = TorchMedMNIST(tr_mm, augment=True)
        va = TorchMedMNIST(va_mm)
        te = TorchMedMNIST(te_mm)
    except Exception as e:
        print(f"[cv] MedMNIST not available ({e}); falling back to synthetic")
        dataset_name = "synthetic-fallback"
        source = "procedural"
        rng = np.random.RandomState(0)
        def make_split(n):
            imgs, labs = [], []
            for _ in range(n):
                lab = int(rng.randint(0, 2))
                img = _make_abnormal(rng) if lab == 0 else _make_healthy(rng)
                imgs.append(img); labs.append(lab)
            class _S:
                pass
            s = _S(); s.imgs = np.array(imgs); s.labels = np.array(labs)
            return s
        tr = TorchMedMNIST(make_split(400), augment=True)
        va = TorchMedMNIST(make_split(80))
        te = TorchMedMNIST(make_split(120))

    tr_dl = DataLoader(tr, batch_size=batch_size, shuffle=True)
    va_dl = DataLoader(va, batch_size=batch_size)
    te_dl = DataLoader(te, batch_size=batch_size)

    model = TinyCNN(n_classes=2)
    opt   = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.CrossEntropyLoss()

    history = []
    for ep in range(epochs):
        model.train(); losses = []
        for xb, yb in tr_dl:
            opt.zero_grad()
            logits = model(xb); loss = loss_fn(logits, yb)
            loss.backward(); opt.step()
            losses.append(loss.item())
        train_loss = float(np.mean(losses))

        model.eval(); correct = tot = 0
        with torch.no_grad():
            for xb, yb in va_dl:
                pred = model(xb).argmax(1)
                correct += (pred == yb).sum().item(); tot += len(yb)
        val_acc = correct / max(tot, 1)
        history.append(dict(epoch=ep + 1,
                            train_loss=round(train_loss, 4),
                            val_accuracy=round(val_acc, 4)))
        print(f"  epoch {ep+1}/{epochs}  loss={train_loss:.4f}  val_acc={val_acc:.4f}")

    # Test
    model.eval(); correct = tot = 0
    conf = np.zeros((2, 2), dtype=int)
    with torch.no_grad():
        for xb, yb in te_dl:
            pred = model(xb).argmax(1)
            for t, p in zip(yb.tolist(), pred.tolist()):
                conf[t, p] += 1
            correct += (pred == yb).sum().item(); tot += len(yb)
    test_acc = correct / max(tot, 1)

    # Save 6 real test images for the UI to display
    import base64, io
    from PIL import Image
    samples = []
    for i in range(min(6, len(te))):
        arr = (te.imgs[i]).astype(np.uint8)
        im = Image.fromarray(arr).resize((112, 112), Image.NEAREST)
        buf = io.BytesIO(); im.save(buf, format="PNG")
        b64 = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
        samples.append(dict(
            idx=i,
            label=CLASSES[int(te.labels[i])],
            image=b64,
        ))

    torch.save(model.state_dict(), MODEL_DIR / "cnn_model.pt")
    report = dict(
        dataset=dataset_name,
        source=source,
        classes=CLASSES,
        epochs=epochs,
        n_train=len(tr), n_val=len(va), n_test=len(te),
        history=history,
        test_accuracy=round(test_acc, 4),
        confusion_matrix=conf.tolist(),
        input_shape=[1, IMG_SIZE, IMG_SIZE],
        gallery=samples,
    )
    (MODEL_DIR / "cnn_report.json").write_text(json.dumps(report, indent=2))
    return report


if __name__ == "__main__":
    print(json.dumps(train(), indent=2))
