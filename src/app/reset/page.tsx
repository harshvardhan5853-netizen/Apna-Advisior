"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Resetting…");
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function reset() {
      try {
        // 1. Clear localStorage auth tokens + remembered username
        setStatus("Clearing local storage…");
        localStorage.removeItem("auth_token");
        localStorage.removeItem("remembered_username");
        localStorage.clear();

        // 2. Delete IndexedDB (apna-advisor)
        setStatus("Clearing IndexedDB…");
        try {
          const dbs = await indexedDB.databases();
          for (const db of dbs) {
            if (db.name) indexedDB.deleteDatabase(db.name);
          }
        } catch {
          // indexedDB.databases() not supported in all browsers
          indexedDB.deleteDatabase("apna-advisor");
        }

        // 3. Clear cookies (session_token)
        setStatus("Clearing cookies…");
        document.cookie =
          "session_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";

        // 4. Call server-side logout to clear any remaining session
        setStatus("Finalizing…");
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch {
          // Server session already gone — fine
        }

        setDone(true);
        setStatus("Reset complete");
      } catch (err) {
        setStatus(`Reset failed: ${err}`);
      }
    }

    reset();
  }, []);

  useEffect(() => {
    if (done) {
      const timer = setTimeout(() => router.push("/login"), 800);
      return () => clearTimeout(timer);
    }
  }, [done, router]);

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050508]">
        <div className="text-center">
          <div className="mx-auto size-16 rounded-full bg-emerald-400/[0.1] border border-emerald-400/20 flex items-center justify-center mb-6">
            <svg
              className="size-8 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Reset Complete</h2>
          <p className="text-sm text-white/40">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050508]">
      <div className="text-center">
        <div className="mx-auto size-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mb-4" />
        <p className="text-sm text-white/40">{status}</p>
      </div>
    </div>
  );
}
