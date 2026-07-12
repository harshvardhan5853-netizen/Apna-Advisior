<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/Apna_Advisor-Your_AI_Portfolio_Advisor-10b981?style=for-the-badge&labelColor=050508">
    <img alt="Apna Advisor" src="https://img.shields.io/badge/Apna_Advisor-Your_AI_Portfolio_Advisor-10b981?style=for-the-badge&labelColor=050508">
  </picture>
</p>

<p align="center">
  <strong>AI-powered portfolio management for the modern investor.</strong><br>
  Track holdings, analyze opportunities, simulate growth, and make data-driven decisions — all in one place.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js 16">
  <img src="https://img.shields.io/badge/React-19-58c4dc?style=flat-square&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178c6?style=flat-square&logo=typescript" alt="TypeScript 6.0">
  <img src="https://img.shields.io/badge/Tailwind-4-06b6d4?style=flat-square&logo=tailwindcss" alt="Tailwind CSS 4">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT License">
</p>

---

## ✨ Features

- **📊 Portfolio Management** — Create and manage multiple portfolios with real-time valuation
- **📄 OCR Import** — Upload portfolio screenshots and extract holdings automatically via OCR
- **📰 Market News** — Curated financial news feed with filters
- **🎯 Opportunity Scanner** — Screen stocks based on technical and fundamental criteria
- **💡 Smart Tools**
  - **SIP Calculator** — Project systematic investment plan growth
  - **Goal Planner** — Set and track financial goals
  - **Tax Calculator** — Estimate capital gains tax
  - **Dividend Tracker** — Monitor dividend income
  - **Corporate Actions** — Track stock splits, bonuses, and dividends
  - **Backup & Restore** — Export and import your data
- **📈 Live Quotes** — Real-time stock prices via Finnhub API
- **🔐 Authentication** — Secure login with JWT + httpOnly cookies
- **📱 Responsive** — Works seamlessly across desktop and mobile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **UI Library** | [React 19](https://react.dev/) |
| **Language** | [TypeScript 6.0](https://www.typescriptlang.org/) — Strict mode |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Auth** | JWT with httpOnly cookies + bcrypt |
| **Data Storage** | [Dexie](https://dexie.org/) (IndexedDB) — local-first storage |
| **OCR** | [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) (primary) + Tesseract.js + EasyOCR (fallbacks) |
| **AI Enhancement** | [Gemini API](https://ai.google.dev/) — structured holding repair |
| **Validation Engine** | NSE master symbol list, broker aliases, financial consistency checks |
| **Confidence Scoring** | Weighted OCR(40%) / Parser(30%) / Validation(30%) |
| **Live Quotes** | [Finnhub API](https://finnhub.io/) via Server-Sent Events |
| **Charts** | [Recharts](https://recharts.org/) |

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or later
- **npm** 10.x or later
- **Python** 3.10–3.13 (for OCR + PDF extraction)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/apna-advisor.git
cd apna-advisor

# Install Node dependencies
npm install

# Set up Python virtual environment for extraction service
py -m venv .venv
.venv\Scripts\pip install -r requirements.txt
```

> **Windows OCR notice**: Install [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) and ensure `tesseract` is on your PATH. Python extraction also requires the Visual C++ Redistributable for PaddleOCR.

### Configuration

Create a `.env.local` file in the project root:

```env
# Required for AI cleanup of extracted holdings
GEMINI_API_KEY=your_gemini_api_key
```

The Gemini API key enables automatic cleanup of OCR-extracted holdings (symbol correction, quantity formatting, etc.). The pipeline works without it — extractions that need review will be sent to the review workflow instead.

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

Production build output goes to `.next/`.

### Lint

```bash
npm run lint
```

## 📁 Project Structure

```
src/
├── app/                      # Next.js App Router pages & API routes
│   ├── api/
│   │   ├── ai/cleanup/       # Gemini AI enhancement endpoint
│   │   ├── auth/             # Login, register, session
│   │   ├── extract/          # Server-side extraction (Excel, PDF, image)
│   │   └── ...
│   ├── login/                # Login page
│   ├── portfolio/            # Portfolio management (import, dashboard)
│   ├── tools/                # SIP, tax, goals, dividend, etc.
│   └── ...
├── components/
│   ├── portfolio/            # Import dialog, review table, upload area
│   └── ui/                   # Primitives (Button, Input, Dialog, Badge, etc.)
├── lib/                      # Core business logic
│   ├── ai-enhancer.ts        # Gemini API client for holding cleanup
│   ├── confidence-scorer.ts  # Weighted confidence scoring
│   ├── validation-engine.ts  # NSE symbol validation, holding checks
│   ├── parsers/              # CSV, Excel, PDF, OCR, extract API
│   └── db.ts                 # Dexie/IndexedDB storage
├── scripts/
│   └── run-benchmark.ts      # Benchmark framework (unit + API tests)
└── test-data/                # Datasets for benchmark testing
    ├── csv/                  # CSV test files + expected.json
    ├── excel/                # Excel test files + expected.json
    ├── pdf/                  # Text PDF test files
    ├── broker/               # Mock broker responses
    └── edge-cases/           # Malformed input edge cases
```

## Usage

1. **Register** an account with your name, email, and password.
2. **Create a portfolio** and import holdings via CSV, Excel, PDF, or screenshot.
3. **Review** extracted holdings — the validation engine flags issues per row.
4. **Import** — eligible holdings auto-import (confidence >= 95%), others go to review.
5. **Monitor** portfolio value with real-time price updates.
6. **Explore** market news and opportunity scanner for investment ideas.

## Extraction Pipeline

Uploaded files go through a multi-stage pipeline:

1. **Parse** — detect file type, extract raw holdings (CSV/Excel browser-side, PDF/image server-side via Python/PaddleOCR)
2. **Validate** — check each symbol against NSE master list, validate quantity/price/financial consistency
3. **AI Enhance** (optional) — Gemini API cleans/repairs parsed data (no OCR, no hallucination)
4. **Re-validate** — run validation again on AI-repaired data
5. **Deduplicate** — merge same-symbol holdings, sum quantities
6. **Score Confidence** — weighted OCR(40%) + Parser(30%) + Validation(30%)
7. **Auto-Import Gate** — confidence >= 95% AND no critical errors AND no unknown symbols AND no missing required fields -> skip review
8. **Import or Review** — auto-import or present in review table with per-row status badges

## Benchmarking

```bash
# Unit tests only (29 tests covering validation + confidence)
npm run benchmark

# Verbose output
npm run benchmark:verbose

# With JSON reports
npx tsx scripts/run-benchmark.ts --report

# Include API integration tests (requires running server)
npx tsx scripts/run-benchmark.ts --api http://localhost:3000
```

Reports are written to:
- `benchmark-report.json` — overall results
- `failure-report.json` — per-file failure details
- `performance-report.json` — extraction times by file type

## Security

- File extension whitelist (CSV/XLSX/PDF/PNG/JPG)
- 50MB file size limit
- Extraction timeout (configurable)
- No stack traces or sensitive paths in error responses
- User-friendly error messages for all failure modes

## License

This project is licensed under the **MIT License**.

## Author

**Harsh Chaudhary**
