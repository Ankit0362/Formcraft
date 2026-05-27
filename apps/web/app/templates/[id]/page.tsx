"use client";

import { use } from "react";
import { trpc } from "../../../trpc/client";
import { ArrowLeft, Download, CheckCircle2, ShoppingCart, Loader2, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function TemplateDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  const { data, isLoading } = trpc.marketplace.getTemplate.useQuery({
    id: resolvedParams.id,
  });

  const applyMutation = trpc.marketplace.applyTemplate.useMutation({
    onSuccess: (res) => {
      router.push(`/forms/${res.formId}/edit`);
    },
  });

  const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
  const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

  if (isLoading || !data) {
    return (
      <div className="flex h-screen bg-background text-foreground items-center justify-center font-sans">
        <Loader2 className="h-4 w-4 animate-spin opacity-50" />
      </div>
    );
  }

  const { template, fields } = data;
  const isPremium = template.price > 0;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-foreground selection:text-background flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between z-40 relative">
        <div className="flex items-center gap-8">
          <Link href="/templates" className="hover:opacity-50 transition"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="text-[10px] uppercase tracking-widest font-bold opacity-50">Architectural Detail</div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-8 w-full pb-32">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="mt-16 space-y-32">
          
          <div className="flex flex-col md:flex-row gap-16">
            
            {/* Visual Header */}
            <motion.div variants={fadeIn} className="flex-1 space-y-8">
              <div className="flex items-center gap-4 border-b border-foreground/10 pb-4">
                <span className="text-[9px] uppercase tracking-widest font-bold border border-current px-2 py-0.5 rounded-full">
                  {template.industry}
                </span>
                {template.isCurated && (
                  <span className="flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold opacity-50">
                    <Star className="w-3 h-3" /> Official
                  </span>
                )}
              </div>
              <h1 className="text-6xl md:text-8xl font-serif italic leading-none">{template.title}</h1>
              <p className="text-xl font-light opacity-60 leading-relaxed max-w-2xl">{template.description}</p>
              
              <div className="flex gap-16 pt-8 border-t border-foreground/10 text-xs uppercase tracking-widest font-bold opacity-50">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" /> {template.downloadsCount} Uses
                </div>
                <div>
                  {fields.length} Configured Fields
                </div>
              </div>
            </motion.div>

            {/* Action Box */}
            <motion.div variants={fadeIn} className="w-full md:w-80 shrink-0">
              <div className="p-8 border border-foreground/10 flex flex-col items-center text-center">
                <div className="text-[10px] uppercase tracking-widest font-bold opacity-50 mb-8">Acquisition</div>
                <div className="text-6xl font-serif italic mb-8">
                  {isPremium ? `$${(template.price / 100).toFixed(2)}` : "Free"}
                </div>
                <button 
                  onClick={() => applyMutation.mutate({ templateId: template.id })}
                  disabled={applyMutation.isPending}
                  className="w-full py-4 text-xs uppercase tracking-widest font-bold border-b border-foreground flex items-center justify-center gap-4 group hover:opacity-50 transition-opacity"
                >
                  {applyMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing</>
                  ) : isPremium ? (
                    <><ShoppingCart className="w-4 h-4" /> Initiate Transfer</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Clone Architecture</>
                  )}
                </button>
                <p className="text-[10px] opacity-30 mt-8 font-light">
                  Direct structural clone into the active environment.
                </p>
              </div>
            </motion.div>

          </div>

          {/* Fields Preview */}
          <motion.div variants={fadeIn} className="max-w-4xl space-y-8">
            <h3 className="text-3xl font-serif italic border-b border-foreground/10 pb-4">Structural Components</h3>
            <div className="grid md:grid-cols-2 gap-x-12 gap-y-4">
              {fields.map((f, i) => (
                <div key={f.id} className="flex items-center gap-8 py-4 border-b border-foreground/5">
                  <div className="text-xs font-mono opacity-30 w-4">{(i + 1).toString().padStart(2, '0')}</div>
                  <div className="flex-1">
                    <div className="font-serif text-lg">{f.label}</div>
                  </div>
                  <div className="text-[9px] uppercase tracking-widest font-bold opacity-30 border border-foreground/10 px-2 py-0.5">
                    {f.type.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </motion.div>
      </main>
    </div>
  );
}
