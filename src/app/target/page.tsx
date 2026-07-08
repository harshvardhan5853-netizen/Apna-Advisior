"use client";

import Link from "next/link";
import { ArrowLeft, Target } from "lucide-react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { PageShell } from "@/components/layout/page-shell";
import { TargetView } from "@/components/target-portfolio/target-view";

export default function TargetRoute() {
  return (
    <AuthGuard>
    <PageShell>
      <main className="container relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 md:py-14 page-enter">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground transition hover:border-emerald-400/40 hover:text-emerald-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to dashboard
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
              <Target className="h-3 w-3" />
              Target
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl font-bold md:text-4xl">
              Your <span className="text-emerald-gradient">ideal portfolio</span>
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Set target weights per stock. See exactly how much to invest, what
              to trim, and how close you are to your dream allocation.
            </p>
          </div>
        </header>

        <TargetView />

        <footer className="mt-4 text-xs text-muted-foreground">
          Local-only · Nothing leaves your device · Rebalancing is a suggestion,
          not investment advice.
        </footer>
      </main>
    </PageShell>
    </AuthGuard>
  );
}
