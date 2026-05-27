"use client";

import React, { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ShieldAlert, Terminal, ArrowRight, UserPlus, LogIn, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "~/trpc/client";

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);

  // Check auth status
  const { data: authData, isLoading: authLoading } = trpc.auth.me.useQuery(undefined, {
    staleTime: 1000 * 60, // 1 minute
  });

  // Get invite details
  const { data: inviteData, isLoading: inviteLoading } = trpc.workspaces.getInviteDetails.useQuery(
    { token: token || "" },
    { enabled: !!token, retry: false }
  );

  const acceptMutation = trpc.workspaces.acceptInvite.useMutation({
    onSuccess: () => {
      toast.success("Invitation accepted! Welcome to the workspace.");
      router.push("/dashboard");
      router.refresh();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to accept invitation.");
      setLoading(false);
    },
  });

  const onAccept = () => {
    if (!token) return;
    setLoading(true);
    acceptMutation.mutate({ token });
  };

  const brutalIn = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.1, ease: "linear" as const } },
  };
  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 font-mono">
        <div className="brutal-card bg-white p-8 max-w-md text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-black uppercase mb-2">Invalid Link</h1>
          <p className="text-gray-600 mb-6 text-sm">No invitation token was provided.</p>
          <Link href="/" className="brutal-btn w-full inline-block">Return Home</Link>
        </div>
      </div>
    );
  }

  if (authLoading || inviteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 font-mono">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Terminal className="w-8 h-8 opacity-50" />
          <p className="font-bold tracking-widest text-xs uppercase">Loading Invite...</p>
        </div>
      </div>
    );
  }

  if (inviteData && !inviteData.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 font-mono p-4">
        <div className="brutal-card bg-white p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-black uppercase mb-2">Invitation Invalid</h1>
          <p className="text-gray-600 mb-6 text-sm font-medium">{inviteData.error || "This invitation is no longer valid."}</p>
          <Link href="/auth" className="brutal-btn w-full inline-block">Go to Login</Link>
        </div>
      </div>
    );
  }

  const user = authData?.user;
  const isEmailMatch = user && inviteData?.email && user.email.toLowerCase() === inviteData.email.toLowerCase();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row font-mono selection:bg-[var(--caution)] selection:text-black">
      {/* ── Left panel ── */}
      <div className="hidden md:flex w-1/2 bg-black text-white p-12 flex-col justify-between border-r-8 border-[var(--caution)] relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: "linear-gradient(#facc15 1px, transparent 1px), linear-gradient(90deg, #facc15 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative z-10 flex flex-col justify-between h-full">
          <Link href="/" className="font-black text-2xl tracking-tighter uppercase flex items-center gap-3">
            <div className="bg-[var(--caution)] border-2 border-white p-1">
              <Terminal className="w-6 h-6 text-black" />
            </div>
            FORMCRAFT
          </Link>
          <div className="space-y-6">
            <h1 className="text-6xl font-black uppercase tracking-tighter leading-none text-[var(--caution)]">
              WORKSPACE<br />INVITE
            </h1>
            <p className="text-xl font-bold uppercase tracking-widest opacity-80 border-l-4 border-[var(--caution)] pl-4">
              You've been invited to collaborate.
            </p>
          </div>
          <div className="text-xs uppercase tracking-widest font-bold text-[var(--caution)]">
            SECURE INVITATION LINK
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="w-full md:w-1/2 flex flex-col p-6 md:p-12 lg:p-24 justify-center relative bg-gray-100">
        <Link href="/" className="md:hidden font-black text-xl tracking-tighter uppercase mb-12">
          FORMCRAFT
        </Link>

        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="w-full max-w-md mx-auto brutal-card bg-white p-8">
          <div className="absolute top-0 left-0 w-full h-4 bg-[var(--caution)]" />

          <motion.div variants={brutalIn} className="mb-8 mt-4">
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">
              YOU'RE INVITED
            </h2>
            <div className="p-4 bg-gray-50 border-2 border-gray-200 mt-4">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Workspace</div>
              <div className="text-lg font-black">{inviteData?.workspaceName}</div>
              
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-4 mb-1">Role</div>
              <div className="text-sm font-bold capitalize">{inviteData?.role}</div>
              
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-4 mb-1">Invited Email</div>
              <div className="text-sm font-bold">{inviteData?.email}</div>
            </div>
          </motion.div>

          {!user ? (
            <motion.div variants={brutalIn} className="space-y-4">
              <div className="p-3 bg-yellow-50 border-2 border-yellow-400 text-yellow-800 text-xs font-bold uppercase tracking-widest">
                You must log in to accept
              </div>
              <Link href="/auth" className="brutal-btn w-full flex justify-center items-center gap-2">
                <LogIn className="w-4 h-4" /> LOG IN OR SIGN UP
              </Link>
              <p className="text-[10px] text-gray-500 text-center uppercase tracking-widest font-bold mt-2">
                Make sure to use: {inviteData?.email}
              </p>
            </motion.div>
          ) : !isEmailMatch ? (
            <motion.div variants={brutalIn} className="space-y-4">
              <div className="p-4 bg-red-50 border-2 border-red-500">
                <h3 className="font-black text-red-700 uppercase mb-2 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Email Mismatch
                </h3>
                <p className="text-xs text-red-600 font-medium">
                  You are logged in as <strong>{user.email}</strong>, but this invite was sent to <strong>{inviteData?.email}</strong>.
                </p>
              </div>
              <Link href="/auth" className="brutal-btn w-full text-center inline-block">
                SWITCH ACCOUNT
              </Link>
            </motion.div>
          ) : (
            <motion.div variants={brutalIn}>
              <button
                onClick={onAccept}
                disabled={loading}
                className="w-full brutal-btn flex justify-center items-center gap-2"
              >
                {loading ? "ACCEPTING..." : "ACCEPT INVITATION"}
                {!loading && <Check className="w-5 h-5" />}
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100" />}>
      <InviteContent />
    </Suspense>
  );
}


