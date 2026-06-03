"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Terminal, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "~/trpc/client";

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const utils = trpc.useUtils();

  const [status, setStatus] = useState("VERIFYING SECURE TOKEN...");

  const callbackMutation = trpc.auth.googleCallback.useMutation({
    onSuccess: async (data) => {
      // Stamp the session cookie on the Next.js domain so middleware can read it
      await fetch("/api/auth/set-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: data.sessionToken }),
      });
      setStatus("AUTHENTICATION SUCCESSFUL. REDIRECTING...");
      toast.success("Successfully logged in with Google!");
      utils.auth.me.invalidate().then(() => {
        router.push("/dashboard");
      });
    },
    onError: (err) => {
      setStatus("AUTHENTICATION FAILED.");
      toast.error(err.message || "Failed to authenticate with Google.");
      setTimeout(() => router.push("/auth"), 2000);
    },
  });

  useEffect(() => {
    if (error) {
      setStatus("AUTHENTICATION CANCELLED OR FAILED.");
      toast.error(`Google Auth Error: ${error}`);
      setTimeout(() => router.push("/auth"), 2000);
      return;
    }

    if (!code) {
      setStatus("NO AUTHORIZATION CODE FOUND.");
      toast.error("Invalid callback URL.");
      setTimeout(() => router.push("/auth"), 2000);
      return;
    }

    const redirectUri = window.location.origin + "/auth/callback/google";
    setStatus("EXCHANGING TOKENS...");
    callbackMutation.mutate({ code, redirectUri });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, error]);

  const brutalIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "linear" as const } },
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono selection:bg-[var(--caution)] selection:text-black">
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(#facc15 1px, transparent 1px), linear-gradient(90deg, #facc15 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      
      <motion.div initial="hidden" animate="visible" variants={brutalIn} className="relative z-10 brutal-card bg-white text-black p-12 max-w-lg w-full border-4 border-[var(--caution)] shadow-[12px_12px_0_0_var(--caution)]">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="bg-[var(--caution)] border-4 border-black p-4 inline-block">
            {callbackMutation.isPending || (!code && !error) && !callbackMutation.isError && !callbackMutation.isSuccess ? (
              <Loader2 className="w-12 h-12 text-black animate-spin" />
            ) : callbackMutation.isSuccess ? (
              <ShieldCheck className="w-12 h-12 text-black" />
            ) : (
              <Terminal className="w-12 h-12 text-black" />
            )}
          </div>
          
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            GOOGLE<br />AUTHORIZATION
          </h1>
          
          <div className="bg-gray-100 border-2 border-black p-4 w-full">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">CURRENT STATUS</p>
            <p className="text-sm font-black animate-pulse">{status}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono">
        <Loader2 className="w-12 h-12 animate-spin text-[var(--caution)]" />
      </div>
    }>
      <GoogleCallbackContent />
    </Suspense>
  );
}
