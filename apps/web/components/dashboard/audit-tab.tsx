"use client";

import React from "react";
import { motion } from "framer-motion";
import { trpc } from "~/trpc/client";

const brutalIn = { hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.1 } } };
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

export function AuditTab() {
  const { data: auditData } = trpc.audit.list.useQuery({});

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-8">
      <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0_0_#000]">
        <h2 className="text-4xl font-black uppercase tracking-tighter">AUDIT LOG</h2>
        <p className="font-mono text-xs font-bold uppercase text-gray-500 mt-2">WORKSPACE ACTIVITY LOG</p>
      </div>
      <div className="bg-black text-[var(--caution)] p-8 font-mono border-4 border-[var(--caution)] shadow-[8px_8px_0_0_#000]">
        <div className="space-y-1 text-sm">
          {(!auditData?.logs || auditData.logs.length === 0) && <div>NO LOGS FOUND.</div>}
          {auditData?.logs?.map(log => (
            <motion.div variants={brutalIn} key={log.id} className="flex flex-col sm:flex-row sm:gap-6 py-2 border-b border-gray-800 hover:bg-gray-900">
              <span className="w-48 text-gray-500">{new Date(log.createdAt).toLocaleString()}</span>
              <span className="w-48 font-bold">[{log.action}]</span>
              <span className="flex-1 text-white">{log.details || "NO ADDITIONAL DETAILS"}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
