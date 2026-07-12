"use client";

import * as React from "react";
import { Download, FileSpreadsheet, FileText, Braces } from "lucide-react";
import { toast } from "sonner";
import type { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatINR, formatPct } from "@/lib/utils";
import type {
  CombinedHolding,
  PortfolioSummary,
  SectorAllocation,
} from "@/types/portfolio";

interface ExportMenuProps {
  scopeLabel: string;
  holdings: CombinedHolding[];
  summary: PortfolioSummary;
  sectors: SectorAllocation[];
}

type AutoTableOptions = {
  columns?: Array<{ header: string; dataKey: string }>;
  body?: Array<Record<string, string | number>>;
  startY?: number;
  margin?: { left?: number; right?: number };
  styles?: Record<string, unknown>;
  headStyles?: Record<string, unknown>;
  alternateRowStyles?: Record<string, unknown>;
  didDrawPage?: (data: { pageNumber: number }) => void;
};

type JsPdfWithAutoTable = jsPDF & {
  autoTable: (opts: AutoTableOptions) => void;
  lastAutoTable?: { finalY?: number };
};

function todayLabel(): string {
  return new Date().toISOString().split("T")[0];
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 250);
}

export function ExportMenu({ scopeLabel, holdings, summary, sectors }: ExportMenuProps) {
  const disabled = holdings.length === 0;

  const handleExcel = React.useCallback(async () => {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const summarySheet = XLSX.utils.json_to_sheet([
        { Metric: "Scope", Value: scopeLabel },
        { Metric: "Generated", Value: new Date().toLocaleString("en-IN") },
        { Metric: "Total invested (INR)", Value: summary.invested.toFixed(2) },
        { Metric: "Current value (INR)", Value: summary.currentValue.toFixed(2) },
        { Metric: "Total P&L (INR)", Value: summary.pnl.toFixed(2) },
        { Metric: "Return %", Value: (summary.pnlPercent * 100).toFixed(2) + "%" },
        { Metric: "Stock count", Value: summary.stockCount },
      ]);
      XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

      const holdingsRows = holdings.map((h) => ({
        Stock: h.stockName,
        Symbol: h.symbol,
        Exchange: h.exchange,
        Sector: h.sector ?? "",
        Industry: h.industry ?? "",
        MarketCap: h.marketCap ?? "",
        Quantity: h.quantity,
        AvgBuyPrice: h.avgBuyPrice,
        CurrentPrice: h.currentPrice,
        Invested: h.investedAmount,
        CurrentValue: h.currentValue,
        PnL: h.pnl,
        "Return%": (h.pnlPercent * 100).toFixed(2),
        "Allocation%": h.allocationPercent.toFixed(2),
        NeedsReview: h.needsReview ? "Yes" : "No",
        Confidence: h.confidence.toFixed(2),
        Sources: h.sources.map((s) => s.portfolioName).join(" | "),
      }));
      const holdingsSheet = XLSX.utils.json_to_sheet(holdingsRows);
      const cols = [
        22, 12, 8, 20, 22, 10, 10, 14, 14, 14, 14, 14, 10, 12, 12, 12, 36,
      ].map((w) => ({ wch: w }));
      holdingsSheet["!cols"] = cols;
      XLSX.utils.book_append_sheet(wb, holdingsSheet, "Holdings");

      const sectorRows = sectors.map((s) => ({
        Sector: s.sector,
        Stocks: s.count,
        Invested: s.invested,
        CurrentValue: s.currentValue,
        PnL: s.pnl,
        "Return%": (s.pnlPercent * 100).toFixed(2),
      }));
      const sectorSheet = XLSX.utils.json_to_sheet(sectorRows);
      sectorSheet["!cols"] = [22, 8, 14, 14, 14, 10].map((w) => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, sectorSheet, "Sector Allocation");

      const sourceRows = holdings.flatMap((h) =>
        h.sources.map((s) => ({
          Stock: h.stockName,
          Symbol: h.symbol,
          Portfolio: s.portfolioName,
          Quantity: s.quantity,
          AvgBuyPrice: s.avgBuyPrice,
          Invested: s.investedAmount,
          Imported: new Date(s.dateImported).toLocaleDateString("en-IN"),
        })),
      );
      if (sourceRows.length > 0) {
        const sourceSheet = XLSX.utils.json_to_sheet(sourceRows);
        sourceSheet["!cols"] = [22, 12, 22, 10, 14, 14, 12].map((w) => ({ wch: w }));
        XLSX.utils.book_append_sheet(wb, sourceSheet, "Portfolio Sources");
      }

      XLSX.writeFile(wb, `apna-advisor-${todayLabel()}.xlsx`);
      toast.success("Exported Excel workbook");
    } catch (err) {
      console.error(err);
      toast.error("Could not export Excel");
    }
  }, [scopeLabel, holdings, summary, sectors]);

  const handlePdf = React.useCallback(async () => {
    try {
      const [{ jsPDF: JsPdfCtor }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new JsPdfCtor({ orientation: "landscape", unit: "mm", format: "a4" }) as JsPdfWithAutoTable;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header
      doc.setFillColor(9, 30, 24);
      doc.rect(0, 0, pageWidth, 22, "F");
      doc.setTextColor(110, 231, 183);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Apna Advisor — Portfolio Report", 12, 14);
      doc.setFontSize(10);
      doc.setTextColor(180, 220, 200);
      doc.text(`${scopeLabel}  ·  ${new Date().toLocaleString("en-IN")}`, 12, 20);

      // Summary card row
      const tiles: Array<[string, string]> = [
        ["Invested", formatINR(summary.invested)],
        ["Current value", formatINR(summary.currentValue)],
        ["Total P&L", formatINR(summary.pnl)],
        ["Return", formatPct(summary.pnlPercent)],
        ["Stocks", String(summary.stockCount)],
      ];
      const tileWidth = (pageWidth - 24 - (tiles.length - 1) * 4) / tiles.length;
      tiles.forEach(([label, value], i) => {
        const x = 12 + i * (tileWidth + 4);
        doc.setDrawColor(60, 90, 78);
        doc.setFillColor(15, 40, 34);
        doc.roundedRect(x, 28, tileWidth, 18, 2, 2, "FD");
        doc.setFontSize(8);
        doc.setTextColor(140, 180, 160);
        doc.text(label.toUpperCase(), x + 3, 33);
        doc.setFontSize(12);
        doc.setTextColor(230, 245, 235);
        doc.text(value, x + 3, 41);
      });

      // Holdings table
      const holdingsBody = holdings.map((h) => ({
        Stock: h.stockName,
        Symbol: h.symbol,
        Sector: h.sector ?? "—",
        Qty: h.quantity,
        Avg: h.avgBuyPrice.toFixed(2),
        LTP: h.currentPrice.toFixed(2),
        Invested: h.investedAmount.toFixed(0),
        Current: h.currentValue.toFixed(0),
        PnL: h.pnl.toFixed(0),
        "Ret%": (h.pnlPercent * 100).toFixed(2) + "%",
        "Alloc%": h.allocationPercent.toFixed(2) + "%",
      }));

      doc.autoTable({
        columns: [
          { header: "Stock", dataKey: "Stock" },
          { header: "Symbol", dataKey: "Symbol" },
          { header: "Sector", dataKey: "Sector" },
          { header: "Qty", dataKey: "Qty" },
          { header: "Avg", dataKey: "Avg" },
          { header: "LTP", dataKey: "LTP" },
          { header: "Invested", dataKey: "Invested" },
          { header: "Current", dataKey: "Current" },
          { header: "P&L", dataKey: "PnL" },
          { header: "Ret %", dataKey: "Ret%" },
          { header: "Alloc %", dataKey: "Alloc%" },
        ],
        body: holdingsBody,
        startY: 52,
        margin: { left: 10, right: 10 },
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
          textColor: [220, 235, 225],
          lineColor: [40, 60, 52],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [16, 100, 76],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [18, 34, 30] },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.setTextColor(140, 180, 160);
          doc.text(
            `Page ${data.pageNumber}  ·  Apna Advisor  ·  Local-only report`,
            pageWidth / 2,
            pageHeight - 6,
            { align: "center" },
          );
        },
      });

      // Sector table on next page if data present
      if (sectors.length > 0) {
        const finalY = doc.lastAutoTable?.finalY ?? 52;
        const needsNewPage = finalY > pageHeight - 60;
        if (needsNewPage) doc.addPage();
        const startY = needsNewPage ? 20 : finalY + 8;
        doc.setFontSize(12);
        doc.setTextColor(110, 231, 183);
        doc.text("Sector allocation", 12, startY - 2);
        doc.autoTable({
          columns: [
            { header: "Sector", dataKey: "Sector" },
            { header: "Stocks", dataKey: "Stocks" },
            { header: "Invested", dataKey: "Invested" },
            { header: "Current", dataKey: "Current" },
            { header: "P&L", dataKey: "PnL" },
            { header: "Return %", dataKey: "Ret" },
          ],
          body: sectors.map((s) => ({
            Sector: s.sector,
            Stocks: s.count,
            Invested: s.invested.toFixed(0),
            Current: s.currentValue.toFixed(0),
            PnL: s.pnl.toFixed(0),
            Ret: (s.pnlPercent * 100).toFixed(2) + "%",
          })),
          startY: startY + 2,
          margin: { left: 10, right: 10 },
          styles: { fontSize: 8, cellPadding: 2.5, textColor: [220, 235, 225] },
          headStyles: { fillColor: [16, 100, 76], textColor: [255, 255, 255], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [18, 34, 30] },
        });
      }

      doc.save(`apna-advisor-${todayLabel()}.pdf`);
      toast.success("Exported PDF report");
    } catch (err) {
      console.error(err);
      toast.error("Could not export PDF");
    }
  }, [scopeLabel, holdings, summary, sectors]);

  const handleJson = React.useCallback(() => {
    try {
      const payload = {
        meta: {
          app: "apna-advisor",
          version: 1,
          exportedAt: new Date().toISOString(),
          scope: scopeLabel,
        },
        summary,
        holdings: holdings.map((h) => ({
          id: h.id,
          stockName: h.stockName,
          symbol: h.symbol,
          exchange: h.exchange,
          sector: h.sector,
          industry: h.industry,
          marketCap: h.marketCap,
          quantity: h.quantity,
          avgBuyPrice: h.avgBuyPrice,
          currentPrice: h.currentPrice,
          investedAmount: h.investedAmount,
          currentValue: h.currentValue,
          pnl: h.pnl,
          pnlPercent: h.pnlPercent,
          dayPnl: h.dayPnl ?? null,
          dayPnlPercent: h.dayPnlPercent ?? null,
          allocationPercent: h.allocationPercent,
          confidence: h.confidence,
          needsReview: h.needsReview,
          source: h.source,
          sources: h.sources,
          fundamentals: h.fundamentals ?? null,
          technical: h.technical ?? null,
          risk: h.risk ?? null,
        })),
        sectors,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      download(blob, `apna-advisor-dataset-${todayLabel()}.json`);
      toast.success("Exported AI-ready dataset");
    } catch (err) {
      console.error(err);
      toast.error("Could not export JSON");
    }
  }, [scopeLabel, holdings, summary, sectors]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Download className="h-4 w-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Export options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExcel}>
          <FileSpreadsheet className="h-4 w-4 text-emerald-300" />
          <div className="flex flex-col">
            <span>Excel workbook</span>
            <span className="text-[10px] text-muted-foreground">
              Summary + Holdings + Sectors + Sources
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePdf}>
          <FileText className="h-4 w-4 text-emerald-300" />
          <div className="flex flex-col">
            <span>PDF report</span>
            <span className="text-[10px] text-muted-foreground">
              Landscape · summary tiles + tables
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleJson}>
          <Braces className="h-4 w-4 text-emerald-300" />
          <div className="flex flex-col">
            <span>AI dataset (.json)</span>
            <span className="text-[10px] text-muted-foreground">
              Ready for models — all fields incl. enrichment slots
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
