"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sparkles, Plus, Trash2, ExternalLink, BarChart3, Edit2, Layout,
  ArrowRight, Box
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "~/trpc/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "~/components/ui/dialog";

const brutalIn = { hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.1 } } };
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

export function FormsTab() {
  const router = useRouter();
  const [newFormTitle, setNewFormTitle] = useState("");
  const [newFormDesc, setNewFormDesc] = useState("");
  const [newFormTheme, setNewFormTheme] = useState("default");
  const [newFormLayout, setNewFormLayout] = useState("conversational");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"classic" | "ai">("classic");

  const utils = trpc.useUtils();
  const { data: forms, isLoading: isFormsLoading } = trpc.forms.list.useQuery();

  const createFormMutation = trpc.forms.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Form "${data.title}" created successfully.`);
      setIsCreateOpen(false); setNewFormTitle(""); setNewFormDesc("");
      utils.forms.list.invalidate(); router.push(`/forms/${data.id}/edit`);
    },
    onError: (err) => toast.error(err.message || "Failed to create form."),
  });

  const generateAiFormMutation = trpc.forms.generateAiForm.useMutation({
    onSuccess: (data) => {
      toast.success(`Form "${data.title}" generated via AI.`);
      setIsCreateOpen(false); setAiPrompt(""); setIsAiLoading(false);
      utils.forms.list.invalidate(); router.push(`/forms/${data.id}/edit`);
    },
    onError: (err) => { toast.error(err.message || "AI GENERATION FAILED."); setIsAiLoading(false); },
  });

  const deleteFormMutation = trpc.forms.delete.useMutation({
    onSuccess: () => { toast.success("Form deleted."); utils.forms.list.invalidate(); },
  });

  const handleCreateForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormTitle) return;
    createFormMutation.mutate({ title: newFormTitle, description: newFormDesc, theme: newFormTheme, layoutType: newFormLayout });
  };

  const handleAiGenerate = () => {
    if (!aiPrompt) return;
    setIsAiLoading(true);
    generateAiFormMutation.mutate({ prompt: aiPrompt });
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-8">
      <div className="bg-white border-4 border-black p-6 flex items-center justify-between shadow-[8px_8px_0_0_#000]">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter">YOUR FORMS</h2>
          <p className="font-mono text-xs font-bold uppercase text-gray-500 mt-2">MANAGE AND ANALYZE YOUR FORMS</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <button className="brutal-btn-primary text-sm">
              <Plus className="w-5 h-5" /> CREATE NEW FORM
            </button>
          </DialogTrigger>
          <DialogContent className="bg-white border-8 border-black rounded-none shadow-[16px_16px_0_0_var(--caution)] p-0 max-w-3xl text-black font-sans">
            <div className="p-8">
              <DialogHeader className="mb-8 border-b-4 border-black pb-4">
                <DialogTitle className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                  <Box className="w-8 h-8 text-[var(--caution)] fill-black" />
                  FORM SETUP
                </DialogTitle>
                <DialogDescription className="font-mono text-xs uppercase font-bold text-gray-500">CHOOSE HOW TO BUILD YOUR FORM</DialogDescription>
              </DialogHeader>

              <div className="flex gap-4 mb-8">
                <button onClick={() => setCreateMode("classic")} className={`flex-1 p-4 border-4 uppercase font-black tracking-widest text-sm transition-all ${createMode === "classic" ? "bg-black text-white border-black" : "bg-gray-100 text-gray-400 border-transparent hover:border-black hover:text-black"}`}>START FROM SCRATCH</button>
                <button onClick={() => setCreateMode("ai")} className={`flex-1 p-4 border-4 uppercase font-black tracking-widest text-sm transition-all ${createMode === "ai" ? "bg-[var(--caution)] text-black border-black shadow-[4px_4px_0_0_#000]" : "bg-gray-100 text-gray-400 border-transparent hover:border-black hover:text-black"}`}>GENERATE WITH AI</button>
              </div>

              {createMode === "classic" ? (
                <form onSubmit={handleCreateForm} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest">FORM TITLE</label>
                    <input required type="text" value={newFormTitle} onChange={e => setNewFormTitle(e.target.value)} className="brutal-input" placeholder="e.g. USER_ONBOARDING_V2" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest">FORM DESCRIPTION</label>
                    <input type="text" value={newFormDesc} onChange={e => setNewFormDesc(e.target.value)} className="brutal-input" placeholder="What is this form for?..." />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest">FORM LAYOUT</label>
                      <select value={newFormLayout} onChange={e => setNewFormLayout(e.target.value)} className="brutal-input cursor-pointer appearance-none">
                        <option value="conversational">SEQUENTIAL (STEP-BY-STEP)</option>
                        <option value="classic">VERTICAL (SINGLE PAGE)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest">FORM THEME</label>
                      <select value={newFormTheme} onChange={e => setNewFormTheme(e.target.value)} className="brutal-input cursor-pointer appearance-none">
                        <option value="default">DEFAULT</option>
                        <option value="cyberpunk">CYBER_NEON</option>
                        <option value="retro">RETRO_TERMINAL</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={createFormMutation.isPending} className="w-full brutal-btn mt-8 text-lg">
                    {createFormMutation.isPending ? "CREATING..." : "CREATE FORM"} <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="bg-black text-white p-4 font-mono text-sm border-l-4 border-[var(--caution)] mb-6">
                    Provide prompt parameters. AI core will compile the required structural nodes.
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-4 h-4 text-[var(--caution)]"/> WHAT SHOULD THIS FORM BE ABOUT?</label>
                    <textarea rows={4} value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} className="brutal-input resize-none" placeholder="e.g. Build an employee satisfaction survey..."></textarea>
                  </div>
                  <button onClick={handleAiGenerate} disabled={isAiLoading || !aiPrompt} className="w-full brutal-btn-primary mt-8 text-lg">
                    {isAiLoading ? "GENERATING..." : "GENERATE FORM"} {!isAiLoading && <ArrowRight className="w-5 h-5" />}
                  </button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isFormsLoading ? (
        <div className="font-mono font-bold uppercase animate-pulse">LOADING FORMS...</div>
      ) : !forms?.items || forms.items.length === 0 ? (
        <div className="bg-white border-4 border-black border-dashed p-12 text-center text-gray-500 font-mono font-bold uppercase">YOU HAVEN'T CREATED ANY FORMS YET.</div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {forms.items.map(form => (
            <motion.div variants={brutalIn} key={form.id} className="bg-white border-4 border-black p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[8px_8px_0_0_#000] hover:-translate-y-1 hover:shadow-[12px_12px_0_0_var(--caution)] transition-all">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 font-mono text-xs font-bold uppercase text-gray-500">
                  <span className={`w-3 h-3 border-2 border-black ${form.status === 'published' ? 'bg-[var(--caution)]' : 'bg-gray-300'}`}></span>
                  ID: {form.id.substring(0,8)} // {new Date(form.createdAt).toLocaleDateString()}
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">{form.title}</h3>
                <p className="font-mono text-sm mt-2 opacity-80">{form.description || "NO_DESC_PROVIDED"}</p>
              </div>

              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-8">
                <div className="flex gap-4 border-4 border-gray-200 p-2">
                  <div className="text-center px-4 border-r-2 border-gray-200">
                    <span className="block text-2xl font-black">{form.viewsCount}</span>
                    <span className="text-[10px] font-mono font-bold uppercase">VIEWS</span>
                  </div>
                  <div className="text-center px-4">
                    <span className="block text-2xl font-black">{form.startsCount}</span>
                    <span className="text-[10px] font-mono font-bold uppercase">STARTS</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/forms/${form.id}/edit`} className="bg-black text-white p-3 border-2 border-black hover:bg-[var(--caution)] hover:text-black transition-colors"><Edit2 className="w-5 h-5" /></Link>
                  <Link href={`/forms/${form.id}/analytics`} className="bg-gray-200 text-black p-3 border-2 border-black hover:bg-black hover:text-white transition-colors"><BarChart3 className="w-5 h-5" /></Link>
                  <button onClick={() => { if(confirm("CONFIRM DELETION?")) deleteFormMutation.mutate({ id: form.id }); }} className="bg-red-100 text-red-600 p-3 border-2 border-black hover:bg-red-600 hover:text-white transition-colors"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
