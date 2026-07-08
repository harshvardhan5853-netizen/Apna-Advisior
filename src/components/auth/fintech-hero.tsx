"use client";

import { motion } from "framer-motion";
import { BrainCircuit, TrendingUp, Target, Shield, Lock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Animation presets ───
const heroStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.25 },
  },
};

const heroChild = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

/* ─── Abstract Wealth Ecosystem SVG ─── */
function WealthEcosystem() {
  const cx = 140;
  const cy = 75;

  // Constellation nodes — no numerical data, pure brand concepts
  const nodes = [
    { id: "ai", label: "AI", x: cx, y: cy - 8, r: 10, desc: "Intelligence" },
    { id: "markets", label: "Markets", x: cx - 62, y: cy + 40, r: 7, desc: "Analysis" },
    { id: "portfolio", label: "Portfolio", x: cx + 62, y: cy + 48, r: 7, desc: "Management" },
    { id: "goals", label: "Goals", x: cx - 35, y: cy - 42, r: 6, desc: "Planning" },
    { id: "wealth", label: "Wealth", x: cx + 40, y: cy - 38, r: 6, desc: "Growth" },
    { id: "security", label: "Secure", x: cx, y: cy + 52, r: 6, desc: "Protected" },
  ];

  return (
    <svg viewBox="0 0 280 160" className="w-full h-auto" fill="none">
      <defs>
        <linearGradient id="nodeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        <linearGradient id="lineGrad1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.08" />
          <stop offset="50%" stopColor="#10b981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
        <filter id="nodeGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="coreGlow">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Subtle dot grid */}
      <pattern id="dotGrid2" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="0.5" fill="#10b981" fillOpacity="0.12" />
      </pattern>
      <rect width="280" height="160" fill="url(#dotGrid2)" rx="12" />

      {/* Growth curve — conceptual upward sweep */}
      <path
        d="M20,130 C50,125 80,100 100,90 C120,80 140,60 160,52 C180,44 210,32 240,28 C255,26 268,28 272,30"
        stroke="url(#lineGrad1)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Filled area under curve */}
      <path
        d="M20,130 C50,125 80,100 100,90 C120,80 140,60 160,52 C180,44 210,32 240,28 C255,26 268,28 272,30 L272,160 L20,160 Z"
        fill="url(#areaGrad)"
      />

      {/* Constellation connection lines */}
      {[
        ["ai", "markets"],
        ["ai", "portfolio"],
        ["ai", "goals"],
        ["ai", "wealth"],
        ["ai", "security"],
        ["markets", "security"],
        ["portfolio", "security"],
        ["markets", "goals"],
        ["portfolio", "wealth"],
      ].map(([from, to]) => {
        const a = nodes.find((n) => n.id === from)!;
        const b = nodes.find((n) => n.id === to)!;
        return (
          <line
            key={`${from}-${to}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="#10b981"
            strokeOpacity={0.08}
            strokeWidth="0.5"
          />
        );
      })}

      {/* Outer glow halos for AI core */}
      <circle cx={cx} cy={cy - 8} r="20" fill="#10b981" fillOpacity="0.06" filter="url(#coreGlow)" />
      <circle cx={cx} cy={cy - 8} r="14" fill="#10b981" fillOpacity="0.08" filter="url(#coreGlow)" />

      {/* Nodes */}
      {nodes.map((node) => (
        <g key={node.id}>
          {node.id === "ai" ? (
            <>
              <circle cx={node.x} cy={node.y} r={node.r} fill="url(#nodeGrad)" filter="url(#coreGlow)" />
              <circle cx={node.x} cy={node.y} r={node.r} fill="url(#nodeGrad)" fillOpacity={0.3} />
              <circle cx={node.x} cy={node.y} r={node.r - 2} fill="none" stroke="#10b981" strokeOpacity={0.5} strokeWidth="0.5" />
            </>
          ) : (
            <>
              <circle cx={node.x} cy={node.y} r={node.r} fill="#10b981" fillOpacity={0.12} stroke="#10b981" strokeOpacity={0.2} strokeWidth="0.5" />
              <circle cx={node.x} cy={node.y} r={node.r - 1} fill="#34d399" fillOpacity={0.6} filter="url(#nodeGlow)" />
            </>
          )}
          {/* Node label */}
          <text
            x={node.id === "ai" ? node.x : node.x + node.r + 5}
            y={node.id === "ai" ? node.y + 3.5 : node.y + 3}
            fill={node.id === "ai" ? "#10b981" : "rgba(255,255,255,0.4)"}
            fontSize={node.id === "ai" ? 7 : 6}
            fontWeight={node.id === "ai" ? 700 : 500}
            textAnchor={node.id === "ai" ? "middle" : "start"}
            fontFamily="system-ui"
            letterSpacing="0.05em"
          >
            {node.label}
          </text>
          {/* Description under label for AI core */}
          {node.id === "ai" && (
            <text x={node.x} y={node.y + 12} fill="rgba(255,255,255,0.2)" fontSize={5} textAnchor="middle" fontFamily="system-ui" letterSpacing="0.1em">
              {node.desc}
            </text>
          )}
        </g>
      ))}

      {/* Orbiting data dots */}
      {[...Array(5)].map((_, i) => {
        const angle = (i / 5) * Math.PI * 2 + 0.3;
        const orbitR = 18 + i * 2;
        return (
          <circle
            key={`orbit-${i}`}
            cx={cx + Math.cos(angle) * orbitR}
            cy={cy - 8 + Math.sin(angle) * orbitR}
            r="1"
            fill="#34d399"
            fillOpacity={0.3 + i * 0.05}
          />
        );
      })}
    </svg>
  );
}

/* ─── Feature value props ─── */
const features = [
  {
    icon: BrainCircuit,
    label: "AI-Powered Intelligence",
    desc: "Smart portfolio insights driven by artificial intelligence.",
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/[0.06]",
    borderColor: "border-emerald-400/10",
  },
  {
    icon: Target,
    label: "Goal-Based Planning",
    desc: "Strategic investment plans tailored to your financial goals.",
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/[0.06]",
    borderColor: "border-cyan-400/10",
  },
  {
    icon: TrendingUp,
    label: "Smart Analytics",
    desc: "Real-time market tracking and fundamental analysis at your fingertips.",
    color: "text-amber-300",
    bgColor: "bg-amber-300/[0.06]",
    borderColor: "border-amber-300/10",
  },
  {
    icon: Shield,
    label: "Bank-Grade Security",
    desc: "Your financial data, encrypted and private. Always.",
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/[0.06]",
    borderColor: "border-emerald-400/10",
  },
];

/* ─── Right Panel Component ─── */
export function FintechHero() {
  return (
    <motion.div
      className="hidden lg:flex relative flex-1 flex-col items-center justify-center text-white overflow-hidden p-8"
      variants={heroStagger}
      initial="hidden"
      animate="visible"
    >
      {/* ── Ambient bg layers ── */}
      <div className="pointer-events-none absolute inset-0 bg-grid-emerald opacity-30" />
      {/* Floating particles */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute size-1.5 rounded-full bg-emerald-400/20"
            style={{
              left: `${8 + i * 11}%`,
              top: `${15 + (i % 4) * 20}%`,
              animation: `float ${4 + (i % 3) * 0.8}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute -top-48 -right-32 size-[35rem] rounded-full bg-emerald-500/[0.08] blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-emerald-400/[0.05] blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 size-72 rounded-full bg-cyan-500/[0.04] blur-3xl animate-float" />
      <div className="pointer-events-none absolute top-1/2 left-1/3 size-80 rounded-full bg-amber-400/[0.03] blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-emerald-500/[0.05] to-transparent" />

      {/* ── Brand Pill ── */}
      <motion.div
        variants={heroChild}
        className="relative z-10 mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3.5 py-1"
      >
        <Zap className="size-3 text-emerald-400" />
        <span className="text-[10px] font-medium text-white/40 tracking-wider uppercase">
          AI-Powered Wealth Management
        </span>
      </motion.div>

      {/* ── Wealth Ecosystem Visual ── */}
      <motion.div
        variants={heroChild}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl shadow-premium overflow-hidden">
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-glass-highlight opacity-60" />
          <div className="relative px-5 pt-4 pb-3">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="size-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">
                Wealth Intelligence
              </span>
            </div>

            {/* Ecosystem visual */}
            <div className="w-full">
              <WealthEcosystem />
            </div>

            {/* Feature value props grid */}
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.label}
                    className={cn(
                      "group rounded-xl border px-3 py-2.5 transition-all duration-300",
                      f.borderColor,
                      f.bgColor,
                      "hover:bg-white/[0.04]",
                    )}
                  >
                    <Icon className={cn("size-4 mb-1.5", f.color)} />
                    <div className="text-[11px] font-semibold text-white/80 group-hover:text-white transition-colors duration-200">
                      {f.label}
                    </div>
                    <div className="text-[9px] text-white/30 leading-relaxed mt-0.5">
                      {f.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Trust Signals ── */}
      <motion.div
        variants={heroChild}
        className="relative z-10 mt-8 flex items-center gap-6 text-[10px] text-white/30"
      >
        <span className="flex items-center gap-1.5 group cursor-default">
          <Lock className="size-3 text-emerald-400/50 group-hover:text-emerald-400 transition-colors duration-200" />
          Encrypted
        </span>
        <span className="flex items-center gap-1.5 group cursor-default">
          <Shield className="size-3 text-emerald-400/50 group-hover:text-emerald-400 transition-colors duration-200" />
          Private
        </span>
        <span className="flex items-center gap-1.5 group cursor-default">
          <Zap className="size-3 text-emerald-400/50 group-hover:text-emerald-400 transition-colors duration-200" />
          AI-Powered
        </span>
        <span className="flex items-center gap-1.5 group cursor-default">
          <Target className="size-3 text-emerald-400/50 group-hover:text-emerald-400 transition-colors duration-200" />
          Goal-Focused
        </span>
      </motion.div>
    </motion.div>
  );
}
