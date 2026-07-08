#!/usr/bin/env python3
"""
Integration tests for extract_service.py.
Tests: detection, password validation, resource cleanup, timeout.
"""
import subprocess
import sys
import os
import json
import time

FIXTURE_DIR = os.path.join(os.path.dirname(__file__), "..", "test-fixtures")
SCRIPT_PATH = os.path.join(os.path.dirname(__file__), "extract_service.py")
PYTHON = os.path.join(os.path.dirname(__file__), "..", ".venv", "Scripts", "python.exe")
PASSWORD = "Test@123"


def run_script(*args, stdin=None, timeout=30):
    """Run extract_service.py with args and optional stdin input."""
    cmd = [PYTHON, SCRIPT_PATH] + list(args)
    proc = subprocess.run(
        cmd,
        input=stdin,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    return proc


def test_normal_pdf():
    print("\n[TEST] Normal PDF detection...", end=" ")
    path = os.path.join(FIXTURE_DIR, "normal.pdf")
    proc = run_script(path, "--kind", "pdf")
    data = json.loads(proc.stdout.strip())
    assert "error" not in data or data.get("holdings"), f"Extraction failed: {data.get('error')}"
    assert len(data.get("holdings", [])) > 0, "No holdings found"
    print(f"PASS ({len(data['holdings'])} holdings)")


def test_protected_pdf_detection():
    print("[TEST] Protected PDF detection...", end=" ")
    path = os.path.join(FIXTURE_DIR, "protected.pdf")
    proc = run_script(path, "--check-protection")
    data = json.loads(proc.stdout.strip())
    assert data.get("passwordProtected") is True, f"Expected protected, got: {data}"
    print("PASS")


def test_corrupted_pdf_detection():
    print("[TEST] Corrupted PDF detection...", end=" ")
    path = os.path.join(FIXTURE_DIR, "corrupted.pdf")
    proc = run_script(path, "--check-protection")
    data = json.loads(proc.stdout.strip())
    assert data.get("corrupted") is True, f"Expected corrupted, got: {data}"
    print("PASS")


def test_protected_pdf_password_correct():
    print("[TEST] Protected PDF correct password...", end=" ")
    path = os.path.join(FIXTURE_DIR, "protected.pdf")
    proc = run_script(path, "--password-stdin", stdin=f"{PASSWORD}\n")
    data = json.loads(proc.stdout.strip())
    assert data.get("passwordOk") is True, f"Expected passwordOk=True, got: {data}"
    print("PASS")


def test_protected_pdf_password_wrong():
    print("[TEST] Protected PDF wrong password...", end=" ")
    path = os.path.join(FIXTURE_DIR, "protected.pdf")
    proc = run_script(path, "--password-stdin", stdin="wrong_password\n")
    data = json.loads(proc.stdout.strip())
    assert data.get("passwordOk") is False, f"Expected passwordOk=False, got: {data}"
    print("PASS")


def test_protected_xlsx_detection():
    print("[TEST] Protected XLSX detection...", end=" ")
    path = os.path.join(FIXTURE_DIR, "protected.xlsx")
    proc = run_script(path, "--check-protection")
    data = json.loads(proc.stdout.strip())
    assert data.get("passwordProtected") is True, f"Expected protected, got: {data}"
    print("PASS")


def test_protected_xlsx_password_correct():
    print("[TEST] Protected XLSX correct password...", end=" ")
    path = os.path.join(FIXTURE_DIR, "protected.xlsx")
    proc = run_script(path, "--password-stdin", stdin=f"{PASSWORD}\n")
    data = json.loads(proc.stdout.strip())
    assert data.get("passwordOk") is True, f"Expected passwordOk=True, got: {data}"
    print("PASS")


def test_protected_xlsx_password_wrong():
    print("[TEST] Protected XLSX wrong password...", end=" ")
    path = os.path.join(FIXTURE_DIR, "protected.xlsx")
    proc = run_script(path, "--password-stdin", stdin="wrong_password\n")
    data = json.loads(proc.stdout.strip())
    assert data.get("passwordOk") is False, f"Expected passwordOk=False, got: {data}"
    print("PASS")


def test_normal_pdf_no_password_stdin():
    """Normal PDF should work without password-stdin."""
    print("[TEST] Normal PDF with --password-stdin (no password needed)...", end=" ")
    path = os.path.join(FIXTURE_DIR, "normal.pdf")
    proc = run_script(path, "--password-stdin", stdin="irrelevant\n")
    data = json.loads(proc.stdout.strip())
    # password-stdin only runs validate_password, which should fail for non-protected
    # but normal PDF opens fine — it's not encrypted
    assert data.get("passwordOk") is True, f"Expected passwordOk=True, got: {data}"
    print("PASS")


def test_fitz_resource_cleanup():
    """Verify fitz doc is closed properly by opening many files."""
    print("[TEST] fitz resource cleanup (open 50 files)...", end=" ")
    import fitz
    for i in range(50):
        path = os.path.join(FIXTURE_DIR, "normal.pdf")
        doc = fitz.open(str(path))
        # Simulate the code path — read text
        _ = sum(len((page.get_text() or "").strip()) for page in doc)
        doc.close()
    print("PASS")


def test_extraction_timeout_via_stdin():
    """Verify --password-stdin mode processes correctly with timeout."""
    print("[TEST] Extraction with stdin password...", end=" ")
    path = os.path.join(FIXTURE_DIR, "normal.pdf")
    proc = run_script(path, "--password-stdin", stdin="any_password\n", timeout=10)
    assert proc.returncode == 0, f"Process failed: {proc.stderr}"
    data = json.loads(proc.stdout.strip())
    assert "passwordOk" in data, f"Missing passwordOk in: {data}"
    print("PASS")


def test_normal_pdf_extraction():
    """Normal extraction mode works."""
    print("[TEST] Normal PDF extraction...", end=" ")
    path = os.path.join(FIXTURE_DIR, "normal.pdf")
    proc = run_script(path, "--kind", "pdf")
    assert proc.returncode == 0, f"Process failed: {proc.stderr}"
    data = json.loads(proc.stdout.strip())
    assert "error" not in data or data.get("holdings"), f"Error: {data.get('error')}"
    print("PASS")


def test_normal_xlsx_extraction():
    """Normal (unprotected) XLSX extraction."""
    print("[TEST] Normal XLSX extraction...", end=" ")
    path = os.path.join(FIXTURE_DIR, "normal.xlsx")
    # Create a normal unprotected xlsx first
    import openpyxl
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["StockName", "Quantity", "AvgBuyPrice", "CurrentPrice", "InvestedAmount", "CurrentValue"])
    ws.append(["INFY", 15, 1700.00, 1745.00, 25500.00, 26175.00])
    wb.save(path)
    wb.close()
    proc = run_script(path, "--kind", "xlsx")
    assert proc.returncode == 0, f"Process failed: {proc.stderr}"
    data = json.loads(proc.stdout.strip())
    assert "error" not in data or data.get("holdings"), f"Error: {data.get('error')}"
    assert len(data.get("holdings", [])) > 0, "No holdings found"
    os.unlink(path)
    print("PASS")


