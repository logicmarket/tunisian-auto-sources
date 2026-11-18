"use client";

/**
 * File: components/phase4/contribute/ContributeForm.tsx
 * Purpose: Arabic RTL community-source form with client validation, debounced
 * duplicate detection, optional invisible reCAPTCHA v3, and a clear success
 * state that links to the public tracking page.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RotateCw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    grecaptcha?: {
      ready(callback: () => void): void;
      execute(siteKey: string, options: { action: string }): Promise<string>;
    };
  }
}

export interface ContributeOption {
  value: string;
  label: string;
  description?: string;
}

interface ContributeFormProps {
  systems: ContributeOption[];
  tasks: ContributeOption[];
  recaptchaSiteKey?: string;
}

const LIMITS = {
  nameMin: 3,
  nameMax: 50,
  descriptionMin: 20,
  descriptionMax: 200,
  reasonMax: 500,
  emailMax: 120,
} as const;

interface FormValues {
  url: string;
  name: string;
  description_ar: string;
  suggested_system: string;
  suggested_task: string;
  reason: string;
  email: string;
}

const EMPTY: FormValues = {
  url: "",
  name: "",
  description_ar: "",
  suggested_system: "",
  suggested_task: "",
  reason: "",
  email: "",
};

interface DuplicateInfo {
  id: number;
  name: string;
  href: string;
}

interface SuccessInfo {
  id: number;
  trackingId: string;
  statusUrl: string;
  emailQueued: boolean;
}

function isValidUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return Boolean(parsed.hostname && parsed.hostname.includes("."));
  } catch {
    return false;
  }
}

function isValidEmail(value: string): boolean {
  return value.length <= LIMITS.emailMax && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export function ContributeForm({
  systems,
  tasks,
  recaptchaSiteKey,
}: ContributeFormProps) {
  const formId = useId();
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollTargetRef = useRef<HTMLElement | null>(null);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key as string];
      return next;
    });
    setServerError(null);
  }

  const checkDuplicate = useCallback(async (url: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setChecking(true);
    setCheckError(false);
    try {
      const response = await fetch(
        `/api/contribute/check?url=${encodeURIComponent(url.trim())}`,
        { signal: controller.signal, cache: "no-store" },
      );
      const payload = (await response.json()) as {
        duplicate?: boolean;
        source?: { id: number; name: string; href: string };
      };
      if (!response.ok) throw new Error("check failed");
      setDuplicate(payload.duplicate && payload.source ? payload.source : null);
    } catch (cause) {
      if ((cause as Error)?.name === "AbortError") return;
      setCheckError(true);
      setDuplicate(null);
    } finally {
      if (!controller.signal.aborted) setChecking(false);
    }
  }, []);

  /* Debounced duplicate check (600 ms) after the URL looks valid. */
  useEffect(() => {
    const url = values.url.trim();
    if (!isValidUrl(url)) {
      setDuplicate(null);
      setChecking(false);
      setCheckError(false);
      return;
    }

    const timer = setTimeout(() => {
      void checkDuplicate(url);
    }, 600);

    return () => clearTimeout(timer);
  }, [values.url, checkDuplicate]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  /* Optional reCAPTCHA v3 script — loaded only when a site key is configured. */
  useEffect(() => {
    if (!recaptchaSiteKey) return;
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-recaptcha-v3="true"]',
    );
    if (existing) {
      setRecaptchaReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(
      recaptchaSiteKey,
    )}`;
    script.async = true;
    script.defer = true;
    script.dataset.recaptchaV3 = "true";
    script.onload = () => setRecaptchaReady(true);
    script.onerror = () => setRecaptchaReady(false);
    document.head.appendChild(script);
  }, [recaptchaSiteKey]);

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    const name = values.name.trim();
    const description = values.description_ar.trim();
    const email = values.email.trim();
    const reason = values.reason.trim();

    if (!values.url.trim()) next.url = "الرابط مطلوب.";
    else if (!isValidUrl(values.url)) {
      next.url = "أدخل رابطاً صحيحاً يبدأ بـ http:// أو https://";
    }
    // A duplicate is shown by the dedicated banner with a link to the
    // existing source, so it is not duplicated as a plain field error.

    if (!name) next.name = "اسم الموقع مطلوب.";
    else if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax) {
      next.name = `اسم الموقع يجب أن يكون بين ${LIMITS.nameMin} و${LIMITS.nameMax} حرفاً.`;
    }

    if (!description) next.description_ar = "الوصف بالعربي مطلوب.";
    else if (
      description.length < LIMITS.descriptionMin ||
      description.length > LIMITS.descriptionMax
    ) {
      next.description_ar = `الوصف يجب أن يكون بين ${LIMITS.descriptionMin} و${LIMITS.descriptionMax} حرفاً.`;
    }

    if (!values.suggested_system) next.suggested_system = "اختر النظام المقترح.";
    if (!values.suggested_task) next.suggested_task = "اختر المهمة المقترحة.";
    if (email && !isValidEmail(email)) {
      next.email = "صيغة البريد الإلكتروني غير صحيحة.";
    }
    if (reason.length > LIMITS.reasonMax) {
      next.reason = `سبب الاقتراح يجب ألا يتجاوز ${LIMITS.reasonMax} حرفاً.`;
    }

    return next;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const validation = validate();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      setServerError("راجع الحقول المظللة ثم أعد الإرسال.");
      scrollTargetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (duplicate) {
      setServerError("هذا المصدر موجود بالفعل.");
      setErrors({});
      scrollTargetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setSubmitting(true);
    setServerError(null);

    let recaptchaToken: string | undefined;
    if (recaptchaSiteKey && recaptchaReady && window.grecaptcha) {
      try {
        recaptchaToken = await new Promise<string>((resolve, reject) => {
          window.grecaptcha!.ready(() => {
            window
              .grecaptcha!.execute(recaptchaSiteKey, { action: "contribute" })
              .then(resolve)
              .catch(reject);
          });
        });
      } catch {
        // Optional: submit without a token and let the server flag it.
        recaptchaToken = undefined;
      }
    }

    try {
      const response = await fetch("/api/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: values.url.trim(),
          name: values.name.trim(),
          description_ar: values.description_ar.trim(),
          suggested_system: values.suggested_system,
          suggested_task: values.suggested_task,
          reason: values.reason.trim() || undefined,
          email: values.email.trim() || undefined,
          recaptchaToken,
        }),
        cache: "no-store",
      });

      const payload = (await response.json()) as {
        success?: boolean;
        id?: number;
        trackingId?: string;
        statusUrl?: string;
        emailQueued?: boolean;
        error?: string;
        errors?: Record<string, string>;
        duplicate?: DuplicateInfo;
      };

      if (!response.ok || !payload.success) {
        if (response.status === 409 && payload.duplicate) {
          setDuplicate(payload.duplicate);
          setErrors({});
        } else if (payload.errors) {
          setErrors(payload.errors);
        }
        setServerError(payload.error ?? "تعذر إرسال الاقتراح. جرّب مرة أخرى.");
        scrollTargetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      setSuccess({
        id: payload.id ?? 0,
        trackingId: payload.trackingId ?? "",
        statusUrl: payload.statusUrl ?? `/contribute/status/${payload.id ?? 0}`,
        emailQueued: Boolean(payload.emailQueued),
      });
      scrollTargetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      setServerError("تعذر إرسال الاقتراح. جرّب مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div
        ref={(node) => {
          scrollTargetRef.current = node;
        }}
        className="surface-card p-6 text-center sm:p-8"
      >
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/25">
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-xl font-extrabold text-white">
          شكراً! تم استلام اقتراحك وسنراجعه قريباً
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-[11px] leading-6 text-muted">
          احتفظ برقم المتابعة أدناه. لا ننشر أي مصدر قبل التحقق من الرابط
          ومناسبته للميكانيكي التونسي.
        </p>

        <div className="mx-auto mt-5 max-w-md rounded-xl border border-accent/25 bg-accent/[0.06] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-accent-300">
            رقم المتابعة
          </p>
          <p className="mt-1 font-mono text-lg font-extrabold tracking-wider text-white" dir="ltr">
            {success.trackingId || `#${success.id}`}
          </p>
          <p className="mt-2 text-[10px] leading-5 text-muted">
            الحالة الحالية: قيد المراجعة
            {success.emailQueued
              ? " · أُضيف إشعار بريدي إلى قائمة الإرسال."
              : " · لم تُدخل بريداً، لذا تابع الحالة بالرابط."}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href={success.statusUrl}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-extrabold text-background"
          >
            متابعة الحالة
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => {
              setSuccess(null);
              setValues(EMPTY);
              setErrors({});
              setDuplicate(null);
            }}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong hover:text-white"
          >
            إرسال اقتراح آخر
          </button>
        </div>

        <p className="mt-5 text-[10px] leading-5 text-muted/80">
          الحد الأقصى 3 اقتراحات في الساعة لكل عنوان IP. الاقتراحات المكررة أو
          المحتوى غير التقني يُرفض تلقائياً.
        </p>
      </div>
    );
  }

  return (
    <form
      ref={(node) => {
        scrollTargetRef.current = node;
      }}
      onSubmit={handleSubmit}
      noValidate
      className="surface-card scroll-mt-24 p-4 sm:p-6"
      aria-labelledby={`${formId}-title`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id={`${formId}-title`} className="text-base font-extrabold text-white">
            اقترح مصدراً جديداً
          </h2>
          <p className="mt-1 text-[11px] leading-6 text-muted">
            أضف موقعاً أو قاعدة بيانات تستعملها فعلاً في الورشة. نراجع كل اقتراح
            يدوياً قبل النشر.
          </p>
        </div>
        <span className="chip">
          <ShieldCheck className="h-3 w-3 text-emerald-400" aria-hidden="true" />
          مراجعة يدوية
        </span>
      </div>

      {serverError ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/[0.06] p-3 text-[11px] leading-6 text-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {serverError}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4">
        <div>
          <label htmlFor={`${formId}-url`} className="block text-[11px] font-bold text-white">
            رابط المصدر <span className="text-danger">*</span>
          </label>
          <div className="relative mt-1.5">
            <input
              id={`${formId}-url`}
              type="url"
              dir="ltr"
              value={values.url}
              onChange={(event) => update("url", event.target.value)}
              onBlur={() => {
                if (isValidUrl(values.url)) void checkDuplicate(values.url);
              }}
              aria-invalid={Boolean(errors.url)}
              aria-describedby={`${formId}-url-help`}
              placeholder="https://example.com/repair-guides"
              autoComplete="url"
              className={cn(
                "min-h-12 w-full rounded-xl border bg-surface-raised px-3 pe-10 text-sm text-white placeholder:text-muted/60 focus:border-accent/50",
                errors.url ? "border-danger/50" : "border-line",
              )}
            />
            <span className="absolute inset-y-0 end-3 flex items-center">
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin text-accent-400" aria-hidden="true" />
              ) : duplicate ? (
                <AlertCircle className="h-4 w-4 text-danger" aria-hidden="true" />
              ) : isValidUrl(values.url) ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              ) : null}
            </span>
          </div>
          <div id={`${formId}-url-help`} className="mt-1 min-h-4 text-[10px] leading-5">
            {errors.url ? (
              <p className="text-danger">{errors.url}</p>
            ) : duplicate ? (
              <p className="text-danger">
                هذا المصدر موجود بالفعل.{" "}
                <Link href={duplicate.href} className="font-bold underline underline-offset-4">
                  افتح «{duplicate.name}»
                </Link>
              </p>
            ) : checkError ? (
              <p className="text-amber-300">تعذر التحقق من الرابط. سنتحقق عند الإرسال.</p>
            ) : (
              <p className="text-muted">
                يجب أن يبدأ بـ http:// أو https://. نزيل معاملات التتبع قبل مقارنة
                التكرار.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${formId}-name`} className="block text-[11px] font-bold text-white">
              اسم الموقع <span className="text-danger">*</span>
            </label>
            <input
              id={`${formId}-name`}
              type="text"
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
              maxLength={LIMITS.nameMax}
              aria-invalid={Boolean(errors.name)}
              placeholder="مثال: دليل إصلاح السيارات"
              className={cn(
                "mt-1.5 min-h-12 w-full rounded-xl border bg-surface-raised px-3 text-sm text-white placeholder:text-muted/60 focus:border-accent/50",
                errors.name ? "border-danger/50" : "border-line",
              )}
            />
            <div className="mt-1 flex items-start justify-between gap-2 text-[10px]">
              <span className="text-danger">{errors.name ?? ""}</span>
              <span className="shrink-0 text-muted">
                {values.name.trim().length}/{LIMITS.nameMax}
              </span>
            </div>
          </div>

          <div>
            <label htmlFor={`${formId}-email`} className="block text-[11px] font-bold text-white">
              بريدك الإلكتروني (اختياري)
            </label>
            <input
              id={`${formId}-email`}
              type="email"
              dir="ltr"
              value={values.email}
              onChange={(event) => update("email", event.target.value)}
              maxLength={LIMITS.emailMax}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={`${formId}-email-help`}
              placeholder="you@example.com"
              autoComplete="email"
              className={cn(
                "mt-1.5 min-h-12 w-full rounded-xl border bg-surface-raised px-3 text-sm text-white placeholder:text-muted/60 focus:border-accent/50",
                errors.email ? "border-danger/50" : "border-line",
              )}
            />
            <p id={`${formId}-email-help`} className="mt-1 text-[10px] leading-5 text-muted">
              {errors.email ? (
                <span className="text-danger">{errors.email}</span>
              ) : (
                "نستخدمه فقط لإعلامك بقرار المراجعة. لا يظهر للزوار."
              )}
            </p>
          </div>
        </div>

        <div>
          <label htmlFor={`${formId}-description`} className="block text-[11px] font-bold text-white">
            وصف المصدر بالعربي <span className="text-danger">*</span>
          </label>
          <textarea
            id={`${formId}-description`}
            value={values.description_ar}
            onChange={(event) => update("description_ar", event.target.value)}
            maxLength={LIMITS.descriptionMax}
            rows={4}
            aria-invalid={Boolean(errors.description_ar)}
            placeholder="ماذا يقدم هذا المصدر؟ ما الذي يميزه لميكانيكي تونسي؟"
            className={cn(
              "mt-1.5 w-full resize-y rounded-xl border bg-surface-raised p-3 text-sm leading-7 text-white placeholder:text-muted/60 focus:border-accent/50",
              errors.description_ar ? "border-danger/50" : "border-line",
            )}
          />
          <div className="mt-1 flex items-start justify-between gap-2 text-[10px]">
            <span className="text-danger">{errors.description_ar ?? ""}</span>
            <span className="shrink-0 text-muted">
              {values.description_ar.trim().length}/{LIMITS.descriptionMax} · 20 حرفاً على الأقل
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${formId}-system`} className="block text-[11px] font-bold text-white">
              النظام المقترح <span className="text-danger">*</span>
            </label>
            <select
              id={`${formId}-system`}
              value={values.suggested_system}
              onChange={(event) => update("suggested_system", event.target.value)}
              aria-invalid={Boolean(errors.suggested_system)}
              className={cn(
                "mt-1.5 min-h-12 w-full rounded-xl border bg-surface-raised px-3 text-sm font-semibold text-white focus:border-accent/50",
                errors.suggested_system ? "border-danger/50" : "border-line",
              )}
            >
              <option value="">اختر النظام…</option>
              {systems.map((system) => (
                <option key={system.value} value={system.value}>
                  {system.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-danger">{errors.suggested_system ?? ""}</p>
          </div>

          <div>
            <label htmlFor={`${formId}-task`} className="block text-[11px] font-bold text-white">
              المهمة المقترحة <span className="text-danger">*</span>
            </label>
            <select
              id={`${formId}-task`}
              value={values.suggested_task}
              onChange={(event) => update("suggested_task", event.target.value)}
              aria-invalid={Boolean(errors.suggested_task)}
              className={cn(
                "mt-1.5 min-h-12 w-full rounded-xl border bg-surface-raised px-3 text-sm font-semibold text-white focus:border-accent/50",
                errors.suggested_task ? "border-danger/50" : "border-line",
              )}
            >
              <option value="">اختر المهمة…</option>
              {tasks.map((task) => (
                <option key={task.value} value={task.value}>
                  {task.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-danger">{errors.suggested_task ?? ""}</p>
          </div>
        </div>

        <div>
          <label htmlFor={`${formId}-reason`} className="block text-[11px] font-bold text-white">
            لماذا تقترح هذا المصدر؟ (اختياري)
          </label>
          <textarea
            id={`${formId}-reason`}
            value={values.reason}
            onChange={(event) => update("reason", event.target.value)}
            maxLength={LIMITS.reasonMax}
            rows={3}
            aria-invalid={Boolean(errors.reason)}
            placeholder="مثال: أستعمله يومياً في الورشة، وفيه مخططات كهربائية لطرازات متوفرة في تونس."
            className={cn(
              "mt-1.5 w-full resize-y rounded-xl border bg-surface-raised p-3 text-sm leading-7 text-white placeholder:text-muted/60 focus:border-accent/50",
              errors.reason ? "border-danger/50" : "border-line",
            )}
          />
          <div className="mt-1 flex items-start justify-between gap-2 text-[10px]">
            <span className="text-danger">{errors.reason ?? ""}</span>
            <span className="shrink-0 text-muted">
              {values.reason.trim().length}/{LIMITS.reasonMax}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="max-w-md text-[10px] leading-5 text-muted">
          بالإرسال تقرّ بأن المصدر تقني وليس محتوى إعلانياً أو احتيالياً. الحد
          الأقصى 3 اقتراحات/ساعة لكل IP.
        </p>
        <button
          type="submit"
          disabled={submitting || Boolean(duplicate)}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-5 text-xs font-extrabold text-background shadow-accent-glow transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          {submitting ? "جارٍ الإرسال…" : "أرسل الاقتراح"}
        </button>
      </div>

      {recaptchaSiteKey ? (
        <p className="mt-3 flex items-center gap-1 text-[9px] leading-5 text-muted/70">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          محمي بـ reCAPTCHA v3 (بدون اختبار مرئي). تخضع لسياسة خصوصية Google.
        </p>
      ) : null}
    </form>
  );
}
