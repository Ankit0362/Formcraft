"use client";

import React from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Trash2, ChevronUp, ChevronDown, PlusCircle, Filter, GitBranch } from "lucide-react";
import type { FieldItem } from "~/hooks/use-form-builder";
import { getTheme } from "~/lib/themes";

interface BuilderCanvasProps {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  theme: string;
  fields: FieldItem[];
  selectedFieldId: string | null;
  setSelectedFieldId: (id: string | null) => void;
  draggedIndex: number | null;
  onDragStart: (i: number) => void;
  onDragEnter: (i: number) => void;
  onDragEnd: () => void;
  onMoveField: (i: number, dir: "up" | "down") => void;
  onRemoveField: (i: number) => void;
  onUpdateField: (i: number, key: keyof FieldItem, value: any) => void;
  onAddOption: (fi: number) => void;
  onRemoveOption: (fi: number, oi: number) => void;
  onUpdateOption: (fi: number, oi: number, val: string) => void;
}

export function BuilderCanvas({
  title, setTitle, description, setDescription, theme,
  fields, selectedFieldId, setSelectedFieldId,
  draggedIndex, onDragStart, onDragEnter, onDragEnd,
  onMoveField, onRemoveField, onUpdateField,
  onAddOption, onRemoveOption, onUpdateOption,
}: BuilderCanvasProps) {
  const t = getTheme(theme);

  const getThemeWrapperStyles = () => `${t.card} relative group transition-all duration-300`;
  const getThemeActiveStyles = () => `${t.card} relative group transition-all duration-300 ring-2 ring-blue-500 -translate-y-1 shadow-lg`;

  return (
    <main className={`flex-1 p-8 overflow-y-auto flex justify-center custom-scrollbar transition-colors duration-300 ${t.convBg}`}>
      <div className="max-w-2xl w-full space-y-6">
        {/* Title Block */}
        <div className={`${t.cardPadding} ${t.titleLayout} ${t.divider} ${getThemeWrapperStyles()}`}>
          <div className="absolute top-0 right-0 font-mono text-[10px] font-bold px-2 py-1 uppercase tracking-widest bg-gray-200 text-gray-800">FORM METADATA</div>
          <input type="text" placeholder="Form Title (Click to edit)" value={title} onChange={(e) => setTitle(e.target.value)} className={`w-full bg-transparent border-b-2 border-transparent hover:border-current focus:border-current focus:outline-none py-2 placeholder:opacity-40 transition-colors ${t.title}`} />
          <textarea placeholder="Form description (click to edit)..." value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`w-full bg-transparent border-b border-transparent hover:border-current focus:border-current focus:outline-none py-1 placeholder:opacity-40 resize-none transition-colors opacity-75 ${t.muted}`} />
        </div>

        {/* Fields List */}
        {fields.length === 0 ? (
          <div className={`border-4 border-dashed py-24 text-center ${getThemeWrapperStyles()}`}>
            <PlusCircle className="h-8 w-8 text-black mx-auto mb-3" />
            <p className="text-xs text-black font-black uppercase">Your form workspace is empty. Add a field from the left sidebar to start building.</p>
          </div>
        ) : (
          <div className={t.fieldGap}>
            {fields.map((field, idx) => (
              <div
                key={field.id || idx}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragEnter={() => onDragEnter(idx)}
                onDragEnd={onDragEnd}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => setSelectedFieldId(idx.toString())}
                className={`${t.cardPadding} flex flex-col justify-between font-sans cursor-move ${selectedFieldId === idx.toString() ? getThemeActiveStyles() : getThemeWrapperStyles()} ${draggedIndex === idx ? "opacity-50 scale-[0.98] border-dashed" : "opacity-100"}`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className={`flex-1 ${t.labelSpacing}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-gray-200 text-gray-800">Q{idx + 1}: {field.type.replace("_", " ")}</span>
                      {field.required && <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider bg-red-50 px-2 py-0.5 border border-red-300">* Required</span>}
                    </div>
                    <input type="text" value={field.label} onChange={(e) => onUpdateField(idx, "label", e.target.value)} className={`w-full bg-transparent border-b-2 border-transparent hover:border-current focus:border-current focus:outline-none py-0.5 transition-colors ${t.label}`} />

                    {["short_text", "long_text", "email", "number"].includes(field.type) && (
                      <div className={`w-full px-3 flex items-center opacity-50 ${t.input}`}>
                        <input type="text" placeholder={field.placeholder || "Enter placeholder hint..."} value={field.placeholder || ""} onChange={(e) => onUpdateField(idx, "placeholder", e.target.value)} className="w-full bg-transparent focus:outline-none h-12" />
                      </div>
                    )}

                    {["select", "multi_select", "checkbox", "matrix"].includes(field.type) && (
                      <div className="space-y-2 pt-2 border-t-4 border-black mt-4">
                        <label className="text-[10px] font-black text-black uppercase tracking-wider bg-gray-200 px-2 py-0.5 inline-block">Choice Options</label>
                        <div className="space-y-1.5 mt-2">
                          {(field.options || []).map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <Input type="text" value={opt} onChange={(e) => onUpdateOption(idx, optIdx, e.target.value)} className="h-9 bg-white border-2 border-black text-xs font-bold text-black rounded-none shadow-[2px_2px_0_0_#000] focus-visible:ring-0" />
                              <Button variant="ghost" className="h-9 w-9 text-black border-2 border-transparent hover:border-black hover:bg-gray-100 p-0 rounded-none shrink-0" onClick={() => onRemoveOption(idx, optIdx)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                            </div>
                          ))}
                          <Button variant="outline" className="h-9 border-2 border-black bg-white text-black hover:bg-gray-100 rounded-none text-xs font-black uppercase mt-2 shadow-[2px_2px_0_0_#000] transition-all" onClick={() => onAddOption(idx)}>+ Add Option</Button>
                        </div>
                      </div>
                    )}

                    {field.type === "payment" && (
                      <div className="mt-4 p-4 border-4 border-black bg-white shadow-[4px_4px_0_0_#000] space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-black font-black uppercase tracking-wider">Checkout Total</span>
                          <span className="font-bold text-black font-mono bg-[var(--caution)] px-2 py-0.5 border border-black">$50.00 USD</span>
                        </div>
                        <Button disabled className="w-full bg-gray-200 text-gray-400 border-2 border-gray-300 font-black uppercase rounded-none text-xs h-10">Pay with Stripe</Button>
                      </div>
                    )}

                    {field.type === "file_upload" && (
                      <div className="mt-4 border-4 border-dashed border-black bg-gray-100 p-6 text-center">
                        <p className="text-[10px] text-black font-black uppercase">Drop files here or click to upload</p>
                      </div>
                    )}

                    {field.type === "nps" && (
                      <div className="mt-4 flex gap-1 justify-between max-w-lg flex-wrap">
                        {[0,1,2,3,4,5,6,7,8,9,10].map((num) => (
                          <div key={num} className={`w-8 h-8 flex items-center justify-center font-bold text-xs opacity-50 ${t.optionChip}`}>{num}</div>
                        ))}
                      </div>
                    )}

                    {field.type === "slider" && (
                      <div className="mt-4 max-w-lg">
                        <input type="range" min="0" max="100" className="w-full opacity-50" disabled />
                        <div className="flex justify-between text-xs font-bold text-gray-500 mt-1"><span>0</span><span>100</span></div>
                      </div>
                    )}

                    {field.type === "matrix" && (
                      <div className="mt-4 w-full overflow-x-auto opacity-50 border-2 border-black p-2 bg-gray-50">
                        <table className="w-full text-left text-xs font-bold">
                          <thead><tr><th className="p-2 border-b-2 border-black"></th>{[1,2,3,4,5].map(n => <th key={n} className="p-2 border-b-2 border-black text-center">{n}</th>)}</tr></thead>
                          <tbody>{(field.options || ["Option A", "Option B"]).map((opt, i) => (<tr key={i}><td className="p-2 border-b border-gray-300">{opt}</td>{[1,2,3,4,5].map(n => <td key={n} className="p-2 border-b border-gray-300 text-center"><input type="radio" disabled /></td>)}</tr>))}</tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <Button variant="ghost" className="h-8 w-8 p-0 text-black border-2 border-transparent hover:border-black hover:bg-gray-100 rounded-none" onClick={(e) => { e.stopPropagation(); onMoveField(idx, "up"); }}><ChevronUp className="h-5 w-5" /></Button>
                    <Button variant="ghost" className="h-8 w-8 p-0 text-black border-2 border-transparent hover:border-black hover:bg-gray-100 rounded-none" onClick={(e) => { e.stopPropagation(); onMoveField(idx, "down"); }}><ChevronDown className="h-5 w-5" /></Button>
                  </div>
                </div>

                <div className={`flex items-center justify-between border-t pt-4 mt-2 text-xs font-black uppercase ${t.divider}`}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={field.required} onChange={(e) => onUpdateField(idx, "required", e.target.checked)} className="rounded-none h-4 w-4 border-2 border-black text-black focus:ring-0 bg-white" />
                    <span>Required Question</span>
                  </label>
                  <Button variant="ghost" className="text-red-600 hover:text-white hover:bg-red-600 border-2 border-transparent hover:border-black h-8 rounded-none px-2 flex items-center gap-1 transition-colors" onClick={(e) => { e.stopPropagation(); onRemoveField(idx); }}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete Field
                  </Button>
                </div>

                {/* Validation Rules */}
                {["short_text", "long_text", "number", "email"].includes(field.type) && (
                  <div className="border-t-4 border-black pt-3 mt-4 space-y-2">
                    <button type="button" onClick={(e) => { e.stopPropagation(); onUpdateField(idx, "validationRules", field.validationRules ? null : { min: "", max: "", regex: "" }); }} className="text-[10px] font-black uppercase text-black bg-gray-200 px-2 py-1 border-2 border-black flex items-center gap-1 hover:bg-gray-300 transition-colors shadow-[2px_2px_0_0_#000]">
                      <Filter className="h-3 w-3" />{field.validationRules ? "Hide" : "Add"} Validation Rules
                    </button>
                    {field.validationRules && (
                      <div className="grid grid-cols-3 gap-2 bg-gray-100 border-2 border-black p-3 mt-2">
                        {["min", "max", "regex"].map((k) => (
                          <div key={k} className="space-y-1">
                            <label className="text-[10px] font-black text-black uppercase">{k}</label>
                            <Input type={k === "regex" ? "text" : "number"} placeholder={k === "regex" ? "^[A-Z].*" : k === "min" ? "Min" : "Max"} value={field.validationRules?.[k] ?? ""} onChange={(e) => { e.stopPropagation(); onUpdateField(idx, "validationRules", { ...field.validationRules, [k]: e.target.value }); }} className="h-8 bg-white border-2 border-black text-xs font-bold text-black rounded-none focus-visible:ring-0 shadow-[2px_2px_0_0_#000]" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Conditional Logic */}
                {fields.length > 1 && (
                  <div className="border-t-4 border-black pt-3 mt-4 space-y-2">
                    <button type="button" onClick={(e) => { e.stopPropagation(); onUpdateField(idx, "conditionalLogic", field.conditionalLogic ? null : { dependOnField: "", operator: "equals", value: "", action: "show" }); }} className="text-[10px] font-black uppercase text-black bg-[var(--caution)] px-2 py-1 border-2 border-black flex items-center gap-1 hover:bg-yellow-300 transition-colors shadow-[2px_2px_0_0_#000]">
                      <GitBranch className="h-3 w-3" />{field.conditionalLogic ? "Remove" : "Add"} Skip Logic
                    </button>
                    {field.conditionalLogic && (
                      <div className="p-4 bg-gray-100 border-4 border-black space-y-3 mt-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-black uppercase">If Question</label>
                            <select value={field.conditionalLogic?.dependOnField ?? ""} onChange={(e) => { e.stopPropagation(); onUpdateField(idx, "conditionalLogic", { ...field.conditionalLogic, dependOnField: e.target.value }); }} className="w-full h-9 bg-white border-2 border-black text-black font-bold rounded-none px-2 text-xs focus:outline-none shadow-[2px_2px_0_0_#000]">
                              <option value="">Select question...</option>
                              {fields.filter((_, fi) => fi !== idx).map((f, fi) => { const aIdx = fi >= idx ? fi + 1 : fi; return <option key={f.id || aIdx} value={f.id || String(aIdx)}>Q{aIdx + 1}: {f.label.substring(0, 30)}</option>; })}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-black uppercase">Operator</label>
                            <select value={field.conditionalLogic?.operator ?? "equals"} onChange={(e) => { e.stopPropagation(); onUpdateField(idx, "conditionalLogic", { ...field.conditionalLogic, operator: e.target.value }); }} className="w-full h-9 bg-white border-2 border-black text-black font-bold rounded-none px-2 text-xs focus:outline-none shadow-[2px_2px_0_0_#000]">
                              {["equals", "not_equals", "contains", "greater_than", "less_than"].map(op => <option key={op} value={op}>{op.replace("_", " ")}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-black uppercase">Value</label>
                            <Input type="text" placeholder="Expected answer..." value={field.conditionalLogic?.value ?? ""} onChange={(e) => { e.stopPropagation(); onUpdateField(idx, "conditionalLogic", { ...field.conditionalLogic, value: e.target.value }); }} className="h-9 bg-white border-2 border-black text-xs font-bold text-black rounded-none focus-visible:ring-0 shadow-[2px_2px_0_0_#000]" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-black uppercase">Then</label>
                            <select value={field.conditionalLogic?.action ?? "show"} onChange={(e) => { e.stopPropagation(); onUpdateField(idx, "conditionalLogic", { ...field.conditionalLogic, action: e.target.value }); }} className="w-full h-9 bg-white border-2 border-black text-black font-bold rounded-none px-2 text-xs focus:outline-none shadow-[2px_2px_0_0_#000]">
                              <option value="show">Show this question</option>
                              <option value="hide">Hide this question</option>
                              <option value="skip">Skip to this question</option>
                            </select>
                          </div>
                        </div>
                        <p className="text-[10px] font-bold text-black bg-white px-2 py-1 border-l-4 border-[var(--caution)] inline-block">💡 This question will be conditionally {field.conditionalLogic?.action === "hide" ? "hidden" : "shown"} based on the selected rule.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
