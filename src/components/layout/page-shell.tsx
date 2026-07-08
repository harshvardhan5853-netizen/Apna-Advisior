import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Remove the ambient background glow orb (default: shown) */
  noOrb?: boolean;
  /** Orb color class (e.g. "bg-emerald-500/[0.08]"). Default: "bg-emerald-500/[0.08]" */
  orbColor?: string;
  /** Extra classes on the outer wrapper */
  className?: string;
}

/**
 * Shared page wrapper that provides the ambient grid + glow background.
 * Replaces the duplicated inline `<div>` pattern across all dashboard pages.
 */
export function PageShell({ children, noOrb = false, orbColor = "bg-emerald-500/[0.08]", className = "" }: Props) {
  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* Grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-20 opacity-[0.15]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(16,185,129,0.12) 0 1px, transparent 1px 56px), repeating-linear-gradient(90deg, rgba(16,185,129,0.12) 0 1px, transparent 1px 56px)",
        }}
      />
      {/* Glow orb */}
      {!noOrb && (
        <div
          aria-hidden
          className={`orb -top-32 left-1/2 h-[520px] w-[720px] -translate-x-1/2 ${orbColor}`}
        />
      )}
      {children}
    </div>
  );
}
