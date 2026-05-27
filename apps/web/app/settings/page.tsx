"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "~/trpc/client";

export default function SettingsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: meData, isLoading } = trpc.auth.me.useQuery(undefined, { retry: false });

  const [workspaceName, setWorkspaceName] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [removeBranding, setRemoveBranding] = useState(false);

  React.useEffect(() => {
    if (meData?.activeWorkspace) {
      setWorkspaceName(meData.activeWorkspace.name);
      setCustomDomain(meData.activeWorkspace.customDomain || "");
      setRemoveBranding(meData.activeWorkspace.removeBranding || false);
    }
  }, [meData]);

  const updateWorkspaceMutation = trpc.workspaces.update.useMutation({
    onSuccess: () => {
      toast.success("Settings saved successfully.");
      utils.auth.me.invalidate();
    },
    onError: (err) => {
      toast.error("Failed to save: " + err.message);
    },
  });

  const handleSave = () => {
    updateWorkspaceMutation.mutate({
      name: workspaceName,
      customDomain: customDomain || null,
      removeBranding,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-mono font-bold text-2xl uppercase">
        <RefreshCw className="h-8 w-8 animate-spin mr-4 text-[var(--caution)]" />
        Loading...
      </div>
    );
  }

  if (!meData?.user) {
    router.push("/auth");
    return null;
  }

  const ws = meData.activeWorkspace;
  const tier = ws?.tier ?? "free";
  const canCustomDomain = ["business", "enterprise"].includes(tier);
  const canRemoveBranding = ["pro", "business", "enterprise"].includes(tier);

  return (
    <div className="min-h-screen bg-[#e2e8f0] text-black font-sans flex flex-col selection:bg-[var(--caution)] selection:text-black">
      {/* Header */}
      <header className="bg-black text-white border-b-8 border-[var(--caution)] px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-black text-xl tracking-tighter uppercase flex items-center gap-3">
            <div className="bg-[var(--caution)] border-2 border-white p-1">
              <Activity className="w-5 h-5 text-black" />
            </div>
            FORMCRAFT
          </Link>
        </div>
        <Link href="/dashboard" className="flex items-center gap-2 text-xs font-mono font-bold uppercase hover:text-[var(--caution)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          BACK TO DASHBOARD
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto px-8 py-16 w-full">
        <div className="mb-12 bg-white border-4 border-black p-8 shadow-[8px_8px_0_0_#000]">
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">WORKSPACE SETTINGS</h1>
          <p className="font-mono text-sm font-bold opacity-60">
            Manage your workspace: <span className="text-black opacity-100">{ws?.name}</span> &nbsp;·&nbsp;
            Tier: <span className="uppercase text-[var(--caution)] bg-black px-2 py-0.5">{tier}</span>
          </p>
        </div>

        <div className="space-y-8">
          {/* Workspace Name */}
          <div className="bg-white border-4 border-black p-8 shadow-[4px_4px_0_0_#000]">
            <label className="block text-xs font-black uppercase tracking-widest mb-3 border-l-4 border-[var(--caution)] pl-3">
              WORKSPACE NAME
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full border-4 border-black px-4 py-3 font-mono font-bold text-sm bg-gray-50 focus:outline-none focus:bg-[var(--caution)] focus:bg-opacity-10 transition-colors"
              placeholder="My Workspace"
            />
          </div>

          {/* Custom Domain */}
          <div className={`bg-white border-4 border-black p-8 shadow-[4px_4px_0_0_#000] ${!canCustomDomain ? "opacity-60" : ""}`}>
            <label className="block text-xs font-black uppercase tracking-widest mb-1 border-l-4 border-[var(--caution)] pl-3">
              CUSTOM DOMAIN
            </label>
            {!canCustomDomain && (
              <p className="font-mono text-xs font-bold text-gray-500 mb-3">
                ⚠ Requires Business or Enterprise plan.{" "}
                <Link href="/pricing" className="underline text-black">Upgrade →</Link>
              </p>
            )}
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              disabled={!canCustomDomain}
              className="w-full border-4 border-black px-4 py-3 font-mono font-bold text-sm bg-gray-50 focus:outline-none focus:bg-[var(--caution)] focus:bg-opacity-10 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="forms.yourcompany.com"
            />
          </div>

          {/* Remove Branding */}
          <div className={`bg-white border-4 border-black p-8 shadow-[4px_4px_0_0_#000] ${!canRemoveBranding ? "opacity-60" : ""}`}>
            <label className="flex items-start gap-4 cursor-pointer">
              <input
                type="checkbox"
                checked={removeBranding}
                onChange={(e) => setRemoveBranding(e.target.checked)}
                disabled={!canRemoveBranding}
                className="w-5 h-5 mt-1 border-2 border-black accent-black disabled:cursor-not-allowed"
              />
              <div>
                <span className="text-xs font-black uppercase tracking-widest border-l-4 border-[var(--caution)] pl-3 block">
                  REMOVE FORMCRAFT BRANDING
                </span>
                {!canRemoveBranding && (
                  <p className="font-mono text-xs font-bold text-gray-500 mt-1 pl-3">
                    ⚠ Requires Pro or higher.{" "}
                    <Link href="/pricing" className="underline text-black">Upgrade →</Link>
                  </p>
                )}
                <p className="font-mono text-xs font-bold opacity-60 mt-2 pl-3">
                  Removes the "Powered by FormCraft" footer from your public forms.
                </p>
              </div>
            </label>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={updateWorkspaceMutation.isPending}
            className="w-full bg-black text-white font-black uppercase tracking-widest text-sm p-5 border-4 border-black hover:bg-[var(--caution)] hover:text-black transition-all shadow-[4px_4px_0_0_var(--caution)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateWorkspaceMutation.isPending ? "SAVING..." : "SAVE SETTINGS"}
          </button>
        </div>
      </main>
    </div>
  );
}
