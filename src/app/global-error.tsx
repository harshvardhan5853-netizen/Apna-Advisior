"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]", error.message, error.digest);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-[#050508] p-8">
        <div className="max-w-md text-center">
          <div className="mb-4 text-6xl">🚨</div>
          <h1 className="mb-2 text-2xl font-bold text-white">
            Critical Application Error
          </h1>
          <p className="mb-2 text-sm text-gray-400">
            Apna Advisor encountered a critical error and could not recover.
          </p>
          <p className="mb-6 text-xs text-gray-500">
            {error.message || "No additional details available."}
          </p>
          <button
            onClick={reset}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
          >
            Restart application
          </button>
        </div>
      </body>
    </html>
  );
}
