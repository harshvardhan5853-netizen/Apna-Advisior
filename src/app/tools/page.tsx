"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { PageShell } from "@/components/layout/page-shell";
import { ToolsHub } from "@/components/tools/tools-hub";

export default function ToolsRoute() {
  return (
    <AuthGuard>
    <PageShell>
      <main className="container relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 md:py-14 page-enter">
        <header className="flex flex-col gap-4">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-emerald-400/40 hover:text-emerald-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-3xl font-semibold md:text-4xl">
              Portfolio <span className="text-emerald-gradient">Tools</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Dividend tracker, goal planner, SIP calculator, tax P&amp;L, corporate actions calendar, and full backup — all in one place.
            </p>
          </div>
        </header>

        <ToolsHub />

        <footer className="pt-6 text-center text-xs text-muted-foreground">
          Local-only · Nothing leaves your device.
        </footer>
      </main>
    </PageShell>
    </AuthGuard>
  );
}
