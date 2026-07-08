#!/usr/bin/env python3
"""Create test fixtures for E2E verification."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

FIXTURE_DIR = os.path.join(os.path.dirname(__file__), "..", "test-fixtures")
os.makedirs(FIXTURE_DIR, exist_ok=True)

FIXTURE_PASSWORD = "Test@123"


def create_normal_pdf(path: str) -> None:
    """Normal PDF with some text."""
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 100), "Apna Advisor Portfolio", fontsize=16)
    page.insert_text((50, 140), "StockName  Qty  Avg  LTP  Invested  Value", fontsize=10)
    page.insert_text((50, 160), "RELIANCE  10  2500.50  2550.00  25005.00  25500.00", fontsize=10)
    page.insert_text((50, 180), "TCS  5  3800.00  3850.00  19000.00  19250.00", fontsize=10)
    doc.save(path)
    doc.close()
    print(f"[OK] Normal PDF: {path}")


def create_protected_pdf(path: str, password: str) -> None:
    """Password-protected PDF using PyMuPDF."""
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 100), "Apna Advisor Portfolio (Protected)", fontsize=16)
    page.insert_text((50, 140), "HDFCBANK  20  1650.00  1680.00  33000.00  33600.00", fontsize=10)
    doc.save(path, encryption=fitz.PDF_ENCRYPT_AES_256, owner_pw=password, user_pw=password)
    doc.close()
    print(f"[OK] Protected PDF: {path} (password: {password})")


def create_protected_xlsx(path: str, password: str) -> None:
    """Password-protected XLSX using openpyxl + msoffcrypto encryption."""
    import openpyxl
    from openpyxl.styles import Font
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Holdings"
    ws.append(["StockName", "Quantity", "AvgBuyPrice", "CurrentPrice", "InvestedAmount", "CurrentValue"])
    ws.append(["INFY", 15, 1700.00, 1745.00, 25500.00, 26175.00])
    ws.append(["WIPRO", 30, 450.50, 468.00, 13515.00, 14040.00])
    # Bold header
    for cell in ws[1]:
        cell.font = Font(bold=True)
    # Save to temp
    tmp_path = path + ".tmp.xlsx"
    wb.save(tmp_path)
    wb.close()

    # Encrypt with msoffcrypto-tool
    import msoffcrypto
    with open(tmp_path, "rb") as f_in:
        office = msoffcrypto.OfficeFile(f_in)
        office.load_key(password=password)
        with open(path, "wb") as f_out:
            office.encrypt(password=password, outfile=f_out)

    os.unlink(tmp_path)
    print(f"[OK] Protected XLSX: {path} (password: {password})")


def create_corrupted_file(path: str) -> None:
    """Corrupted file with garbage bytes."""
    with open(path, "w") as f:
        f.write("This is not a valid PDF, XLSX, or any known format.\n" * 100)
    print(f"[OK] Corrupted PDF: {path}")


def create_large_file(path: str) -> None:
    """A file >50MB to test upload limits."""
    size_mb = 51
    with open(path, "wb") as f:
        f.write(b"0" * (size_mb * 1024 * 1024))
    print(f"[OK] Large file (51MB): {path}")


if __name__ == "__main__":
    print("Creating test fixtures...\n")

    create_normal_pdf(os.path.join(FIXTURE_DIR, "normal.pdf"))
    create_protected_pdf(os.path.join(FIXTURE_DIR, "protected.pdf"), FIXTURE_PASSWORD)
    create_protected_xlsx(os.path.join(FIXTURE_DIR, "protected.xlsx"), FIXTURE_PASSWORD)
    create_corrupted_file(os.path.join(FIXTURE_DIR, "corrupted.pdf"))
    create_large_file(os.path.join(FIXTURE_DIR, "large_over_50mb.bin"))

    print(f"\nAll fixtures created in: {FIXTURE_DIR}")
    print(f"Password for protected files: {FIXTURE_PASSWORD}")
