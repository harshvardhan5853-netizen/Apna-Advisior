"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-emerald-400 to-emerald-600 text-emerald-950 shadow-glow-emerald hover:from-emerald-300 hover:to-emerald-500 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.5),0_10px_40px_-10px_rgba(16,185,129,0.6)] active:from-emerald-500 active:to-emerald-700 active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground border border-white/5 hover:bg-accent hover:border-white/10 active:scale-[0.98]",
        outline:
          "border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 text-foreground active:scale-[0.98]",
        ghost:
          "hover:bg-white/[0.06] hover:text-foreground/90 text-foreground/70 active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]",
        link: "text-emerald-300 underline-offset-4 hover:underline hover:text-emerald-200",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
