from pathlib import Path

import numpy as np
from PIL import Image

from app.imaging import read_image_size
from app.vision import _fold_px


def test_fold_px_desktop_and_mobile():
    assert _fold_px("desktop", 1440, 5000) == 900
    assert _fold_px("mobile", 1170, 5000) == int(1170 * 844 / 390)


def test_fold_px_capped_by_height():
    assert _fold_px("desktop", 1440, 500) == 500


def test_read_image_size(tmp_path):
    path = tmp_path / "x.png"
    Image.fromarray(np.zeros((40, 60, 3), dtype="uint8")).save(path)
    assert read_image_size(Path(path)) == (60, 40)
