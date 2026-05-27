"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Eye, Copy, RefreshCw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { useFormBuilder } from "~/hooks/use-form-builder";
import { BuilderSidebar } from "~/components/form-builder/builder-sidebar";
import { BuilderCanvas } from "~/components/form-builder/builder-canvas";

export default function FormBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;

  const builder = useFormBuilder(formId);

  if (builder.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 text-black flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-black animate-spin" />
      </div>
    );
  }

  if (!builder.data) {
    return (
      <div className="min-h-screen bg-gray-50 text-black flex items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-xl font-bold mb-4">Form not found or access denied.</h2>
          <Button asChild className="brutal-btn">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans flex flex-col selection:bg-[var(--caution)] selection:text-black h-screen overflow-hidden">
      
      {/* Editor Header */}
      <header className="h-16 border-b-4 border-black bg-white px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="h-9 w-9 p-0 text-black hover:bg-gray-200 border-2 border-transparent hover:border-black rounded-none" asChild>
            <Link href="/dashboard"><ArrowLeft className="h-5 w-5 font-black" /></Link>
          </Button>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tighter">{builder.title || "Untitled Form"}</h1>
            <p className="text-[10px] font-mono text-gray-500 font-bold uppercase">
              Status: <span className="text-black bg-[var(--caution)] px-1">{builder.status}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-2 border-black bg-white text-black hover:bg-gray-100 h-9 rounded-none text-xs font-black uppercase flex items-center gap-1.5 shadow-[2px_2px_0_0_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all" onClick={builder.copyShareLink}>
            <Copy className="h-3.5 w-3.5" /> Copy Link
          </Button>
          <Button variant="outline" className="border-2 border-black bg-white text-black hover:bg-gray-100 h-9 rounded-none text-xs font-black uppercase flex items-center gap-1.5 shadow-[2px_2px_0_0_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all" asChild>
            <Link href={`/share/${formId}?preview=true`} target="_blank">
              <Eye className="h-3.5 w-3.5 mr-1" /> View Live
            </Link>
          </Button>
          {builder.status === "draft" && (
            <Button
              onClick={builder.handlePublish}
              disabled={builder.isSaving}
              className="border-2 border-black bg-black hover:bg-gray-800 text-white font-black uppercase rounded-none h-9 text-xs flex items-center gap-1.5 shadow-[2px_2px_0_0_var(--caution)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
            >
              {builder.isSaving ? "Publishing..." : "Publish Live"}
            </Button>
          )}
          <Button
            onClick={builder.handleSaveAll}
            disabled={builder.isSaving}
            className="border-2 border-black bg-[var(--caution)] hover:bg-yellow-300 text-black font-black uppercase rounded-none h-9 text-xs flex items-center gap-1.5 shadow-[2px_2px_0_0_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
          >
            <Save className="h-3.5 w-3.5" /> {builder.isSaving ? "Saving..." : "Save Draft"}
          </Button>
        </div>
      </header>

      {/* Editor Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <BuilderSidebar
          activePanel={builder.activePanel}
          setActivePanel={builder.setActivePanel}
          status={builder.status}
          setStatus={builder.setStatus}
          visibility={builder.visibility}
          setVisibility={builder.setVisibility}
          layoutType={builder.layoutType}
          setLayoutType={builder.setLayoutType}
          customSlug={builder.customSlug}
          setCustomSlug={builder.setCustomSlug}
          password={builder.password}
          setPassword={builder.setPassword}
          expiryDate={builder.expiryDate}
          setExpiryDate={builder.setExpiryDate}
          responseLimit={builder.responseLimit}
          setResponseLimit={builder.setResponseLimit}
          formId={formId}
          onAddField={builder.addField}
          onPublishTemplate={() => {
            if (confirm("Are you sure you want to publish this to the public marketplace?")) {
              builder.publishTemplateMutation.mutate({ formId, industry: "General", price: 0 });
            }
          }}
          isPublishing={builder.publishTemplateMutation.isPending}
        />

        <BuilderCanvas
          title={builder.title}
          setTitle={builder.setTitle}
          description={builder.description}
          setDescription={builder.setDescription}
          theme={builder.theme}
          fields={builder.fields}
          selectedFieldId={builder.selectedFieldId}
          setSelectedFieldId={builder.setSelectedFieldId}
          draggedIndex={builder.draggedIndex}
          onDragStart={builder.handleDragStart}
          onDragEnter={builder.handleDragEnter}
          onDragEnd={builder.handleDragEnd}
          onMoveField={builder.moveField}
          onRemoveField={builder.removeField}
          onUpdateField={builder.updateFieldDetails}
          onAddOption={builder.handleAddOption}
          onRemoveOption={builder.handleRemoveOption}
          onUpdateOption={builder.handleUpdateOption}
        />
      </div>
    </div>
  );
}
