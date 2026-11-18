"use client";

/**
 * File: components/search/SearchOverlay.tsx
 * Purpose: Full-screen instant search triggered from the header. Results
 * are grouped (sources, categories, OBD), keyboard-navigable, and recent
 * searches are remembered in localStorage.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock3,
  Loader2,
  Search,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchResultGroups } from "./SearchResultGroups";
import {
  flattenSearchResults,
  type FlatSearchItem,
} from "./search-result-utils";
import { useInstantSearch } from "./useInstantSearch";

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

const HISTORY_KEY = "tas-search-history";
const SUGGESTIONS = [
  "P0300",
  "كهرباء",
  "حساس الأكسجين",
  "زيت ناقل الحركة",
  "ECU",
  "فرامل",
];

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { data, loading, error } = useInstantSearch(query, open);
  const items = flattenSearchResults(data, false);
  const showResults = query.trim().length >= 2;

  useEffect(() => {
    if (!open) return;

    setActiveIndex(-1);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    try {
      const stored = window.localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) {
          setHistory(parsed.filter((item): item is string => typeof item === "string").slice(0, 5));
        }
      }
    } catch {
      setHistory([]);
    }

    const timer = window.setTimeout(() => inputRef.current?.focus(), 60);

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  function remember(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    const next = [trimmed, ...history.filter((item) => item !== trimmed)].slice(0, 5);
    setHistory(next);
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      // Storage can be unavailable in private mode; history is optional.
    }
  }

  function clearHistory() {
    setHistory([]);
    try {
      window.localStorage.removeItem(HISTORY_KEY);
    } catch {
      // Ignore storage failures.
    }
  }

  function activate(item: FlatSearchItem) {
    remember(query);
    onClose();
    router.push(item.href);
  }

  function submit() {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    remember(trimmed);
    onClose();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (!showResults || items.length === 0) {
      if (event.key === "Enter") {
        event.preventDefault();
        submit();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + items.length) % items.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0) activate(items[activeIndex]);
      else submit();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-background/95 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label="البحث الشامل في المنصة"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="border-b border-line bg-background/80">
        <div className="container-page flex items-center gap-3 py-3">
          <span className="flex items-center gap-2 text-sm font-extrabold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-background">
              <Wrench className="h-4 w-4" aria-hidden="true" />
            </span>
            البحث في المنصة
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق البحث"
            className="ms-auto flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="container-page py-6 sm:py-10">
          <div className="mx-auto max-w-3xl">
            <div
              className={cn(
                "flex items-center gap-2 rounded-2xl border border-line bg-surface p-2 shadow-card transition-colors",
                "focus-within:border-accent/50 focus-within:ring-1 focus-within:ring-accent/20",
              )}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-accent-400">
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <Search className="h-5 w-5" aria-hidden="true" />
                )}
              </span>
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder="ابحث عن مصادر، أنظمة، أكواد OBD..."
                role="combobox"
                aria-expanded={showResults}
                aria-controls="overlay-search-results"
                aria-autocomplete="list"
                aria-activedescendant={
                  activeIndex >= 0
                    ? `overlay-search-option-${activeIndex}`
                    : undefined
                }
                aria-label="نص البحث"
                className="h-11 min-w-0 flex-1 bg-transparent px-1 text-base font-semibold text-white outline-none placeholder:font-normal placeholder:text-muted/70 [&::-webkit-search-cancel-button]:appearance-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setActiveIndex(-1);
                    inputRef.current?.focus();
                  }}
                  aria-label="مسح نص البحث"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={submit}
                className="min-h-12 shrink-0 rounded-xl bg-accent px-5 text-sm font-bold text-background transition-opacity hover:opacity-90"
              >
                بحث
              </button>
            </div>

            <div className="mt-5" id="overlay-search-results">
              {!showResults ? (
                <div className="space-y-6">
                  {history.length > 0 ? (
                    <section aria-label="عمليات البحث الأخيرة">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="flex items-center gap-2 text-xs font-bold text-muted-strong">
                          <Clock3 className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
                          عمليات البحث الأخيرة
                        </h3>
                        <button
                          type="button"
                          onClick={clearHistory}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-muted transition-colors hover:text-danger"
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                          مسح السجل
                        </button>
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {history.map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => {
                              setQuery(term);
                              inputRef.current?.focus();
                            }}
                            className="inline-flex min-h-9 items-center rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-semibold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  <section aria-label="اقتراحات بحث">
                    <h3 className="text-xs font-bold text-muted-strong">
                      جرّب أحد هذه البحثات
                    </h3>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {SUGGESTIONS.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => {
                            setQuery(term);
                            inputRef.current?.focus();
                          }}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-semibold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
                        >
                          <Search className="h-3 w-3 text-accent-400" aria-hidden="true" />
                          {term}
                        </button>
                      ))}
                    </div>
                  </section>

                  <div className="rounded-2xl border border-line bg-surface/70 p-4">
                    <p className="text-xs leading-6 text-muted">
                      ابحث بالعربية أو بالإنجليزية، أو أدخل كود عطل مباشرة مثل{" "}
                      <span className="font-mono font-bold text-accent-300" dir="ltr">
                        P0300
                      </span>
                      . تظهر لك المصادر والتصنيفات والأكواد مرتبة في مجموعات.
                    </p>
                  </div>
                </div>
              ) : error ? (
                <div className="surface-card p-8 text-center">
                  <p className="text-sm font-bold text-danger">{error}</p>
                </div>
              ) : loading && !data ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
                  <Loader2 className="h-5 w-5 animate-spin text-accent-400" aria-hidden="true" />
                  جارٍ البحث…
                </div>
              ) : items.length > 0 ? (
                <div
                  role="listbox"
                  aria-label="نتائج البحث"
                  className="surface-card overflow-hidden p-2 sm:p-3"
                >
                  <SearchResultGroups
                    data={data}
                    activeIndex={activeIndex}
                    onActivate={activate}
                    onHover={setActiveIndex}
                    idPrefix="overlay-search"
                  />
                </div>
              ) : (
                <div className="surface-card flex flex-col items-center px-6 py-14 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-raised text-muted">
                    <Search className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-extrabold text-white">
                    لا توجد نتائج عن «{query.trim()}»
                  </h3>
                  <p className="mt-2 max-w-md text-xs leading-6 text-muted">
                    جرّب كلمة أقصر، أو ابحث باسم النظام مثل «كهرباء»، أو بكود
                    العطل مثل P0300. يمكنك أيضاً تصفح التصنيفات مباشرة.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.slice(0, 4).map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => setQuery(term)}
                        className="rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-semibold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <p className="mt-5 hidden text-center text-[10px] text-muted sm:block">
              للتنقل استخدم <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 font-sans">↑</kbd>{" "}
              <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 font-sans">↓</kbd>{" "}
              · للفتح <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 font-sans">Enter</kbd>{" "}
              · للإغلاق <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 font-sans">Esc</kbd>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
