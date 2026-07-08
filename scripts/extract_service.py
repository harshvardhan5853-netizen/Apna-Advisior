#!/usr/bin/env python3
"""
Apna Advisor — broker screenshot & PDF extraction service.

Pipeline:
  Images  → OpenCV preprocess → EasyOCR (+ Tesseract fallback) → heuristic parse
  PDFs    → pdfplumber tables/text → PyMuPDF text → scanned-page OCR fallback

Stdout: JSON { source, layout, engine, warnings, holdings, rawText }
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import uuid
from pathlib import Path
from typing import Any

# ── lazy singletons ──────────────────────────────────────────────────────────

_easyocr_reader = None
_tesseract_ok: bool | None = None


def uid(prefix: str = "h") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


def emit(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False))
    sys.stdout.flush()


def emit_error(code: str, detail: str) -> None:
    emit({"error": code, "detail": detail, "holdings": [], "warnings": [detail]})


# ── broker detection ─────────────────────────────────────────────────────────

def detect_broker(text: str) -> str:
    t = text.lower()
    if re.search(r"\bgroww\b", t):
        return "groww"
    if re.search(r"\bzerodha\b|\bkite\b|\bconsole\b", t):
        return "zerodha"
    if re.search(r"\bangel one\b|\bangelone\b|\bangel broking\b", t):
        return "angelone"
    if re.search(r"\bupstox\b", t):
        return "upstox"
    if re.search(r"\bdhan\b", t):
        return "dhan"
    return "generic"


# ── number parsing ───────────────────────────────────────────────────────────

NUMBER_RE = re.compile(r"-?\(?\d[\d,]*\.?\d*\)?%?")
SIGNED_NUM_RE = re.compile(
    r"(?<![A-Za-z0-9])([+\-−])?\s*(?:₹|Rs\.?)?\s*(\d[\d,]*(?:\.\d+)?)\s*%?",
    re.IGNORECASE,
)
SHARES_AVG_RE = re.compile(
    r"(\d[\d,]*)\s*shares?\s*[^A-Za-z\d]*avg\.?\s*[₹Rs.]*\s*([\d,]+(?:\.\d+)?)",
    re.IGNORECASE,
)
HEADER_TOKENS = {
    "name", "names", "company", "instrument", "stock", "symbol", "qty", "quantity",
    "shares", "avg", "average", "ltp", "price", "market", "cmp", "inv", "invested",
    "investment", "amt", "amount", "current", "cur", "value", "val", "overall",
    "day", "days", "returns", "return", "gain", "loss", "g/l", "gl", "p&l", "pnl",
    "p/l", "holdings", "portfolio", "net", "chg", "change",
}


def parse_number_loose(raw: str) -> float:
    s = raw.strip().replace(",", "").replace("₹", "").replace("Rs.", "").replace("Rs", "")
    if s.endswith("%"):
        s = s[:-1]
    neg = s.startswith("(") and s.endswith(")")
    s = s.strip("()")
    try:
        n = float(s)
        return -n if neg else n
    except ValueError:
        return float("nan")


def extract_signed_numbers(text: str) -> list[float]:
    out: list[float] = []
    for m in SIGNED_NUM_RE.finditer(text):
        sign = -1 if m.group(1) in ("-", "−") else 1
        try:
            n = float(m.group(2).replace(",", ""))
            out.append(sign * n)
        except ValueError:
            continue
    return out


def correct_decimal_pair(qty: float, avg: float, invested: float) -> tuple[float, float]:
    if not (qty > 0 and avg > 0 and invested > 0):
        return avg, invested

    def near(a: float, b: float) -> bool:
        return abs(a / b - 1) < 0.08

    if near(qty * avg, invested):
        return avg, invested
    for div in (10, 100, 1000):
        if near(qty * (avg / div), invested):
            return avg / div, invested
    for div in (10, 100, 1000):
        if near(qty * avg, invested * div):
            return avg, invested * div
    return avg, invested


def score_row(qty: float, avg: float, ltp: float, invested: float, cur_val: float) -> float:
    score = 0.4
    if qty > 0:
        score += 0.08
    if avg > 0:
        score += 0.05
    if ltp > 0:
        score += 0.05
    if invested > 0:
        score += 0.05
    if cur_val > 0:
        score += 0.05

    def near(a: float, b: float) -> bool:
        return abs(a / b - 1) < 0.05

    if qty > 0 and avg > 0 and invested > 0 and near(qty * avg, invested):
        score += 0.16
    if qty > 0 and ltp > 0 and cur_val > 0 and near(qty * ltp, cur_val):
        score += 0.16
    return min(1.0, score)


def looks_like_header_row(text: str) -> bool:
    cleaned = re.sub(r"[^a-z0-9%/&\s]", " ", text.lower())
    tokens = [t for t in cleaned.split() if t]
    if not tokens:
        return False
    alpha = [t for t in tokens if re.match(r"^[a-z%/&]", t)]
    if not alpha:
        return False
    hits = sum(1 for t in alpha if t in HEADER_TOKENS)
    digit_count = len(re.findall(r"\d", cleaned))
    if hits >= 2 and digit_count <= 2:
        return True
    if hits >= 1 and len(alpha) <= 3 and digit_count <= 2:
        return True
    return False


def norm_text(s: str) -> str:
    return re.sub(r"\s{2,}", " ", s.replace("\u00a0", " ").replace("·", " ").replace("•", " ").strip())


def normalize_symbol(name: str) -> str:
    token = re.sub(r"[^A-Za-z0-9&-]", "", (name.split() or [""])[0]).upper()
    return token[:20] if token else "UNKNOWN"


def holding_from_parts(
    name: str,
    qty: float,
    avg: float,
    ltp: float,
    invested: float,
    cur_val: float,
    pnl: float | None,
    pnl_pct: float | None,
    source: str,
) -> dict[str, Any]:
    avg, invested = correct_decimal_pair(qty, avg, invested)
    ltp_fix = correct_decimal_pair(qty, ltp, cur_val)
    ltp, cur_val = ltp_fix[0], ltp_fix[1]
    if pnl is None:
        pnl = cur_val - invested
    if pnl_pct is None:
        pnl_pct = (pnl / invested) if invested > 0 else 0.0
    elif abs(pnl_pct) > 3:
        pnl_pct = pnl_pct / 100.0
    math_pnl = cur_val - invested
    if abs(math_pnl) > 0.5 and pnl != 0 and (pnl > 0) != (math_pnl > 0) and invested > 0:
        pnl = math_pnl
        pnl_pct = math_pnl / invested
    confidence = score_row(qty, avg, ltp, invested, cur_val)
    clean_name = re.sub(r"\s{2,}", " ", name.strip())
    return {
        "id": uid(),
        "stockName": clean_name,
        "symbol": normalize_symbol(clean_name),
        "exchange": "UNKNOWN",
        "quantity": int(qty) if qty == int(qty) else qty,
        "avgBuyPrice": round(avg, 4),
        "currentPrice": round(ltp, 4),
        "investedAmount": round(invested, 2),
        "currentValue": round(cur_val, 2),
        "pnl": round(pnl, 2),
        "pnlPercent": round(pnl_pct, 6),
        "confidence": round(confidence, 3),
        "needsReview": confidence < 0.8,
        "source": source,
    }


def extract_holdings_from_lines(lines: list[str], source: str) -> list[dict[str, Any]]:
    holdings: list[dict[str, Any]] = []
    for raw in lines:
        line = norm_text(raw.replace("\u00a0", " "))
        if not line:
            continue
        if re.match(r"^(stock|instrument|holdings|total|page|portfolio|summary)\b", line, re.I):
            continue
        nums = NUMBER_RE.findall(line)
        if len(nums) < 3:
            continue
        m = NUMBER_RE.search(line)
        if not m:
            continue
        first_idx = m.start()
        if first_idx <= 1:
            continue
        name_part = line[:first_idx].strip()
        if not re.search(r"[A-Za-z]", name_part):
            continue
        parsed = [parse_number_loose(n) for n in nums]
        parsed = [n for n in parsed if n == n]  # drop nan
        if len(parsed) < 3:
            continue
        qty, avg, cur, invested, cur_val, pnl, pnl_pct = (parsed + [0] * 7)[:7]
        quantity = qty or 0
        avg_buy = avg or 0
        current_price = cur or 0
        invested_amt = invested if invested and invested > 0 else quantity * avg_buy
        current_value = cur_val if cur_val and cur_val > 0 else quantity * current_price
        pnl_val = pnl if pnl == pnl else current_value - invested_amt
        holdings.append(
            holding_from_parts(
                name_part, quantity, avg_buy, current_price,
                invested_amt, current_value, pnl_val, pnl_pct, source,
            )
        )
    return holdings


def extract_card_layout(lines: list[str], source: str) -> list[dict[str, Any]]:
    holdings: list[dict[str, Any]] = []
    items = [norm_text(l) for l in lines if norm_text(l)]
    for i, text in enumerate(items):
        m = SHARES_AVG_RE.search(text)
        if not m:
            continue
        name = ""
        for j in range(i - 1, max(-1, i - 4), -1):
            t = items[j].strip()
            if not t or SHARES_AVG_RE.search(t) or looks_like_header_row(t):
                continue
            if re.match(r"^[+\-−₹\d(]", t):
                continue
            if not re.search(r"[A-Za-z]", t):
                continue
            name = re.sub(r"\s{2,}", " ", re.sub(r"[^\w &().-]", " ", t)).strip()
            break
        if not name:
            continue
        qty = parse_number_loose(m.group(1))
        avg = parse_number_loose(m.group(2))
        next_nums: list[float] = []
        for k in range(i + 1, min(len(items), i + 11)):
            t = items[k].strip()
            if not t:
                continue
            if SHARES_AVG_RE.search(t):
                break
            has_digits = bool(re.search(r"\d", t))
            has_words = bool(re.search(r"[A-Za-z]{3,}", t))
            if not has_digits and has_words and len(next_nums) >= 5:
                break
            next_nums.extend(extract_signed_numbers(t))
            if len(next_nums) >= 7:
                break
        if len(next_nums) >= 7:
            ltp, pnl, pnl_pct, cur_val, invested = next_nums[0], next_nums[3], next_nums[4], next_nums[5], next_nums[6]
        elif len(next_nums) == 6:
            ltp, pnl, pnl_pct, cur_val, invested = next_nums[0], next_nums[2], next_nums[3], next_nums[4], next_nums[5]
        elif len(next_nums) == 5:
            ltp, pnl, pnl_pct, cur_val, invested = next_nums[0], next_nums[1], next_nums[2], next_nums[3], next_nums[4]
        elif len(next_nums) >= 3:
            ltp = next_nums[0]
            cur_val = next_nums[-2]
            invested = next_nums[-1]
            pnl = cur_val - invested
            pnl_pct = (pnl / invested) if invested > 0 else 0
        else:
            continue
        holdings.append(holding_from_parts(name, qty, avg, ltp, invested, cur_val, pnl, pnl_pct, source))
    return holdings


def parse_text_to_holdings(text: str, source: str | None = None) -> tuple[list[dict[str, Any]], str]:
    broker = source or detect_broker(text)
    lines = [l.strip() for l in re.split(r"\r?\n", text) if l.strip()]
    card_hits = sum(1 for l in lines if SHARES_AVG_RE.search(l))
    layout = "card" if card_hits >= 2 or (broker == "groww" and card_hits >= 1) else "tabular"
    holdings = extract_card_layout(lines, broker) if layout == "card" else []
    if not holdings:
        holdings = extract_holdings_from_lines(lines, broker)
        layout = "tabular" if holdings else layout
    return holdings, layout


# ── image preprocessing (OpenCV) ─────────────────────────────────────────────

def preprocess_image(path: Path):
    import cv2
    import numpy as np

    img = cv2.imdecode(np.fromfile(str(path), dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Could not decode image: {path}")
    h, w = img.shape[:2]
    target_w = 2000
    scale = max(1.0, min(3.0, target_w / max(1, w)))
    if scale > 1.01:
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)
    gray = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return thresh, img


def tesseract_available() -> bool:
    global _tesseract_ok
    if _tesseract_ok is not None:
        return _tesseract_ok
    try:
        import pytesseract
        # Windows winget install often isn't on PATH for child processes spawned by Node.
        if sys.platform == "win32":
            for candidate in (
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            ):
                if Path(candidate).is_file():
                    pytesseract.pytesseract.tesseract_cmd = candidate
                    break
        pytesseract.get_tesseract_version()
        _tesseract_ok = True
    except Exception:
        _tesseract_ok = False
    return _tesseract_ok


def ocr_tesseract(img) -> tuple[str, str]:
    import pytesseract
    config = "--psm 6 -c preserve_interword_spaces=1"
    text = pytesseract.image_to_string(img, lang="eng", config=config)
    return text or "", "tesseract"


def ocr_easyocr(img) -> tuple[str, str]:
    global _easyocr_reader
    import easyocr
    import numpy as np

    if _easyocr_reader is None:
        _easyocr_reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    arr = img if hasattr(img, "shape") else np.array(img)
    results = _easyocr_reader.readtext(arr, detail=0, paragraph=True)
    text = "\n".join(str(r).strip() for r in results if str(r).strip())
    return text, "easyocr"


def extract_image(path: Path) -> dict[str, Any]:
    warnings: list[str] = []
    try:
        processed, color = preprocess_image(path)
    except Exception as e:
        return {"error": "preprocess-failed", "detail": str(e), "holdings": [], "warnings": [str(e)]}

    candidates: list[tuple[str, str, list[dict[str, Any]]]] = []

    try:
        text, engine = ocr_easyocr(processed)
        holdings, layout = parse_text_to_holdings(text)
        candidates.append((engine, layout, holdings))
    except Exception as e:
        warnings.append(f"EasyOCR failed: {e}")

    if tesseract_available():
        try:
            text, engine = ocr_tesseract(processed)
            holdings, layout = parse_text_to_holdings(text)
            candidates.append((engine, layout, holdings))
        except Exception as e:
            warnings.append(f"Tesseract failed: {e}")
    else:
        warnings.append("Tesseract binary not found on PATH — install for fallback OCR.")

    if not candidates:
        return {
            "source": "generic",
            "layout": "unknown",
            "engine": "none",
            "warnings": warnings + ["All OCR engines failed."],
            "holdings": [],
            "rawText": "",
        }

    best = max(candidates, key=lambda c: (len(c[2]), sum(h.get("confidence", 0) for h in c[2])))
    engine, layout, holdings = best
    raw_text = ""
    try:
        raw_text, _ = ocr_easyocr(color) if engine == "easyocr" else ocr_tesseract(processed)
    except Exception:
        pass

    broker = detect_broker(raw_text)
    if not holdings:
        warnings.append("OCR ran but no holdings rows detected — try Gemini or manual review.")
    return {
        "source": broker,
        "layout": layout,
        "engine": engine,
        "warnings": warnings,
        "holdings": holdings,
        "rawText": raw_text[:12000],
    }


# ── PDF extraction ───────────────────────────────────────────────────────────

def extract_pdf_text_lines(path: Path) -> tuple[list[str], list[str]]:
    lines: list[str] = []
    warnings: list[str] = []

    try:
        import pdfplumber
        with pdfplumber.open(str(path)) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables() or []
                for table in tables:
                    for row in table:
                        if not row:
                            continue
                        cells = [str(c or "").strip() for c in row]
                        line = "  ".join(c for c in cells if c)
                        if line:
                            lines.append(line)
                text = page.extract_text() or ""
                for ln in text.splitlines():
                    ln = ln.strip()
                    if ln:
                        lines.append(ln)
    except Exception as e:
        warnings.append(f"pdfplumber: {e}")

    if len(lines) < 3:
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(str(path))
            pymupdf_lines: list[str] = []
            for page in doc:
                text = page.get_text("text") or ""
                for ln in text.splitlines():
                    ln = ln.strip()
                    if ln:
                        pymupdf_lines.append(ln)
            if len(pymupdf_lines) > len(lines):
                lines = pymupdf_lines
        except Exception as e:
            warnings.append(f"PyMuPDF: {e}")

    return lines, warnings


def pdf_needs_ocr(path: Path) -> bool:
    try:
        import fitz
        doc = fitz.open(str(path))
        chars = sum(len((page.get_text() or "").strip()) for page in doc)
        return chars < 80 * max(1, doc.page_count)
    except Exception:
        return True


def ocr_pdf_pages(path: Path) -> tuple[str, list[str]]:
    import fitz
    warnings: list[str] = []
    texts: list[str] = []
    doc = fitz.open(str(path))
    for i, page in enumerate(doc):
        try:
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            tmp = path.parent / f"_page_{i}.png"
            pix.save(str(tmp))
            result = extract_image(tmp)
            tmp.unlink(missing_ok=True)
            if result.get("rawText"):
                texts.append(result["rawText"])
            elif result.get("holdings"):
                texts.extend(
                    f"{h.get('stockName','')} {h.get('quantity','')} {h.get('avgBuyPrice','')} {h.get('investedAmount','')}"
                    for h in result["holdings"]
                )
        except Exception as e:
            warnings.append(f"Page {i + 1} OCR failed: {e}")
    return "\n".join(texts), warnings


def extract_pdf(path: Path) -> dict[str, Any]:
    warnings: list[str] = []
    lines, w = extract_pdf_text_lines(path)
    warnings.extend(w)

    raw_text = "\n".join(lines)
    holdings, layout = parse_text_to_holdings(raw_text)
    engine = "pdfplumber"

    if not holdings and pdf_needs_ocr(path):
        warnings.append("PDF appears scanned — running page OCR.")
        ocr_text, ocr_w = ocr_pdf_pages(path)
        warnings.extend(ocr_w)
        if ocr_text:
            raw_text = ocr_text
            holdings, layout = parse_text_to_holdings(ocr_text)
            engine = "pdf-ocr"

    broker = detect_broker(raw_text)
    if not holdings:
        warnings.append("PDF parsed but no holdings rows found — try a screenshot or Gemini.")

    return {
        "source": broker,
        "layout": layout,
        "engine": engine,
        "warnings": warnings,
        "holdings": holdings,
        "rawText": raw_text[:12000],
    }


# ── entrypoint ───────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(description="Apna Advisor file extraction")
    parser.add_argument("file", type=str, help="Path to image or PDF")
    parser.add_argument("--kind", choices=["auto", "image", "pdf"], default="auto")
    args = parser.parse_args()

    path = Path(args.file)
    if not path.is_file():
        emit_error("file-not-found", f"File not found: {path}")
        return 1

    ext = path.suffix.lower()
    kind = args.kind
    if kind == "auto":
        kind = "pdf" if ext == ".pdf" else "image"

    try:
        if kind == "pdf":
            result = extract_pdf(path)
        else:
            result = extract_image(path)
        if "error" in result and not result.get("holdings"):
            emit(result)
            return 1
        emit(result)
        return 0
    except Exception as e:
        emit_error("extract-failed", str(e))
        return 1


if __name__ == "__main__":
    sys.exit(main())
