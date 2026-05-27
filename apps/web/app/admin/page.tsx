"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Users, Globe, BarChart3, RefreshCw,
  Activity, ChevronDown, Check, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "~/trpc/client";

const TIERS = ["free", "pro", "business", "enterprise"] as const;
type Tier = typeof TIERS[number];

const TIER_COLORS: Record<Tier, string> = {
  free: "bg-gray-200 text-gray-800",
  pro: "bg-blue-100 text-blue-800 border border-blue-300",
  business: "bg-purple-100 text-purple-800 border border-purple-300",
  enterprise: "bg-[var(--caution)] text-black border border-black",
};

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "workspaces" | "users">("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: meData, isLoading: isMeLoading } = trpc.auth.me.useQuery(undefined, { retry: false });
  const { data: stats, isLoading: statsLoading } = trpc.admin.getStats.useQuery(undefined, {
    enabled: !!meData?.user?.isSuperAdmin,
  });
  const { data: workspaces, isLoading: wsLoading, refetch: refetchWs } = trpc.admin.listWorkspaces.useQuery(undefined, {
    enabled: !!meData?.user?.isSuperAdmin,
  });
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = trpc.admin.listUsers.useQuery(undefined, {
    enabled: !!meData?.user?.isSuperAdmin,
  });

  const setTierMutation = trpc.admin.setWorkspaceTier.useMutation({
    onSuccess: (data) => {
      toast.success(`Tier updated to ${data.newTier} ✓`);
      refetchWs();
    },
    onError: (err) => toast.error(err.message),
  });

  const setSuperAdminMutation = trpc.admin.setSuperAdmin.useMutation({
    onSuccess: () => {
      toast.success("User permissions updated.");
      refetchUsers();
    },
    onError: (err) => toast.error(err.message),
  });

  // Auth guard
  if (isMeLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <RefreshCw className="h-8 w-8 animate-spin text-[var(--caution)]" />
    </div>
  );

  if (!meData?.user?.isSuperAdmin) return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-mono gap-6">
      <div className="bg-red-900 border-4 border-red-500 p-8 text-center shadow-[8px_8px_0_0_#ef4444]">
        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Access Denied</h1>
        <p className="text-sm opacity-70 mb-6">Super Admin credentials required.</p>
        <Link href="/auth" className="bg-red-500 text-white font-black uppercase px-6 py-3 border-2 border-white hover:bg-white hover:text-black transition-colors">
          LOGIN AS ADMIN
        </Link>
      </div>
    </div>
  );

  const filteredWorkspaces = workspaces?.filter(ws =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ws.owner?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users?.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      {/* Header */}
      <header className="bg-black border-b-4 border-[var(--caution)] px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-[var(--caution)] border-2 border-white p-2">
            <Shield className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="font-black text-lg uppercase tracking-tighter leading-none">FORMCRAFT ADMIN</h1>
            <p className="text-[10px] font-mono text-[var(--caution)] uppercase tracking-widest">Super Admin Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-gray-400">
            Logged in as <span className="text-[var(--caution)] font-bold">{meData.user.email}</span>
          </span>
          <Link href="/dashboard" className="text-xs font-mono font-bold uppercase border-2 border-gray-600 px-3 py-1.5 hover:border-[var(--caution)] hover:text-[var(--caution)] transition-colors">
            ← DASHBOARD
          </Link>
        </div>
      </header>

      {/* Stats Bar */}
      {statsLoading ? (
        <div className="bg-gray-950 border-b border-gray-800 px-8 py-4 flex items-center justify-center">
          <RefreshCw className="w-4 h-4 animate-spin text-gray-500" />
        </div>
      ) : stats && (
        <div className="bg-gray-950 border-b border-gray-800 px-8 py-4 grid grid-cols-2 md:grid-cols-5 gap-6">
          {[
            { label: "TOTAL USERS", value: stats.totalUsers },
            { label: "WORKSPACES", value: stats.totalWorkspaces },
            { label: "FORMS", value: stats.totalForms },
            { label: "RESPONSES", value: stats.totalResponses },
            { label: "TIER SPLIT", value: Object.entries(stats.tierBreakdown).map(([t, c]) => `${t}:${c}`).join(" · ") },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{s.label}</p>
              <p className="text-lg font-black text-[var(--caution)] font-mono">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-gray-950 border-b border-gray-800 px-8 flex gap-1 pt-4">
        {[
          { id: "overview", label: "OVERVIEW", icon: BarChart3 },
          { id: "workspaces", label: "WORKSPACES", icon: Globe },
          { id: "users", label: "USERS", icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest border-b-4 transition-all ${
              activeTab === tab.id
                ? "border-[var(--caution)] text-[var(--caution)]"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">

        {/* Search */}
        {activeTab !== "overview" && (
          <div className="mb-6">
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-md bg-gray-900 border-2 border-gray-700 focus:border-[var(--caution)] px-4 py-2.5 text-sm font-mono text-white placeholder-gray-600 outline-none transition-colors"
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >

            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-gray-950 border border-gray-800 p-6">
                  <h2 className="text-sm font-black uppercase tracking-widest text-[var(--caution)] mb-4 border-b border-gray-800 pb-3">
                    TIER BREAKDOWN
                  </h2>
                  {stats && Object.entries(stats.tierBreakdown).map(([tier, count]) => (
                    <div key={tier} className="flex items-center justify-between py-2.5 border-b border-gray-900">
                      <span className={`text-xs font-black uppercase px-2.5 py-1 rounded ${TIER_COLORS[tier as Tier] || "bg-gray-700"}`}>
                        {tier}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-800 h-2">
                          <div
                            className="h-2 bg-[var(--caution)]"
                            style={{ width: `${(count / (stats?.totalWorkspaces || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-black font-mono w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-950 border border-gray-800 p-6">
                  <h2 className="text-sm font-black uppercase tracking-widest text-[var(--caution)] mb-4 border-b border-gray-800 pb-3">
                    QUICK ACTIONS
                  </h2>
                  <div className="space-y-3">
                    <button onClick={() => setActiveTab("workspaces")} className="w-full text-left px-4 py-3 bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-[var(--caution)] text-sm font-mono font-bold uppercase tracking-wider transition-colors flex items-center justify-between">
                      MANAGE WORKSPACE TIERS <Globe className="w-4 h-4" />
                    </button>
                    <button onClick={() => setActiveTab("users")} className="w-full text-left px-4 py-3 bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-[var(--caution)] text-sm font-mono font-bold uppercase tracking-wider transition-colors flex items-center justify-between">
                      MANAGE USERS <Users className="w-4 h-4" />
                    </button>
                    <div className="px-4 py-3 bg-gray-900 border border-gray-700 text-xs font-mono text-gray-500">
                      <p className="font-bold text-gray-300 mb-1">ADMIN CREDENTIALS</p>
                      <p>Email: superadmin@formcraft.com</p>
                      <p>Pass: FormCraft@Admin123</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* WORKSPACES TAB */}
            {activeTab === "workspaces" && (
              <div>
                {wsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <RefreshCw className="w-6 h-6 animate-spin text-[var(--caution)]" />
                  </div>
                ) : (
                  <div className="border border-gray-800 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-900 border-b border-gray-800">
                          <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">WORKSPACE</th>
                          <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">OWNER</th>
                          <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">CURRENT TIER</th>
                          <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">CHANGE TIER</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWorkspaces?.map((ws) => (
                          <tr key={ws.id} className="border-b border-gray-900 hover:bg-gray-950 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-bold text-white text-sm">{ws.name}</p>
                              <p className="text-[10px] font-mono text-gray-600">{ws.slug}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-mono text-xs text-gray-300">{ws.owner?.email || "—"}</p>
                              <p className="font-mono text-[10px] text-gray-600">{ws.owner?.fullName}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-black uppercase px-2.5 py-1 ${TIER_COLORS[ws.tier as Tier] || "bg-gray-700 text-white"}`}>
                                {ws.tier}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1 flex-wrap">
                                {TIERS.filter(t => t !== ws.tier).map((tier) => (
                                  <button
                                    key={tier}
                                    onClick={() => setTierMutation.mutate({ workspaceId: ws.id, tier })}
                                    disabled={setTierMutation.isPending}
                                    className={`text-[10px] font-black uppercase px-2 py-1 border transition-all hover:opacity-100 opacity-70 ${TIER_COLORS[tier]} hover:scale-105`}
                                  >
                                    → {tier}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* USERS TAB */}
            {activeTab === "users" && (
              <div>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <RefreshCw className="w-6 h-6 animate-spin text-[var(--caution)]" />
                  </div>
                ) : (
                  <div className="border border-gray-800 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-900 border-b border-gray-800">
                          <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">USER</th>
                          <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">EMAIL</th>
                          <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">ROLE</th>
                          <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers?.map((user) => (
                          <tr key={user.id} className="border-b border-gray-900 hover:bg-gray-950 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-bold text-white text-sm">{user.fullName}</p>
                              <p className="text-[10px] font-mono text-gray-600">
                                {new Date(user.createdAt!).toLocaleDateString()}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-mono text-xs text-gray-300">{user.email}</p>
                            </td>
                            <td className="px-4 py-3">
                              {user.isSuperAdmin ? (
                                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[var(--caution)] bg-black border border-[var(--caution)] px-2 py-0.5 w-fit">
                                  <Shield className="w-3 h-3" /> SUPER ADMIN
                                </span>
                              ) : (
                                <span className="text-[10px] font-black uppercase text-gray-500 bg-gray-900 px-2 py-0.5">
                                  USER
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {user.id !== meData.user?.id && (
                                <button
                                  onClick={() => setSuperAdminMutation.mutate({
                                    userId: user.id,
                                    isSuperAdmin: !user.isSuperAdmin
                                  })}
                                  disabled={setSuperAdminMutation.isPending}
                                  className={`text-[10px] font-black uppercase px-2.5 py-1 border transition-colors ${
                                    user.isSuperAdmin
                                      ? "border-red-700 text-red-400 hover:bg-red-900"
                                      : "border-[var(--caution)] text-[var(--caution)] hover:bg-[var(--caution)] hover:text-black"
                                  }`}
                                >
                                  {user.isSuperAdmin ? "REVOKE ADMIN" : "MAKE ADMIN"}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
