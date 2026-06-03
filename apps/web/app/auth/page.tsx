"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldAlert, Key, Terminal, Check, X, Chrome } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "~/trpc/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// ─── Password rules (single source of truth for UI + validation) ────────────
const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters",     test: (p: string) => p.length >= 8 },
  { id: "lower",  label: "One lowercase letter (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { id: "upper",  label: "One uppercase letter (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { id: "number", label: "One number (0-9)",           test: (p: string) => /\d/.test(p) },
];

const getAuthSchema = (isLogin: boolean) =>
  z.object({
    email: z.string().min(1, "Email is required").email("Please enter a valid email address."),
    password: isLogin
      ? z.string().min(1, "Password is required")
      : z.string()
          .min(8, "Must be at least 8 characters.")
          .regex(/[a-z]/, "Must include a lowercase letter (a-z).")
          .regex(/[A-Z]/, "Must include an uppercase letter (A-Z).")
          .regex(/\d/,    "Must include at least one number (0-9)."),
    fullName: isLogin
      ? z.string().optional()
      : z.string().min(2, "Full name must be at least 2 characters."),
  });

type AuthFormValues = z.infer<ReturnType<typeof getAuthSchema>>;

// ─── Live password checklist ─────────────────────────────────────────────────
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

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPasswordHints, setShowPasswordHints] = useState(false);

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(getAuthSchema(isLogin)),
    defaultValues: { email: "", password: "", fullName: "" },
    mode: "onChange",
  });

  const watchedPassword = form.watch("password") ?? "";

  // Reset when switching between Login / Sign Up
  useEffect(() => {
    form.reset({ email: form.getValues("email"), password: "", fullName: "" });
    setShowPasswordHints(false);
  }, [isLogin]);

  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: (data) => {
      toast.success(`Welcome, ${data.user.fullName}! Your account is ready.`);
      router.push("/dashboard");
    },
    onError: (err) => {
      toast.error(err.message || "Sign up failed. Please try again.");
      setLoading(false);
    },
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      toast.success(`Welcome back, ${data.user.fullName}!`);
      router.push("/dashboard");
    },
    onError: () => {
      toast.error("Incorrect email or password. Please try again.");
      setLoading(false);
    },
  });

  const redirectUri = typeof window !== "undefined" ? `${window.location.origin}/auth/callback/google` : "";
  const { data: googleAuthData } = trpc.auth.getGoogleAuthUrl.useQuery(
    { redirectUri },
    { enabled: !!redirectUri }
  );

  const demoLoginMutation = trpc.auth.demoLogin.useMutation({
    onSuccess: () => {
      toast.success("Demo login successful!");
      router.push("/dashboard");
    },
    onError: (err) => {
      toast.error(err.message || "Demo login failed.");
      setLoading(false);
    },
  });

  const onSubmit = (data: AuthFormValues) => {
    setLoading(true);
    if (isLogin) {
      loginMutation.mutate({ email: data.email, password: data.password });
    } else {
      signupMutation.mutate({ email: data.email, password: data.password, fullName: data.fullName || "" });
    }
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
              {isLogin ? <>WELCOME<br />BACK</> : <>GET<br />STARTED</>}
            </h1>
            <p className="text-xl font-bold uppercase tracking-widest opacity-80 border-l-4 border-[var(--caution)] pl-4">
              {isLogin
                ? "Access your FormCraft dashboard to build, manage, and analyze your forms."
                : "Create your free account and start building beautiful forms in minutes."}
            </p>
          </div>
          <div className="text-xs uppercase tracking-widest font-bold text-[var(--caution)]">
            SECURE CONNECTION ESTABLISHED
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
                {isLogin ? "LOG IN" : "CREATE ACCOUNT"}
              </h2>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                {isLogin ? "Enter your credentials" : "Sign up for a free account"}
              </p>
            </div>
          </motion.div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* Full Name — signup only */}
            {!isLogin && (
              <motion.div variants={brutalIn} className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest bg-black text-white px-2 py-1 inline-block">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  {...form.register("fullName")}
                  className={`brutal-input ${form.formState.errors.fullName ? "border-red-500 bg-red-50" : ""}`}
                />
                {form.formState.errors.fullName && (
                  <p className="text-xs font-bold text-red-500 mt-1">
                    ⚠ {form.formState.errors.fullName.message}
                  </p>
                )}
              </motion.div>
            )}

            {/* Email */}
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

            {/* Password */}
            <motion.div variants={brutalIn} className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest bg-black text-white px-2 py-1 inline-block">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                {...form.register("password")}
                onFocus={() => !isLogin && setShowPasswordHints(true)}
                className={`brutal-input ${form.formState.errors.password ? "border-red-500 bg-red-50" : ""}`}
              />

              {/* Live checklist — only shown during signup after focusing the field */}
              {!isLogin && showPasswordHints && (
                <PasswordChecklist password={watchedPassword} />
              )}

              {/* Text error — show on login, or on signup before hints appear */}
              {form.formState.errors.password && (isLogin || !showPasswordHints) && (
                <p className="text-xs font-bold text-red-500 mt-1">
                  ⚠ {form.formState.errors.password.message}
                </p>
              )}
            </motion.div>

            <motion.button
              variants={brutalIn}
              type="submit"
              disabled={loading}
              className="w-full brutal-btn mt-4"
            >
              {loading ? "PLEASE WAIT..." : isLogin ? "LOG IN" : "CREATE ACCOUNT"}
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </form>

          {/* Switch login/signup */}
          <motion.div
            variants={brutalIn}
            className="mt-6 flex justify-between items-center text-xs font-black uppercase tracking-widest text-gray-600"
          >
            <span>{isLogin ? "NO ACCOUNT YET?" : "ALREADY REGISTERED?"}</span>
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-black hover:text-[var(--caution)] underline decoration-2 underline-offset-4"
            >
              {isLogin ? "SIGN UP FREE" : "LOG IN"}
            </button>
          </motion.div>

          {/* Google Auth */}
          <motion.div variants={brutalIn} className="mt-8 pt-6 border-t-4 border-black space-y-4">
            <button
              type="button"
              disabled={loading}
              onClick={() => { 
                if (googleAuthData?.url) {
                  window.location.href = googleAuthData.url;
                } else {
                  toast.error("Google Login is not configured. Please check your .env file.");
                }
              }}
              className="w-full brutal-btn bg-white text-black border-4 border-black hover:bg-gray-100 flex items-center justify-center gap-2"
            >
              <Chrome className="w-5 h-5 text-red-500" />
              CONTINUE WITH GOOGLE
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
