import { Suspense } from "react";
import { ReviewContent } from "./review-content";

export default function ReviewExtractionsRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#050508]">
          <div className="size-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}
