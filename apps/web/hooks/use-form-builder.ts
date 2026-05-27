import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { trpc } from "~/trpc/client";

export interface FieldItem {
  id?: string;
  type: string;
  label: string;
  placeholder: string;
  required: boolean;
  order: number;
  options: string[] | null;
  validationRules: any | null;
  conditionalLogic: any | null;
}

export type PanelType = "fields" | "settings";

export function useFormBuilder(formId: string) {
  const [activePanel, setActivePanel] = useState<PanelType>("fields");

  // Form details state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "unpublished">("draft");
  const [visibility, setVisibility] = useState<"public" | "unlisted">("public");
  const [layoutType, setLayoutType] = useState<"conversational" | "classic">("conversational");
  const [theme, setTheme] = useState("ecommerce_1");
  const [customSlug, setCustomSlug] = useState("");
  const [password, setPassword] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [responseLimit, setResponseLimit] = useState<number | "">("");

  // Fields state
  const [fields, setFields] = useState<FieldItem[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // FIX #19: Track whether the form has unsaved changes
  const [isDirty, setIsDirty] = useState(false);

  // Queries
  const { data, isLoading, refetch } = trpc.forms.get.useQuery({ id: formId }, { retry: false });

  // Load form data
  useEffect(() => {
    if (data) {
      const f = data.form;
      setTitle(f.title);
      setDescription(f.description || "");
      setStatus(f.status as any);
      setVisibility(f.visibility as any);
      setLayoutType(f.layoutType as any);
      setTheme(f.theme);
      setCustomSlug(f.customSlug || "");
      setPassword(f.password || "");
      const expDate = f.expiryDate ? new Date(f.expiryDate).toISOString().split("T")[0] : "";
      setExpiryDate(expDate || "");
      setResponseLimit(f.responseLimit || "");
      setFields(data.fields as any);
      setIsDirty(false); // FIX #19: Reset dirty flag after loading fresh data
    }
  }, [data]);

  // FIX #19: Warn user before navigating away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const updateFieldsMutation = trpc.forms.updateFields.useMutation({
    onSuccess: () => { toast.success("All changes saved."); setIsDirty(false); refetch(); },
    onError: (err) => { toast.error(err.message || "Failed to save form fields."); },
  });

  // FIX #18: Chain mutations sequentially — fields only saved after form settings succeed.
  // This prevents partial saves where settings succeed but fields fail (or vice versa).
  const updateFormMutation = trpc.forms.update.useMutation({
    onSuccess: () => {
      // After form settings saved, now save fields
      updateFieldsMutation.mutate({
        formId,
        fields: fields.map((f, i) => ({ ...f, order: i + 1 })),
      });
    },
    onError: (err) => { toast.error(err.message || "Failed to save form settings."); },
  });

  // FIX #18: handleSaveAll now only triggers the form mutation;
  // field save is chained in the form mutation's onSuccess.
  const handleSaveAll = () => {
    updateFormMutation.mutate({
      id: formId, title, description: description || null, status, visibility,
      layoutType, theme, customSlug: customSlug || null, password: password || null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      responseLimit: responseLimit ? Number(responseLimit) : null,
    });
  };

  const handlePublish = () => {
    setStatus("published");
    updateFormMutation.mutate({
      id: formId, title, description: description || null, status: "published", visibility,
      layoutType, theme, customSlug: customSlug || null, password: password || null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      responseLimit: responseLimit ? Number(responseLimit) : null,
    });
  };

  const addField = (type: string) => {
    const defaultLabels: Record<string, string> = {
      short_text: "What is your name?", long_text: "Describe your feedback here:",
      email: "Enter your email address:", number: "How old are you?",
      select: "Select your preference:", multi_select: "Choose multiple options:",
      checkbox: "Check all that apply:", rating: "Rate your experience (1 to 5):",
      date: "Select a date:", file_upload: "Upload your document:",
      payment: "Payment total: $50.00", nps: "How likely are you to recommend us? (0-10)",
      matrix: "Please rate the following aspects:", slider: "Adjust the slider to indicate your level:",
    };
    const newField: FieldItem = {
      id: crypto.randomUUID(), type,
      label: defaultLabels[type] || "New Question Label",
      placeholder: "Write placeholder text here...",
      required: false, order: fields.length + 1,
      options: ["select", "multi_select", "checkbox", "matrix"].includes(type) ? ["Option A", "Option B"] : null,
      validationRules: null, conditionalLogic: null,
    };
    setFields([...fields, newField]);
    setIsDirty(true); // FIX #19: Mark dirty
    toast.success(`Added ${type} field`);
  };

  const removeField = (index: number) => {
    const f = [...fields];
    f.splice(index, 1);
    setFields(f.map((item, idx) => ({ ...item, order: idx + 1 })));
    toast.info("Removed field");
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const f = [...fields];
    if (direction === "up" && index > 0) {
      [f[index], f[index - 1]] = [f[index - 1]!, f[index]!];
    } else if (direction === "down" && index < f.length - 1) {
      [f[index], f[index + 1]] = [f[index + 1]!, f[index]!];
    }
    setFields(f.map((item, idx) => ({ ...item, order: idx + 1 })));
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);

  const handleDragEnter = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    setFields((prev) => {
      const f = [...prev];
      const dragged = f[draggedIndex]!;
      f.splice(draggedIndex, 1);
      f.splice(index, 0, dragged);
      return f.map((item, idx) => ({ ...item, order: idx + 1 }));
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => setDraggedIndex(null);

  const updateFieldDetails = (index: number, key: keyof FieldItem, value: any) => {
    const f = [...fields];
    f[index] = { ...f[index], [key]: value } as FieldItem;
    setFields(f);
  };

  const handleAddOption = (fieldIndex: number) => {
    const f = [...fields];
    const field = f[fieldIndex];
    if (!field) return;
    field.options = [...(field.options || []), `Option ${(field.options || []).length + 1}`];
    setFields(f);
  };

  const handleRemoveOption = (fieldIndex: number, optionIndex: number) => {
    const f = [...fields];
    const field = f[fieldIndex];
    if (!field) return;
    const opts = [...(field.options || [])];
    opts.splice(optionIndex, 1);
    field.options = opts;
    setFields(f);
  };

  const handleUpdateOption = (fieldIndex: number, optionIndex: number, val: string) => {
    const f = [...fields];
    const field = f[fieldIndex];
    if (!field) return;
    const opts = [...(field.options || [])];
    opts[optionIndex] = val;
    field.options = opts;
    setFields(f);
  };

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/share/${customSlug || formId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard!");
  };

  const isSaving = updateFormMutation.isPending || updateFieldsMutation.isPending;

  return {
    // State
    activePanel, setActivePanel,
    title, setTitle, description, setDescription,
    status, setStatus, visibility, setVisibility,
    layoutType, setLayoutType, theme, setTheme,
    customSlug, setCustomSlug, password, setPassword,
    expiryDate, setExpiryDate, responseLimit, setResponseLimit,
    fields, selectedFieldId, setSelectedFieldId,
    draggedIndex, isLoading, isSaving, isDirty, data,
    // Actions
    handleSaveAll, handlePublish, addField, removeField, moveField,
    handleDragStart, handleDragEnter, handleDragEnd,
    updateFieldDetails, handleAddOption, handleRemoveOption, handleUpdateOption,
    copyShareLink,
    setIsDirty,
    // Mutations
    publishTemplateMutation: trpc.marketplace.publishTemplate.useMutation({
      onSuccess: (res: any) => { toast.success("Published to Marketplace successfully!"); },
      onError: (err: any) => { toast.error(err.message || "Failed to publish template."); },
    }),
  };
}
