"use client";

/**
 * File: components/search/useInstantSearch.ts
 * Purpose: Debounced instant-search hook (300 ms) shared by the header
 * overlay and the hero search bar. Cancels stale requests.
 */

import { useEffect, useState } from "react";
import type { SearchPortalResult } from "@/lib/types";

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

interface InstantSearchState {
  data: SearchPortalResult | null;
  loading: boolean;
  error: string | null;
  term: string;
}

export function useInstantSearch(query: string, enabled = true): InstantSearchState {
  const term = useDebouncedValue(query.trim(), 300);
  const [data, setData] = useState<SearchPortalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || term.length < 2) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/search?q=${encodeURIComponent(term)}&limit=8`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`search failed: ${response.status}`);
        return response.json() as Promise<SearchPortalResult>;
      })
      .then((payload) => {
        setData(payload);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError("تعذر إكمال البحث. تحقق من الاتصال وحاول مرة أخرى.");
        setData(null);
        setLoading(false);
      });

    return () => controller.abort();
  }, [term, enabled]);

  return { data, loading, error, term };
}
