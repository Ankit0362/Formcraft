"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, ArrowLeft, Sparkles, Home } from "lucide-react";
import { motion } from "framer-motion";
import { trpc } from "~/trpc/client";
import { getTheme } from "~/lib/themes";

export default function SubmissionSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const idOrSlug = params.slugOrId as string;
  const isEmbed = searchParams.get("embed") === "true";

  const { data } = trpc.forms.getPublicForm.useQuery(
    { idOrSlug },
    { refetchOnWindowFocus: false }
  );

  const form = data?.form;
  const t = getTheme(form?.theme);

  const confirmationMsg =
    "Your response has been recorded. Thank you for taking the time to fill out this form!";

  return (
    <div className={`min-h-screen ${t.page}`}>
      <div className="flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`w-full max-w-xl ${t.card} ${t.cardPadding} text-center`}
        >
          {/* Animated success icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
            className="flex justify-center mb-6"
          >
            <div className="relative flex items-center justify-center w-24 h-24">
              {/* Ripple ring */}
              <motion.div
                animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-full bg-green-400"
              />
              <div className="relative z-10 w-20 h-20 rounded-full bg-green-100 flex items-center justify-center shadow-lg shadow-green-200">
                <CheckCircle2 className="w-10 h-10 text-green-600" strokeWidth={2.5} />
              </div>
            </div>
          </motion.div>

          {/* Title + message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <h1 className={`${t.title} text-2xl sm:text-3xl mb-3`}>
              {form ? `Response Submitted!` : "Thank You!"}
            </h1>
            <p className={`${t.muted} mb-2 leading-relaxed text-base`}>
              {confirmationMsg}
            </p>
            {form?.title && (
              <p className={`${t.muted} text-sm opacity-70 mb-6`}>
                — {form.title}
              </p>
            )}
          </motion.div>

          {/* Divider */}
          <div className={`border-t ${t.divider} my-6`} />

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link
              href={`/share/${idOrSlug}`}
              className={`${t.buttonGhost} inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg transition-all`}
            >
              <ArrowLeft className="w-4 h-4" />
              Submit Another Response
            </Link>

            {!isEmbed && (
              <Link
                href="/"
                className={`${t.button} inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg transition-all`}
              >
                <Home className="w-4 h-4" />
                Go to FormCraft
              </Link>
            )}
          </motion.div>

          {/* Branding */}
          {!form?.removeBranding && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-8 pt-4 border-t border-dashed opacity-40"
            >
              <p className={`${t.muted} text-xs flex items-center justify-center gap-1.5`}>
                <Sparkles className="w-3 h-3" />
                Powered by{" "}
                <Link href="/" className="underline hover:opacity-80 font-semibold ml-1">
                  FormCraft
                </Link>
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
