"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { DashboardHeader } from "./dashboard-header";
import { CardGrid } from "./card-grid";
import { UserMenu } from "@/components/auth/user-menu";

export function DashboardShell() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050508]">
        <div className="size-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }
  return (
    <div className="relative min-h-screen">
      {/* Ambient grid */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-grid-emerald opacity-[0.12]"
        style={{ backgroundSize: "56px 56px" }}
      />
      {/* Ambient orbs */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 left-1/2 h-[620px] w-[820px] -translate-x-1/2 rounded-full bg-emerald-500/[0.06] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-purple-500/[0.04] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -left-40 top-1/3 h-[400px] w-[400px] rounded-full bg-cyan-500/[0.03] blur-3xl"
      />
      {/* Noise texture overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "256px 256px",
        }}
      />

      <main className="container relative mx-auto flex max-w-7xl flex-col gap-10 py-10 md:py-14">
        <div className="flex items-start justify-between">
          <DashboardHeader />
          <UserMenu />
        </div>
        <CardGrid />
        <footer className="pt-6 text-center text-xs text-muted-foreground/50">
          Built for Indian retail investors · Your data lives on your device.
        </footer>
      </main>
    </div>
  );
}
