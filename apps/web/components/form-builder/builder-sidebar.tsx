"use client";

import React from "react";
import { Plus } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { PanelType } from "~/hooks/use-form-builder";

const FIELD_TYPES = [
  { type: "short_text", name: "Short Text" },
  { type: "long_text", name: "Long Text" },
  { type: "email", name: "Email Address" },
  { type: "number", name: "Number" },
  { type: "select", name: "Single Select" },
  { type: "checkbox", name: "Checkboxes" },
  { type: "rating", name: "Rating Star" },
  { type: "date", name: "Date Select" },
  { type: "file_upload", name: "File Upload" },
  { type: "payment", name: "Payment" },
  { type: "nps", name: "NPS (0-10)" },
  { type: "matrix", name: "Matrix (Likert)" },
  { type: "slider", name: "Range Slider" },
];



interface BuilderSidebarProps {
  activePanel: PanelType;
  setActivePanel: (p: PanelType) => void;
  status: string;
  setStatus: (s: any) => void;
  visibility: string;
  setVisibility: (v: any) => void;
  layoutType: string;
  setLayoutType: (l: any) => void;
  customSlug: string;
  setCustomSlug: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  expiryDate: string;
  setExpiryDate: (v: string) => void;
  responseLimit: number | "";
  setResponseLimit: (v: number | "") => void;
  formId: string;
  onAddField: (type: string) => void;
  onPublishTemplate: () => void;
  isPublishing: boolean;
}

