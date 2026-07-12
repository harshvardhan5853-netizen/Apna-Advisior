"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  ArrowUpRight,
  Target,
  Lock,
  User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { FintechHero } from "@/components/auth/fintech-hero";

// ─── Animation presets ───
const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.12 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

/* ─── Page ─── */
export default function LoginPage() {
  const {
    login,
    user,
    loading,
    rememberedUsername,
    rememberedUsernames,
    selectUsername,
  } = useAuth();
  const router = useRouter();
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && user) router.push("/");
  }, [user, loading, router]);

  const [emailOrUsername, setEmailOrUsername] = useState(
    rememberedUsername ?? "",
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  useEffect(() => {
    if (rememberedUsername && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [rememberedUsername]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(emailOrUsername, password);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSelectAccount(username: string) {
    selectUsername(username);
    setEmailOrUsername(username);
    setPassword("");
    setShowAccountPicker(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050508]">
        <div className="size-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#050508]">
      {/* ─── Left Panel — Premium Auth Card ─── */}
      <div className="relative flex items-center justify-center px-5 py-10 lg:w-[42%]">
        {/* Decorative chart-line BG */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='400' height='200' viewBox='0 0 400 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,160 Q40,150 80,155 T160,130 T240,100 T320,110 T400,80' fill='none' stroke='%2310b981' stroke-width='1' opacity='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: "400px 200px",
            backgroundRepeat: "repeat",
          }}
        />

        <div className="relative w-full max-w-sm">
          {/* ── Logo ── */}
          <Link href="/" className="inline-flex items-center gap-2.5 mb-10 group">
            <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_20px_-4px_rgba(16,185,129,0.4)] transition-transform duration-200 group-hover:scale-105">
              AA
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Apna Advisor
            </span>
          </Link>

          <motion.div variants={container} initial="hidden" animate="visible">
            {/* ── Headline ── */}
            <motion.div variants={fadeUp}>
              <h1 className="text-3xl font-bold hero-gradient leading-tight">
                {rememberedUsername ? "Welcome back" : "Your financial"}
                <br />
                <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  {rememberedUsername ? "to your portfolio" : "intelligence begins here"}
                </span>
              </h1>
              <p className="mt-2 text-sm text-white/40">
                {rememberedUsername
                  ? "Enter your password to continue"
                  : "AI-powered portfolio management for the modern investor."}
              </p>
            </motion.div>

            {/* ── Error ── */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="mt-6 overflow-hidden"
                >
                  <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-200 flex items-start gap-2.5">
                    <div className="mt-0.5 size-1.5 rounded-full bg-red-400 shrink-0" />
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {/* Email / Username */}
              <motion.div variants={fadeUp}>
                <label
                  htmlFor="emailOrUsername"
                  className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 mb-2"
                >
                  Email or Username
                </label>
                {showAccountPicker ? (
                  <div className="space-y-1.5">
                    {rememberedUsernames.length > 0 ? (
                      rememberedUsernames.map((u) => {
                        const initial = u[0].toUpperCase();
                        const isActive = u === rememberedUsername;
                        return (
                          <button
                            key={u}
                            type="button"
                            onClick={() => handleSelectAccount(u)}
                            className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                              isActive
                                ? "border-emerald-500/40 bg-emerald-500/[0.06]"
                                : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
                            }`}
                          >
                            <div className="size-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                              {initial}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white/80 truncate">{u}</div>
                              <div className="text-[10px] text-white/30">
                                {isActive ? "Current account" : "Saved account"}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-sm text-white/30">
                        No saved accounts yet
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowAccountPicker(false)}
                      className="mt-2 text-xs text-white/30 hover:text-white/50 transition-colors"
                    >
                      ← Back
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/20" />
                      <Input
                        id="emailOrUsername"
                        type="text"
                        required
                        value={emailOrUsername}
                        onChange={(e) => setEmailOrUsername(e.target.value)}
                        placeholder="you@example.com"
                        autoFocus={!rememberedUsername}
                        className="pl-10"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAccountPicker(true)}
                      className="mt-2 text-xs text-emerald-400/70 hover:text-emerald-300 transition-colors flex items-center gap-1"
                    >
                      <User className="size-3" />
                      Show saved accounts
                    </button>
                  </div>
                )}
              </motion.div>

              {!showAccountPicker && (
                <>
                  {/* Password */}
                  <motion.div variants={fadeUp}>
                    <label
                      htmlFor="password"
                      className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 mb-2"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/20 z-10" />
                      <Input
                        ref={passwordRef}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={rememberedUsername ? "" : "• • • • • • • •"}
                        autoFocus={!!rememberedUsername}
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors z-10"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </motion.div>



                  {/* Submit */}
                  <motion.div variants={fadeUp}>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-4 py-3 text-sm font-semibold text-emerald-950 shadow-glow-emerald transition-all duration-300 hover:from-emerald-300 hover:to-emerald-500 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.5),0_10px_40px_-10px_rgba(16,185,129,0.6)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                      <span className="relative flex items-center justify-center gap-2">
                        {submitting ? (
                          <>
                            <span className="size-4 rounded-full border-2 border-emerald-950/30 border-t-emerald-950 animate-spin" />
                            Signing in…
                          </>
                        ) : (
                          <>
                            Secure Login
                            <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          </>
                        )}
                      </span>
                    </button>
                  </motion.div>
                </>
              )}
            </form>

            {/* ── Register link ── */}
            <motion.div variants={fadeUp} className="mt-8 text-center">
              <p className="text-sm text-white/30">
                New to Apna Advisor?{" "}
                <Link
                  href="/register"
                  className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Create an account
                </Link>
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ─── Right Panel ─── */}
      <div className="flex-1 flex min-h-0">
        <FintechHero />
      </div>

      {/* ── Bottom Bar (mobile) ── */}
      <div className="lg:hidden flex items-center justify-between px-6 py-4 border-t border-white/[0.05] text-[10px] text-white/20">
        <span>© 2026 Apna Advisor</span>
        <span className="flex items-center gap-1">
          <Target className="size-3" />
          Wealth. Simplified.
        </span>
      </div>
    </div>
  );
}
