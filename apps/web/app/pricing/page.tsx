"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Cpu, HardDrive, Server, Activity, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "~/components/ui/dialog";
import { trpc } from "~/trpc/client";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const pricingTiers = [
  {
    name: "FREE PLAN",
    tier: "free",
    price: "₹0",
    description: "EVERYTHING YOU NEED TO GET STARTED.",
    features: [
      "1,000 RESPONSES/MONTH",
      "UNLIMITED FORMS",
      "STEP-BY-STEP FORMS",
      "DEFAULT THEME",
      "BASIC VALIDATION",
      "SPAM PROTECTION",
    ],
    cta: "GET STARTED FREE",
    icon: Cpu,
  },
  {
    name: "PRO PLAN",
    tier: "pro",
    price: "₹1,999",
    period: "/MO",
    description: "MORE RESPONSES AND CUSTOM DESIGNS.",
    features: [
      "10,000 RESPONSES/MONTH",
      "UNLIMITED FORMS",
      "ALL FORM LAYOUTS",
      "PREMIUM THEMES",
      "ADVANCED ANALYTICS",
      "CSV EXPORT",
      "EMAIL NOTIFICATIONS",
      "CUSTOM DOMAINS",
    ],
    cta: "UPGRADE TO PRO",
    popular: true,
    icon: HardDrive,
  },
  {
    name: "ENTERPRISE PLAN",
    tier: "enterprise",
    price: "₹4,999",
    period: "/MO",
    description: "FOR HIGH-VOLUME BUSINESSES AND TEAMS.",
    features: [
      "50,000 RESPONSES/MONTH",
      "UNLIMITED FORMS",
      "REMOVE FORMCRAFT BRANDING",
      "API & WEBHOOKS",
      "TEAM COLLABORATION",
      "CONDITIONAL LOGIC",
      "PASSWORD PROTECTED FORMS",
      "FORM EXPIRATION DATES",
      "PRIORITY SUPPORT",
    ],
    cta: "CONTACT SALES",
    icon: Server,
  },
];

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const router = useRouter();
  const utils = trpc.useUtils();

  // FIX #9: Use auth.me which actually exists, instead of the non-existent getWorkspaces
  const { data: meData, isError } = trpc.auth.me.useQuery(undefined, {
    retry: false,
  });
  const workspaces = meData?.workspaces ?? [];
  const activeWorkspace = meData?.activeWorkspace ?? null;

  const { data: billingStatus, refetch: refetchBilling } = trpc.billing.getStatus.useQuery(
    { workspaceId: activeWorkspace?.id || "" },
    { enabled: !!activeWorkspace?.id, retry: false }
  );

  const cancelMutation = trpc.billing.cancelSubscription.useMutation({
    onSuccess: () => {
      toast.success("Subscription cancelled successfully.");
      refetchBilling();
      // Also refetch me to update tier globally
      utils.auth.me.invalidate();
    },
    onError: (err) => {
      toast.error("Failed to cancel subscription: " + err.message);
    }
  });

  const verifyPaymentMutation = trpc.billing.verifyPayment.useMutation({
    onSuccess: () => {
      toast.success("Subscription activated successfully!");
      router.push("/dashboard");
    },
    onError: (err) => {
      toast.error("Payment verification failed: " + err.message);
    }
  });

  const subscriptionMutation = trpc.billing.createSubscription.useMutation({
    onSuccess: (data, variables) => {
      // DEV MODE: Razorpay keys are invalid/test — simulate checkout
      if ((data as any).devMode) {
        toast.info("🛠 Dev Mode: Razorpay keys are test/invalid. Upgrading directly for local testing.", { duration: 5000 });
        // Directly verify with a fake signature (backend won't validate in dev path)
        verifyPaymentMutation.mutate({
          workspaceId: variables.workspaceId,
          tier: variables.tier,
          razorpay_payment_id: `pay_DEV_${Date.now()}`,
          razorpay_subscription_id: data.subscriptionId,
          razorpay_signature: "dev_bypass",
        });
        return;
      }

      if (typeof window === "undefined" || !window.Razorpay) {
        toast.error("Razorpay SDK not loaded. Please refresh the page.");
        return;
      }

      const options = {
        key: data.razorpayKeyId,
        subscription_id: data.subscriptionId,
        name: "FormCraft",
        description: `Upgrade to ${variables.tier} plan`,
        handler: function (response: any) {
          verifyPaymentMutation.mutate({
            workspaceId: variables.workspaceId,
            tier: variables.tier,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_subscription_id: response.razorpay_subscription_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        theme: { color: "#000000" },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.on("payment.failed", function (response: any) {
        toast.error("Payment failed: " + response.error.description);
      });
      rzp1.open();
    },
    onError: (err) => {
      toast.error("Failed to initiate checkout: " + err.message);
    }
  });

  const handleCheckout = (tierObj: any) => {
    if (tierObj.tier === "free") {
      router.push("/auth");
      return;
    }

    // FIX #9: Use meData-derived workspace, not the non-existent getWorkspaces
    if (isError || !activeWorkspace) {
      toast.error("Please log in to upgrade your plan.");
      router.push("/auth");
      return;
    }

    subscriptionMutation.mutate({
      workspaceId: activeWorkspace.id,
      tier: tierObj.tier as "pro" | "enterprise",
    });
  };

  const brutalIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "linear" as const } } };
  const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

  return (
    <div className="min-h-screen bg-[#cbd5e1] text-black font-sans selection:bg-[var(--caution)] selection:text-black flex flex-col">
      
      {/* Background Texture */}
      <div className="fixed inset-0 pointer-events-none opacity-50 z-0" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')" }} />

      {/* Industrial Header */}
      <header className="bg-white border-b-8 border-black px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link href="/" className="font-black text-xl tracking-tighter uppercase flex items-center gap-3">
          <div className="bg-[var(--caution)] border-2 border-black p-1">
            <Activity className="w-5 h-5 text-black" />
          </div>
          FORMCRAFT
        </Link>
        <div className="flex items-center gap-8 text-[10px] uppercase tracking-widest font-bold">
          <Link href="/pricing" className="text-[var(--caution)] bg-black px-3 py-1 border-2 border-black">PRICING</Link>
          <Link href="/auth" className="hover:text-[var(--caution)] transition-colors hover:underline decoration-2 underline-offset-4">DASHBOARD</Link>
          <Link href="/auth" className="bg-black text-white px-4 py-2 hover:bg-[var(--caution)] hover:text-black transition-colors border-2 border-black">GET STARTED</Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 max-w-[1400px] mx-auto px-8 py-24 w-full relative z-10">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="mb-24 bg-white border-4 border-black p-12 shadow-[8px_8px_0_0_#000]">
          <motion.div variants={brutalIn} className="inline-flex items-center gap-3 bg-[var(--caution)] border-2 border-black px-3 py-1 mb-6 font-mono text-xs font-bold uppercase tracking-widest">
            <span className="w-2 h-2 bg-black rounded-full animate-pulse" />
            PRICING
          </motion.div>
          <motion.h1 variants={brutalIn} className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-6">
            SIMPLE<br />PRICING
          </motion.h1>
          <motion.p variants={brutalIn} className="text-xl font-mono font-bold opacity-80 max-w-2xl border-l-4 border-black pl-4">
            Transparent pricing. Select the plan that works best for your needs.
          </motion.p>
          
          {billingStatus?.hasActiveSubscription && (
            <motion.div variants={brutalIn} className="mt-8 p-6 bg-red-50 border-4 border-red-500 inline-block">
              <h3 className="font-black text-red-600 uppercase mb-2">ACTIVE SUBSCRIPTION</h3>
              <p className="font-mono text-sm font-bold text-red-700 mb-4">
                You are currently on the {billingStatus.tier.toUpperCase()} plan.
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="bg-red-600 text-white font-black uppercase tracking-widest text-xs px-4 py-2 hover:bg-red-700 transition-colors">
                    CANCEL SUBSCRIPTION
                  </button>
                </DialogTrigger>
                <DialogContent className="brutal-card p-8 border-4 border-black rounded-none">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Cancel Subscription?</DialogTitle>
                    <DialogDescription className="font-mono font-bold text-sm mt-4 text-black opacity-70">
                      Are you sure you want to cancel? You will immediately lose access to premium features and be downgraded to the FREE plan.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex gap-4 mt-8">
                    <button 
                      onClick={() => cancelMutation.mutate({ workspaceId: activeWorkspace!.id })}
                      disabled={cancelMutation.isPending}
                      className="bg-red-600 text-white font-black uppercase tracking-widest px-6 py-3 hover:bg-red-700 transition-colors flex-1"
                    >
                      {cancelMutation.isPending ? "CANCELLING..." : "YES, CANCEL NOW"}
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
            </motion.div>
          )}
        </motion.div>

        {/* Pricing List */}
        <motion.div initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingTiers.map((tier) => (
            <motion.div
              variants={brutalIn}
              key={tier.name}
              className={`flex flex-col bg-white border-4 border-black p-8 transition-all ${tier.popular ? 'shadow-[12px_12px_0_0_var(--caution)] -translate-y-2' : 'shadow-[8px_8px_0_0_#000] hover:-translate-y-1'}`}
            >
              {tier.popular && (
                <div className="bg-[var(--caution)] text-black border-b-4 border-black font-black uppercase tracking-widest text-xs p-2 text-center -mx-8 -mt-8 mb-8 border-x-4 border-t-4 border-[var(--caution)]">
                  MOST POPULAR
                </div>
              )}
              
              <div className="mb-8 border-b-4 border-black pb-8">
                <div className="flex items-center gap-4 mb-4">
                  <tier.icon className="w-8 h-8" />
                  <h3 className="text-xl font-black uppercase tracking-tighter">{tier.name}</h3>
                </div>
                <div className="flex items-baseline gap-2 mb-4 bg-gray-100 p-4 border-2 border-black">
                  <span className="text-5xl font-mono font-black">{tier.price}</span>
                  {tier.period && <span className="text-sm font-bold opacity-50 uppercase">{tier.period}</span>}
                </div>
                <p className="font-mono text-xs font-bold uppercase opacity-80">{tier.description}</p>
              </div>

              <div className="flex-1 mb-8">
                <ul className="space-y-4">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 font-mono text-xs font-bold uppercase">
                      <div className="w-4 h-4 bg-black text-white flex items-center justify-center shrink-0 mt-0.5"><ShieldCheck className="w-3 h-3" /></div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                className={`w-full uppercase font-black tracking-widest text-sm p-4 border-4 border-black transition-all flex justify-center items-center gap-2 ${tier.popular ? 'bg-[var(--caution)] hover:bg-black hover:text-white' : 'bg-black text-white hover:bg-[var(--caution)] hover:text-black'} ${billingStatus?.tier === tier.tier ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handleCheckout(tier)}
                disabled={subscriptionMutation.isPending || billingStatus?.tier === tier.tier}
              >
                {billingStatus?.tier === tier.tier ? (
                  <>CURRENT PLAN</>
                ) : subscriptionMutation.isPending && subscriptionMutation.variables?.tier === tier.tier ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> PROCESSING...</>
                ) : (
                  <>{tier.cta} <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            </motion.div>
          ))}
        </motion.div>

        {/* FAQ */}
        <motion.div initial="hidden" animate="visible" variants={stagger} className="mt-24 bg-white border-4 border-black p-12 shadow-[8px_8px_0_0_#000]">
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-12">FREQUENTLY ASKED QUESTIONS</h2>
          <div className="grid md:grid-cols-2 gap-12 font-mono">
            <motion.div variants={brutalIn}>
              <h4 className="text-sm uppercase font-black mb-4 border-l-4 border-[var(--caution)] pl-3">IS THE FREE PLAN REALLY FREE?</h4>
              <p className="text-xs font-bold opacity-70 leading-relaxed">
                YES. YOU CAN BUILD AS MANY FORMS AS YOU WANT, WITH A LIMIT OF 1,000 RESPONSES PER MONTH.
              </p>
            </motion.div>
            <motion.div variants={brutalIn}>
              <h4 className="text-sm uppercase font-black mb-4 border-l-4 border-[var(--caution)] pl-3">CAN I CONNECT MY OWN TOOLS?</h4>
              <p className="text-xs font-bold opacity-70 leading-relaxed">
                YES. OUR ENTERPRISE PLAN INCLUDES API ACCESS AND WEBHOOKS SO YOU CAN SEND DATA ANYWHERE.
              </p>
            </motion.div>
            <motion.div variants={brutalIn}>
              <h4 className="text-sm uppercase font-black mb-4 border-l-4 border-[var(--caution)] pl-3">WHAT ARE STEP-BY-STEP FORMS?</h4>
              <p className="text-xs font-bold opacity-70 leading-relaxed">
                FORMS WHERE USERS ANSWER ONE QUESTION AT A TIME. THIS APPROACH FEELS MORE CONVERSATIONAL AND INCREASES COMPLETION RATES.
              </p>
            </motion.div>
            <motion.div variants={brutalIn}>
              <h4 className="text-sm uppercase font-black mb-4 border-l-4 border-[var(--caution)] pl-3">DO YOU HAVE FORM TEMPLATES?</h4>
              <p className="text-xs font-bold opacity-70 leading-relaxed">
                YES. WE OFFER SEVERAL PRE-BUILT TEMPLATES YOU CAN USE IMMEDIATELY FROM YOUR DASHBOARD.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-black text-white border-t-8 border-[var(--caution)] py-8 font-mono text-xs font-bold uppercase tracking-widest px-8 z-10 relative">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <p>FORMCRAFT // BUILT WITH NEXT.JS</p>
          <div className="flex gap-8">
            <Link href="/" className="hover:text-[var(--caution)] hover:underline decoration-2 underline-offset-4">PRIVACY</Link>
            <Link href="/" className="hover:text-[var(--caution)] hover:underline decoration-2 underline-offset-4">TERMS</Link>
            <Link href="/docs" className="hover:text-[var(--caution)] hover:underline decoration-2 underline-offset-4">DOCS</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
