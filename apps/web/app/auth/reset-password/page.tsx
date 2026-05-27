"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldAlert, Terminal, Check, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "~/trpc/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters",     test: (p: string) => p.length >= 8 },
  { id: "lower",  label: "One lowercase letter (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { id: "upper",  label: "One uppercase letter (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { id: "number", label: "One number (0-9)",           test: (p: string) => /\d/.test(p) },
];

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, "Must be at least 8 characters.")
    .regex(/[a-z]/, "Must include a lowercase letter (a-z).")
    .regex(/[A-Z]/, "Must include an uppercase letter (A-Z).")
    .regex(/\d/,    "Must include at least one number (0-9)."),
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

function PasswordChecklist({ password }: { password: string }) {
  return (
    <div className="mt-2 p-3 bg-gray-50 border-2 border-gray-200 space-y-1.5">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
        Your password needs:
      </p>
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password);
        return (
          <div key={rule.id} className="flex items-center gap-2">
            <div className={`w-4 h-4 flex items-center justify-center flex-shrink-0 border-2 transition-all duration-150 ${
              passed ? "bg-green-500 border-green-500" : "bg-white border-gray-300"
            }`}>
              {passed
                ? <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                : <X className="w-2.5 h-2.5 text-gray-300" strokeWidth={3} />
              }
            </div>
            <span className={`text-xs font-semibold transition-colors duration-150 ${
              passed ? "text-green-600" : "text-gray-500"
            }`}>
              {rule.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "" },
    mode: "onChange",
  });

  const watchedPassword = form.watch("password") ?? "";

  useEffect(() => {
    if (!token) {
      toast.error("Invalid or missing reset token.");
      router.push("/auth");
    }
  }, [token, router]);

  const resetPasswordMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Password reset successfully! You can now log in.");
      router.push("/auth");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to reset password. The link may have expired.");
      setLoading(false);
    },
  });

  const onSubmit = (data: ResetPasswordValues) => {
    if (!token) return;
    setLoading(true);
    resetPasswordMutation.mutate({ token, password: data.password });
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
    return null; // Redirecting in useEffect
  }

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
              NEW<br />PASSWORD
            </h1>
            <p className="text-xl font-bold uppercase tracking-widest opacity-80 border-l-4 border-[var(--caution)] pl-4">
              Enter a new secure password for your account.
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
                SET NEW PASSWORD
              </h2>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                Almost done!
              </p>
            </div>
          </motion.div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <motion.div variants={brutalIn} className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest bg-black text-white px-2 py-1 inline-block">
                New Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                {...form.register("password")}
                className={`brutal-input ${form.formState.errors.password ? "border-red-500 bg-red-50" : ""}`}
              />

              <PasswordChecklist password={watchedPassword} />

            </motion.div>

            <motion.button
              variants={brutalIn}
              type="submit"
              disabled={loading || !form.formState.isValid}
              className="w-full brutal-btn mt-4 flex justify-center items-center gap-2"
            >
              {loading ? "SAVING..." : "UPDATE PASSWORD"}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';
