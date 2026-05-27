"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Key, Webhook, Trash2, Copy, Activity } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "~/trpc/client";

const brutalIn = { hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.1 } } };
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

export function DevelopersTab() {
  const [apiKeyName, setApiKeyName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  const utils = trpc.useUtils();
  const { data: apiKeys } = trpc.apikeys.list.useQuery();
  const { data: webhooks } = trpc.webhooks.list.useQuery();
  const { data: webhookLogs } = trpc.webhooks.getLogs.useQuery();

  const copyToClipboard = (text: string, msg: string) => {
    navigator.clipboard.writeText(text);
    toast.success(msg);
  };

  const createApiKeyMutation = trpc.apikeys.create.useMutation({
    onSuccess: (data) => {
      toast.success(`API Key "${data.name}" generated.`);
      setApiKeyName("");
      utils.apikeys.list.invalidate();
    },
  });

  const deleteApiKeyMutation = trpc.apikeys.delete.useMutation({
    onSuccess: () => { toast.success("API Key deleted."); utils.apikeys.list.invalidate(); },
  });

  const createWebhookMutation = trpc.webhooks.create.useMutation({
    onSuccess: () => {
      toast.success("Webhook configured successfully.");
      setWebhookUrl("");
      utils.webhooks.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to configure webhook."),
  });

  const deleteWebhookMutation = trpc.webhooks.delete.useMutation({
    onSuccess: () => { toast.success("Webhook removed."); utils.webhooks.list.invalidate(); },
  });

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-12">
      <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0_0_#000]">
        <h2 className="text-4xl font-black uppercase tracking-tighter">DEVELOPER SETTINGS</h2>
        <p className="font-mono text-xs font-bold uppercase text-gray-500 mt-2">MANAGE API KEYS AND WEBHOOKS</p>
      </div>

      {/* API Keys */}
      <motion.div variants={brutalIn} className="bg-white border-4 border-black p-8 shadow-[8px_8px_0_0_#000]">
        <h3 className="text-2xl font-black uppercase mb-6 flex items-center gap-3"><Key className="w-6 h-6"/> API KEYS</h3>
        <div className="flex flex-col sm:flex-row items-stretch gap-4 mb-8">
          <input type="text" placeholder="Key Name (e.g. Zapier Integration)" value={apiKeyName} onChange={e => setApiKeyName(e.target.value)} className="brutal-input flex-1" />
          <button disabled={!apiKeyName || createApiKeyMutation.isPending} onClick={() => createApiKeyMutation.mutate({ name: apiKeyName })} className="brutal-btn-primary">
            {createApiKeyMutation.isPending ? "CREATING..." : "CREATE KEY"}
          </button>
        </div>
        <div className="space-y-4">
          {apiKeys?.map(key => (
            <div key={key.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-100 border-2 border-black">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <span className="font-black uppercase bg-black text-white px-2 py-1 text-xs">{key.name}</span>
                <code className="text-sm font-mono font-bold text-gray-600 bg-gray-200 px-2 py-1 border border-gray-300">{key.key.substring(0, 24)}...</code>
              </div>
              <div className="flex gap-2 mt-4 sm:mt-0">
                <button onClick={() => copyToClipboard(key.key, "API KEY COPIED.")} className="bg-white border-2 border-black p-2 hover:bg-[var(--caution)] transition-colors"><Copy className="w-4 h-4" /></button>
                <button onClick={() => deleteApiKeyMutation.mutate({ id: key.id })} className="bg-white border-2 border-black p-2 hover:bg-red-500 hover:text-white transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Webhooks */}
      <motion.div variants={brutalIn} className="bg-white border-4 border-black p-8 shadow-[8px_8px_0_0_#000]">
        <h3 className="text-2xl font-black uppercase mb-6 flex items-center gap-3"><Webhook className="w-6 h-6"/> WEBHOOKS</h3>
        <div className="flex flex-col sm:flex-row items-stretch gap-4 mb-8">
          <input type="url" placeholder="https://endpoint.local/receive" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} className="brutal-input flex-1 font-mono" />
          <button disabled={!webhookUrl || createWebhookMutation.isPending} onClick={() => createWebhookMutation.mutate({ url: webhookUrl })} className="brutal-btn">
            {createWebhookMutation.isPending ? "ADDING..." : "ADD WEBHOOK"}
          </button>
        </div>
        <div className="space-y-4 mb-12">
          {webhooks?.map(wh => (
            <div key={wh.id} className="flex items-center justify-between p-4 bg-gray-100 border-2 border-black">
              <span className="font-mono text-sm font-bold">{wh.url}</span>
              <button onClick={() => deleteWebhookMutation.mutate({ id: wh.id })} className="bg-white border-2 border-black p-2 hover:bg-red-500 hover:text-white transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>

        <div className="border-t-4 border-black pt-8">
          <h4 className="text-lg font-black uppercase mb-4 flex items-center gap-2"><Activity className="w-5 h-5"/> WEBHOOK LOGS</h4>
          <div className="bg-black text-[var(--caution)] p-4 font-mono text-sm h-64 overflow-y-auto border-4 border-gray-800">
            {webhookLogs?.length === 0 && <div>NO LOGS FOUND.</div>}
            {webhookLogs?.map(log => (
              <div key={log.id} className="flex gap-4 py-2 border-b border-gray-800 hover:bg-gray-900 transition-colors">
                <span className="w-24 opacity-70">{new Date(log.deliveredAt).toLocaleTimeString()}</span>
                <span className={`w-12 font-bold ${log.responseStatus === 200 ? 'text-green-500' : 'text-red-500'}`}>[{log.responseStatus}]</span>
                <span className="flex-1 truncate text-white">{log.event}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
