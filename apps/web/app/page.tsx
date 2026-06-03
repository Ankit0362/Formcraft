"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight, Box, Activity, Terminal, Zap, Shield, BarChart3,
  Globe, Layers, Webhook, Key, Star, CheckCircle, ChevronRight,
  FileText, Users, TrendingUp, Clock, Lock, Cpu, HardDrive, Server,
} from "lucide-react";

// ─── Animation variants ────────────────────────────────────────────────────
const brutalIn = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "linear" as const } },
};
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

// ─── Section wrapper with scroll-triggered animation ──────────────────────
function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ─── Data ──────────────────────────────────────────────────────────────────
const STATS = [
  { value: "120+", label: "Templates" },
  { value: "50K+", label: "Forms Built" },
  { value: "2M+", label: "Responses" },
  { value: "99.9%", label: "Uptime" },
  { value: "0ms", label: "Config Time" },
  { value: "∞", label: "Possibilities" },
];

const FEATURES = [
  {
    icon: Zap,
    title: "AI-Powered Builder",
    desc: "Describe your form in plain English. Our AI generates a fully structured form with fields, validation, and logic in seconds.",
    tag: "INTELLIGENCE",
    color: "#facc15",
  },
  {
    icon: Layers,
    title: "Drag & Drop Editor",
    desc: "Pixel-perfect drag-and-drop canvas. Reorder fields, add conditional logic, and configure validation without writing a single line of code.",
    tag: "BUILDER",
    color: "#000",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    desc: "Live response tracking, completion rates, drop-off analysis, and exportable CSV data. Know exactly how your forms perform.",
    tag: "ANALYTICS",
    color: "#facc15",
  },
  {
    icon: Webhook,
    title: "Webhooks & API",
    desc: "Push response data to any endpoint the moment it arrives. Connect Slack, Zapier, custom backends — no middleman.",
    tag: "INTEGRATIONS",
    color: "#000",
  },
  {
    icon: Shield,
    title: "Spam Protection",
    desc: "Built-in honeypot traps, rate limiting, and email verification stop bots before they pollute your data.",
    tag: "SECURITY",
    color: "#facc15",
  },
  {
    icon: Globe,
    title: "Public Share Links",
    desc: "Every form gets a shareable slug. Embed it, link it, QR-code it. Collect responses from anywhere, no account required.",
    tag: "SHARING",
    color: "#000",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Choose or Describe",
    desc: "Pick from 120+ industry templates or type what you need — our AI handles the rest in under 10 seconds.",
    icon: FileText,
  },
  {
    step: "02",
    title: "Customize & Configure",
    desc: "Drag fields, set validation rules, add conditional logic, and theme your form to match your brand.",
    icon: Cpu,
  },
  {
    step: "03",
    title: "Publish & Share",
    desc: "One click to go live. Share the link, embed it in your site, or use our API to trigger it programmatically.",
    icon: Globe,
  },
  {
    step: "04",
    title: "Collect & Analyze",
    desc: "Responses stream in real-time. Analyse, export, and route data to your tools via webhooks automatically.",
    icon: BarChart3,
  },
];

const TEMPLATES_PREVIEW = [
  { name: "Customer Feedback", industry: "E-Commerce", color: "#ec4899", fields: 8 },
  { name: "Job Application", industry: "HR", color: "#f97316", fields: 14 },
  { name: "Event Registration", industry: "Events", color: "#ef4444", fields: 10 },
  { name: "Patient Intake", industry: "Healthcare", color: "#14b8a6", fields: 18 },
  { name: "Lead Capture", industry: "Marketing", color: "#a855f7", fields: 6 },
  { name: "Bug Report", industry: "Technology", color: "#06b6d4", fields: 9 },
];

