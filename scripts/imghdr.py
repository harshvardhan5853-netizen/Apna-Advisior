"""Minimal shim for the stdlib ``imghdr`` module removed in Python 3.13.

PaddleOCR 1.1.1 (the pinned 2.x-line engine used by smart_extract.py) imports
``imghdr``, which no longer ships with Python 3.13+. This tiny replacement
provides the ``what()`` entry point PaddleOCR relies on so the legacy engine
keeps working without rewriting smart_extract.py for the newer PaddleOCR 3.x
API. Kept local to ``scripts/`` and injected onto sys.path by extract_service.
"""

from __future__ import annotations

import os


def what(file, h: bytes | None = None) -> str | None:
    if h is None:
        if isinstance(file, (str, bytes, os.PathLike)):
            with open(file, "rb") as fp:
                h = fp.read(32)  # noqa: UP015 - binary read of magic bytes
        else:
            h = file.read(32)

    if len(h) < 6:
        return None

    # PNG
    if h[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    # GIF
    if h[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    # JPEG
    if h[:2] == b"\xff\xd8":
        return "jpeg"
    # BMP
    if h[:2] == b"BM":
        return "bmp"
    # TIFF
    if h[:2] in (b"II", b"MM"):
        return "tiff"
    # WEBP
    if h[:4] == b"RIFF" and h[8:12] == b"WEBP":
        return "webp"
    # XBM
    if h.startswith(b"#define "):
        return "xbm"
    return None
