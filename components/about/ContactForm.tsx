"use client";

/**
 * File: components/about/ContactForm.tsx
 * Purpose: Local contact/suggestion form for the About page. Stores the
 * message through /api/contact for editorial review.
 */

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

const TOPICS = ["اقتراح مصدر", "رابط معطّل", "تصحيح معلومة", "ملاحظة عامة"];

export function ContactForm() {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, name, email, message, website }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "تعذر إرسال الرسالة.");
      }

      setSuccess(
        payload.message ?? "تم استلام رسالتك. شكراً لمساهمتك في تحسين المنصة.",
      );
      setName("");
      setEmail("");
      setMessage("");
      setTopic(TOPICS[0]);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "تعذر إرسال الرسالة. حاول مرة أخرى.",
      );
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="surface-card flex flex-col items-center px-6 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-base font-extrabold text-white">
          وصلتنا رسالتك
        </h3>
        <p className="mt-2 max-w-sm text-xs leading-6 text-muted">{success}</p>
        <button
          type="button"
          onClick={() => setSuccess(null)}
          className="mt-5 min-h-12 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
        >
          إرسال رسالة أخرى
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card p-5 sm:p-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="text-xs font-bold text-muted-strong">
            الاسم <span className="font-normal text-muted">(اختياري)</span>
          </label>
          <input
            id="contact-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            autoComplete="name"
            placeholder="اسمك أو اسم الورشة"
            className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-white outline-none transition-colors placeholder:text-muted/60 focus:border-accent/50"
          />
        </div>

        <div>
          <label htmlFor="contact-email" className="text-xs font-bold text-muted-strong">
            البريد الإلكتروني <span className="font-normal text-muted">(اختياري)</span>
          </label>
          <input
            id="contact-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={120}
            autoComplete="email"
            dir="ltr"
            placeholder="name@example.com"
            className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-start text-sm text-white outline-none transition-colors placeholder:text-muted/60 focus:border-accent/50"
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="contact-topic" className="text-xs font-bold text-muted-strong">
          نوع الرسالة
        </label>
        <select
          id="contact-topic"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm font-semibold text-white outline-none transition-colors focus:border-accent/50"
        >
          {TOPICS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label htmlFor="contact-message" className="text-xs font-bold text-muted-strong">
          الرسالة
        </label>
        <textarea
          id="contact-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={5}
          minLength={10}
          maxLength={3000}
          required
          placeholder="اكتب اقتراحك أو وصف المشكلة مع رابط المصدر إن أمكن…"
          className="mt-1.5 w-full resize-y rounded-xl border border-line bg-surface-raised px-3 py-2.5 text-sm leading-7 text-white outline-none transition-colors placeholder:text-muted/60 focus:border-accent/50"
        />
        <p className="mt-1 text-[10px] text-muted">
          {message.length} / 3000 حرف
        </p>
      </div>

      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-website">الموقع</label>
        <input
          id="contact-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <div aria-live="polite" className="mt-3 min-h-5">
        {error ? <p className="text-[11px] text-danger">{error}</p> : null}
      </div>

      <button
        type="submit"
        disabled={pending || message.trim().length < 10}
        className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="h-4 w-4" aria-hidden="true" />
        )}
        إرسال الرسالة
      </button>
    </form>
  );
}
