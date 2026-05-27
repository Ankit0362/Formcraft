"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoveRight, Shield, Type, Layers, Box, PenTool, Hash, ArrowRight, CornerDownRight } from "lucide-react";

export default function AvantGardeShowcase() {
  const [activeTheme, setActiveTheme] = useState<number>(0);

  const themes = [
    {
      id: "refinery",
      name: "1. The Data Refinery",
      render: () => <RefineryTheme />
    },
    {
      id: "dossier",
      name: "2. The Official Dossier",
      render: () => <DossierTheme />
    },
    {
      id: "editorial",
      name: "3. The Cinematic Editorial",
      render: () => <EditorialTheme />
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#e5e5e5] text-black font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b-4 border-black bg-white flex items-center justify-between px-8 z-50 shrink-0 shadow-[0_4px_0_0_rgba(0,0,0,1)] relative">
        <div className="font-black uppercase tracking-tighter text-xl">The Vanguard Concepts</div>
        <div className="flex gap-4">
          {themes.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setActiveTheme(i)}
              className={`text-xs font-bold uppercase tracking-widest px-4 py-2 border-2 border-black transition-all ${
                activeTheme === i 
                  ? "bg-black text-white shadow-[2px_2px_0_0_rgba(250,204,21,1)]" 
                  : "bg-white text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </header>

      {/* Main Display Area */}
      <main className="flex-1 relative bg-[#f4f4f5]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTheme}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 overflow-y-auto"
          >
            {themes[activeTheme]?.render()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// ---------------------------------------------------------
// 1. THE DATA REFINERY (Industrial / Neobrutalism)
// ---------------------------------------------------------
function RefineryTheme() {
  return (
    <div className="min-h-full bg-[#cbd5e1] p-12 flex items-center justify-center font-mono selection:bg-yellow-400">
      <div className="w-full max-w-5xl grid grid-cols-12 gap-8">
        
        {/* Story Intro */}
        <div className="col-span-12 mb-4 bg-white border-4 border-black p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex items-center gap-6">
          <div className="bg-yellow-400 p-4 border-2 border-black rotate-3">
            <Box className="w-8 h-8 text-black" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">The Story: The Data Refinery</h2>
            <p className="font-sans font-medium text-gray-700 mt-1">A form isn't a document; it's industrial machinery. You aren't asking questions; you are processing raw user input into refined business value. The UI is rugged, tactile, and heavy-duty.</p>
          </div>
        </div>

        {/* Builder Panel */}
        <div className="col-span-4 bg-[#f8fafc] border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col">
          <div className="bg-black text-white font-black p-3 uppercase tracking-widest text-xs flex justify-between items-center">
            <span>Assembly Line Tools</span>
            <span className="text-yellow-400">SYS_RDY</span>
          </div>
          <div className="p-4 space-y-4 flex-1 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
            {["Text Input Mechanism", "Boolean Switch", "Logic Router", "Data Output"].map((tool) => (
              <div key={tool} className="bg-white border-2 border-black p-3 font-bold text-sm shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_rgba(250,204,21,1)] cursor-pointer transition-all flex items-center gap-3">
                <div className="w-3 h-3 bg-black rounded-full" /> {tool}
              </div>
            ))}
          </div>
        </div>

        {/* Form Canvas */}
        <div className="col-span-8 bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-repeating-linear-gradient-to-r from-yellow-400 to-black" style={{ backgroundImage: "repeating-linear-gradient(45deg, #facc15, #facc15 10px, #000 10px, #000 20px)" }} />
          
          <div className="p-12 space-y-12 mt-4">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Vendor Onboarding Protocol</h1>
              <div className="bg-gray-200 text-gray-600 font-bold px-3 py-1 inline-block border-2 border-black uppercase text-xs">Processing Pipeline 01</div>
            </div>

            <div className="space-y-8">
              <div className="bg-[#f1f5f9] border-2 border-black p-6 relative group">
                <div className="absolute -top-3 left-4 bg-yellow-400 border-2 border-black px-2 py-0.5 font-black text-[10px] uppercase">Input_01</div>
                <label className="font-bold text-lg block mb-4 flex items-center gap-2">
                  <CornerDownRight className="w-5 h-5 text-gray-400" /> Enter Legal Entity Name
                </label>
                <input type="text" className="w-full bg-white border-2 border-black p-4 text-xl font-bold focus:outline-none focus:shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-shadow" placeholder="RAW TEXT STRING..." />
              </div>

              <div className="bg-[#f1f5f9] border-2 border-black p-6 relative group">
                <div className="absolute -top-3 left-4 bg-yellow-400 border-2 border-black px-2 py-0.5 font-black text-[10px] uppercase">Input_02</div>
                <label className="font-bold text-lg block mb-4 flex items-center gap-2">
                  <CornerDownRight className="w-5 h-5 text-gray-400" /> Select Operational Region
                </label>
                <select className="w-full bg-white border-2 border-black p-4 text-xl font-bold focus:outline-none focus:shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-shadow appearance-none cursor-pointer">
                  <option>North America Sector</option>
                  <option>EMEA Sector</option>
                  <option>APAC Sector</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-8">
              <button className="bg-black text-white border-2 border-black px-8 py-4 font-black uppercase tracking-widest text-lg hover:bg-yellow-400 hover:text-black transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,0.3)] flex items-center gap-3">
                Engage Pipeline <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 2. THE OFFICIAL DOSSIER (Tactile / Analog)
// ---------------------------------------------------------
function DossierTheme() {
  return (
    <div className="min-h-full bg-[#f5f0e6] p-12 flex items-center justify-center font-serif text-[#1c1917] selection:bg-[#c2410c] selection:text-white">
      
      <div className="w-full max-w-4xl relative">
        
        {/* Story Intro */}
        <div className="mb-12 bg-white border border-[#d6d3d1] p-6 shadow-sm flex items-start gap-6 font-sans">
          <Type className="w-8 h-8 text-[#c2410c] shrink-0 mt-1" />
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#1c1917]">The Story: The Official Dossier</h2>
            <p className="text-[#57534e] mt-1 leading-relaxed">You aren't sending a generic survey; you are conducting a professional interview. The UI mimics the tactile, high-stakes feel of a physical dossier or a typewriter. It feels incredibly official, trustworthy, and bespoke.</p>
          </div>
        </div>

        {/* Dossier Folder */}
        <div className="bg-[#ffedd5] p-2 shadow-xl border border-[#fdba74] relative">
          
          {/* Manila folder tab */}
          <div className="absolute -top-10 right-4 bg-[#ffedd5] border-t border-x border-[#fdba74] px-8 py-2 font-mono text-sm text-[#c2410c] font-bold rounded-t-lg">
            FILE_REF_8923
          </div>

          <div className="bg-white p-16 shadow-inner border border-[#fed7aa] min-h-[600px] relative">
            
            {/* Paper Texture */}
            <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-multiply" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cream-paper.png')" }} />

            <div className="relative z-10">
              <div className="border-b-2 border-[#1c1917] pb-6 mb-12 flex justify-between items-end">
                <div>
                  <div className="text-[#c2410c] font-sans font-bold tracking-widest uppercase text-xs mb-4 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Confidential Intake
                  </div>
                  <h1 className="text-5xl font-black tracking-tight" style={{ fontFamily: "'Courier New', Courier, monospace" }}>CANDIDATE INTERVIEW.</h1>
                </div>
                <div className="text-right font-sans text-xs text-[#a8a29e] uppercase tracking-widest font-bold">
                  Date: {new Date().toLocaleDateString()}<br/>
                  Page: 01 of 04
                </div>
              </div>

              <div className="space-y-12">
                
                <div className="group">
                  <label className="font-sans font-bold uppercase text-xs text-[#78716c] tracking-widest block mb-1">
                    01. State Your Full Legal Name
                  </label>
                  <input type="text" className="w-full bg-transparent border-b-2 border-[#d6d3d1] text-3xl pb-2 focus:outline-none focus:border-[#c2410c] font-bold text-[#1c1917] placeholder:text-[#d6d3d1] transition-colors" placeholder="Type here..." style={{ fontFamily: "'Courier New', Courier, monospace" }} />
                </div>

                <div className="group">
                  <label className="font-sans font-bold uppercase text-xs text-[#78716c] tracking-widest block mb-4">
                    02. Highest Level of Education Attained
                  </label>
                  <div className="grid grid-cols-2 gap-4 font-sans font-medium text-sm">
                    {["High School Diploma", "Bachelor's Degree", "Master's Degree", "Doctorate"].map((opt) => (
                      <div key={opt} className="border-2 border-[#d6d3d1] p-4 cursor-pointer hover:border-[#1c1917] hover:bg-[#fafaf9] transition-all flex items-center gap-3">
                        <div className="w-4 h-4 border-2 border-[#1c1917] rounded-full" /> {opt}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <div className="mt-16 pt-8 border-t border-[#d6d3d1]">
                <button className="bg-[#1c1917] text-white font-sans font-bold uppercase tracking-widest px-8 py-4 text-sm hover:bg-[#c2410c] transition-colors flex items-center gap-3">
                  Record Statement <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 3. THE CINEMATIC EDITORIAL (Storybook / Narrative)
// ---------------------------------------------------------
function EditorialTheme() {
  return (
    <div className="min-h-full bg-black text-white flex items-center justify-center font-serif relative overflow-hidden">
      
      {/* Cinematic Background Image with heavy overlay */}
      <div className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity" 
           style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600607686527-6fb886090705?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')" }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />

      <div className="w-full max-w-5xl relative z-10 flex gap-12 p-12">
        
        {/* Story Intro */}
        <div className="w-1/3 space-y-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl font-sans">
            <h2 className="text-xl font-bold tracking-tight mb-2">The Cinematic Editorial</h2>
            <p className="text-white/60 text-sm leading-relaxed">A form isn't a list; it's a narrative. You are guiding the user through a high-end, immersive storybook. Perfect for luxury brands, creative agencies, and companies that want to leave a breathtaking impression.</p>
          </div>
        </div>

        {/* Form Experience */}
        <div className="flex-1 space-y-24 pt-12">
          
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-[0.3em] font-sans text-white/50">Chapter I</div>
            <h1 className="text-6xl italic font-light tracking-tight leading-tight">Tell us about<br/>your vision.</h1>
          </div>

          <div className="space-y-16">
            <div className="relative group">
              <label className="absolute -left-12 top-4 text-xl text-white/30 font-light italic">1.</label>
              <h3 className="text-2xl mb-6">What is the name of your brand?</h3>
              <input type="text" className="w-full bg-transparent border-b border-white/20 pb-4 text-3xl font-light focus:outline-none focus:border-white transition-colors placeholder:text-white/20" placeholder="e.g. Maison Margiela" />
            </div>

            <div className="relative group">
              <label className="absolute -left-12 top-4 text-xl text-white/30 font-light italic">2.</label>
              <h3 className="text-2xl mb-8">Select the essence of your project.</h3>
              <div className="flex flex-col gap-4 font-sans text-sm tracking-widest uppercase">
                {["Brand Identity", "Digital Experience", "Physical Space", "Creative Campaign"].map((opt) => (
                  <label key={opt} className="flex items-center gap-6 cursor-pointer group/opt">
                    <span className="w-12 h-px bg-white/20 group-hover/opt:bg-white group-hover/opt:w-16 transition-all" />
                    <span className="text-white/50 group-hover/opt:text-white transition-colors">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-12">
            <button className="font-sans text-xs uppercase tracking-[0.3em] font-bold border-b border-white pb-2 hover:text-white/50 hover:border-white/50 transition-all flex items-center gap-4">
              Continue to Chapter II <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
