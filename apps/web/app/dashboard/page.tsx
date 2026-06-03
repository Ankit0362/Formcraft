"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, FileText, Terminal, Mail, Clock, Layout, Activity, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "~/trpc/client";

import { FormsTab } from "../../components/dashboard/forms-tab";
import { DevelopersTab } from "../../components/dashboard/developers-tab";
import { EmailsTab } from "../../components/dashboard/emails-tab";
import { AuditTab } from "../../components/dashboard/audit-tab";
import { TemplatesTab } from "../../components/dashboard/templates-tab";

const TABS = [
  { id: "forms", label: "FORMS", icon: FileText },
  { id: "templates", label: "TEMPLATES", icon: Layout },
  { id: "developers", label: "DEVELOPER API", icon: Terminal },
  { id: "emails", label: "EMAILS", icon: Mail },
  { id: "audit", label: "AUDIT LOG", icon: Clock },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("forms");

  const utils = trpc.useUtils();
  const { data: meData, isLoading: isMeLoading } = trpc.auth.me.useQuery(undefined, { retry: false });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      // Clear the fc_session cookie on the Next.js domain
      await fetch("/api/auth/signout", { method: "POST" });
      toast.success("Logged out successfully.");
      window.location.href = "/auth";
    },
    onError: async () => {
      // Even if the API call fails, clear the cookie on the Next.js domain
      await fetch("/api/auth/signout", { method: "POST" });
      window.location.href = "/auth";
    },
  });

  // If auth.me resolves to null (no session on Express API), redirect cleanly.
  // Middleware handles blocking unauthenticated Next.js navigation,
  // but auth.me failure means the Express session is gone — redirect to login.
  useEffect(() => {
    if (!isMeLoading && !meData?.user) {
      window.location.href = "/auth";
    }
  }, [isMeLoading, meData]);

  if (isMeLoading || !meData?.user) return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-mono font-bold text-2xl uppercase">
      <RefreshCw className="h-8 w-8 animate-spin mr-4 text-[var(--caution)]" />
      Loading Dashboard...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#e2e8f0] text-black font-sans flex flex-col selection:bg-[var(--caution)] selection:text-black pb-16">
      
      {/* Header */}
      <header className="bg-black text-white border-b-8 border-[var(--caution)] px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-black text-xl tracking-tighter uppercase flex items-center gap-3">
            <div className="bg-[var(--caution)] border-2 border-white p-1">
              <Activity className="w-5 h-5 text-black" />
            </div>
            DASHBOARD
          </Link>
          <div className="hidden md:flex items-center gap-4 bg-gray-900 px-4 py-2 border-2 border-gray-700">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--caution)]">USER:</span>
            <span className="text-xs font-mono font-bold">{meData.user.fullName.toUpperCase()}</span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--caution)] ml-4">WORKSPACE:</span>
            <span className="text-xs font-mono font-bold">{meData.activeWorkspace?.name.toUpperCase()}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/pricing" className="bg-gray-800 border-2 border-gray-600 px-3 py-1 text-xs font-mono font-bold uppercase hover:bg-white hover:text-black transition-colors">
            TIER: {meData.activeWorkspace?.tier}
          </Link>
          <Link href="/settings" className="bg-gray-800 border-2 border-gray-600 px-3 py-1 text-xs font-mono font-bold uppercase hover:bg-white hover:text-black transition-colors">
            SETTINGS
          </Link>
          {meData.user.isSuperAdmin && (
            <Link href="/admin" className="bg-[var(--caution)] text-black border-2 border-black px-3 py-1 text-xs font-mono font-bold uppercase hover:bg-white transition-colors flex items-center gap-1.5">
              🛡 ADMIN
            </Link>
          )}
          <button onClick={() => logoutMutation.mutate()} className="bg-red-600 text-white font-black uppercase tracking-widest px-4 py-2 border-2 border-transparent hover:border-white transition-all text-xs flex items-center gap-2">
            <LogOut className="w-4 h-4" /> LOG OUT
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row mt-8 px-8 max-w-[1600px] mx-auto w-full gap-8">
        
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex md:flex-col gap-4 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-4 px-6 py-4 border-4 text-sm uppercase tracking-widest font-black transition-all ${
                    active
                      ? "bg-black text-white border-black shadow-[4px_4px_0_0_var(--caution)]"
                      : "bg-white text-gray-500 border-transparent hover:border-black hover:text-black hover:shadow-[4px_4px_0_0_#000]"
                  }`}
                >
                  <tab.icon className={`w-5 h-5 ${active ? "text-[var(--caution)]" : ""}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Tab Content */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.1 }}
              className="w-full"
            >
              {activeTab === "forms" && <FormsTab />}
              {activeTab === "templates" && <TemplatesTab />}
              {activeTab === "developers" && <DevelopersTab />}
              {activeTab === "emails" && <EmailsTab />}
              {activeTab === "audit" && <AuditTab />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
