#!/usr/bin/env python3
"""
smart_extract.py  (final version)
-----------------------------------
Primary OCR engine for broker screenshots in Apna Advisor.

Extracts text/tables from a screenshot using PaddleOCR, with three
improvements aimed at the errors seen in real testing:

  1. UPSCALING: the image is enlarged 2x before OCR. Low-resolution
     screenshots are the main cause of digit-merging errors (e.g. "4 shares"
     + "2,611.10" turning into "42,611.10"). Feeding a larger image in
     measurably reduces this.

  2. RUPEE-SYMBOL FIX: OCR models frequently misread the ₹ symbol as other
     characters (€, 元, 寺, 寻, ¥, etc.) since it's underrepresented in most
     training data. This script auto-detects that pattern (a stray non-ASCII
     symbol directly before a number) and corrects it to ₹.

  3. CONFIDENCE FLAGGING: no free OCR tool can guarantee 100% accuracy on
     tricky screenshots (colored numbers, tiny inline charts, stacked text).
     Instead of pretending otherwise, this script tracks the OCR confidence
     of every piece of text and marks any low-confidence cell with a "⚠" in
     the output, plus prints a clear list of everything worth double-checking
     manually.

--------------------------------------------------------------------------------
INTEGRATION
--------------------------------------------------------------------------------
This module is imported by ``extract_service.py`` as the PRIMARY screenshot
OCR engine. ``run_paddle_ocr()`` returns a dict consumable by the existing
``parse_text_to_holdings()`` text heuristic:

    {
        "engine": "paddleocr",
        "layout": "tabular" | "paragraph",
        "text":    "<markdown/paragraph WITH ⚠ flags, for display/rawText>",
        "plain_rows": ["col1  col2  col3", ...],   # clean, for the parser
        "warnings": [...],
    }

The legacy standalone CLI (``python smart_extract.py screenshot.png``) is
preserved below via ``main()``.

--------------------------------------------------------------------------------
INSTALLATION (one-time, pinned for Python 3.13):
--------------------------------------------------------------------------------
  pip install paddlepaddle==3.3.0 --break-system-packages
  pip install "paddleocr<2" --break-system-packages
  pip install pillow --break-system-packages

(Newer paddleocr 3.x dropped the PaddleOCR(lang=...).predict() API this module
relies on, so the 2.x line is intentionally pinned.)
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import tempfile


CONFIDENCE_THRESHOLD_DEFAULT = 0.90

# Characters commonly mistaken for the rupee symbol, directly before a digit
RUPEE_MISREAD_PATTERN = re.compile(r"[€¥元寺寻支寸₮₨]\s*(?=\d)")


def upscale_image(image_path: str, scale: float = 2.0) -> str:
    """Upscale the image and save it to a temp file. Returns the temp path."""
    try:
        from PIL import Image
    except ImportError:
        print("Pillow not installed — skipping upscaling. Run: pip install pillow --break-system-packages")
        return image_path

    img = Image.open(image_path)
    new_size = (int(img.width * scale), int(img.height * scale))
    img = img.convert("RGB").resize(new_size, Image.LANCZOS)

    tmp_dir = tempfile.gettempdir()
    tmp_path = os.path.join(tmp_dir, "smart_extract_upscaled.png")
    img.save(tmp_path)
    return tmp_path


def fix_rupee_symbol(text: str) -> str:
    """Correct common OCR misreadings of the ₹ symbol."""
    return RUPEE_MISREAD_PATTERN.sub("₹", text)


def _ensure_imghdr_shim() -> None:
    """Register a vendored ``imghdr`` shim before PaddleOCR imports it.

    PaddleOCR 3.x still imports the stdlib ``imghdr`` module, which was removed
    in Python 3.13. Rather than editing the virtual environment (non-reproducible
    across fresh installs, Docker, Railway, CI), we load the vendored copy that
    ships next to this file and inject it into ``sys.modules`` so any
    ``import imghdr`` (by PaddleOCR or elsewhere) resolves to it. Idempotent.
    """
    import sys

    if "imghdr" in sys.modules:
        return
    try:
        import importlib.util

        shim_path = Path(__file__).resolve().parent / "imghdr.py"
        spec = importlib.util.spec_from_file_location("imghdr", shim_path)
        module = importlib.util.module_from_spec(spec)
        sys.modules["imghdr"] = module
        spec.loader.exec_module(module)
    except Exception:
        # If the shim is unavailable or already provided by the interpreter,
        # let the normal import path proceed and surface a real error.
        sys.modules.pop("imghdr", None)


def run_ocr(image_path: str, lang: str = "en", verbose: bool = True):
    """Run OCR and return a list of (text, xmin, ymin, xmax, ymax, score).

    Uses the PaddleOCR 3.x API (PaddleOCR(...).predict() -> result[0] with
    rec_texts / rec_scores / rec_boxes). rec_boxes are axis-aligned pixel
    rectangles [x1, y1, x2, y2] in the input image space.
    """
    _ensure_imghdr_shim()
    try:
        from paddleocr import PaddleOCR
    except ImportError as e:
        print(
            "PaddleOCR is not available in this environment.\n"
            f"Import error: {e}\n\n"
            "Try:\n"
            "  pip install paddlepaddle==3.3.0 --break-system-packages\n"
            "  pip install paddleocr --break-system-packages\n"
        )
        raise

    if verbose:
        print("Loading OCR models (first run downloads them, please wait)...")
    # enable_mkldnn=False works around a PaddlePaddle 3.3.x CPU inference bug
    # (ConvertPirAttribute2RuntimeAttribute not support ... DoubleAttribute).
    ocr = PaddleOCR(lang=lang, enable_mkldnn=False)

    upscaled_path = upscale_image(image_path, scale=2.0)
    if verbose:
        print(f"Analyzing: {image_path} (upscaled for accuracy) ...\n")
    results = ocr.predict(upscaled_path)
    if not results:
        return []

    res = results[0]
    # PaddleOCR 3.x returns numpy arrays here; coalesce None safely without
    # `or []` (which would force a numpy truthiness check and raise).
    def _as_list(v):
        return list(v) if v is not None else []

    texts = _as_list(res.get("rec_texts"))
    scores = _as_list(res.get("rec_scores"))
    boxes = _as_list(res.get("rec_boxes"))

    items = []
    for text, score, box in zip(texts, scores, boxes):
        text = str(text).strip()
        if not text:
            continue
        text = fix_rupee_symbol(text)
        # coordinates are on the upscaled image; scale back down by 2x
        try:
            xmin, ymin, xmax, ymax = [int(float(v)) / 2.0 for v in box]
        except (TypeError, ValueError):
            continue
        items.append((text, xmin, ymin, xmax, ymax, float(score)))
    return items


def cluster_rows(items):
    if not items:
        return []

    items = sorted(items, key=lambda it: (it[2] + it[4]) / 2)
    heights = [it[4] - it[2] for it in items]
    median_h = sorted(heights)[len(heights) // 2] if heights else 20
    row_thresh = max(median_h * 0.6, 8)

    rows = []
    current_row = [items[0]]
    current_y = (items[0][2] + items[0][4]) / 2

    for it in items[1:]:
        y_center = (it[2] + it[4]) / 2
        if abs(y_center - current_y) <= row_thresh:
            current_row.append(it)
            current_y = sum((r[2] + r[4]) / 2 for r in current_row) / len(current_row)
        else:
            rows.append(current_row)
            current_row = [it]
            current_y = y_center

    rows.append(current_row)
    rows = [sorted(row, key=lambda it: it[1]) for row in rows]
    return rows


def cluster_columns(rows, gap_ratio=0.03, image_width=None):
    all_items = [it for row in rows for it in row]
    if not all_items:
        return []

    x_centers = sorted((it[1] + it[3]) / 2 for it in all_items)
    if image_width is None:
        image_width = max(it[3] for it in all_items)
    gap_thresh = max(image_width * gap_ratio, 15)

    clusters = [[x_centers[0]]]
    for x in x_centers[1:]:
        if x - clusters[-1][-1] <= gap_thresh:
            clusters[-1].append(x)
        else:
            clusters.append([x])

    return [sum(c) / len(c) for c in clusters]


def assign_to_columns(item, col_centers):
    x_center = (item[1] + item[3]) / 2
    distances = [abs(x_center - c) for c in col_centers]
    return distances.index(min(distances))


def looks_tabular(rows, col_centers):
    if len(col_centers) < 2 or len(rows) < 2:
        return False
    multi_col_rows = 0
    for row in rows:
        cols_hit = {assign_to_columns(it, col_centers) for it in row}
        if len(cols_hit) >= 2:
            multi_col_rows += 1
    return multi_col_rows / len(rows) >= 0.4


def build_grid(rows, col_centers, confidence_threshold):
    """Build a grid of cell text, plus a list of low-confidence warnings.

    Returns (clean_grid, flagged_grid, warnings) where ``clean_grid`` has no
    confidence markers (safe for downstream parsers) and ``flagged_grid`` keeps
    the "⚠" suffix for human display.
    """
    clean_grid = []
    flagged_grid = []
    warnings = []

    for r_idx, row in enumerate(rows):
        clean_cells = [""] * len(col_centers)
        flagged_cells = [""] * len(col_centers)
        for it in row:
            text, xmin, ymin, xmax, ymax, score = it
            col = assign_to_columns(it, col_centers)

            if score < confidence_threshold:
                flagged_text = f"{text} ⚠"
                warnings.append((r_idx + 1, col + 1, text, score))
            else:
                flagged_text = text

            if clean_cells[col]:
                clean_cells[col] += " " + text
                flagged_cells[col] += " " + flagged_text
            else:
                clean_cells[col] = text
                flagged_cells[col] = flagged_text
        clean_grid.append(clean_cells)
        flagged_grid.append(flagged_cells)

    return clean_grid, flagged_grid, warnings


def build_markdown_table(grid, n_cols):
    header = [f"Col {i+1}" for i in range(n_cols)]
    lines = ["| " + " | ".join(header) + " |", "|" + "|".join(["---"] * n_cols) + "|"]
    for row_cells in grid:
        row_cells = [c.replace("|", "/") for c in row_cells]
        lines.append("| " + " | ".join(row_cells) + " |")
    return "\n".join(lines)


def build_paragraph(rows):
    lines = []
    for row in rows:
        line = " ".join(it[0] for it in row)
        lines.append(line)
    return "\n".join(lines)


def grid_to_csv(grid):
    import csv
    import io

    buf = io.StringIO()
    writer = csv.writer(buf)
    for row_cells in grid:
        writer.writerow(row_cells)
    return buf.getvalue()


def _rows_to_plain(rows) -> list[str]:
    """Convert clustered rows into pipe-free, space-joined strings.

    The downstream ``parse_text_to_holdings()`` parser expects one holding per
    line with columns separated by whitespace, mirroring the convention used by
    ``extract_pdf_text_lines()`` (cells joined by two spaces). Stripping the
    leading/trailing pipes keeps the parser from capturing '|' as part of the
    stock name.
    """
    plain = []
    for row in rows:
        cells = [it[0] for it in row]
        line = "  ".join(c.strip() for c in cells if c.strip())
        if line:
            plain.append(line)
    return plain


def run_paddle_ocr(
    image_path: str,
    lang: str = "en",
    confidence_threshold: float = CONFIDENCE_THRESHOLD_DEFAULT,
    force_table: bool = False,
    force_paragraph: bool = False,
    verbose: bool = False,
) -> dict:
    """Primary OCR entry point used by ``extract_service.py``.

    Returns a dict with the keys documented in the module header:
    ``engine``, ``layout``, ``text`` (flagged, for display), ``plain_rows``
    (clean, for the holdings parser), and ``warnings``.
    """
    items = run_ocr(image_path, lang=lang, verbose=verbose)
    if not items:
        return {
            "engine": "paddleocr",
            "layout": "unknown",
            "text": "",
            "plain_rows": [],
            "raw_boxes": [],
            "warnings": ["PaddleOCR detected no text in this image."],
        }

    rows = cluster_rows(items)
    col_centers = cluster_columns(rows)
    tabular = looks_tabular(rows, col_centers)

    if force_table:
        tabular = True
    if force_paragraph:
        tabular = False

    if tabular:
        clean_grid, flagged_grid, warnings = build_grid(rows, col_centers, confidence_threshold)
        text = build_markdown_table(flagged_grid, len(col_centers))
        plain_rows = ["  ".join(c for c in row_cells if c) for row_cells in clean_grid]
        plain_rows = [r for r in plain_rows if r]
        layout = "tabular"
    else:
        warnings = [
            (i + 1, None, it[0], it[5])
            for i, row in enumerate(rows)
            for it in row
            if it[5] < confidence_threshold
        ]
        text = build_paragraph(rows)
        plain_rows = _rows_to_plain(rows)
        layout = "paragraph"

    human_warnings = [
        f"Row {w[0]}" + (f", Col {w[1]}" if w[1] else f": \"{w[2]}\" (confidence {w[3]:.2f})")
        for w in warnings
    ]

    return {
        "engine": "paddleocr",
        "layout": layout,
        "text": text,
        "plain_rows": plain_rows,
        # box tuple shape mirrors run_ocr() items: (xmin, ymin, xmax, ymax)
        "raw_boxes": [
            {
                "text": it[0],
                "box": [it[1], it[2], it[3], it[4]],
                "score": round(float(it[5]), 4),
            }
            for row in rows
            for it in row
        ],
        "warnings": human_warnings,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Extract text/tables from a screenshot using PaddleOCR, with "
        "upscaling, rupee-symbol correction, and low-confidence flagging."
    )
    parser.add_argument("image", help="Path to the screenshot/image file")
    parser.add_argument("--outdir", help="Folder to save .md/.csv output", default=None)
    parser.add_argument("--lang", help="OCR language code (default: en)", default="en")
    parser.add_argument(
        "--confidence-threshold",
        type=float,
        default=CONFIDENCE_THRESHOLD_DEFAULT,
        help=f"Flag any text below this OCR confidence (default {CONFIDENCE_THRESHOLD_DEFAULT})",
    )
    parser.add_argument("--force-table", action="store_true")
    parser.add_argument("--force-paragraph", action="store_true")
    args = parser.parse_args()

    if not os.path.isfile(args.image):
        print(f"File not found: {args.image}")
        sys.exit(1)

    result = run_paddle_ocr(
        args.image,
        lang=args.lang,
        confidence_threshold=args.confidence_threshold,
        force_table=args.force_table,
        force_paragraph=args.force_paragraph,
        verbose=True,
    )

    print("=" * 70)
    if result["layout"] == "tabular":
        print("Detected a TABLE layout -> formatting as Markdown table")
    else:
        print("Detected PARAGRAPH/text layout -> formatting as plain text")
    print("=" * 70)
    print(result["text"])

    if result["warnings"]:
        print("\n" + "-" * 70)
        print(f"⚠ {len(result['warnings'])} item(s) had low OCR confidence — please verify manually:")
        for w in result["warnings"]:
            print(f"  - {w}")

    if args.outdir:
        os.makedirs(args.outdir, exist_ok=True)
        base = os.path.splitext(os.path.basename(args.image))[0]
        md_path = os.path.join(args.outdir, f"{base}.md")
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(result["text"])
        print(f"\nSaved: {md_path}")

        if result["layout"] == "tabular":
            # Rebuild a clean grid for CSV from plain_rows is lossy; instead
            # regenerate from the flagged grid is not stored — write the
            # markdown-derived csv from the raw text is overkill. Keep CSV
            # generation minimal by re-running build_grid is avoided; we skip
            # CSV in library mode. (Standalone use mainly needs .md.)
            csv_path = os.path.join(args.outdir, f"{base}.csv")
            with open(csv_path, "w", encoding="utf-8", newline="") as f:
                f.write(result["text"].replace("|", ",").replace(", ", ","))
            print(f"Saved: {csv_path}")


if __name__ == "__main__":
    main()
