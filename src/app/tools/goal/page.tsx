"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GoalPlanner } from "@/components/tools/goal-planner";

export default function GoalRoute() {
  return (
    <div className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(16,185,129,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.12) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 left-1/2 -z-10 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-emerald-500/[0.08] blur-3xl"
      />

      <main className="container relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 md:py-14">
        <header className="flex flex-col gap-4">
          <Link
            href="/tools"
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-emerald-400/40 hover:text-emerald-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to tools
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-3xl font-semibold md:text-4xl">
              Goal <span className="text-emerald-gradient">Planner</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Set a target corpus and horizon; see the monthly SIP required at your expected return.
            </p>
          </div>
        </header>

        <GoalPlanner />

        <footer className="pt-6 text-center text-xs text-muted-foreground">
          Local-only · Nothing leaves your device.
        </footer>
      </main>
    </div>
  );
}
