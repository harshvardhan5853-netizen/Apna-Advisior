"use client";

import { Toaster } from "sonner";
import { TooltipProvider } from "@radix-ui/react-tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      {children}
      <Toaster
        position="top-right"
        theme="dark"
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast:
              "!bg-[hsl(158_28%_10%)] !border !border-white/10 !text-foreground !backdrop-blur-xl !shadow-glass",
            title: "!text-foreground",
            description: "!text-muted-foreground",
          },
        }}
      />
    </TooltipProvider>
  );
}
