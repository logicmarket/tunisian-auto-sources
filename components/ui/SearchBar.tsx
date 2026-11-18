"use client";

/**
 * File: components/ui/SearchBar.tsx
 * Purpose: Prominent Arabic search input with 300 ms instant suggestions,
 * keyboard navigation, a clear button, and a full-results fallback.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchResultGroups } from "@/components/search/SearchResultGroups";
import {
  flattenSearchResults,
  type FlatSearchItem,
} from "@/components/search/search-result-utils";
import { useInstantSearch } from "@/components/search/useInstantSearch";

interface SearchBarProps {
  defaultValue?: string;
  size?: "md" | "lg";
  placeholder?: string;
  autoFocus?: boolean;
  showSuggestions?: boolean;
  className?: string;
  inputId?: string;
}

export function SearchBar({
  defaultValue = "",
  size = "lg",
  placeholder = "ابحث عن مصادر، أنظمة، خدمات...",
  autoFocus = false,
  showSuggestions = true,
  className,
  inputId = "portal-search",
}: SearchBarProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const enabled = showSuggestions && focused;
  const { data, loading, error, term } = useInstantSearch(value, enabled);
  const items = flattenSearchResults(data, true);
  const listboxId = `${inputId}-listbox`;
  const open = enabled && value.trim().length >= 2;

  useEffect(() => {
    if (!open) setActiveIndex(-1);
  }, [open]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function goToSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    setFocused(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function activate(item: FlatSearchItem) {
    setFocused(false);
    router.push(item.href);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (open && activeIndex >= 0 && items[activeIndex]) {
      activate(items[activeIndex]);
      return;
    }
    goToSearch(value);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setFocused(false);
      event.currentTarget.blur();
      return;
    }
    if (!open || items.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + items.length) % items.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0) {
        activate(items[activeIndex]);
      } else {
        goToSearch(value);
      }
    }
  }

  const inputHeight = size === "lg" ? "h-14 text-base" : "h-12 text-sm";

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form
        role="search"
        onSubmit={handleSubmit}
        className={cn(
          "flex items-center gap-1.5 rounded-2xl border border-line bg-surface/95 p-1.5 shadow-card backdrop-blur transition-colors",
          focused ? "border-accent/45 ring-1 ring-accent/20" : "hover:border-line/80",
        )}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-xl bg-surface-raised text-accent-400",
            size === "lg" ? "h-11 w-11" : "h-9 w-9",
          )}
          aria-hidden="true"
        >
          <Search className={size === "lg" ? "h-5 w-5" : "h-4 w-4"} />
        </span>

        <input
          id={inputId}
          type="search"
          value={value}
          autoFocus={autoFocus}
          onChange={(event) => {
            setValue(event.target.value);
            setActiveIndex(-1);
            setFocused(true);
          }}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${inputId}-option-${activeIndex}` : undefined
          }
          aria-label="البحث في مصادر السيارات"
          className={cn(
            "min-w-0 flex-1 bg-transparent px-1 font-semibold text-white outline-none",
            "placeholder:font-normal placeholder:text-muted/70",
            "[&::-webkit-search-cancel-button]:appearance-none",
            inputHeight,
          )}
        />

        {loading ? (
          <Loader2
            className="me-2 h-4 w-4 shrink-0 animate-spin text-accent-400"
            aria-label="جارٍ البحث"
          />
        ) : null}

        {value ? (
          <button
            type="button"
            onClick={() => {
              setValue("");
              setActiveIndex(-1);
            }}
            aria-label="مسح نص البحث"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}

        <button
          type="submit"
          className={cn(
            "shrink-0 rounded-xl bg-accent font-bold text-background shadow-accent-glow transition-opacity hover:opacity-90",
            "min-h-12",
            size === "lg" ? "px-5 text-sm" : "px-4 text-xs",
          )}
        >
          بحث
        </button>
      </form>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="نتائج البحث المقترحة"
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-[65vh] overflow-y-auto rounded-2xl border border-line bg-surface/98 p-1.5 shadow-2xl backdrop-blur-xl"
        >
          {error ? (
            <p className="px-3 py-4 text-center text-xs text-danger">{error}</p>
          ) : loading && !data ? (
            <div className="flex items-center justify-center gap-2 px-3 py-6 text-xs text-muted">
              <Loader2 className="h-4 w-4 animate-spin text-accent-400" aria-hidden="true" />
              جارٍ البحث عن «{term}»…
            </div>
          ) : items.length > 0 ? (
            <>
              <SearchResultGroups
                data={data}
                activeIndex={activeIndex}
                onActivate={activate}
                onHover={setActiveIndex}
                compact
                idPrefix={inputId}
              />
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => goToSearch(value)}
                className="mt-1 flex w-full items-center justify-center rounded-xl border border-line bg-surface-raised px-3 py-2.5 text-[11px] font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
              >
                عرض كل النتائج عن «{value.trim()}»
              </button>
            </>
          ) : (
            <div className="px-3 py-6 text-center">
              <p className="text-sm font-bold text-white">لا توجد نتائج</p>
              <p className="mt-1 text-[11px] leading-5 text-muted">
                جرّب كلمة أقصر، أو ابحث بكود العطل مثل P0300، أو باسم النظام
                مثل «كهرباء».
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
