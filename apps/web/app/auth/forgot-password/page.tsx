"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Send, ShieldAlert, Terminal } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "~/trpc/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address."),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const requestResetMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setLoading(false);
      toast.success("Reset link sent!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to request reset. Please try again.");
      setLoading(false);
    },
  });

  const onSubmit = (data: ForgotPasswordValues) => {
    setLoading(true);
    requestResetMutation.mutate({ email: data.email });
  };

  const brutalIn = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.1, ease: "linear" as const } },
  };
  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row font-mono selection:bg-[var(--caution)] selection:text-black">

      {/* ── Left panel ── */}
      <div className="hidden md:flex w-1/2 bg-black text-white p-12 flex-col justify-between border-r-8 border-[var(--caution)] relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(#facc15 1px, transparent 1px), linear-gradient(90deg, #facc15 1px, transparent 1px)",
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
              FORGOT<br />PASSWORD
            </h1>
            <p className="text-xl font-bold uppercase tracking-widest opacity-80 border-l-4 border-[var(--caution)] pl-4">
              Don't worry, it happens to the best of us. Let's get you back in.
            </p>
          </div>
          <div className="text-xs uppercase tracking-widest font-bold text-[var(--caution)]">
            SECURE RECOVERY MODE
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="w-full md:w-1/2 flex flex-col p-6 md:p-12 lg:p-24 justify-center relative bg-gray-100">
        <Link href="/" className="md:hidden font-black text-xl tracking-tighter uppercase mb-12">
          FORMCRAFT
        </Link>

        <motion.div
          initial="hidden" animate="visible" variants={staggerContainer}
          className="w-full max-w-md mx-auto brutal-card bg-white p-8"
        >
          <div className="absolute top-0 left-0 w-full h-4 bg-[var(--caution)]" />

          {/* Header */}
          <motion.div variants={brutalIn} className="mb-8 mt-4 flex items-center gap-4 border-b-4 border-black pb-4">
            <ShieldAlert className="w-10 h-10 text-black" />
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">
                RESET PASSWORD
              </h2>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                Enter your email address
              </p>
            </div>
          </motion.div>

          {submitted ? (
            <motion.div variants={brutalIn} className="space-y-6 text-center">
              <div className="bg-green-50 border-2 border-green-500 p-6 rounded-lg">
                <p className="font-bold text-green-800 text-sm">
                  If an account exists with that email, we have sent a password reset link.
                </p>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Please check your inbox (and spam folder) and click the link to choose a new password.
              </p>
              <Link href="/auth" className="brutal-btn-primary w-full flex justify-center items-center gap-2 mt-4">
                <ArrowLeft className="w-4 h-4" />
                RETURN TO LOGIN
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <motion.div variants={brutalIn} className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest bg-black text-white px-2 py-1 inline-block">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="hello@example.com"
                  {...form.register("email")}
                  className={`brutal-input ${form.formState.errors.email ? "border-red-500 bg-red-50" : ""}`}
                />
                {form.formState.errors.email && (
                  <p className="text-xs font-bold text-red-500 mt-1">
                    ⚠ {form.formState.errors.email.message}
                  </p>
                )}
              </motion.div>

              <motion.button
                variants={brutalIn}
                type="submit"
                disabled={loading}
                className="w-full brutal-btn mt-4 flex justify-center items-center gap-2"
              >
                {loading ? "SENDING..." : "SEND RESET LINK"}
                {!loading && <Send className="w-5 h-5" />}
              </motion.button>
            </form>
          )}

          {!submitted && (
            <motion.div
              variants={brutalIn}
              className="mt-6 flex justify-center items-center text-xs font-black uppercase tracking-widest text-gray-600"
            >
              <Link
                href="/auth"
                className="text-black hover:text-[var(--caution)] flex items-center gap-2 underline decoration-2 underline-offset-4"
              >
                <ArrowLeft className="w-3 h-3" />
                BACK TO LOGIN
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
