"use client";

import { Toaster } from "sonner";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import { ExtractionProvider } from "@/contexts/extraction-context";
import { ErrorBoundary } from "@/components/error-boundary";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <ErrorBoundary>
        <AuthProvider>
          <ExtractionProvider>{children}</ExtractionProvider>
        </AuthProvider>
      </ErrorBoundary>
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
