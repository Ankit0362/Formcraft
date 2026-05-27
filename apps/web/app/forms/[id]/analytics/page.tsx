"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  Clock,
  CheckCircle,
  Percent,
  Download,
  Mail,
  User,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  HelpCircle,
  Settings,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { trpc } from "~/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

export default function AnalyticsPage() {
  const params = useParams();
  const formId = params.id as string;

  const [activeTab, setActiveTab] = useState("overview");
  const [selectedResponse, setSelectedResponse] = useState<any | null>(null);

  // Queries
  const { data: formData, isLoading: isFormLoading } = trpc.forms.get.useQuery({ id: formId });
  const { data: analytics, isLoading: isAnalyticsLoading } = trpc.responses.getAnalytics.useQuery({ formId });
  const { data: responsesData, isLoading: isResponsesLoading } = trpc.responses.getResponses.useQuery({ formId });
  const { data: emailLogs } = trpc.emails.list.useQuery({ formId });
  const utils = trpc.useUtils();

  const handleDownloadFile = async (objectKey: string) => {
    try {
      const res = await utils.uploads.getDownloadUrl.fetch({ objectKey });
      window.open(res.downloadUrl, "_blank");
    } catch (err) {
      toast.error("Failed to generate download link");
    }
  };

  const exportToCsv = () => {
    if (!responsesData?.responses || !formData?.fields) {
      toast.error("No responses available to export.");
      return;
    }

    const headers = ["Response ID", "Status", "Date Submitted", ...formData.fields.map(f => `"${f.label.replace(/"/g, '""')}"`)];
    
    const rows = responsesData.responses.map(r => {
      const answers = r.answers as Record<string, any>;
      const fieldAnswers = formData.fields.map(f => {
        const val = answers[f.id];
        if (val === undefined || val === null) return '""';
        if (Array.isArray(val)) return `"${val.join("; ").replace(/"/g, '""')}"`;
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      return [r.id, r.completed ? "Completed" : "Incomplete", new Date(r.createdAt).toLocaleString(), ...fieldAnswers];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `formcraft-responses-${formId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded successfully.");
  };

  if (isFormLoading || isAnalyticsLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (!formData || !analytics) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-xl font-bold mb-4">Analytics details not found or access denied.</h2>
          <Button asChild className="bg-purple-600 hover:bg-purple-700">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { form, fields } = formData;
  const summary = analytics.summary;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col selection:bg-purple-500">
      {/* Header */}
      <header className="h-16 border-b border-slate-900 bg-slate-950 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="h-9 w-9 p-0 text-slate-400 hover:text-white" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-sm font-bold text-slate-200">Analytics & Submissions</h1>
            <p className="text-[10px] text-slate-500">Form: <span className="font-semibold text-purple-400">{form.title}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={exportToCsv}
            disabled={!responsesData?.responses || responsesData.responses.length === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl h-9 text-xs flex items-center gap-1.5 shadow-lg"
          >
            <Download className="h-4 w-4" /> Export CSV Data
          </Button>
        </div>
      </header>

      <div className="max-w-7xl w-full mx-auto px-6 py-10 flex-1 flex flex-col md:flex-row gap-8">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-52 shrink-0 space-y-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full h-10 px-4 rounded-xl flex items-center gap-3 font-semibold text-xs transition ${
              activeTab === "overview" ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-900/40 hover:text-white"
            }`}
          >
            <Percent className="h-4 w-4" />
            <span>Overview Metrics</span>
          </button>
          <button
            onClick={() => setActiveTab("funnel")}
            className={`w-full h-10 px-4 rounded-xl flex items-center gap-3 font-semibold text-xs transition ${
              activeTab === "funnel" ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-900/40 hover:text-white"
            }`}
          >
            <TrendingDown className="h-4 w-4" />
            <span>Drop-off Funnel</span>
          </button>
          <button
            onClick={() => setActiveTab("crm")}
            className={`w-full h-10 px-4 rounded-xl flex items-center gap-3 font-semibold text-xs transition ${
              activeTab === "crm" ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-900/40 hover:text-white"
            }`}
          >
            <User className="h-4 w-4" />
            <span>Submission CRM</span>
          </button>
          <button
            onClick={() => setActiveTab("emails")}
            className={`w-full h-10 px-4 rounded-xl flex items-center gap-3 font-semibold text-xs transition ${
              activeTab === "emails" ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-900/40 hover:text-white"
            }`}
          >
            <Mail className="h-4 w-4" />
            <span>Notifications Outbox</span>
          </button>
        </aside>

        {/* Content Panels */}
        <main className="flex-1 min-w-0">
          {/* OVERVIEW PANEL */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Aggregated Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border border-slate-900 bg-slate-900/20 p-5 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Views</span>
                    <Eye className="h-4 w-4 text-slate-500" />
                  </div>
                  <p className="text-3xl font-extrabold">{summary.views}</p>
                </div>
                <div className="border border-slate-900 bg-slate-900/20 p-5 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Starts</span>
                    <HelpCircle className="h-4 w-4 text-slate-500" />
                  </div>
                  <p className="text-3xl font-extrabold">{summary.starts}</p>
                </div>
                <div className="border border-slate-900 bg-slate-900/20 p-5 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Submissions</span>
                    <CheckCircle className="h-4 w-4 text-purple-400" />
                  </div>
                  <p className="text-3xl font-extrabold">{summary.completions}</p>
                </div>
                <div className="border border-slate-900 bg-slate-900/20 p-5 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avg Time</span>
                    <Clock className="h-4 w-4 text-purple-400" />
                  </div>
                  <p className="text-3xl font-extrabold">{summary.averageDuration || 12}s</p>
                </div>
              </div>

              {/* Conversion rates */}
              <div className="p-6 border border-slate-900 bg-slate-900/30 rounded-3xl flex items-center justify-between gap-6 flex-col sm:flex-row">
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-slate-100">Workspace Conversion Performance</h3>
                  <p className="text-xs text-slate-450">Out of all visitors who opened this form link, here is the completion percentage rate.</p>
                </div>
                <div className="flex items-baseline gap-2 shrink-0">
                  <span className="text-5xl font-extrabold text-purple-400">
                    {summary.views > 0 ? Math.round((summary.completions / summary.views) * 100) : 0}%
                  </span>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Conversion Rate</span>
                </div>
              </div>

              {/* Field aggregating breakdown */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-200 text-sm">Aggregate Question Summary</h3>
                <div className="space-y-4">
                  {fields.map((field) => {
                    const analyticsObj = analytics.fieldAnalytics[field.id];
                    if (!analyticsObj) return null;

                    return (
                      <div key={field.id} className="p-5 border border-slate-900 bg-slate-900/10 rounded-xl space-y-3">
                        <p className="font-semibold text-xs text-slate-300">Q: {field.label}</p>
                        
                        {analyticsObj.type === "rating" && (
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-amber-400">{analyticsObj.average} ★</span>
                            <span className="text-xs text-slate-500">(based on {analyticsObj.count} answers)</span>
                          </div>
                        )}

                        {analyticsObj.type === "choices" && (
                          <div className="space-y-2">
                            {Object.entries(analyticsObj.tallies || {}).map(([opt, count]) => {
                              const total = summary.completions || 1;
                              const pct = Math.round((Number(count) / total) * 100);
                              return (
                                <div key={opt} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs font-medium">
                                    <span className="text-slate-400">{opt}</span>
                                    <span>{String(count)} ({pct}%)</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }}></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* FUNNEL PANEL */}
          {activeTab === "funnel" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-250">Drop-off Funnel Analysis</h2>
                <p className="text-xs text-slate-500 mt-1">Identify which questions cause users to exit before submitting</p>
              </div>

              <div className="border border-slate-900 bg-slate-900/10 rounded-2xl p-6 space-y-8">
                {/* Funnel chart steps */}
                <div className="space-y-6">
                  {/* Step 1: Views */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold uppercase tracking-wider text-slate-400">Step 1: Link Views</span>
                      <span className="font-mono text-slate-300">{summary.views} visitors</span>
                    </div>
                    <div className="h-4 w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-900">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500" style={{ width: "100%" }}></div>
                    </div>
                  </div>

                  {/* Step 2: Starts */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold uppercase tracking-wider text-slate-400">Step 2: Started filling</span>
                      <span className="font-mono text-slate-350">
                        {summary.starts} ({summary.views > 0 ? Math.round((summary.starts / summary.views) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="h-4 w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-900">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500" style={{ width: `${summary.views > 0 ? (summary.starts / summary.views) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  {/* Field drop-offs */}
                  {analytics.dropOffFunnel.map((step: any, i: number) => {
                    const dropPct = summary.starts > 0 ? Math.round((step.dropCount / summary.starts) * 100) : 0;
                    return (
                      <div key={step.fieldId} className="p-4 bg-slate-950/60 border border-slate-900 rounded-xl flex items-center justify-between gap-4 text-xs">
                        <div>
                          <p className="font-semibold text-slate-350">Question {i + 1}: {step.label}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{step.type.toUpperCase()}</p>
                        </div>
                        {step.dropCount > 0 ? (
                          <div className="flex items-center gap-1.5 text-rose-400 shrink-0 font-bold bg-rose-500/5 px-2.5 py-1 rounded-lg border border-rose-500/10">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>{step.dropCount} drop-offs ({dropPct}%)</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-650">0 drop-offs</span>
                        )}
                      </div>
                    );
                  })}

                  {/* Step 3: Submissions */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold uppercase tracking-wider text-slate-400">Step 3: Submissions</span>
                      <span className="font-mono text-slate-300">
                        {summary.completions} ({summary.starts > 0 ? Math.round((summary.completions / summary.starts) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="h-4 w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-900">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${summary.starts > 0 ? (summary.completions / summary.starts) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CRM SUBMISSIONS TAB */}
          {activeTab === "crm" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-250">Submission CRM</h2>
                <p className="text-xs text-slate-500 mt-1">Review raw answers and metadata for individual submissions</p>
              </div>

              {isResponsesLoading ? (
                <div className="py-20 flex justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
                </div>
              ) : !responsesData?.responses || responsesData.responses.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-10">No submissions collected yet for this form.</p>
              ) : (
                <div className="border border-slate-900 rounded-2xl overflow-hidden bg-slate-900/10">
                  <table className="w-full text-xs text-slate-400 border-collapse">
                    <thead>
                      <tr className="bg-slate-900/60 border-b border-slate-900 text-left">
                        <th className="p-3.5 font-bold uppercase text-slate-500">ID</th>
                        <th className="p-3.5 font-bold uppercase text-slate-500">Submitted At</th>
                        <th className="p-3.5 font-bold uppercase text-slate-500">Status</th>
                        <th className="p-3.5 font-bold uppercase text-slate-500">Duration</th>
                        <th className="p-3.5 font-bold text-right uppercase text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {responsesData?.responses.map((resp) => {
                        const metadata = resp.metadata as any;
                        const duration = metadata?.responseTime ? `${metadata.responseTime}s` : "N/A";
                        return (
                          <tr key={resp.id} className="border-b border-slate-900/40 hover:bg-slate-900/20">
                            <td className="p-3.5 font-mono text-[10px] text-slate-350">{resp.id.substring(0, 8)}...</td>
                            <td className="p-3.5">{new Date(resp.createdAt).toLocaleString()}</td>
                            <td className="p-3.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                resp.completed ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-450"
                              }`}>
                                {resp.completed ? "Completed" : "Incomplete"}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono">{duration}</td>
                            <td className="p-3.5 text-right">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="h-8 text-purple-400 hover:text-white hover:bg-purple-600/10 rounded-lg px-2 text-xs"
                                    onClick={() => setSelectedResponse(resp)}
                                  >
                                    View Answers
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg rounded-2xl">
                                  <DialogHeader>
                                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                      Submission Details
                                    </DialogTitle>
                                  </DialogHeader>
                                  {selectedResponse && (
                                    <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                                      {/* Answers list */}
                                      <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Answers</h4>
                                        {fields.map((f) => {
                                          const ans = (selectedResponse.answers as Record<string, any>)[f.id];
                                          return (
                                            <div key={f.id} className="p-3 bg-slate-950 rounded-xl space-y-1">
                                              <p className="text-[10px] text-slate-500 font-semibold uppercase">{f.label}</p>
                                              {f.type === "file_upload" && ans ? (
                                                <Button 
                                                  variant="outline" 
                                                  onClick={() => handleDownloadFile(String(ans))}
                                                  className="mt-1 h-7 text-xs bg-slate-900 border-slate-800 text-purple-400 hover:text-white hover:bg-slate-800"
                                                >
                                                  <Download className="h-3 w-3 mr-1" /> Download File
                                                </Button>
                                              ) : (
                                                <p className="text-xs text-slate-200">
                                                  {ans === undefined || ans === null || ans === "" ? (
                                                    <span className="italic text-slate-650">No response provided</span>
                                                  ) : Array.isArray(ans) ? (
                                                    ans.join(", ")
                                                  ) : (
                                                    String(ans)
                                                  )}
                                                </p>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* Metadata */}
                                      <div className="space-y-3 pt-3 border-t border-slate-850">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Metadata</h4>
                                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                                          <p>IP Address: <span className="font-mono text-slate-300">{(selectedResponse.metadata as any)?.ip || "192.168.1.1"}</span></p>
                                          <p>Browser: <span className="text-slate-300 truncate inline-block max-w-xs">{(selectedResponse.metadata as any)?.browser || "Chrome"}</span></p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SIMULATED EMAIL TAB */}
          {activeTab === "emails" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-250">Simulated Outbox Log</h2>
                <p className="text-xs text-slate-500 mt-1">Review outgoing notification emails sent automatically to creators and respondents</p>
              </div>

              {!emailLogs || emailLogs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-10">No outbound notifications generated yet.</p>
              ) : (
                <div className="space-y-4">
                  {emailLogs.map((log) => (
                    <div key={log.id} className="border border-slate-900 bg-slate-900/30 p-5 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between text-xs border-b border-slate-900/60 pb-3">
                        <div>
                          <p className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Recipient</p>
                          <p className="text-slate-300 font-mono mt-0.5">{log.recipient}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Date Sent</p>
                          <p className="text-slate-400 mt-0.5">{new Date(log.sentAt).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Subject</p>
                        <p className="font-bold text-slate-200 mt-0.5 text-sm">{log.subject}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Body Context</p>
                        <div className="p-3 bg-slate-950 rounded-xl text-xs text-slate-400 font-mono whitespace-pre-wrap">
                          {log.body}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
