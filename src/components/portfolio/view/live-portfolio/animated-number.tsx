"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number | null | undefined;
  format: (v: number) => string;
  className?: string;
  /** If provided, colors the value emerald/red based on sign of this reference (usually the delta). */
  tone?: number | null;
  /** Flash a brief emerald/red glow when the value changes. Defaults to true. */
  flash?: boolean;
  placeholder?: string;
}

/**
 * Animates value changes with a slide/fade and briefly flashes emerald (up) or red (down)
 * when the underlying value moves. Used everywhere in the live portfolio view.
 */
export function AnimatedNumber({
  value,
  format,
  className,
  tone,
  flash = true,
  placeholder = "—",
}: AnimatedNumberProps) {
  const prev = React.useRef<number | null>(null);
  const [flashDir, setFlashDir] = React.useState<"up" | "down" | null>(null);

  React.useEffect(() => {
    if (!flash) return;
    if (value == null || !Number.isFinite(value)) return;
    if (prev.current != null && value !== prev.current) {
      setFlashDir(value > prev.current ? "up" : "down");
      const timer = window.setTimeout(() => setFlashDir(null), 900);
      return () => window.clearTimeout(timer);
    }
    prev.current = value;
  }, [value, flash]);

  const isNumber = typeof value === "number" && Number.isFinite(value);
  const display = isNumber ? format(value) : placeholder;
  const toneColor = tone == null ? undefined : tone > 0 ? "text-emerald-300" : tone < 0 ? "text-red-400" : undefined;

  return (
    <span className={cn("relative inline-block money-tabular", toneColor, className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={display}
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -6, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="inline-block"
        >
          {display}
        </motion.span>
      </AnimatePresence>
      <AnimatePresence>
        {flashDir && (
          <motion.span
            key={flashDir}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className={cn(
              "pointer-events-none absolute -inset-x-1 -inset-y-0.5 rounded-md",
              flashDir === "up" ? "bg-emerald-500/20" : "bg-red-500/20",
            )}
            aria-hidden
          />
        )}
      </AnimatePresence>
    </span>
  );
}
