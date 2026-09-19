"""Encode a DNA sequence into a 2-D matrix / image.

    A → 0, C → 1, G → 2, T → 3

The output is a 2-D matrix reshaped from the encoded sequence, ready for a
CNN. NOTE: this is a computational visualization of sequence data — it is
NOT a physical image of DNA.
"""
from __future__ import annotations

import numpy as np
from PIL import Image

NUCLEOTIDE_MAP = {"A": 0, "C": 1, "G": 2, "T": 3, "N": 0}
COLORS = {
    0: (65,  135, 232),      # A — blue
    1: (232, 82,  109),      # C — red
    2: (65,  201, 137),      # G — green
    3: (243, 191, 82),       # T — amber
}


def encode(seq: str) -> np.ndarray:
    return np.array([NUCLEOTIDE_MAP.get(b.upper(), 0) for b in seq], dtype=np.int64)


def encode_2d(seq: str, size: int = 32) -> np.ndarray:
    """Reshape a sequence into a size×size matrix (pad or crop as needed)."""
    v = encode(seq)
    target = size * size
    if len(v) < target:
        v = np.pad(v, (0, target - len(v)), constant_values=0)
    else:
        v = v[:target]
    return v.reshape(size, size)


def to_rgb_image(matrix: np.ndarray) -> Image.Image:
    h, w = matrix.shape
    img = np.zeros((h, w, 3), dtype=np.uint8)
    for value, rgb in COLORS.items():
        img[matrix == value] = rgb
    return Image.fromarray(img)


if __name__ == "__main__":
    import sys
    seq = sys.argv[1] if len(sys.argv) > 1 else "ATGCGTAGCTAGCTAGCGT" * 60
    m = encode_2d(seq, 32)
    to_rgb_image(m).save("dna.png")
    print("wrote dna.png", m.shape)
