"use client";

/**
 * File: components/phase4/diagnosis/CodeSearch.tsx
 * Purpose: Path A — debounced (300 ms) OBD code typeahead with keyboard
 * support, abortable requests and Arabic-only empty/error states.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertCircle, Loader2, RotateCw, ScanLine, Search, X } from "lucide-react";
import type { ObdCodeRecord } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

const QUICK_CODES = ["P0301", "P0420", "P0171", "P0128", "P0300"];

interface CodeSearchProps {
  onSelect: (code: string) => void;
  busy?: boolean;
}

export function CodeSearch({ onSelect, busy = false }: CodeSearchProps) {
  const inputId = useId();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ObdCodeRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(async (value: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/diagnosis/codes?q=${encodeURIComponent(value)}&limit=8`,
        { signal: controller.signal, cache: "no-store" },
      );
      const payload = (await response.json()) as {
        codes?: ObdCodeRecord[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "تعذر البحث في أكواد OBD. جرّب مرة أخرى.");
      }
      setResults(payload.codes ?? []);
      setActiveIndex(-1);
    } catch (cause) {
      if ((cause as Error)?.name === "AbortError") return;
      setResults([]);
      setError(
        cause instanceof Error
          ? cause.message
          : "تعذر البحث في أكواد OBD. جرّب مرة أخرى.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const value = query.trim();
    if (value.length === 0) {
      abortRef.current?.abort();
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      void runSearch(value);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, runSearch]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function choose(code: string) {
    setOpen(false);
    setResults([]);
    setQuery("");
    onSelect(code);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const chosen = activeIndex >= 0 ? results[activeIndex] : results[0];
      if (chosen) choose(chosen.code);
    }
  }

  const showPanel = open && query.trim().length > 0;

  return (
    <div className="space-y-3">
      <label htmlFor={inputId} className="block text-xs font-bold text-white">
        ابحث برقم كود OBD
      </label>

      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-accent-400">
          <Search className="h-4 w-4" aria-hidden="true" />
        </span>

        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 && results[activeIndex]
              ? `${listId}-${results[activeIndex].code}`
              : undefined
          }
          autoComplete="off"
          spellCheck={false}
          dir="ltr"
          value={query}
          disabled={busy}
          onChange={(event) => {
            setQuery(event.target.value.toUpperCase());
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Delay so a click on a result still registers.
            setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={handleKeyDown}
          placeholder="مثال: P0301 أو 420"
          className="min-h-12 w-full rounded-xl border border-line bg-surface-raised ps-10 pe-10 text-base font-bold uppercase tracking-wider text-white placeholder:text-sm placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-muted/70 focus:border-accent/50"
        />

        <div className="absolute inset-y-0 end-2 flex items-center gap-1">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-accent-400" aria-hidden="true" />
          ) : null}
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                setError(null);
              }}
              aria-label="مسح البحث"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {showPanel ? (
          <div
            className="absolute inset-x-0 top-[calc(100%+0.4rem)] z-30 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
            onMouseDown={(event) => event.preventDefault()}
          >
            {error ? (
              <div className="flex flex-wrap items-center gap-2 p-3 text-[11px] text-danger">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => void runSearch(query.trim())}
                  className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-danger/30 px-2 font-bold"
                >
                  <RotateCw className="h-3 w-3" aria-hidden="true" />
                  إعادة
                </button>
              </div>
            ) : loading && results.length === 0 ? (
              <div className="flex items-center gap-2 p-4 text-[11px] text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-400" aria-hidden="true" />
                جارٍ البحث…
              </div>
            ) : results.length === 0 ? (
              <div className="p-4">
                <p className="text-[11px] font-bold text-white">
                  لم نجد كوداً مطابقاً.
                </p>
                <p className="mt-1 text-[11px] leading-6 text-muted">
                  جرّب كوداً كاملاً مثل P0301، أو اختر الأعراض بدلاً من الكود.
                </p>
              </div>
            ) : (
              <ul id={listId} role="listbox" aria-label="نتائج البحث عن الأكواد" className="max-h-80 overflow-y-auto">
                {results.map((code, index) => (
                  <li
                    key={code.code}
                    id={`${listId}-${code.code}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    className={cn(
                      "cursor-pointer border-b border-line/60 px-3 py-2.5 last:border-b-0",
                      index === activeIndex ? "bg-accent/10" : "hover:bg-surface-raised",
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(code.code)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-extrabold tracking-wider text-accent-300">
                        {code.code}
                      </span>
                      <span className="text-[10px] text-muted">
                        {code.severity ?? "غير محدد"}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-strong">
                      {code.name_ar ?? code.name_en ?? "بدون وصف"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold text-muted">أكواد شائعة:</span>
        {QUICK_CODES.map((code) => (
          <button
            key={code}
            type="button"
            disabled={busy}
            onClick={() => choose(code)}
            className="inline-flex min-h-12 items-center gap-1 rounded-lg border border-line bg-surface-raised px-2.5 font-mono text-[11px] font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-accent-200 disabled:opacity-50"
          >
            <ScanLine className="h-3 w-3 text-accent-400" aria-hidden="true" />
            {code}
          </button>
        ))}
      </div>

      <p className="text-[10px] leading-5 text-muted/80">
        البحث يشمل رقم الكود والاسم العربي والإنجليزي ({formatNumber(442)} كوداً في
        القاعدة).
      </p>
    </div>
  );
}
