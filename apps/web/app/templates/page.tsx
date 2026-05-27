"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, Star, LayoutTemplate, ArrowRight, Clock, Layers,
  Zap, CheckCircle, Heart, ShoppingBag, BookOpen, Building2,
  Briefcase, Home, Code2, Utensils, Plane, Dumbbell, Scale,
  Stethoscope, TrendingUp, Users, Globe, Wrench, Lock
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { trpc } from "~/trpc/client";
import { useRouter } from "next/navigation";
import { getTheme } from "~/lib/themes";

// ─────────────────────────────────────────────────────────────
//  THEME MINI PREVIEW CARD
// ─────────────────────────────────────────────────────────────
function ThemePreviewCard({ theme }: { theme: string }) {
  const currentTheme = getTheme(theme);
  if (!currentTheme) return null;

  return (
    <div className={`h-40 w-full p-6 flex items-center justify-center overflow-hidden relative ${currentTheme.page}`}>
      <div 
        className={`w-[90%] max-w-[280px] flex flex-col ${currentTheme.card} ${currentTheme.cardPadding} transform scale-[0.6] origin-center z-10 hover:scale-[0.65] transition-transform`} 
      >
        <div className={currentTheme.titleLayout}>
          <div className={`${currentTheme.title} text-xl mb-1`}>Sample Form</div>
          <div className={`${currentTheme.muted} text-xs`}>Premium design preview</div>
        </div>
        
        <div className={currentTheme.fieldGap + " mt-6"}>
          <div>
            <div className={`${currentTheme.label} mb-2`}>Your Name</div>
            <div className={`${currentTheme.input} w-full h-10`}></div>
          </div>
          <div className={`${currentTheme.button} w-full h-10 flex items-center justify-center text-sm shadow-md mt-4`}>
            SUBMIT
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function TemplatesGallery() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedIndustry, setSelectedIndustry] = useState("All");
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Pre-select industry from ?industry= query param (set by dashboard template cards)
  useEffect(() => {
    const industryParam = searchParams.get("industry");
    if (industryParam) {
      setSelectedIndustry(industryParam);
    }
  }, [searchParams]);

  // Get current user's workspace tier
  const { data: meData } = trpc.auth.me.useQuery(undefined, { retry: false });
  const workspaceTier = (meData?.activeWorkspace?.tier ?? "free") as "free" | "pro" | "business" | "enterprise";
  const isPaidTier = ["pro", "business", "enterprise"].includes(workspaceTier);

  const { data: dbTemplates, isLoading: isFetchingTemplates } = trpc.marketplace.listTemplates.useQuery({
    workspaceTier,
  });

  const TEMPLATES = useMemo(() => {
    if (!dbTemplates) return [];
    return dbTemplates.map((t) => ({
      ...t,
      icon: LayoutTemplate,
      estimatedTime: "3 min",
      fields: 10,
      accentColor: "#facc15",
      accentLight: "#fef08a",
    }));
  }, [dbTemplates]);

  const ALL_INDUSTRIES = ["All", ...Array.from(new Set(TEMPLATES.map((t) => t.industry)))];

  const applyTemplate = trpc.marketplace.applyTemplate.useMutation({
    onSuccess: (data) => {
      toast.success(`Template applied! Opening editor...`);
      router.push(`/forms/${data.formId}/edit`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create form from template.");
      setLoadingId(null);
    },
  });

  const filteredTemplates = useMemo(() => {
    let result = TEMPLATES;
    if (selectedIndustry !== "All") {
      result = result.filter((t) => t.industry === selectedIndustry);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          t.industry.toLowerCase().includes(q)
      );
    }
    return result;
  }, [selectedIndustry, search, TEMPLATES]);

  const displayTemplates = !isPaidTier ? filteredTemplates.filter(t => !t.locked) : filteredTemplates;
  const hiddenPremiumCount = !isPaidTier ? filteredTemplates.length - displayTemplates.length : 0;

  const handleUseTemplate = (template: any) => {
    if (template.locked) {
      toast.error(`Free plan: only 5 templates per category. Upgrade to Pro to unlock all templates.`, {
        duration: 5000,
        action: { label: "Upgrade →", onClick: () => router.push("/pricing") },
      });
      return;
    }
    setLoadingId(template.id);
    applyTemplate.mutate({ templateId: template.id });
  };

  const popularCount = TEMPLATES.filter((t) => t.downloadsCount > 100).length;
  const lockedCount = TEMPLATES.filter((t) => t.locked).length;

  return (
    <div className="min-h-screen bg-[#EFEFEF] text-black font-sans selection:bg-yellow-400 selection:text-black flex flex-col pb-20">

      {/* ── HEADER ── */}
      <header className="bg-black text-white border-b-4 border-yellow-400 px-6 md:px-10 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link href="/dashboard" className="font-black text-lg tracking-tighter uppercase flex items-center gap-2">
          <div className="bg-yellow-400 border-2 border-yellow-400 p-1">
            <LayoutTemplate className="w-4 h-4 text-black" />
          </div>
          Template Gallery
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden md:block text-[10px] font-mono font-bold text-gray-400 uppercase">{TEMPLATES.length} templates</span>
          <Link
            href="/dashboard"
            className="bg-yellow-400 text-black border-2 border-yellow-400 px-4 py-1.5 text-xs font-black uppercase tracking-widest hover:bg-yellow-300 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] mx-auto px-6 md:px-10 w-full mt-10 space-y-8">

        {/* ── HERO ── */}
        <div className="bg-black text-white p-8 md:p-12 relative overflow-hidden border-4 border-black shadow-[8px_8px_0_0_#facc15]">
          {/* Yellow accent corner */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-400 opacity-10 rounded-full translate-x-16 -translate-y-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-400 opacity-10 rounded-full -translate-x-8 translate-y-8" />

          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 bg-yellow-400 text-black px-3 py-1 text-[10px] font-black uppercase tracking-widest mb-5">
              <Zap className="w-3 h-3" /> {TEMPLATES.length} Ready-to-Use Templates
            </span>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-4">
              Pick a Template.<br />
              <span className="text-yellow-400">Own It.</span>
            </h1>
            <p className="text-sm font-medium text-gray-300 max-w-lg mb-8 leading-relaxed">
              Industry-ready forms with professional design built-in. Click any template to instantly open it in the form editor — fully customizable.
            </p>

            {/* Search */}
            <div className="flex items-center gap-0 max-w-xl border-4 border-white">
              <div className="bg-white text-black p-3 shrink-0">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/10 text-white placeholder:text-gray-400 px-4 py-3 text-sm font-medium focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ── FREE TIER BANNER ── */}
        {!isPaidTier && lockedCount > 0 && (
          <div className="bg-black text-white border-4 border-yellow-400 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[4px_4px_0_0_#facc15]">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-yellow-400 shrink-0" />
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-yellow-400">Free Plan — Template Limit Active</p>
                <p className="text-[11px] font-mono text-gray-300 mt-0.5">
                  You can access <strong className="text-white">5 templates per category</strong>. {lockedCount} templates are locked.
                </p>
              </div>
            </div>
            <Link href="/pricing" className="shrink-0 bg-yellow-400 text-black border-2 border-yellow-400 px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-yellow-300 transition-colors whitespace-nowrap">
              Upgrade to Pro →
            </Link>
          </div>
        )}

        {/* ── STATS BAR ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Templates", value: TEMPLATES.length },
            { label: "Industries", value: ALL_INDUSTRIES.length - 1 },
            { label: "Popular", value: popularCount },
            { label: "Showing", value: displayTemplates.length },
          ].map((s) => (
            <div key={s.label} className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_#000]">
              <div className="text-3xl font-black">{s.value}</div>
              <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── FILTER + GRID ── */}
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar */}
          <aside className="w-full lg:w-56 shrink-0 space-y-1">
            <div className="bg-black text-yellow-400 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest mb-2 border-4 border-black">
              Filter by Industry
            </div>
            <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible no-scrollbar">
              {ALL_INDUSTRIES.map((ind) => {
                const count = ind === "All" ? TEMPLATES.length : TEMPLATES.filter((t) => t.industry === ind).length;
                return (
                  <button
                    key={ind}
                    onClick={() => setSelectedIndustry(ind)}
                    className={`px-3 py-2.5 text-xs font-black uppercase tracking-wide border-4 transition-all text-left whitespace-nowrap flex items-center justify-between gap-3 min-w-max lg:min-w-0 ${
                      selectedIndustry === ind
                        ? "bg-yellow-400 border-black text-black shadow-[3px_3px_0_0_#000]"
                        : "bg-white border-transparent text-gray-500 hover:border-black hover:text-black"
                    }`}
                  >
                    <span className="truncate">{ind}</span>
                    <span className="text-[9px] font-mono bg-black/10 px-1.5 py-0.5 shrink-0">{count}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Template Grid */}
          <div className="flex-1">
            {isFetchingTemplates ? (
              <div className="bg-white border-4 border-dashed border-black p-20 text-center">
                <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h3 className="text-xl font-black uppercase text-gray-500 mb-3">Loading Templates...</h3>
              </div>
            ) : displayTemplates.length === 0 && hiddenPremiumCount === 0 ? (
              <div className="bg-white border-4 border-dashed border-black p-20 text-center">
                <h3 className="text-3xl font-black uppercase text-gray-300 mb-3">No Templates Found</h3>
                <p className="text-sm text-gray-400">Try a different search or industry filter.</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <motion.div
                  layout
                  className="grid md:grid-cols-2 xl:grid-cols-3 gap-5"
                >
                  {displayTemplates.map((template) => {
                    const IconComp = template.icon;
                    const isLoading = loadingId === template.id;

                    return (
                      <motion.div
                        key={template.id}
                        layout
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="bg-white border-4 border-black shadow-[6px_6px_0_0_#000] hover:-translate-y-1 hover:shadow-[10px_10px_0_0_#000] transition-all flex flex-col group overflow-hidden"
                      >
                        {/* Live Theme Preview */}
                        <div className="relative">
                          <ThemePreviewCard theme={template.theme || "default"} />

                          {/* Industry badge overlay */}
                          <div
                            className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border border-black"
                            style={{ backgroundColor: template.accentColor, color: "#fff" }}
                          >
                            {template.industry}
                          </div>
                          {template.downloadsCount > 100 && (
                            <div className="absolute top-2 right-2 bg-yellow-400 border border-black text-black text-[9px] font-black uppercase px-1.5 py-0.5 flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-black" /> Hot
                            </div>
                          )}
                          {template.price > 0 && (
                            <div className="absolute bottom-2 right-2 bg-black text-white text-[10px] font-black uppercase px-2 py-1 shadow-[2px_2px_0_0_#facc15]">
                              Premium ${template.price / 100}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="px-5 pt-4 pb-3 flex-1 flex flex-col">
                          <div className="flex items-start gap-2.5 mb-2">
                            <div
                              className="p-1.5 border-2 border-black shrink-0 mt-0.5"
                              style={{ backgroundColor: template.accentLight }}
                            >
                              <IconComp className="w-3.5 h-3.5" style={{ color: template.accentColor }} />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-tight leading-tight">{template.title}</h3>
                          </div>
                          <p className="text-[11px] font-mono text-gray-500 leading-relaxed flex-1 mb-4 line-clamp-3">
                            {template.description}
                          </p>

                          {/* Meta */}
                          <div className="flex items-center gap-3 text-[9px] font-mono font-bold uppercase text-gray-400 border-t-2 border-gray-100 pt-3 mb-4">
                            <span className="flex items-center gap-1"><Layers className="w-2.5 h-2.5" /> {template.fields} fields</span>
                            <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {template.estimatedTime}</span>
                            <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5 text-yellow-500" /> {template.downloadsCount} Uses</span>
                          </div>

                          {/* CTA */}
                          <button
                            onClick={() => handleUseTemplate(template)}
                            disabled={!!loadingId}
                            className={`w-full border-4 border-black py-2.5 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                              isLoading
                                ? "bg-yellow-400 text-black cursor-wait"
                                : "bg-black text-white hover:bg-yellow-400 hover:text-black shadow-[3px_3px_0_0_#facc15] hover:shadow-[5px_5px_0_0_#000]"
                            }`}
                          >
                            {isLoading ? (
                              <><div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" /> Creating...</>
                            ) : (
                              <><CheckCircle className="w-3.5 h-3.5" /> Use This Template <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" /></>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                  
                  {/* BUY PREMIUM TO USE BOX */}
                  {hiddenPremiumCount > 0 && (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-black text-white border-4 border-yellow-400 p-8 flex flex-col items-center justify-center text-center shadow-[6px_6px_0_0_#facc15] hover:-translate-y-1 hover:shadow-[10px_10px_0_0_#facc15] transition-all min-h-[300px]"
                    >
                      <Lock className="w-12 h-12 text-yellow-400 mb-4" />
                      <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">
                        Unlock {hiddenPremiumCount} Premium Templates
                      </h3>
                      <p className="text-xs font-mono text-gray-400 mb-8 max-w-xs">
                        Upgrade to a paid plan to access our full library of beautifully designed, industry-grade forms.
                      </p>
                      <Link href="/pricing" className="bg-yellow-400 text-black border-4 border-yellow-400 px-6 py-3 text-sm font-black uppercase tracking-widest hover:bg-yellow-300 transition-colors w-full sm:w-auto">
                        Buy Premium to Use
                      </Link>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
