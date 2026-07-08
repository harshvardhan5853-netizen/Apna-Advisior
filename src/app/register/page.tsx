"use client";

import { useState, useEffect, type FormEvent } from "react";
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
  Mail,
  UserPlus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { FintechHero } from "@/components/auth/fintech-hero";

// ─── Animation presets (shared) ───
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
export default function RegisterPage() {
  const { register, login, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push("/");
  }, [user, loading, router]);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      await register(fullName, username, email, password);
      await login(email, password);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
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
                Start building
                <br />
                <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  your wealth story
                </span>
              </h1>
              <p className="mt-2 text-sm text-white/40">
                Join smart investors who trust AI-powered wealth management.
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
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {/* Full Name */}
              <motion.div variants={fadeUp}>
                <label
                  htmlFor="fullName"
                  className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 mb-2"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/20" />
                  <Input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    minLength={2}
                    className="pl-10"
                  />
                </div>
              </motion.div>

              {/* Username */}
              <motion.div variants={fadeUp}>
                <label
                  htmlFor="username"
                  className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 mb-2"
                >
                  Username
                </label>
                <div className="relative">
                  <UserPlus className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/20" />
                  <Input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="johndoe"
                    minLength={3}
                    className="pl-10"
                  />
                </div>
              </motion.div>

              {/* Email */}
              <motion.div variants={fadeUp}>
                <label
                  htmlFor="email"
                  className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 mb-2"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/20" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10"
                  />
                </div>
              </motion.div>

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
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="• • • • • • • •"
                    minLength={8}
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
                <p className="mt-1.5 text-[10px] text-white/25">
                  8+ characters, 1 uppercase, 1 number
                </p>
              </motion.div>

              {/* Confirm Password */}
              <motion.div variants={fadeUp}>
                <label
                  htmlFor="confirmPassword"
                  className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 mb-2"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/20" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="• • • • • • • •"
                    minLength={8}
                    className="pl-10"
                  />
                </div>
              </motion.div>

              {/* Submit */}
              <motion.div variants={fadeUp} className="pt-1">
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
                        Creating account…
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </>
                    )}
                  </span>
                </button>
              </motion.div>
            </form>

            {/* ── Login link ── */}
            <motion.div variants={fadeUp} className="mt-8 text-center">
              <p className="text-sm text-white/30">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Sign in to your portfolio
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
