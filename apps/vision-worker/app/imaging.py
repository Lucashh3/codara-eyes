"""Utilidades de imagem sem dependencias pesadas (so Pillow)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image


def read_image_size(path: Path) -> tuple[int, int]:
    with Image.open(path) as image:
        return image.width, image.height
