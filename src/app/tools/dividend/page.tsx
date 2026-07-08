"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { PageShell } from "@/components/layout/page-shell";
import { DividendTracker } from "@/components/tools/dividend-tracker";

export default function DividendRoute() {
  return (
    <AuthGuard>
    <PageShell orbColor="bg-amber-500/[0.08]">
      <main className="container relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 md:py-14">
        <header className="flex flex-col gap-4">
          <Link
            href="/tools"
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-amber-400/40 hover:text-amber-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to tools
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-3xl font-semibold md:text-4xl">
              Dividend <span className="text-emerald-gradient">Tracker</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Detect declared dividends from portfolio news, project annual income, and see per-stock yield.
            </p>
          </div>
        </header>

        <DividendTracker />

        <footer className="pt-6 text-center text-xs text-muted-foreground">
          Local-only · Nothing leaves your device.
        </footer>
      </main>
    </PageShell>
    </AuthGuard>
  );
}
