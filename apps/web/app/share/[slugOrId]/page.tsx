"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Calendar,
  Lock,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  Clock,
  ThumbsUp,
  Mail,
  ShieldCheck,
  Star,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { toast } from "sonner";
import { trpc } from "~/trpc/client";
import { getTheme as resolveTheme, type ThemeConfig } from "~/lib/themes";

interface AnswerState {
  [fieldId: string]: any;
}

type Theme = ThemeConfig;

function getTheme(themeName: string | undefined, customThemeConfig?: any): Theme {
  return resolveTheme(themeName || "ecommerce_1", customThemeConfig);
}

function sanitizeFontName(font?: string): string | null {
  if (!font || typeof font !== "string") return null;
  // allow letters, numbers, spaces and dashes only
  const ok = /^[A-Za-z0-9\s\-]+$/.test(font);
  if (!ok) return null;
  return font.trim();
}

export default function PublicFormFiller() {
  const params = useParams();
  const router = useRouter();
  const idOrSlug = params.slugOrId as string;
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get("embed") === "true";
  const isPreview = searchParams.get("preview") === "true";
  // For preview mode, extract the raw form ID from the URL (UUID)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

  // Form states
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevVisibleCount, setPrevVisibleCount] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});
  const [dragActiveField, setDragActiveField] = useState<string | null>(null);

  // Queries — use protected preview endpoint for owners, public endpoint for respondents
  const publicQuery = trpc.forms.getPublicForm.useQuery(
    { idOrSlug, password: passwordInput || undefined },
    { refetchOnWindowFocus: false, enabled: !isPreview },
  );

  const previewQuery = trpc.forms.getPreviewForm.useQuery(
    { id: isUuid ? idOrSlug : "00000000-0000-0000-0000-000000000000" },
    { refetchOnWindowFocus: false, enabled: isPreview && isUuid, retry: false }
  );

  const isLoading = isPreview ? previewQuery.isLoading : publicQuery.isLoading;
  const error = isPreview ? previewQuery.error : publicQuery.error;

  // Normalise both query shapes into the same structure the rest of the page uses
  const data = isPreview && previewQuery.data
    ? {
        form: {
          ...previewQuery.data.form,
          isPasswordProtected: false,
          isExpired: false,
          isLimitReached: false,
          removeBranding: false,
        },
        fields: previewQuery.data.fields,
      }
    : publicQuery.data;

  const refetch = isPreview ? previewQuery.refetch : publicQuery.refetch;

  // Mutations
  const incrementStartsMutation = trpc.forms.incrementStarts.useMutation();
  const trackProgressMutation = trpc.responses.trackProgress.useMutation();
  const uploadMutation = trpc.uploads.getPresignedUrl.useMutation();
  const submitMutation = trpc.responses.submit.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      router.push(`/share/${idOrSlug}/success`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit form.");
      setSubmitting(false);
    },
  });

  // Verify form password status — always verified in preview mode
  useEffect(() => {
    if (isPreview) { setPasswordVerified(true); return; }
    if (data && !data.form.isPasswordProtected) {
      setPasswordVerified(true);
    }
  }, [data, isPreview]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput) {
      const res = await refetch();
      if (res.data && res.data.fields.length > 0) {
        setPasswordVerified(true);
        setPasswordError(false);
      } else {
        setPasswordError(true);
        toast.error("Incorrect password");
      }
    }
  };

  const handleStart = () => {
    setStarted(true);
    if (data) {
      incrementStartsMutation.mutate({ id: data.form.id });
    }
  };

  const handleAnswerChange = (fieldId: string, val: any) => {
    const updatedAnswers = { ...answers, [fieldId]: val };
    setAnswers(updatedAnswers);
    if (data) {
      trackProgressMutation.mutate({
        formId: data.form.id,
        lastActiveFieldId: fieldId,
        answers: updatedAnswers,
      });
    }
  };

  const getVisibleFields = () => {
    if (!data) return [];
    // Track which field IDs to skip (jump over) so we can still show subsequent fields
    const skippedIds = new Set<string>();

    return data.fields.filter((field: any) => {
      if (!field.conditionalLogic) return !skippedIds.has(field.id);
      const logic = field.conditionalLogic;

      // No dependency configured — always visible unless skipped
      if (!logic.dependOnField && logic.dependOnField !== 0) return !skippedIds.has(field.id);

      const depField = data.fields.find(
        (f: any) => f.id === logic.dependOnField || f.id === String(logic.dependOnField),
      );
      if (!depField) return !skippedIds.has(field.id);

      const depAnswer = String(answers[depField.id] ?? "");
      const targetValue = String(logic.value ?? "");

      let conditionMet = false;
      switch (logic.operator) {
        case "equals":
          conditionMet = depAnswer === targetValue;
          break;
        case "not_equals":
          conditionMet = depAnswer !== targetValue;
          break;
        case "contains":
          conditionMet = depAnswer.toLowerCase().includes(targetValue.toLowerCase());
          break;
        case "greater_than":
          conditionMet = Number(depAnswer) > Number(targetValue);
          break;
        case "less_than":
          conditionMet = Number(depAnswer) < Number(targetValue);
          break;
        default:
          conditionMet = true;
      }

      // skip action: mark this field to be jumped over; it is hidden
      if (logic.action === "skip") {
        if (conditionMet) skippedIds.add(field.id);
        return !conditionMet && !skippedIds.has(field.id);
      }
      if (logic.action === "show") return conditionMet;
      if (logic.action === "hide") return !conditionMet;
      return !skippedIds.has(field.id);
    });
  };

  const visibleFields = data ? getVisibleFields() : [];

  // Clamp currentIndex when visible fields shrink (e.g. a field is hidden mid-flow)
  useEffect(() => {
    if (visibleFields.length > 0 && currentIndex >= visibleFields.length) {
      setCurrentIndex(visibleFields.length - 1);
    }
    // Detect when a new field becomes visible ahead of cursor — stay on current question
    setPrevVisibleCount(visibleFields.length);
  }, [visibleFields.length]);

  const validateField = (field: any, value: any): string | null => {
    if (!field.validationRules) return null;
    const rules = field.validationRules;
    const strVal = String(value ?? "");

    if (rules.min !== undefined && rules.min !== "") {
      if (field.type === "number") {
        if (Number(value) < Number(rules.min)) return `Minimum value is ${rules.min}`;
      } else {
        if (strVal.length < Number(rules.min)) return `Minimum ${rules.min} characters required`;
      }
    }
    if (rules.max !== undefined && rules.max !== "") {
      if (field.type === "number") {
        if (Number(value) > Number(rules.max)) return `Maximum value is ${rules.max}`;
      } else {
        if (strVal.length > Number(rules.max)) return `Maximum ${rules.max} characters allowed`;
      }
    }
    if (rules.regex && strVal) {
      try {
        const re = new RegExp(rules.regex);
        if (!re.test(strVal)) return `Value does not match the required format`;
      } catch (_) {
        /* invalid regex, skip */
      }
    }
    return null;
  };

  const handleNext = () => {
    if (!data) return;
    const currentField = visibleFields[currentIndex];
    if (!currentField) return;

    if (
      currentField.required &&
      (answers[currentField.id] === undefined ||
        answers[currentField.id] === null ||
        answers[currentField.id] === "")
    ) {
      toast.error("This question is required. Please fill in an answer.");
      return;
    }

    const validationError = validateField(currentField, answers[currentField.id]);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (currentIndex < visibleFields.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!started || !data) return;
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        handleNext();
      } else if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [started, data, currentIndex, answers]);

  const handleSubmit = () => {
    if (!data) return;
    for (const f of visibleFields) {
      if (
        f.required &&
        (answers[f.id] === undefined || answers[f.id] === null || answers[f.id] === "")
      ) {
        toast.error(`Question "${f.label}" is required.`);
        return;
      }
    }
    setSubmitting(true);
    submitMutation.mutate({
      formId: data.form.id,
      answers,
      password: passwordInput || undefined,
      _honeypot: honeypot,
    });
  };

  const handleFileUpload = async (fieldId: string, file: File) => {
    if (!data) return;
    
    setUploadingState(prev => ({ ...prev, [fieldId]: true }));
    try {
      // 1. Get presigned URL
      const { uploadUrl, objectKey } = await uploadMutation.mutateAsync({
        formId: data.form.id,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      });

      // 2. Upload directly to Cloudflare R2
      const res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!res.ok) throw new Error("Upload failed");

      // 3. Save the object key as the answer
      handleAnswerChange(fieldId, objectKey);
      toast.success("File uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file");
    } finally {
      setUploadingState(prev => ({ ...prev, [fieldId]: false }));
    }
  };

  // ─────────────────────────────────────────
  //  Render a field for BOTH layouts
  // ─────────────────────────────────────────
  const renderField = (field: any, t: ThemeConfig) => {
    switch (field.type) {
      case "short_text":
      case "email":
      case "number":
        return (
          <Input
            id={`field-${field.id}`}
            type={field.type === "email" ? "email" : field.type === "number" ? "number" : "text"}
            placeholder={
              field.placeholder || (field.type === "email" ? "name@example.com" : "Your answer...")
            }
            value={answers[field.id] || ""}
            onChange={(e) => handleAnswerChange(field.id, e.target.value)}
            className={`h-12 text-sm ${t.input}`}
            aria-required={field.required}
            aria-label={field.label}
          />
        );

      case "long_text":
        return (
          <textarea
            id={`field-${field.id}`}
            rows={4}
            placeholder={field.placeholder || "Type your detailed answer here..."}
            value={answers[field.id] || ""}
            onChange={(e) => handleAnswerChange(field.id, e.target.value)}
            className={`w-full text-sm resize-none ${t.textarea}`}
            aria-required={field.required}
            aria-label={field.label}
          />
        );

      case "select":
        return (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
            role="group"
            aria-label={field.label}
            aria-required={field.required}
          >
            {(field.options || []).map((opt: string) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleAnswerChange(field.id, opt)}
                aria-pressed={answers[field.id] === opt}
                className={`h-12 px-4 text-left text-sm transition flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                  answers[field.id] === opt ? t.optionChipSelected : t.optionChip
                }`}
              >
                {answers[field.id] === opt && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                <span>{opt}</span>
              </button>
            ))}
          </div>
        );

      case "checkbox":
        return (
          <div
            className="space-y-2"
            role="group"
            aria-label={field.label}
            aria-required={field.required}
          >
            {(field.options || []).map((opt: string) => {
              const currentValues = answers[field.id] || [];
              const isChecked = currentValues.includes(opt);
              const checkId = `field-${field.id}-${opt.replace(/\s+/g, "-")}`;
              return (
                <label
                  key={opt}
                  htmlFor={checkId}
                  className={`h-12 px-4 flex items-center gap-3 text-sm transition cursor-pointer ${
                    isChecked ? t.checkboxRowSelected : t.checkboxRow
                  }`}
                >
                  <input
                    id={checkId}
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      let newVals = [...currentValues];
                      if (e.target.checked) {
                        newVals.push(opt);
                      } else {
                        newVals = newVals.filter((v) => v !== opt);
                      }
                      handleAnswerChange(field.id, newVals);
                    }}
                    className={`h-4 w-4 ${t.checkboxEl}`}
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        );

      case "rating":
        return (
          <div
            className="flex items-center gap-2 py-2"
            role="group"
            aria-label={`${field.label} — star rating`}
          >
            {[1, 2, 3, 4, 5].map((num) => {
              const isSelected = (answers[field.id] || 0) >= num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleAnswerChange(field.id, num)}
                  aria-label={`${num} star${num > 1 ? "s" : ""}`}
                  aria-pressed={answers[field.id] === num}
                  className="h-10 w-10 p-0 flex items-center justify-center transition hover:scale-110 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none rounded"
                >
                  <Star
                    className={`h-7 w-7 transition-colors ${isSelected ? t.starActive : t.starInactive}`}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        );

      case "date":
        return (
          <Input
            id={`field-${field.id}`}
            type="date"
            value={answers[field.id] || ""}
            onChange={(e) => handleAnswerChange(field.id, e.target.value)}
            className={`h-12 text-sm ${t.input}`}
            aria-required={field.required}
            aria-label={field.label}
          />
        );

      case "file_upload":
        const isUploading = uploadingState[field.id];
        const uploadedKey = answers[field.id];
        
        return (
          <div 
            className={`p-8 text-center flex flex-col items-center justify-center border-2 border-dashed ${dragActiveField === field.id ? 'border-blue-500 bg-blue-50/50' : t.dropzone} relative transition-all`} 
            role="region" 
            aria-label="File upload area"
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActiveField(field.id); }}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActiveField(field.id); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActiveField(null); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragActiveField(null);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(field.id, e.dataTransfer.files[0]);
              }
            }}
          >
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p className="text-sm font-semibold">Uploading directly to R2...</p>
              </div>
            ) : uploadedKey ? (
              <div className="flex flex-col items-center text-green-600">
                <Check className="h-8 w-8 mb-2" />
                <p className="text-sm font-semibold">File uploaded: {uploadedKey.split('/').pop()}</p>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="mt-2 text-xs h-7" 
                  onClick={() => handleAnswerChange(field.id, null)}
                >
                  Remove & Replace
                </Button>
              </div>
            ) : (
              <>
                <UploadCloud className="h-10 w-10 mb-4 opacity-50" />
                <p className="text-sm font-semibold mb-2 opacity-80" id={`file-hint-${field.id}`}>Drag &amp; Drop files here</p>
                <p className="text-xs opacity-60 mb-4">Max 300MB. Direct upload to Cloudflare R2.</p>
                
                <input 
                  type="file" 
                  id={`file-input-${field.id}`}
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(field.id, file);
                  }}
                />
                
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 text-xs relative overflow-hidden"
                  aria-describedby={`file-hint-${field.id}`}
                  onClick={() => document.getElementById(`file-input-${field.id}`)?.click()}
                >
                  Browse Files
                </Button>
              </>
            )}
          </div>
        );

      case "payment":
        return (
          <div className={`p-6 rounded-xl space-y-4 ${t.input}`} role="region" aria-label="Payment">
            <div
              className={`flex justify-between items-center text-sm font-bold pb-3 border-b ${t.divider}`}
            >
              <span>Total Due</span>
              <span aria-label="50 US dollars">$50.00 USD</span>
            </div>
            <Button
              type="button"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 rounded-lg"
            >
              Pay with Stripe
            </Button>
          </div>
        );

      case "nps":
        return (
          <div
            className="flex flex-wrap gap-2 mt-4"
            role="group"
            aria-label={`${field.label} — scale 0 to 10`}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
              const isSelected = answers[field.id] === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleAnswerChange(field.id, num)}
                  aria-label={`${num} — ${num <= 3 ? "Not likely" : num <= 6 ? "Neutral" : num <= 8 ? "Likely" : "Extremely likely"}`}
                  aria-pressed={isSelected}
                  className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${isSelected ? t.optionChipSelected : t.optionChip}`}
                >
                  {num}
                </button>
              );
            })}
            <div className={`w-full flex justify-between text-xs font-semibold opacity-60 mt-2 px-1 ${t.muted}`} aria-hidden="true">
              <span>Not likely at all</span>
              <span>Extremely likely</span>
            </div>
          </div>
        );

      case "slider":
        return (
          <div className="mt-4 pt-4">
            <input
              id={`field-${field.id}`}
              type="range"
              min="0"
              max="100"
              value={answers[field.id] || 50}
              onChange={(e) => handleAnswerChange(field.id, parseInt(e.target.value))}
              className="w-full accent-current h-2 bg-black/20 rounded-lg appearance-none cursor-pointer focus-visible:outline-none focus-visible:ring-2"
              aria-label={field.label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={answers[field.id] || 50}
              aria-valuetext={`${answers[field.id] || 50} out of 100`}
            />
            <div className={`w-full flex justify-between text-xs font-semibold opacity-60 mt-4 px-1 ${t.muted}`} aria-hidden="true">
              <span>0</span>
              <span className="font-bold text-sm opacity-100">{answers[field.id] || 50}</span>
              <span>100</span>
            </div>
          </div>
        );

      case "matrix":
        return (
          <div className={`mt-6 w-full overflow-x-auto rounded-xl border border-black/10 bg-black/5 p-4 ${t.input}`}>
            <table className="w-full text-left text-sm" role="grid" aria-label={field.label}>
              <thead>
                <tr>
                  <th className="p-3 font-semibold border-b border-black/20" scope="col"></th>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <th key={num} className="p-3 font-semibold border-b border-black/20 text-center" scope="col">{num}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(field.options || ["Option A", "Option B"]).map((opt: string, i: number) => (
                  <tr key={i} className="hover:bg-black/5 transition-colors">
                    <td className="p-3 border-b border-black/10 font-medium" scope="row">{opt}</td>
                    {[1, 2, 3, 4, 5].map((num) => {
                      const currentMatrixObj = answers[field.id] || {};
                      const isSelected = currentMatrixObj[opt] === num;
                      return (
                        <td key={num} className="p-3 border-b border-black/10 text-center">
                          <input
                            type="radio"
                            name={`${field.id}-${i}`}
                            checked={isSelected}
                            aria-label={`${opt}: ${num}`}
                            onChange={() => {
                              handleAnswerChange(field.id, {
                                ...currentMatrixObj,
                                [opt]: num
                              });
                            }}
                            className={`w-5 h-5 cursor-pointer ${t.checkboxEl}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return null;
    }
  };

  // ─────────────────────────────────────────
  //  Loading / Error states
  // ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <Sparkles className="h-8 w-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div className="max-w-md p-6 border border-slate-900 bg-slate-900/30 rounded-2xl space-y-4">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
          <h1 className="text-xl font-bold">Form Not Found</h1>
          <p className="text-sm text-slate-400">
            {isPreview
              ? "Preview failed. Make sure you\'re logged in and this is a valid form ID."
              : "This form doesn\'t exist or is no longer active."}
          </p>
        </div>
      </div>
    );
  }

  const { form } = data;
  const t = getTheme(form.theme, form.customThemeConfig);

  const sanitizedFont = sanitizeFontName(form.customThemeConfig?.fontFamily);

  const customStyle: React.CSSProperties = form.customThemeConfig
    ? ({
        "--fc-bg": form.customThemeConfig.bg || "#f8fafc",
        "--fc-text": form.customThemeConfig.text || "#0f172a",
        "--fc-card-bg": form.customThemeConfig.cardBg || "#ffffff",
        "--fc-border": form.customThemeConfig.border || "#e2e8f0",
        "--fc-border-width": form.customThemeConfig.borderWidth || "1px",
        "--fc-primary": form.customThemeConfig.primary || "#3b82f6",
        "--fc-primary-text": form.customThemeConfig.primaryText || "#ffffff",
        "--fc-primary-light": form.customThemeConfig.primaryLight || "#eff6ff",
        "--fc-radius": form.customThemeConfig.radius || "0.5rem",
        "--fc-shadow":
          form.customThemeConfig.shadow ||
          "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        "--fc-title": form.customThemeConfig.title || form.customThemeConfig.text || "#0f172a",
        "--fc-muted": form.customThemeConfig.muted || "#64748b",
        "--fc-label": form.customThemeConfig.label || "#334155",
        "--fc-input-bg": form.customThemeConfig.inputBg || "#ffffff",
        fontFamily: sanitizedFont ? `'${sanitizedFont}', sans-serif` : undefined,
      } as React.CSSProperties)
    : {};

  const fontLink = sanitizedFont ? (
    <link
      rel="stylesheet"
      href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(sanitizedFont).replace(/%20/g, "+")}:wght@400;500;600;700;800;900&display=swap`}
    />
  ) : null;

  // ─────────────────────────────────────────
  //  Password Gate
  // ─────────────────────────────────────────
  if (!passwordVerified) {
    return (
      <>
        {fontLink}
        <div
          className={`min-h-screen flex items-center justify-center p-6 ${t.page}`}
          style={customStyle}
        >
          <div className={`w-full max-w-sm ${t.cardPadding} ${t.card}`}>
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 opacity-60" />
              <div>
                <h1 className={`text-lg font-bold ${t.title}`}>{form.title}</h1>
                <p className={`text-xs ${t.muted}`}>Password protected</p>
              </div>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Enter password..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className={t.input}
              />
              {passwordError && (
                <p className={`text-xs ${t.required}`}>Incorrect password. Try again.</p>
              )}
              <Button type="submit" className={`w-full ${t.button}`}>
                Enter Form
              </Button>
            </form>
          </div>
        </div>
      </>
    );
  }

  // ─────────────────────────────────────────
  //  Welcome / Start Screen
  // ─────────────────────────────────────────
  if (!started) {
    return (
      <>
        {fontLink}
        {isPreview && (
          <div className="fixed top-0 inset-x-0 z-50 bg-amber-400 text-black text-xs font-black uppercase tracking-widest text-center py-2 flex items-center justify-center gap-3 border-b-2 border-black">
            <span>👁️ PREVIEW MODE — This is how respondents will see your form. Submissions are disabled.</span>
            <button onClick={() => window.close()} className="bg-black text-amber-400 px-3 py-0.5 text-xs font-black hover:bg-gray-800 transition-colors">Close Preview ✕</button>
          </div>
        )}
        <div
          className={`min-h-screen flex items-center justify-center p-6 ${t.page} ${isPreview ? "pt-12" : ""}`}
          style={customStyle}
        >
          <div className={`w-full max-w-lg p-10 sm:p-14 text-center space-y-6 ${t.card}`}>
            <div className="space-y-3">
              <h1 className={`text-3xl sm:text-5xl font-extrabold tracking-tight ${t.title}`}>
                {form.title}
              </h1>
              <p className={`text-sm max-w-md mx-auto ${t.muted}`}>{form.description}</p>
            </div>
            <div className="pt-2">
              <Button
                onClick={handleStart}
                className={`h-12 px-8 text-sm font-bold flex items-center justify-center gap-2 mx-auto ${t.button}`}
              >
                {isPreview ? "Preview Form" : "Start Questionnaire"} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <p className={`text-[11px] ${t.muted}`}>{isPreview ? "Preview mode — answers won't be saved" : "Takes less than 1 minute to complete"}</p>
          </div>
        </div>
      </>
    );
  }

  // ─────────────────────────────────────────
  //  CONVERSATIONAL LAYOUT
  // ─────────────────────────────────────────
  if (form.layoutType === "conversational") {
    const currentField = visibleFields[currentIndex];
    if (!currentField) return null;
    const totalFields = visibleFields.length;
    const progress = Math.round(((currentIndex + 1) / totalFields) * 100);

    return (
      <>
        {fontLink}
        {isPreview && (
          <div className="fixed top-0 inset-x-0 z-50 bg-amber-400 text-black text-xs font-black uppercase tracking-widest text-center py-2 flex items-center justify-center gap-3 border-b-2 border-black">
            <span>👁️ PREVIEW MODE — Submissions disabled.</span>
            <button onClick={() => window.close()} className="bg-black text-amber-400 px-3 py-0.5 text-xs font-black hover:bg-gray-800 transition-colors">Close ✕</button>
          </div>
        )}
        <div
          className={`${isEmbed ? "bg-transparent h-screen w-full" : "min-h-screen"} ${t.convBg} flex flex-col overflow-hidden ${isPreview ? "pt-8" : ""}`}
          style={customStyle}
        >
          {/* Progress Bar */}
          <div className={`h-1 w-full ${t.progressTrack} relative shrink-0`}>
            <div
              className={`h-full ${t.progressFill} transition-all duration-500 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Question Frame */}
          <main className="flex-1 flex items-center justify-center p-6">
            <div className={`w-full max-w-xl ${t.cardPadding} ${t.fieldGap} ${t.card}`}>
              <div className={t.fieldGap}>
                {/* Counter + Label */}
                <div className="space-y-2">
                  <span
                    className={`text-[11px] font-semibold tracking-wider uppercase ${t.counter}`}
                  >
                    Question {currentIndex + 1} of {totalFields}
                  </span>
                  <h2 className={`text-xl sm:text-2xl font-bold leading-snug ${t.title}`}>
                    {currentField.label}
                    {currentField.required && <span className={`ml-1.5 ${t.required}`}>*</span>}
                  </h2>
                  {currentField.placeholder && currentField.type === "long_text" && (
                    <p className={`text-xs ${t.muted}`}>{currentField.placeholder}</p>
                  )}
                </div>

                {/* Input */}
                {renderField(currentField, t)}
              </div>

              {/* Navigation */}
              <div className={`flex items-center justify-between border-t ${t.divider} pt-6 mt-2`}>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={currentIndex === 0}
                  onClick={handlePrev}
                  className={`text-xs font-semibold h-9 ${t.buttonGhost} disabled:opacity-30`}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] hidden sm:block ${t.muted}`}>
                    Press Tab to continue
                  </span>
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={submitting}
                    className={`h-10 px-6 text-sm font-bold flex items-center gap-1.5 ${t.button}`}
                  >
                    {currentIndex === totalFields - 1 ? "Submit" : "Continue"}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Honeypot */}
              <div
                style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}
                aria-hidden="true"
              >
                <input
                  type="text"
                  name="_hp_field"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>
            </div>
          </main>

          {/* Footer Brand */}
          <footer
            className={`h-10 flex items-center justify-center text-[10px] ${t.muted} shrink-0`}
          >
            {!form.removeBranding && (
              <p className="flex items-center gap-1">
                Powered by{" "}
                <span className="font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                  FormCraft
                </span>
              </p>
            )}
          </footer>
        </div>
      </>
    );
  }

  // ─────────────────────────────────────────
  //  CLASSIC SCROLLABLE LAYOUT
  // ─────────────────────────────────────────
  return (
    <>
      {fontLink}
      {isPreview && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-400 text-black text-xs font-black uppercase tracking-widest text-center py-2 flex items-center justify-center gap-3 border-b-2 border-black">
          <span>👁️ PREVIEW MODE — Submissions disabled.</span>
          <button onClick={() => window.close()} className="bg-black text-amber-400 px-3 py-0.5 text-xs font-black hover:bg-gray-800 transition-colors">Close ✕</button>
        </div>
      )}
      <div
        className={`${isEmbed ? "bg-transparent p-0 w-full" : `min-h-screen py-16 px-6 ${t.page}`} flex flex-col justify-between ${isPreview ? "pt-12" : ""}`}
        style={customStyle}
      >
        <div
          className={`w-full max-w-xl mx-auto ${isEmbed ? "p-4 sm:p-6" : t.cardPadding} ${t.fieldGap} ${isEmbed ? "border-0 shadow-none bg-transparent" : t.card}`}
        >
          {/* Title */}
          <div className={`${t.titleLayout} ${t.divider}`}>
            <h1 className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${t.title}`}>
              {form.title}
            </h1>
            {form.description && <p className={`text-sm ${t.muted}`}>{form.description}</p>}
          </div>

          {/* Fields */}
          <div className={t.fieldGap}>
            {visibleFields.map((field: any) => (
              <div key={field.id} className={t.labelSpacing}>
                <label className={`block ${t.label}`}>
                  {field.label}
                  {field.required && <span className={`ml-1 ${t.required}`}>*</span>}
                </label>
                {renderField(field, t)}
              </div>
            ))}
          </div>

          {/* Honeypot */}
          <div
            style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}
            aria-hidden="true"
          >
            <input
              type="text"
              name="_hp_field"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          {/* Submit */}
          <div className={`pt-6 border-t ${t.divider}`}>
            <Button
              type="button"
              onClick={isPreview ? () => { alert("Preview mode — submissions are disabled. Publish your form to accept real responses."); } : handleSubmit}
              disabled={submitting}
              className={`w-full h-12 text-sm font-bold ${t.button}`}
            >
              {isPreview ? "Submit (Preview — Disabled)" : submitting ? "Submitting..." : "Submit Answers"}
            </Button>
            {isPreview && <p className="text-center text-xs mt-2 text-amber-600 font-bold">⚠️ Preview mode — click Publish Live to accept real responses</p>}
          </div>
        </div>

        {/* Footer Branding */}
        {!form.removeBranding && (
          <div className={`mt-8 text-center text-[10px] ${t.muted}`}>
            <p className="flex items-center justify-center gap-1">
              Powered by{" "}
              <span className="font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                FormCraft
              </span>
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export const dynamic = 'force-dynamic';