export function BuilderSidebar({
  activePanel, setActivePanel,
  status, setStatus, visibility, setVisibility,
  layoutType, setLayoutType, customSlug, setCustomSlug,
  password, setPassword, expiryDate, setExpiryDate,
  responseLimit, setResponseLimit, formId,
  onAddField, onPublishTemplate, isPublishing,
}: BuilderSidebarProps) {
  return (
    <aside className="w-full md:w-80 h-auto md:h-full border-b-4 md:border-b-0 md:border-r-4 border-black bg-white p-6 flex flex-col justify-between overflow-y-auto shrink-0 max-h-[40vh] md:max-h-full z-10">
      <div className="space-y-6">
        {/* Panel Switcher */}
        <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 border-2 border-black shadow-[4px_4px_0_0_#000]">
          {(["fields", "settings"] as PanelType[]).map((p) => (
            <button key={p} onClick={() => setActivePanel(p)} className={`py-1.5 text-xs font-black uppercase border-2 transition-all capitalize ${activePanel === p ? "bg-[var(--caution)] text-black border-black" : "border-transparent text-gray-500 hover:text-black"}`}>
              {p}
            </button>
          ))}
        </div>

        {/* FIELDS PANEL */}
        {activePanel === "fields" && (
          <div className="space-y-6">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-black bg-gray-200 inline-block px-2 py-0.5 border border-black">Question Types</h3>
            <div className="grid grid-cols-2 gap-2">
              {FIELD_TYPES.map((btn) => (
                <button key={btn.type} onClick={() => onAddField(btn.type)} className="h-10 bg-white hover:bg-[var(--caution)] border-2 border-black flex items-center justify-start px-2 gap-1.5 text-[10px] font-black uppercase text-black transition-colors shadow-[2px_2px_0_0_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none">
                  <Plus className="h-3 w-3" /><span>{btn.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}



        {/* SETTINGS PANEL */}
        {activePanel === "settings" && (
          <div className="space-y-6">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-black bg-gray-200 inline-block px-2 py-0.5 border border-black">Form Settings</h3>

            {[
              { label: "Publish State", value: status, onChange: setStatus, options: [{ v: "draft", l: "Draft (Editor Only)" }, { v: "published", l: "Published (Live & Open)" }, { v: "unpublished", l: "Unpublished (Closed)" }] },
              { label: "Visibility Mode", value: visibility, onChange: setVisibility, options: [{ v: "public", l: "Public (Visible in gallery)" }, { v: "unlisted", l: "Unlisted (Link only)" }] },
              { label: "Layout Template", value: layoutType, onChange: setLayoutType, options: [{ v: "conversational", l: "Conversational slider" }, { v: "classic", l: "Classic scrollable form" }] },
            ].map(({ label, value, onChange, options }) => (
              <div key={label} className="space-y-1.5">
                <label className="text-[10px] font-black text-black uppercase tracking-wider">{label}</label>
                <select value={value} onChange={(e) => onChange(e.target.value as any)} className="w-full h-10 bg-white border-2 border-black text-black px-3 text-xs font-bold focus:outline-none shadow-[2px_2px_0_0_#000]">
                  {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            ))}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-black uppercase tracking-wider">Custom Link Slug</label>
              <Input type="text" placeholder="e.g. game-trivia-2026" value={customSlug} onChange={(e) => setCustomSlug(e.target.value)} className="h-10 bg-white border-2 border-black text-black text-xs font-bold shadow-[2px_2px_0_0_#000] focus-visible:ring-0 rounded-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-black uppercase tracking-wider">Password Protected</label>
              <Input type="password" placeholder="Enter password access code" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 bg-white border-2 border-black text-black text-xs font-bold shadow-[2px_2px_0_0_#000] focus-visible:ring-0 rounded-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-black uppercase tracking-wider">Expiry Date</label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="h-10 bg-white border-2 border-black text-black text-xs font-bold shadow-[2px_2px_0_0_#000] focus-visible:ring-0 rounded-none" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-black uppercase tracking-wider">Response Limit</label>
              <Input type="number" placeholder="Unlimited" value={responseLimit} onChange={(e) => setResponseLimit(e.target.value ? Number(e.target.value) : "")} className="h-10 bg-white border-2 border-black text-black text-xs font-bold shadow-[2px_2px_0_0_#000] focus-visible:ring-0 rounded-none" />
            </div>

            <div className="space-y-1.5 pt-4 border-t-2 border-black">
              <label className="text-[10px] font-black text-black uppercase tracking-wider flex items-center justify-between">
                Embed Snippet
                <button onClick={() => { const snippet = `<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/share/${customSlug || formId}?embed=true" width="100%" height="600" frameborder="0" allowtransparency="true"></iframe>`; navigator.clipboard.writeText(snippet); toast.success("Embed snippet copied!"); }} className="text-black bg-[var(--caution)] hover:bg-yellow-300 border-2 border-black px-2 py-0.5 flex items-center gap-1 shadow-[2px_2px_0_0_#000] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none transition-all">
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </label>
              <textarea readOnly rows={4} value={`<iframe \n  src="${typeof window !== 'undefined' ? window.location.origin : ''}/share/${customSlug || formId}?embed=true"\n  width="100%" \n  height="600"\n  frameborder="0"\n  allowtransparency="true"\n></iframe>`} className="w-full bg-gray-100 border-2 border-black text-black p-3 text-[10px] font-mono font-bold focus:outline-none resize-none shadow-[2px_2px_0_0_#000]" />
            </div>

            <div className="space-y-1.5 pt-4 border-t-2 border-black">
              <label className="text-[10px] font-black text-black uppercase tracking-wider">Community Marketplace</label>
              <p className="text-[10px] text-gray-500 font-bold mb-2">Publish this form as a template to the marketplace.</p>
              <button onClick={onPublishTemplate} disabled={isPublishing} className="w-full h-10 bg-black text-white hover:bg-gray-800 border-2 border-black font-black uppercase text-xs flex items-center justify-center gap-2 shadow-[2px_2px_0_0_var(--caution)] transition-all">
                {isPublishing ? "Publishing..." : "Publish as Template"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 mt-6 bg-white border-4 border-black shadow-[4px_4px_0_0_var(--caution)] text-[10px] font-bold text-black uppercase leading-relaxed">
        💡 Pro tip: Always hit the <strong>"Save Form"</strong> button on the header to commit field changes.
      </div>
    </aside>
  );
}
