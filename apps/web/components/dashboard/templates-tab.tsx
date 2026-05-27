"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const brutalIn = { hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.1 } } };
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

const TEMPLATES = [
  { name: "Customer Feedback", desc: "Post-purchase feedback on product quality, shipping, and overall experience.", color: "#ec4899", industry: "E-Commerce" },
  { name: "Job Application", desc: "Standard job application with resume upload, experience, education, and references.", color: "#f97316", industry: "HR" },
  { name: "Event Registration", desc: "Event sign-up with ticket type, dietary needs, session selection, and payment.", color: "#ef4444", industry: "Events" },
  { name: "Patient Intake", desc: "Collect patient demographics, insurance info, and medical history.", color: "#14b8a6", industry: "Healthcare" },
  { name: "Lead Capture", desc: "High-converting lead gen form with name, email, company, and interest area.", color: "#a855f7", industry: "Marketing" },
  { name: "Bug Report", desc: "Structured bug report with severity, reproduction steps, and screenshots.", color: "#06b6d4", industry: "Technology" },
];

export function TemplatesTab() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-8">
      <div className="bg-white border-4 border-black p-6 flex items-center justify-between shadow-[8px_8px_0_0_#000]">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter">QUICK START TEMPLATES</h2>
          <p className="font-mono text-xs font-bold uppercase text-gray-500 mt-2">CLICK A CATEGORY TO BROWSE ITS TEMPLATES</p>
        </div>
        <Link href="/templates" className="brutal-btn-primary text-sm">BROWSE ALL 120+ TEMPLATES</Link>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {TEMPLATES.map((tpl, i) => (
          <motion.div variants={brutalIn} key={i}>
            <Link
              href={`/templates?industry=${encodeURIComponent(tpl.industry)}`}
              className="bg-white border-4 border-black shadow-[6px_6px_0_0_#000] cursor-pointer hover:-translate-y-1 hover:shadow-[10px_10px_0_0] transition-all flex flex-col group"
              style={{ "--tw-shadow-color": tpl.color } as React.CSSProperties}
            >
              <div className="h-2 w-full" style={{ backgroundColor: tpl.color }} />
              <div className="p-5 flex-grow">
                <span
                  className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 mb-3 inline-block"
                  style={{ backgroundColor: tpl.color + "20", color: tpl.color, border: `1px solid ${tpl.color}` }}
                >{tpl.industry}</span>
                <h3 className="text-xl font-black uppercase tracking-tight mb-2">{tpl.name}</h3>
                <p className="font-mono text-xs text-gray-500 line-clamp-2">{tpl.desc}</p>
              </div>
              <div className="bg-gray-100 border-t-4 border-black p-3 font-black text-xs uppercase flex justify-between items-center group-hover:bg-[var(--caution)] transition-colors">
                VIEW TEMPLATES <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
