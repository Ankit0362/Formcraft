"use client";

import React from "react";
import { motion } from "framer-motion";
import { trpc } from "~/trpc/client";

const brutalIn = { hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.1 } } };
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

export function EmailsTab() {
  const { data: emailOutbox } = trpc.emails.listAll.useQuery({});

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-8">
      <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0_0_#000]">
        <h2 className="text-4xl font-black uppercase tracking-tighter">EMAIL OUTBOX</h2>
        <p className="font-mono text-xs font-bold uppercase text-gray-500 mt-2">HISTORY OF SENT EMAILS</p>
      </div>
      <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0_0_#000]">
        <div className="space-y-2 font-mono text-sm font-bold">
          <div className="flex gap-4 border-b-4 border-black pb-2 text-gray-400 mb-4">
            <span className="w-32">TIMESTAMP</span>
            <span className="w-64">RECIPIENT</span>
            <span className="flex-1">SUBJECT</span>
          </div>
          {emailOutbox?.length === 0 && <div className="py-8 text-center text-gray-400">NO EMAILS SENT YET.</div>}
          {emailOutbox?.map(email => (
            <motion.div variants={brutalIn} key={email.id} className="flex gap-4 py-3 border-b-2 border-gray-100 hover:bg-gray-50">
              <span className="w-32 text-gray-500">{new Date(email.sentAt).toLocaleDateString()}</span>
              <span className="w-64 truncate">{email.recipient}</span>
              <span className="flex-1 truncate">{email.subject}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
