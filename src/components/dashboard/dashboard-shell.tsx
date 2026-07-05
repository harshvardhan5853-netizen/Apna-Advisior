"use client";

import { DashboardHeader } from "./dashboard-header";
import { CardGrid } from "./card-grid";

export function DashboardShell() {
  return (
    <div className="relative min-h-screen">
      {/* Ambient grid */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-grid-emerald opacity-[0.15]"
        style={{ backgroundSize: "56px 56px" }}
      />
      {/* Ambient orbs */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-emerald-500/[0.08] blur-3xl"
      />

      <main className="container relative mx-auto flex max-w-7xl flex-col gap-10 py-10 md:py-14">
        <DashboardHeader />
        <CardGrid />
        <footer className="pt-6 text-center text-xs text-muted-foreground/70">
          Built for Indian retail investors · Your data lives on your device.
        </footer>
      </main>
    </div>
  );
}