const TESTIMONIALS = [
  {
    name: "Priya Sharma",
    role: "Product Manager @ Nexus",
    text: "FormCraft replaced three different tools. The AI builder alone saved us hours every week. The analytics dashboard is genuinely impressive.",
    rating: 5,
  },
  {
    name: "Arjun Mehta",
    role: "Founder @ DevLaunch",
    text: "I built our entire onboarding flow in one afternoon. Webhooks work perfectly with our backend. Finally a form tool that respects engineers.",
    rating: 5,
  },
  {
    name: "Sneha Kapoor",
    role: "HR Lead @ ScaleUp",
    text: "The job application template got us live in 20 minutes. Response quality improved because the conditional logic keeps forms relevant.",
    rating: 5,
  },
];

const PRICING = [
  { name: "FREE", price: "₹0", period: "", icon: Cpu, features: ["1,000 responses/mo", "Unlimited forms", "5 templates/category", "Basic analytics"], cta: "Start Free", href: "/auth", highlight: false },
  { name: "PRO", price: "₹1,999", period: "/mo", icon: HardDrive, features: ["10,000 responses/mo", "All 120+ templates", "Advanced analytics", "CSV export", "Email notifications", "Webhooks"], cta: "Upgrade to Pro", href: "/auth", highlight: true },
  { name: "ENTERPRISE", price: "₹4,999", period: "/mo", icon: Server, features: ["50,000 responses/mo", "Remove branding", "API access", "Team collaboration", "Priority support"], cta: "Contact Sales", href: "/auth", highlight: false },
];

