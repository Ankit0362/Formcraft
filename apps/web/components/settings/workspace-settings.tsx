"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "~/trpc/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const workspaceSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters."),
  customDomain: z.string().optional(),
  removeBranding: z.boolean(),
});

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

interface WorkspaceSettingsProps {
  workspace: {
    id: string;
    name: string;
    slug: string;
    customDomain: string | null;
    removeBranding: boolean;
    tier: string;
  };
}

const brutalIn = { hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.1 } } };

export function WorkspaceSettings({ workspace }: WorkspaceSettingsProps) {
  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: workspace.name,
      customDomain: workspace.customDomain || "",
      removeBranding: workspace.removeBranding,
    },
  });

  useEffect(() => {
    form.reset({
      name: workspace.name,
      customDomain: workspace.customDomain || "",
      removeBranding: workspace.removeBranding,
    });
  }, [workspace, form]);

  const updateMutation = trpc.workspaces.update.useMutation({
    onSuccess: () => {
      toast.success("Settings saved.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save settings.");
    },
  });

  const onSubmit = (data: WorkspaceFormValues) => {
    updateMutation.mutate({ 
      name: data.name, 
      customDomain: data.customDomain || null, 
      removeBranding: data.removeBranding 
    });
  };

  return (
    <>
      {/* Header Info */}
      <motion.div variants={brutalIn} className="bg-white border-4 border-black p-8 shadow-[8px_8px_0_0_#000]">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-[10px] uppercase tracking-widest font-bold bg-black text-[var(--caution)] px-3 py-1">
            PLAN: {workspace.tier}
          </span>
          <span className="text-sm font-mono font-bold text-gray-500">ID: {workspace.slug}</span>
        </div>
        <h1 className="text-5xl font-black uppercase tracking-tighter">{workspace.name}</h1>
      </motion.div>

      {/* Settings Form */}
      <motion.div variants={brutalIn} className="bg-white border-4 border-black p-8 shadow-[8px_8px_0_0_#000]">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <h2 className="text-3xl font-black uppercase tracking-tighter border-b-4 border-black pb-4 mb-8">WORKSPACE SETTINGS</h2>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-black flex items-center gap-2">
                <div className="w-2 h-2 bg-black"></div> WORKSPACE NAME
              </label>
              <input
                type="text"
                {...form.register("name")}
                className={`brutal-input text-lg font-mono ${form.formState.errors.name ? 'border-red-500 bg-red-50' : ''}`}
              />
              {form.formState.errors.name && (
                <p className="text-xs font-bold text-red-500 mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest font-black flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400"></div> WORKSPACE ID
              </label>
              <input
                type="text" value={workspace.slug} disabled
                className="brutal-input bg-gray-200 text-gray-500 cursor-not-allowed font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs uppercase tracking-widest font-black">
                <span className="flex items-center gap-2"><div className="w-2 h-2 bg-black"></div> CUSTOM DOMAIN</span>
                <span className="bg-[var(--caution)] border border-black px-2 py-0.5 text-[10px]">PRO PLAN REQUIRED</span>
              </label>
              <input
                type="text" placeholder="forms.organization.com"
                {...form.register("customDomain")}
                className="brutal-input text-lg font-mono placeholder:opacity-50"
              />
              <div className="bg-black text-[var(--caution)] p-3 font-mono text-xs border-l-4 border-[var(--caution)]">
                Point your CNAME record to cname.formcraft.com
              </div>
            </div>
          </div>

          <div className="border-t-4 border-black pt-8 mt-8">
            <h3 className="text-xl font-black uppercase mb-6">BRANDING</h3>
            <label className="flex items-start gap-4 cursor-pointer bg-gray-100 border-2 border-black p-4 hover:bg-[var(--caution)] transition-colors">
              <div className="mt-1 relative flex items-center justify-center w-6 h-6 border-2 border-black bg-white">
                <input type="checkbox" {...form.register("removeBranding")} className="opacity-0 absolute inset-0 cursor-pointer" />
                {form.watch("removeBranding") && <div className="w-4 h-4 bg-black" />}
              </div>
              <div>
                <p className="text-sm uppercase tracking-widest font-black mb-1">REMOVE BRANDING</p>
                <p className="text-xs font-mono font-bold opacity-70">HIDES 'POWERED BY FORMCRAFT' ON YOUR FORMS.</p>
              </div>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t-4 border-black gap-4 mt-8">
            <div className="text-xs uppercase tracking-widest font-bold flex items-center gap-2 bg-black text-white px-3 py-1">
              <ShieldCheck className="w-4 h-4 text-[var(--caution)]" /> SAVE YOUR CHANGES
            </div>
            <button type="submit" disabled={updateMutation.isPending} className="brutal-btn w-full sm:w-auto">
              <Save className="w-5 h-5 mr-2" />
              {updateMutation.isPending ? "SAVING..." : "SAVE SETTINGS"}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
