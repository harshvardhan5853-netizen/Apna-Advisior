"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  Mail,
  Target,
  CheckCircle,
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
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    setSent(true);
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#050508]">
      {/* ─── Left Panel — Premium Auth Card ─── */}
      <div className="relative flex items-center justify-center px-5 py-10 lg:w-[42%]">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='400' height='200' viewBox='0 0 400 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,160 Q40,150 80,155 T160,130 T240,100 T320,110 T400,80' fill='none' stroke='%2310b981' stroke-width='1' opacity='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: "400px 200px", backgroundRepeat: "repeat",
          }}
        />

        <div className="relative w-full max-w-sm">
          {/* ── Logo ── */}
          <Link href="/" className="inline-flex items-center gap-2.5 mb-10 group">
            <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_20px_-4px_rgba(16,185,129,0.4)] transition-transform duration-200 group-hover:scale-105">
              AA
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Apna Advisor</span>
          </Link>

          <motion.div variants={container} initial="hidden" animate="visible">
            <AnimatePresence mode="wait">
              {!sent ? (
                <motion.div key="form" variants={container} initial="hidden" animate="visible" exit={{ opacity: 0, y: -12 }}>
                  <motion.div variants={fadeUp}>
                    <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 transition-colors mb-6">
                      <ArrowLeft className="size-3" /> Back to login
                    </Link>
                    <h1 className="text-3xl font-bold hero-gradient leading-tight">
                      Regain access
                      <br />
                      <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 bg-clip-text text-transparent">to your portfolio</span>
                    </h1>
                    <p className="mt-2 text-sm text-white/40">
                      Enter your email and we&apos;ll send you a secure recovery link.
                    </p>
                  </motion.div>

                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -8, height: 0 }} className="mt-6 overflow-hidden">
                        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-200 flex items-start gap-2.5">
                          <div className="mt-0.5 size-1.5 rounded-full bg-red-400 shrink-0" />{error}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <motion.div variants={fadeUp}>
                      <label htmlFor="email" className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 mb-2">Email</label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/20" />
                        <Input id="email" type="email" required value={email}
                          onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-10" />
                      </div>
                    </motion.div>

                    <motion.div variants={fadeUp}>
                      <button type="submit" disabled={submitting}
                        className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-4 py-3 text-sm font-semibold text-emerald-950 shadow-glow-emerald transition-all duration-300 hover:from-emerald-300 hover:to-emerald-500 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.5),0_10px_40px_-10px_rgba(16,185,129,0.6)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed">
                        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                        <span className="relative flex items-center justify-center gap-2">
                          {submitting ? (
                            <><span className="size-4 rounded-full border-2 border-emerald-950/30 border-t-emerald-950 animate-spin" /> Sending…
                            </>
                          ) : (
                            <>Send Recovery Link <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></>
                          )}
                        </span>
                      </button>
                    </motion.div>
                  </form>
                </motion.div>
              ) : (
                <motion.div key="success" variants={fadeUp} initial="hidden" animate="visible" className="text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }}>
                    <div className="mx-auto size-16 rounded-full bg-emerald-400/[0.1] border border-emerald-400/20 flex items-center justify-center mb-6">
                      <CheckCircle className="size-8 text-emerald-400" />
                    </div>
                  </motion.div>
                  <h2 className="text-xl font-bold hero-gradient mb-2">Check your email</h2>
                  <p className="text-sm text-white/40 leading-relaxed mb-8">
                    We&apos;ve sent a password reset link to<br />
                    <span className="text-white/60 font-medium">{email}</span>
                  </p>
                  <Link href="/login"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-emerald-950 shadow-glow-emerald transition-all duration-300 hover:from-emerald-300 hover:to-emerald-500 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.5),0_10px_40px_-10px_rgba(16,185,129,0.6)] active:scale-[0.98]">
                    Back to login <ArrowLeft className="size-4" />
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            {!sent && (
              <motion.div variants={fadeUp} className="mt-8 text-center">
                <p className="text-sm text-white/30">
                  Remember your password?{" "}
                  <Link href="/login" className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors">Sign in</Link>
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0"><FintechHero /></div>

      <div className="lg:hidden flex items-center justify-between px-6 py-4 border-t border-white/[0.05] text-[10px] text-white/20">
        <span>© 2026 Apna Advisor</span>
        <span className="flex items-center gap-1"><Target className="size-3" /> Wealth. Simplified.</span>
      </div>
    </div>
  );
}