// ─── Main Component ────────────────────────────────────────────────────────
export default function LandingPage() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden selection:bg-[var(--caution)] selection:text-black">

      {/* Background Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-0" style={{ backgroundImage: "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      {/* ══════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════ */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b-4 border-black shadow-[0_4px_0_0_#000]">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-black text-xl tracking-tighter uppercase flex items-center gap-3">
            <div className="bg-[var(--caution)] border-2 border-black p-1">
              <Box className="w-5 h-5 text-black" />
            </div>
            FORMCRAFT
          </Link>
          <nav className="hidden md:flex items-center gap-8 font-mono text-sm font-bold uppercase tracking-widest">
            <a href="#features" className="hover:text-[var(--caution)] transition-colors hover:underline decoration-4 underline-offset-4">Features</a>
            <a href="#how-it-works" className="hover:text-[var(--caution)] transition-colors hover:underline decoration-4 underline-offset-4">How It Works</a>
            <Link href="/auth" className="hover:text-[var(--caution)] transition-colors hover:underline decoration-4 underline-offset-4">Pricing</Link>
            <Link href="/auth" className="hover:text-[var(--caution)] transition-colors hover:underline decoration-4 underline-offset-4">Templates</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="hidden sm:block font-black uppercase text-xs tracking-widest px-4 py-2 border-2 border-black hover:bg-gray-100 transition-all">
              LOG IN
            </Link>
            <Link href="/auth" className="bg-black text-white font-black uppercase text-xs tracking-widest px-6 py-2 border-2 border-black hover:bg-[var(--caution)] hover:text-black hover:shadow-[4px_4px_0_0_#000] transition-all">
              GET STARTED
            </Link>
          </div>
        </div>
        <div className="h-2 w-full bg-caution" />
      </header>

      {/* ══════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════ */}
      <section className="relative min-h-screen pt-32 pb-20 px-6 flex flex-col justify-center z-10">
        <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          <motion.div initial="hidden" animate="visible" variants={stagger} className="lg:col-span-7 space-y-8">
            <motion.div variants={brutalIn} className="inline-flex items-center gap-3 bg-white border-4 border-black px-4 py-2 shadow-[4px_4px_0_0_#000] font-mono text-xs font-bold uppercase tracking-widest">
              <span className="w-3 h-3 bg-[var(--caution)] rounded-full animate-pulse" />
              System Online · AI Builder Ready
            </motion.div>

            <motion.h1 variants={brutalIn} className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9]">
              The Heavy<br />
              <span className="text-[var(--caution)]" style={{ textShadow: "4px 4px 0 #000" }}>Machinery</span><br />
              For Your Data.
            </motion.h1>

            <motion.div variants={brutalIn} className="bg-white border-4 border-black p-6 shadow-[8px_8px_0_0_#000] max-w-2xl">
              <p className="text-xl font-mono font-medium leading-relaxed">
                Build industrial-grade forms in seconds with AI. Rugged drag-and-drop editor. Real-time analytics. Webhooks out of the box.
              </p>
            </motion.div>

            <motion.div variants={brutalIn} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
              <Link href="/auth" className="brutal-btn-primary text-lg">
                Start Building Free <ArrowRight className="w-6 h-6" />
              </Link>
              <Link href="/auth" className="font-mono text-sm font-bold flex items-center gap-2 uppercase border-4 border-black px-6 py-3 hover:bg-[var(--caution)] hover:shadow-[4px_4px_0_0_#000] transition-all bg-white">
                <Layers className="w-5 h-5" /> Browse 120+ Templates
              </Link>
            </motion.div>

            <motion.div variants={brutalIn} className="flex flex-wrap items-center gap-6 pt-2">
              {["No credit card", "Free forever plan", "Setup in 60 seconds"].map((t) => (
                <div key={t} className="flex items-center gap-2 font-mono text-xs font-bold uppercase">
                  <CheckCircle className="w-4 h-4 text-green-600" /> {t}
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Hero Visual — mock form builder */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="lg:col-span-5 relative"
          >
            <div className="bg-white border-4 border-black shadow-[16px_16px_0_0_#000] relative overflow-hidden">
              {/* Top bar */}
              <div className="bg-black text-white px-4 py-2 flex items-center justify-between font-mono text-xs font-bold uppercase">
                <span className="flex items-center gap-2"><span className="w-2 h-2 bg-[var(--caution)] rounded-full animate-pulse" /> FormCraft Builder</span>
                <span className="text-[var(--caution)]">LIVE</span>
              </div>
              {/* Field list */}
              <div className="p-6 space-y-4">
                {[
                  { label: "Full Name", type: "TEXT", required: true },
                  { label: "Email Address", type: "EMAIL", required: true },
                  { label: "Company Size", type: "SELECT", required: false },
                  { label: "Message", type: "TEXTAREA", required: false },
                ].map((field, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="border-4 border-black p-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer group"
                  >
                    <div>
                      <div className="font-black uppercase text-sm tracking-tight">{field.label}</div>
                      <div className="font-mono text-[10px] text-gray-400 uppercase">{field.type}{field.required ? " · REQUIRED" : ""}</div>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-6 h-1 bg-black" />
                      <div className="w-6 h-1 bg-black" />
                      <div className="w-6 h-1 bg-black" />
                    </div>
                  </motion.div>
                ))}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="w-full bg-[var(--caution)] border-4 border-black p-3 font-black uppercase text-sm tracking-widest hover:shadow-[4px_4px_0_0_#000] transition-all flex items-center justify-center gap-2"
                >
                  + Add Field
                </motion.button>
              </div>
              {/* Bottom bar */}
              <div className="bg-black text-white px-6 py-3 flex justify-between items-center font-mono text-xs font-bold uppercase">
                <span>4 fields · 0 responses</span>
                <button className="bg-[var(--caution)] text-black px-4 py-1 font-black">Publish →</button>
              </div>
            </div>

            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: -6 }}
              animate={{ opacity: 1, scale: 1, rotate: -6 }}
              transition={{ delay: 0.6 }}
              className="absolute -bottom-6 -left-6 bg-[var(--caution)] border-4 border-black p-4 shadow-[6px_6px_0_0_#000]"
            >
              <div className="font-black uppercase text-xl leading-none">AI</div>
              <div className="font-mono text-[10px] uppercase font-bold">Powered</div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          STATS TICKER
      ══════════════════════════════════════════════ */}
      <div className="bg-black text-white border-y-4 border-black py-5 overflow-hidden z-10 relative">
        <div className="flex gap-0">
          {[...STATS, ...STATS, ...STATS].map((s, i) => (
            <div key={i} className="flex items-center gap-10 shrink-0 px-10">
              <div className="text-center">
                <div className="text-3xl font-black text-[var(--caution)]">{s.value}</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-gray-400">{s.label}</div>
              </div>
              <div className="w-2 h-2 bg-[var(--caution)] rotate-45 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════════ */}
      <Section id="features" className="py-32 px-6 z-10 relative">
        <div className="max-w-[1400px] mx-auto">
          <motion.div variants={brutalIn} className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-[var(--caution)] border-2 border-black px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest mb-4">
                <Zap className="w-3 h-3" /> Core Features
              </div>
              <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
                Built for<br />Builders.
              </h2>
            </div>
            <p className="max-w-md font-mono text-sm font-bold text-gray-600 leading-relaxed border-l-4 border-black pl-4">
              Every feature is designed for speed and precision. No bloat, no confusion — just powerful tools that get out of your way.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              const isHovered = hoveredFeature === i;
              return (
                <motion.div
                  key={i}
                  variants={brutalIn}
                  onMouseEnter={() => setHoveredFeature(i)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  className="bg-white border-4 border-black p-8 shadow-[6px_6px_0_0_#000] hover:-translate-y-1 hover:shadow-[10px_10px_0_0_#000] transition-all cursor-default flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="p-3 border-4 border-black"
                      style={{ backgroundColor: isHovered ? f.color : "#f3f4f6" }}
                    >
                      <Icon className="w-6 h-6" style={{ color: isHovered && f.color === "#facc15" ? "#000" : isHovered ? "#facc15" : "#000" }} />
                    </div>
                    <span className="font-mono text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-black text-white">
                      {f.tag}
                    </span>
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight">{f.title}</h3>
                  <p className="font-mono text-sm text-gray-600 leading-relaxed flex-1">{f.desc}</p>
                  <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-gray-400 pt-2 border-t-2 border-gray-100">
                    Learn more <ChevronRight className="w-3 h-3" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════ */}
      <Section id="how-it-works" className="py-32 px-6 bg-black text-white z-10 relative">
        <div className="max-w-[1400px] mx-auto">
          <motion.div variants={brutalIn} className="mb-16 text-center">
            <div className="inline-flex items-center gap-2 bg-[var(--caution)] text-black border-2 border-[var(--caution)] px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest mb-4">
              <Clock className="w-3 h-3" /> 60 Seconds to Live
            </div>
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
              Four Steps.<br />
              <span className="text-[var(--caution)]">That's It.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div key={i} variants={brutalIn} className="relative">
                  {/* connector line */}
                  {i < STEPS.length - 1 && (
                    <div className="hidden xl:block absolute top-12 left-full w-6 h-1 bg-[var(--caution)] z-10" />
                  )}
                  <div className="border-4 border-[var(--caution)] p-8 h-full hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="text-5xl font-black text-[var(--caution)] leading-none">{step.step}</div>
                      <div className="p-2 border-2 border-[var(--caution)]">
                        <Icon className="w-5 h-5 text-[var(--caution)]" />
                      </div>
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight mb-3">{step.title}</h3>
                    <p className="font-mono text-sm text-gray-400 leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div variants={brutalIn} className="mt-12 text-center">
            <Link href="/auth" className="inline-flex items-center gap-3 bg-[var(--caution)] text-black border-4 border-[var(--caution)] px-10 py-4 font-black uppercase text-lg tracking-widest hover:shadow-[6px_6px_0_0_#facc15] hover:-translate-y-1 transition-all">
              Try It Now — It's Free <ArrowRight className="w-6 h-6" />
            </Link>
          </motion.div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          TEMPLATES PREVIEW
      ══════════════════════════════════════════════ */}
      <Section className="py-32 px-6 z-10 relative">
        <div className="max-w-[1400px] mx-auto">
          <motion.div variants={brutalIn} className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-black text-white border-2 border-black px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest mb-4">
                <Layers className="w-3 h-3" /> 120+ Templates
              </div>
              <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
                Don't Start<br />From Zero.
              </h2>
            </div>
            <Link href="/auth" className="shrink-0 brutal-btn text-sm">
              Browse All Templates <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {TEMPLATES_PREVIEW.map((t, i) => (
              <motion.div key={i} variants={brutalIn}>
                <Link href="/auth" className="block group">
                  <div className="bg-white border-4 border-black shadow-[6px_6px_0_0_#000] hover:-translate-y-1 hover:shadow-[10px_10px_0_0_#000] transition-all overflow-hidden">
                    {/* Color bar */}
                    <div className="h-3 w-full" style={{ backgroundColor: t.color }} />
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className="font-mono text-[9px] font-black uppercase tracking-widest px-2 py-1"
                          style={{ backgroundColor: t.color + "20", color: t.color, border: `1px solid ${t.color}` }}
                        >
                          {t.industry}
                        </span>
                        <span className="font-mono text-[9px] text-gray-400 uppercase">{t.fields} fields</span>
                      </div>
                      <h3 className="text-lg font-black uppercase tracking-tight mb-4">{t.name}</h3>
                      {/* Mock fields */}
                      <div className="space-y-2">
                        {[...Array(3)].map((_, j) => (
                          <div key={j} className="h-3 bg-gray-100 border-2 border-gray-200" style={{ width: `${85 - j * 15}%` }} />
                        ))}
                      </div>
                    </div>
                    <div className="border-t-4 border-black px-6 py-3 bg-gray-50 font-black text-xs uppercase flex items-center justify-between group-hover:bg-[var(--caution)] transition-colors">
                      Use Template <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════════ */}
      <Section className="py-32 px-6 bg-[var(--caution)] z-10 relative">
        <div className="max-w-[1400px] mx-auto">
          <motion.div variants={brutalIn} className="mb-16 text-center">
            <div className="inline-flex items-center gap-2 bg-black text-white border-2 border-black px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest mb-4">
              <Users className="w-3 h-3" /> Trusted By Teams
            </div>
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
              Real People.<br />Real Results.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} variants={brutalIn} className="bg-white border-4 border-black p-8 shadow-[6px_6px_0_0_#000] flex flex-col gap-6">
                {/* Stars */}
                <div className="flex gap-1">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-black text-black" />
                  ))}
                </div>
                <p className="font-mono text-sm leading-relaxed text-gray-700 flex-1">"{t.text}"</p>
                <div className="border-t-4 border-black pt-4">
                  <div className="font-black uppercase tracking-tight">{t.name}</div>
                  <div className="font-mono text-xs text-gray-500 uppercase tracking-widest mt-1">{t.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          PRICING TEASER
      ══════════════════════════════════════════════ */}
      <Section className="py-32 px-6 z-10 relative">
        <div className="max-w-[1400px] mx-auto">
          <motion.div variants={brutalIn} className="mb-16 text-center">
            <div className="inline-flex items-center gap-2 bg-[var(--caution)] border-2 border-black px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest mb-4">
              <TrendingUp className="w-3 h-3" /> Simple Pricing
            </div>
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
              No Surprises.<br />No Fine Print.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {PRICING.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={i}
                  variants={brutalIn}
                  className={`flex flex-col border-4 border-black p-8 ${p.highlight ? "bg-black text-white shadow-[12px_12px_0_0_var(--caution)] -translate-y-2" : "bg-white shadow-[8px_8px_0_0_#000]"}`}
                >
                  {p.highlight && (
                    <div className="bg-[var(--caution)] text-black border-b-4 border-black font-black uppercase tracking-widest text-xs p-2 text-center -mx-8 -mt-8 mb-8">
                      MOST POPULAR
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-6">
                    <Icon className={`w-6 h-6 ${p.highlight ? "text-[var(--caution)]" : ""}`} />
                    <span className="font-black uppercase tracking-widest text-sm">{p.name}</span>
                  </div>
                  <div className="mb-8">
                    <span className="text-5xl font-black font-mono">{p.price}</span>
                    <span className={`text-sm font-bold uppercase ${p.highlight ? "text-gray-400" : "text-gray-500"}`}>{p.period}</span>
                  </div>
                  <ul className="space-y-3 flex-1 mb-8">
                    {p.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-3 font-mono text-xs font-bold uppercase">
                        <CheckCircle className={`w-4 h-4 shrink-0 ${p.highlight ? "text-[var(--caution)]" : "text-green-600"}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={p.href}
                    className={`w-full border-4 font-black uppercase text-sm tracking-widest py-3 text-center flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all ${
                      p.highlight
                        ? "bg-[var(--caution)] text-black border-[var(--caution)] hover:shadow-[4px_4px_0_0_#facc15]"
                        : "bg-black text-white border-black hover:bg-[var(--caution)] hover:text-black hover:shadow-[4px_4px_0_0_#000]"
                    }`}
                  >
                    {p.cta} <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <motion.div variants={brutalIn} className="mt-10 text-center">
            <Link href="/auth" className="font-mono text-sm font-bold uppercase underline decoration-4 underline-offset-4 hover:text-[var(--caution)] transition-colors">
              See full plan comparison →
            </Link>
          </motion.div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════════ */}
      <Section className="py-24 px-6 bg-black z-10 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: "linear-gradient(#facc15 1px, transparent 1px), linear-gradient(90deg, #facc15 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="max-w-[1400px] mx-auto text-center relative z-10">
          <motion.div variants={brutalIn} className="inline-flex items-center gap-2 bg-[var(--caution)] text-black border-2 border-[var(--caution)] px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest mb-6">
            <Activity className="w-3 h-3 animate-pulse" /> System Ready
          </motion.div>
          <motion.h2 variants={brutalIn} className="text-5xl md:text-8xl font-black uppercase tracking-tighter text-white leading-none mb-8">
            Your First Form<br />
            <span className="text-[var(--caution)]">In 60 Seconds.</span>
          </motion.h2>
          <motion.p variants={brutalIn} className="font-mono text-gray-400 text-lg mb-12 max-w-xl mx-auto">
            No credit card. No setup. No fluff. Just the most powerful form builder you've ever used.
          </motion.p>
          <motion.div variants={brutalIn} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth" className="brutal-btn-primary text-xl px-12 py-5">
              Start Building Free <ArrowRight className="w-7 h-7" />
            </Link>
            <Link href="/auth" className="font-mono text-sm font-bold uppercase text-white border-4 border-white px-8 py-4 hover:bg-white hover:text-black transition-all">
              View Templates
            </Link>
          </motion.div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════ */}
      <footer className="border-t-4 border-black bg-white py-16 px-6 z-10 relative">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="font-black text-2xl tracking-tighter uppercase flex items-center gap-3 mb-4">
                <div className="bg-[var(--caution)] border-2 border-black p-1">
                  <Box className="w-5 h-5 text-black" />
                </div>
                FORMCRAFT
              </Link>
              <p className="font-mono text-xs text-gray-500 leading-relaxed uppercase tracking-wide">
                Industrial-grade form builder for modern teams.
              </p>
            </div>
            {/* Links */}
            {[
              { title: "Product", links: [{ label: "Features", href: "#features" }, { label: "Templates", href: "/auth" }, { label: "Pricing", href: "/auth" }, { label: "Dashboard", href: "/auth" }] },
              { title: "Company", links: [{ label: "About", href: "/" }, { label: "Blog", href: "/" }, { label: "Status", href: "/" }, { label: "Changelog", href: "/" }] },
              { title: "Legal", links: [{ label: "Privacy", href: "/" }, { label: "Terms", href: "/" }, { label: "Security", href: "/" }, { label: "Cookies", href: "/" }] },
            ].map((col) => (
              <div key={col.title}>
                <div className="font-black uppercase tracking-widest text-xs mb-4 border-b-4 border-black pb-2">{col.title}</div>
                <ul className="space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="font-mono text-xs text-gray-500 uppercase tracking-wide hover:text-black hover:underline decoration-2 underline-offset-4 transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {/* Bottom bar */}
          <div className="border-t-4 border-black pt-8 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs font-bold uppercase tracking-widest">
            <p>© 2026 FormCraft // All Systems Go</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-600">All systems operational</span>
            </div>
            <div className="flex gap-6">
              <Link href="/" className="hover:text-[var(--caution)] transition-colors">Twitter</Link>
              <Link href="/" className="hover:text-[var(--caution)] transition-colors">GitHub</Link>
              <Link href="/" className="hover:text-[var(--caution)] transition-colors">Discord</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
