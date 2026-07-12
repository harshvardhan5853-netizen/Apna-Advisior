# Apna Advisor — Architecture

## Overview

Apna Advisor is a portfolio management application for Indian investors. It runs as a Next.js 16 single-page application with local-first storage (IndexedDB via Dexie) and a Python sidecar for OCR and PDF extraction.

## Extraction Pipeline

The core pipeline transforms uploaded files into portfolio holdings through a multi-stage flow:

```
Upload File
    |
    v
parseFiles()
    |-- CSV    -> PapaParse client-side
    |-- Excel  -> SheetJS client-side (with password decryption)
    |-- PDF    -> PyMuPDF server-side (fallback: pdfjs-dist browser)
    |-- Image  -> PaddleOCR server-side (fallback: Tesseract.js browser)
    |-- Broker -> Gemini extraction from raw response text
    |
    v
validateHolding()  (per holding)
    |-- validateSymbol()       -> NSE symbol lookup, broker alias resolution
    |-- validateQuantity()     -> must be > 0
    |-- validatePrice()        -> must be > 0, reasonable range
    |-- validateFinancialConsistency() -> invested == qty * avgPrice, etc.
    |
    v
aiEnhancer.ts  (optional, requires GEMINI_API_KEY)
    |-- batchEnhanceHoldings() -> Gemini repairs symbol/qty/price
    |-- Never OCRs -- only cleans already-parsed data
    |-- Returns null on failure -- pipeline continues gracefully
    |
    v
re-validate + mergeDuplicates()
    |
    v
computeConfidence()
    |-- OCR(40%) + Parser(30%) + Validation(30%)
    |-- deriveStageScores()    -> per-stage scores
    |-- shouldAutoImport()     -> confidence >= 0.95 gate
    |-- needsReview()          -> confidence < 0.95
    |
    v
checkAutoImportGate()
    |-- canAutoImport = confidence >= 0.95
    |                   AND no criticalErrors
    |                   AND no unknownSymbols
    |                   AND no missingRequiredFields
    |
    v
Import or Review Dialog
```

## Validation Engine

The validation engine (`src/lib/validation-engine.ts`) performs structured validation on each holding:

### NSE Symbol Resolution
- Master list of ~300 known NSE symbols (TCS, INFY, RELIANCE, HDFCBANK, etc.)
- Broker aliases: e.g., `SIANPAINT` -> `ASIANPAINT`, `HDFC` -> `HDFCBANK`
- Prefix-based fallback: `HDFCBANX` -> `HDFCBANK` (matched=false)
- Unknown symbols marked as critical errors

### Validation Functions

Each returns a `ValidationResult`:
```typescript
interface ValidationResult {
  field: string;
  passed: boolean;
  score: number;       // 0.0 to 1.0
  message: string;
}
```

Aggregated into `HoldingValidation`:
```typescript
interface HoldingValidation {
  holdingId: string;
  warnings: ValidationResult[];
  errors: ValidationResult[];
  criticalErrors: ValidationResult[];
  unknownSymbols: string[];
  missingRequiredFields: string[];
  score: number;             // average of all field scores
  confidencePenalty: number; // 0.0 to 1.0
  duplicates: DuplicateGroup[];
}
```

### Auto-Import Gate
```typescript
interface AutoImportGate {
  canAutoImport: boolean;
  reasons: string[];              // why it failed (if canAutoImport=false)
  failingHoldingIds: string[];
  warnings: string[];             // non-blocking concerns
}
```

## Confidence Scoring

`src/lib/confidence-scorer.ts` implements weighted scoring:

```typescript
function computeConfidence(scores: StageScores): ConfidenceResult {
  // OCR weight: 40%, Parser weight: 30%, Validation weight: 30%
  finalScore = scores.ocr * 0.4 + scores.parser * 0.3 + scores.validation * 0.3;
  return { finalScore, stageScores: scores, autoImport: finalScore >= 0.95 };
}
```

AI enhancement contributes 0% to confidence -- it is a pre-processing step, not a scoring dimension.

## Component Tree

```
Layout (navbar + sidebar)
  +-- Login / Register
  +-- Dashboard
  |     +-- Create Portfolio Button
  |     +-- Upload Area (drag-drop / paste / camera)
  |     +-- Create Portfolio Dialog
  |           +-- Portfolio Name Input
  |           +-- File Upload Zone
  |           +-- Review Table (status badges per row)
  |           +-- Import Stats
  +-- Portfolio Pages
  +-- Tools (SIP, Tax, Goals, etc.)
  +-- News Feed
  +-- Opportunity Scanner
```

### Key Components

| Component | File | Role |
|-----------|------|------|
| `create-portfolio-dialog.tsx` | `components/portfolio/` | Orchestrates full import pipeline |
| `upload-area.tsx` | `components/portfolio/` | File drop, paste, camera capture |
| `review-table.tsx` | `components/portfolio/` | Editable table with per-row status badges |
| `import-stats.tsx` | `components/portfolio/` | Summary after import |

### Review Table Status Badges

| Badge | Condition |
|-------|-----------|
| Valid (green) | No critical errors, no unknown symbols |
| Missing (amber) | Missing required fields (e.g., stockName, exchange) |
| Low Confidence (amber) | Confidence < 0.95 but no hard errors |
| Unknown Symbol (red) | Symbol not in NSE master list |
| Invalid (red) | Critical validation errors (qty=0, price=0) |
| Financial Mismatch (red) | investedAmount != qty * avgBuyPrice |

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/extract` | POST | Server-side extraction (Excel, PDF, image) |
| `/api/extract` | GET | Extraction service health check |
| `/api/ai/cleanup` | POST | Gemini-powered holding repair |
| `/api/auth/login` | POST | User login (JWT + httpOnly cookie) |
| `/api/auth/register` | POST | User registration |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/me` | GET | Current user session |
| `/api/quotes` | GET | Real-time stock prices |
| `/api/news` | GET | Market news feed |
| `/api/opportunities` | GET | Stock screening results |
| `/api/fundamentals` | GET | Fundamental data |
| `/api/portfolio-history` | GET | Historical portfolio snapshots |

## Data Types

Core holding type (`src/types/portfolio.ts`):

```typescript
interface Holding {
  id: string;
  stockName: string;
  symbol: string;
  exchange: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  investedAmount: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  confidence: number;
  needsReview: boolean;
  source: "csv" | "xlsx" | "pdf" | "ocr" | "broker" | "manual" | "generic";
  category?: string;
  sector?: string;
}
```

## Storage

- **IndexedDB** via Dexie.js: portfolios, holdings, auth sessions
- No backend database -- fully client-local
- Auth session persisted in httpOnly cookies (server-managed)

## Extraction Service (Python)

The Python sidecar at `scripts/smart_extract.py` handles server-side extraction:

- **Images**: PaddleOCR 3.x (primary), EasyOCR 1.7+, Tesseract (fallbacks)
- **PDFs**: PyMuPDF for text PDFs, PaddleOCR for scanned PDFs
- **Excel**: openpyxl with msoffcrypto-tool for password-protected workbooks

Service is auto-detected at `/api/extract` GET -- if Python is unavailable, browser-side fallbacks are used (Tesseract.js for OCR, pdfjs-dist for PDFs).

## Security

- File extension whitelist: `/\.(csv|xlsx?|pdf|png|jpe?g|webp|bmp)$/i`
- Max file size: 50MB
- Extraction timeout: configurable via `EXTRACTION_TIMEOUT_MS`
- No stack traces or internal paths in error responses
- All errors mapped to user-friendly messages
- Gemini API key passed per-request (not stored server-side)
