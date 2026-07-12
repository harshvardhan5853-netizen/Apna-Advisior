/**
 * Test data generator for Apna Advisor extraction pipeline.
 *
 * Generates synthetic CSV, Excel, PDF (text), and broker test datasets
 * with corresponding expected.json files for benchmark validation.
 *
 * Structure: test-data/<type>-<name>/input.<ext> + expected.json
 *
 * Usage:
 *   npx tsx scripts/generate-test-data.ts
 *   npx tsx scripts/generate-test-data.ts --force   # overwrite existing
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as XLSX from "xlsx";

const ROOT = path.resolve(import.meta.dirname ?? __dirname, "..");
const TEST_DATA = path.join(ROOT, "test-data");
const FORCE = process.argv.includes("--force");

// ---------------------------------------------------------------------------
// Portfolio data
// ---------------------------------------------------------------------------
interface Holding {
  symbol: string;
  stockName: string;
  exchange: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  investedAmount: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
}

const ALL_HOLDINGS: Holding[] = [
  { symbol: "RELIANCE", stockName: "Reliance Industries", exchange: "NSE", quantity: 50, avgBuyPrice: 2450, currentPrice: 2580, investedAmount: 122500, currentValue: 129000, pnl: 6500, pnlPercent: 5.31 },
  { symbol: "TCS", stockName: "Tata Consultancy Services", exchange: "NSE", quantity: 20, avgBuyPrice: 3450, currentPrice: 3620, investedAmount: 69000, currentValue: 72400, pnl: 3400, pnlPercent: 4.93 },
  { symbol: "HDFCBANK", stockName: "HDFC Bank", exchange: "NSE", quantity: 80, avgBuyPrice: 1520, currentPrice: 1680, investedAmount: 121600, currentValue: 134400, pnl: 12800, pnlPercent: 10.53 },
  { symbol: "INFY", stockName: "Infosys", exchange: "NSE", quantity: 60, avgBuyPrice: 1380, currentPrice: 1450, investedAmount: 82800, currentValue: 87000, pnl: 4200, pnlPercent: 5.07 },
  { symbol: "ICICIBANK", stockName: "ICICI Bank", exchange: "NSE", quantity: 100, avgBuyPrice: 890, currentPrice: 950, investedAmount: 89000, currentValue: 95000, pnl: 6000, pnlPercent: 6.74 },
  { symbol: "SBIN", stockName: "State Bank of India", exchange: "NSE", quantity: 120, avgBuyPrice: 580, currentPrice: 620, investedAmount: 69600, currentValue: 74400, pnl: 4800, pnlPercent: 6.90 },
  { symbol: "BHARTIARTL", stockName: "Bharti Airtel", exchange: "NSE", quantity: 40, avgBuyPrice: 1050, currentPrice: 1120, investedAmount: 42000, currentValue: 44800, pnl: 2800, pnlPercent: 6.67 },
  { symbol: "ITC", stockName: "ITC", exchange: "NSE", quantity: 200, avgBuyPrice: 380, currentPrice: 410, investedAmount: 76000, currentValue: 82000, pnl: 6000, pnlPercent: 7.89 },
  { symbol: "WIPRO", stockName: "Wipro", exchange: "NSE", quantity: 90, avgBuyPrice: 430, currentPrice: 460, investedAmount: 38700, currentValue: 41400, pnl: 2700, pnlPercent: 6.98 },
  { symbol: "ASIANPAINT", stockName: "Asian Paints", exchange: "NSE", quantity: 15, avgBuyPrice: 3150, currentPrice: 2980, investedAmount: 47250, currentValue: 44700, pnl: -2550, pnlPercent: -5.40 },
  { symbol: "MARUTI", stockName: "Maruti Suzuki", exchange: "NSE", quantity: 10, avgBuyPrice: 9500, currentPrice: 10100, investedAmount: 95000, currentValue: 101000, pnl: 6000, pnlPercent: 6.32 },
  { symbol: "TATAMOTORS", stockName: "Tata Motors", exchange: "NSE", quantity: 150, avgBuyPrice: 520, currentPrice: 560, investedAmount: 78000, currentValue: 84000, pnl: 6000, pnlPercent: 7.69 },
  { symbol: "NTPC", stockName: "NTPC", exchange: "NSE", quantity: 180, avgBuyPrice: 210, currentPrice: 240, investedAmount: 37800, currentValue: 43200, pnl: 5400, pnlPercent: 14.29 },
  { symbol: "M&M", stockName: "Mahindra & Mahindra", exchange: "NSE", quantity: 35, avgBuyPrice: 1550, currentPrice: 1680, investedAmount: 54250, currentValue: 58800, pnl: 4550, pnlPercent: 8.39 },
  { symbol: "TITAN", stockName: "Titan Company", exchange: "NSE", quantity: 25, avgBuyPrice: 2800, currentPrice: 3100, investedAmount: 70000, currentValue: 77500, pnl: 7500, pnlPercent: 10.71 },
  { symbol: "BAJFINANCE", stockName: "Bajaj Finance", exchange: "NSE", quantity: 12, avgBuyPrice: 6800, currentPrice: 7200, investedAmount: 81600, currentValue: 86400, pnl: 4800, pnlPercent: 5.88 },
  { symbol: "KOTAKBANK", stockName: "Kotak Mahindra Bank", exchange: "NSE", quantity: 45, avgBuyPrice: 1750, currentPrice: 1820, investedAmount: 78750, currentValue: 81900, pnl: 3150, pnlPercent: 4.00 },
  { symbol: "LT", stockName: "Larsen & Toubro", exchange: "NSE", quantity: 20, avgBuyPrice: 3200, currentPrice: 3450, investedAmount: 64000, currentValue: 69000, pnl: 5000, pnlPercent: 7.81 },
  { symbol: "SUNPHARMA", stockName: "Sun Pharmaceutical", exchange: "NSE", quantity: 70, avgBuyPrice: 880, currentPrice: 920, investedAmount: 61600, currentValue: 64400, pnl: 2800, pnlPercent: 4.55 },
  { symbol: "HCLTECH", stockName: "HCL Technologies", exchange: "NSE", quantity: 55, avgBuyPrice: 1200, currentPrice: 1280, investedAmount: 66000, currentValue: 70400, pnl: 4400, pnlPercent: 6.67 },
];

function pickPortfolio(count: number, seed: number): Holding[] {
  const arr = [...ALL_HOLDINGS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = ((seed * 9973 + i * 7919) % (i + 1) + (i + 1)) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function safeWrite(filePath: string, content: string) {
  if (fs.existsSync(filePath) && !FORCE) {
    console.log(`  SKIP ${path.relative(TEST_DATA, filePath)}`);
    return;
  }
  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`  WRITE ${path.relative(TEST_DATA, filePath)}`);
}

function writeExpected(dir: string, holdings: Holding[], ignoreFields?: string[]) {
  const data: Record<string, unknown> = {
    holdings: holdings.map((h) => ({
      symbol: h.symbol,
      stockName: h.stockName,
      quantity: h.quantity,
      avgBuyPrice: h.avgBuyPrice,
      investedAmount: h.investedAmount,
      currentValue: h.currentValue,
      pnl: h.pnl,
      pnlPercent: h.pnlPercent,
      confidence: 1.0,
      needsReview: false,
    })),
  };
  if (ignoreFields?.length) data.ignoreFields = ignoreFields;
  safeWrite(path.join(dir, "expected.json"), JSON.stringify(data, null, 2) + "\n");
}

function makeCaseDir(prefix: string, name: string): string {
  const dir = path.join(TEST_DATA, `${prefix}-${name}`);
  ensureDir(dir);
  return dir;
}

// ---------------------------------------------------------------------------
// CSV datasets (10 files)
// ---------------------------------------------------------------------------
function generateCSV() {
  console.log("\n=== CSV datasets ===");

  const configs = [
    { name: "large", count: 15, cols: ["Symbol", "Stock Name", "Quantity", "Avg Buy Price", "Invested Amount", "Current Value", "P&L", "P&L %"] },
    { name: "medium", count: 8, cols: ["Symbol", "Stock Name", "Exchange", "Quantity", "Avg Buy Price", "Current Value", "P&L"] },
    { name: "small", count: 4, cols: ["Symbol", "Stock Name", "Quantity", "Avg Buy Price", "Invested Amount"] },
    { name: "bank-focus", count: 6, cols: ["Symbol", "Stock Name", "Quantity", "Avg Buy Price", "Invested Amount", "Current Value", "P&L", "P&L %"] },
    { name: "tech-focus", count: 7, cols: ["Symbol", "Stock Name", "Quantity", "Avg Buy Price", "Invested Amount", "Current Value", "P&L", "P&L %"] },
    { name: "varied-headers", count: 10, cols: ["Symbol", "Stock Name", "Quantity", "Buy Price", "Current Price", "Investment", "Current Value", "P&L", "Returns %"] },
    { name: "minimal", count: 3, cols: ["Symbol", "Quantity", "Avg Cost", "Invested"] },
    { name: "pnl-detailed", count: 5, cols: ["Symbol", "Qty", "Buy Avg", "Current", "Invested", "Current Value", "P&L", "P&L %"] },
    { name: "extra-columns", count: 6, cols: ["#", "Symbol", "Company", "Sector", "Qty", "Avg Price", "Invested", "Market Value", "P&L", "Returns"] },
    { name: "single", count: 1, cols: ["Symbol", "Stock Name", "Quantity", "Avg Buy Price", "Invested Amount", "Current Value", "P&L", "P&L %"] },
  ];

  for (const cfg of configs) {
    const dir = makeCaseDir("csv", cfg.name);
    const holdings = pickPortfolio(cfg.count, cfg.name.length + 42);

    const rowMap: Record<string, (h: Holding) => string | number> = {
      "Symbol": (h) => h.symbol,
      "Stock Name": (h) => h.stockName,
      "Company": (h) => h.stockName,
      "Exchange": (h) => h.exchange,
      "Sector": () => "N/A",
      "Quantity": (h) => h.quantity,
      "Qty": (h) => h.quantity,
      "Avg Buy Price": (h) => h.avgBuyPrice,
      "Buy Price": (h) => h.avgBuyPrice,
      "Avg Cost": (h) => h.avgBuyPrice,
      "Avg Price": (h) => h.avgBuyPrice,
      "Current Price": (h) => h.currentPrice,
      "Current": (h) => h.currentPrice,
      "Invested Amount": (h) => h.investedAmount,
      "Invested": (h) => h.investedAmount,
      "Investment": (h) => h.investedAmount,
      "Current Value": (h) => h.currentValue,
      "Market Value": (h) => h.currentValue,
      "P&L": (h) => h.pnl,
      "P&L %": (h) => h.pnlPercent,
      "Returns": (h) => h.pnlPercent,
      "Returns %": (h) => h.pnlPercent,
      "#": () => "",
    };

    const lines: string[] = [cfg.cols.join(",")];
    for (const h of holdings) {
      const vals = cfg.cols.map((c) => {
        const v = rowMap[c]?.(h) ?? "";
        const s = String(v);
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      });
      lines.push(vals.join(","));
    }
    safeWrite(path.join(dir, "input.csv"), lines.join("\n") + "\n");
    writeExpected(dir, holdings);
  }
}

// ---------------------------------------------------------------------------
// Excel datasets (10 files)
// ---------------------------------------------------------------------------
function generateExcel() {
  console.log("\n=== Excel datasets ===");

  const configs = [
    { name: "large", count: 15, sheet: "Portfolio" },
    { name: "medium", count: 8, sheet: "Holdings" },
    { name: "small", count: 4, sheet: "Stocks" },
    { name: "bank-focus", count: 6, sheet: "Banking" },
    { name: "tech-focus", count: 7, sheet: "Tech" },
    { name: "with-date", count: 10, sheet: "Equity" },
    { name: "multi-sheet", count: 6, sheet: "Summary" },
    { name: "mixed-order", count: 5, sheet: "Holdings" },
    { name: "renamed-headers", count: 5, sheet: "Portfolio" },
    { name: "single", count: 1, sheet: "Sheet1" },
  ];

  for (const cfg of configs) {
    const dir = makeCaseDir("excel", cfg.name);
    const holdings = pickPortfolio(cfg.count, cfg.name.length + 99);
    const workbook = XLSX.utils.book_new();

    const headers = cfg.name === "renamed-headers"
      ? ["Ticker", "Company Name", "Shares", "Avg Cost", "Total Investment", "Market Value", "Profit/Loss", "Return %"]
      : ["Symbol", "Stock Name", "Quantity", "Avg Buy Price", "Invested Amount", "Current Value", "P&L", "P&L %"];

    const data: (string | number)[][] = [headers];
    for (const h of holdings) {
      data.push(cfg.name === "renamed-headers"
        ? [h.symbol, h.stockName, h.quantity, h.avgBuyPrice, h.investedAmount, h.currentValue, h.pnl, h.pnlPercent]
        : [h.symbol, h.stockName, h.quantity, h.avgBuyPrice, h.investedAmount, h.currentValue, h.pnl, h.pnlPercent]
      );
    }

    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, cfg.sheet);

    if (cfg.name === "multi-sheet") {
      const extra = [["Account", "Total Value"], ["Equity", 500000], ["Debt", 200000], ["Cash", 50000]];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(extra), "Account Summary");
    }

    const filePath = path.join(dir, "input.xlsx");
    if (fs.existsSync(filePath) && !FORCE) {
      console.log(`  SKIP ${path.relative(TEST_DATA, filePath)}`);
    } else {
      XLSX.writeFile(workbook, filePath);
      console.log(`  WRITE ${path.relative(TEST_DATA, filePath)}`);
    }
    writeExpected(dir, holdings);
  }
}

// ---------------------------------------------------------------------------
// PDF (text) datasets — text representations that PDF parser handles
// ---------------------------------------------------------------------------
function generateTextPDF() {
  console.log("\n=== PDF (text) datasets ===");

  const configs = [
    { name: "5-stocks", count: 5, title: "Portfolio Summary" },
    { name: "3-stocks", count: 3, title: "My Equity Holdings" },
    { name: "8-stocks", count: 8, title: "Investment Portfolio" },
    { name: "2-stocks", count: 2, title: "Stock Holdings" },
    { name: "all-10", count: 10, title: "Complete Portfolio" },
    { name: "profit-focus", count: 4, title: "Profitable Stocks" },
    { name: "banking-sector", count: 4, title: "Banking Portfolio" },
    { name: "small-cap", count: 3, title: "Small Holdings" },
    { name: "single-stock", count: 1, title: "Single Holding" },
    { name: "losses", count: 3, title: "Underperformers" },
  ];

  for (const cfg of configs) {
    const dir = makeCaseDir("pdf", cfg.name);
    const holdings = pickPortfolio(cfg.count, cfg.name.length + 200);

    const header = "Symbol | Stock Name | Quantity | Avg Buy Price | Invested | Current Value | P&L | P&L %";
    const sep = "-".repeat(header.length);
    const rows = holdings.map((h) =>
      `${h.symbol} | ${h.stockName} | ${h.quantity} | ${h.avgBuyPrice} | ${h.investedAmount} | ${h.currentValue} | ${h.pnl} | ${h.pnlPercent}`
    );
    const content = [
      cfg.title,
      "=".repeat(cfg.title.length),
      `Date: 2026-07-09`,
      "",
      header,
      sep,
      ...rows,
      "---",
      `Total Invested: ${holdings.reduce((s, h) => s + h.investedAmount, 0)}`,
      `Total Value: ${holdings.reduce((s, h) => s + h.currentValue, 0)}`,
      `Total P&L: ${holdings.reduce((s, h) => s + h.pnl, 0)}`,
      "-- End --",
    ].join("\n");

    safeWrite(path.join(dir, "input.txt"), content + "\n");
    writeExpected(dir, holdings);
  }
}

// ---------------------------------------------------------------------------
// Broker mock responses (10 files)
// ---------------------------------------------------------------------------
function generateBrokerResponses() {
  console.log("\n=== Broker datasets ===");

  const configs = [
    { name: "zerodha-full", count: 10 },
    { name: "zerodha-small", count: 3 },
    { name: "groww-medium", count: 6 },
    { name: "zerodha-bank-heavy", count: 5 },
    { name: "zerodha-profit-all", count: 4 },
    { name: "zerodha-loss-some", count: 4 },
    { name: "upstox-varied", count: 8 },
    { name: "zerodha-single", count: 1 },
    { name: "groww-diverse", count: 7 },
    { name: "zerodha-mixed", count: 12 },
  ];

  for (const cfg of configs) {
    const dir = makeCaseDir("broker", cfg.name);
    const holdings = pickPortfolio(cfg.count, cfg.name.length + 300);
    const broker = cfg.name.startsWith("groww") ? "groww" : cfg.name.startsWith("upstox") ? "upstox" : "zerodha";

    const response = {
      broker,
      timestamp: "2026-07-09T10:30:00Z",
      holdings: holdings.map((h) => ({
        tradingSymbol: h.symbol,
        exchange: h.exchange,
        quantity: h.quantity,
        averagePrice: h.avgBuyPrice,
        lastPrice: h.currentPrice,
        investedValue: h.investedAmount,
        currentValue: h.currentValue,
        pnl: h.pnl,
        pnlPercent: h.pnlPercent,
      })),
    };
    safeWrite(path.join(dir, "input.json"), JSON.stringify(response, null, 2) + "\n");
    writeExpected(dir, holdings);
  }
}

// ---------------------------------------------------------------------------
// Edge case CSV datasets
// ---------------------------------------------------------------------------
function generateCSVEdgeCases() {
  console.log("\n=== CSV edge case datasets ===");

  const cases: [string, string][] = [
    ["empty", ""],
    ["missing-headers", "RELIANCE,100,2450\nTCS,50,3450\n"],
    ["wrong-delimiter", "Symbol;Stock Name;Quantity;Avg Buy Price\nRELIANCE;Reliance Industries;100;2450\nTCS;Tata Consultancy Services;50;3450\n"],
    ["duplicate-rows", "Symbol,Quantity,Avg Buy Price\nRELIANCE,100,2450\nTCS,50,3450\nRELIANCE,100,2450\n"],
    ["extra-columns", "Symbol,Quantity,Avg Buy Price,Comments\nRELIANCE,100,2450,Top holding\nTCS,50,3450,IT major\n"],
    ["trailing-commas", "Symbol,Quantity,Avg Buy Price,\nRELIANCE,100,2450,\nTCS,50,3450,\n"],
    ["quoted-fields", 'Symbol,"Stock Name",Quantity,"Avg Buy Price"\nRELIANCE,"Reliance Industries Ltd",100,2450\nTCS,"Tata Consultancy Services",50,3450\n'],
    ["whitespace-columns", "  Symbol  , Quantity , Avg Buy Price  \n  RELIANCE  , 100 , 2450  \n  TCS  , 50 , 3450  \n"],
    ["mixed-case-headers", "symbol,quantity,avg_buy_price\nRELIANCE,100,2450\nTCS,50,3450\n"],
    ["blank-lines", "Symbol,Quantity,Avg Buy Price\nRELIANCE,100,2450\n\nTCS,50,3450\n\n\n"],
  ];

  for (const [name, content] of cases) {
    const dir = makeCaseDir("edge", name);
    safeWrite(path.join(dir, "input.csv"), content);
    safeWrite(path.join(dir, "expected.json"), JSON.stringify({ holdings: [] }, null, 2) + "\n");
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  console.log("================================================================");
  console.log("  Apna Advisor -- Test Data Generator");
  console.log("================================================================");
  console.log(`  Test data dir: ${TEST_DATA}`);
  console.log(`  Force overwrite: ${FORCE}`);
  console.log("");

  generateCSV();
  generateExcel();
  generateTextPDF();
  generateBrokerResponses();
  generateCSVEdgeCases();

  console.log("\nDone! Test data generated in test-data/");
}

main();
