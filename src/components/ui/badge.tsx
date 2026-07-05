import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
        secondary:
          "border-white/10 bg-white/[0.04] text-muted-foreground",
        success:
          "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
        warning:
          "border-amber-400/30 bg-amber-400/10 text-amber-200",
        destructive:
          "border-red-400/30 bg-red-500/10 text-red-200",
        outline: "border-white/10 text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