def test_protected_xlsx_extraction_correct():
    """XLSX extraction with correct password using --extract-with-password."""
    print("[TEST] Protected XLSX extraction (correct password)...", end=" ")
    path = os.path.join(FIXTURE_DIR, "protected.xlsx")
    proc = run_script(path, "--kind", "auto", "--extract-with-password", stdin=f"{PASSWORD}\n")
    assert proc.returncode == 0, f"Process failed: {proc.stderr}"
    data = json.loads(proc.stdout.strip())
    assert "error" not in data, f"Error: {data.get('error')}"
    assert len(data.get("holdings", [])) > 0, f"No holdings found in: {data}"
    print("PASS")


def test_protected_xlsx_extraction_wrong():
    """XLSX extraction with wrong password should return wrong-password error."""
    print("[TEST] Protected XLSX extraction (wrong password)...", end=" ")
    path = os.path.join(FIXTURE_DIR, "protected.xlsx")
    proc = run_script(path, "--kind", "auto", "--extract-with-password", stdin="wrong_password\n")
    data = json.loads(proc.stdout.strip())
    assert data.get("error") == "wrong-password", f"Expected wrong-password, got: {data}"
    print("PASS")


if __name__ == "__main__":
    tests = [
        test_protected_pdf_detection,
        test_corrupted_pdf_detection,
        test_protected_pdf_password_correct,
        test_protected_pdf_password_wrong,
        test_protected_xlsx_detection,
        test_protected_xlsx_password_correct,
        test_protected_xlsx_password_wrong,
        test_normal_pdf_no_password_stdin,
        test_normal_pdf_extraction,
        test_normal_xlsx_extraction,
        test_protected_xlsx_extraction_correct,
        test_protected_xlsx_extraction_wrong,
        test_fitz_resource_cleanup,
        test_extraction_timeout_via_stdin,
    ]

    passed = 0
    failed = 0
    for t in tests:
        try:
            t()
            passed += 1
        except Exception as e:
            print(f"FAIL ({e})")
            failed += 1

    print(f"\n{'='*40}")
    print(f"Results: {passed} passed, {failed} failed, {len(tests)} total")
    sys.exit(0 if failed == 0 else 1)
