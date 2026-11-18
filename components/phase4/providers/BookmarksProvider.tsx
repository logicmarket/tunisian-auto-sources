"use client";

/**
 * File: components/phase4/providers/BookmarksProvider.tsx
 * Purpose: One shared client store for bookmarks, personal ratings, the
 * comparison list and the anonymous visitor id. Every tool reads and writes
 * the same localStorage keys, and changes propagate across tabs.
 *
 * Keys (exact contract):
 *   my-bookmarks        number[]
 *   my-ratings          { [sourceId]: { stars, date, comment?, helpful? } }
 *   compare-list        number[]  (max 4)
 *   rating-visitor-id   string
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { MyRating, RatingMap } from "@/lib/types";

export const STORAGE_KEYS = {
  bookmarks: "my-bookmarks",
  ratings: "my-ratings",
  compare: "compare-list",
  visitor: "rating-visitor-id",
  diagnosisGuide: "diagnosis-guide-dismissed",
  dashboardGuide: "my-sources-guide-dismissed",
  adminToken: "admin-token-session",
} as const;

export const MAX_COMPARE = 4;

const STORAGE_PRIVATE_MESSAGE =
  "المتصفح في وضع التصفح الخاص. بعض الميزات غير متاحة. استخدم متصفح عادي.";

interface BookmarksContextValue {
  ready: boolean;
  storageAvailable: boolean;
  storageError: string | null;
  visitorId: string;
  bookmarks: number[];
  ratings: RatingMap;
  compareList: number[];
  isBookmarked: (sourceId: number) => boolean;
  toggleBookmark: (sourceId: number, sourceName?: string) => void;
  removeBookmark: (sourceId: number) => void;
  isCompared: (sourceId: number) => boolean;
  toggleCompare: (sourceId: number, sourceName?: string) => boolean;
  clearCompare: () => void;
  myRating: (sourceId: number) => MyRating | null;
  saveRating: (
    sourceId: number,
    stars: number,
    extra?: { comment?: string | null; helpful?: boolean | null },
  ) => void;
  removeRating: (sourceId: number) => void;
  notify: (message: string) => void;
  dismissGuide: (key: "diagnosis" | "dashboard") => void;
  isGuideDismissed: (key: "diagnosis" | "dashboard") => boolean;
}

const BookmarksContext = createContext<BookmarksContextValue | null>(null);

function readJson<T>(storage: Storage, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseNumbers(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry > 0);
}

function parseRatings(value: unknown): RatingMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: RatingMap = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const id = Number(key);
    if (!Number.isInteger(id) || id <= 0) continue;
    if (!raw || typeof raw !== "object") continue;
    const record = raw as Record<string, unknown>;
    const stars = Number(record.stars);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) continue;
    result[String(id)] = {
      stars,
      date:
        typeof record.date === "string" ? record.date : new Date().toISOString(),
      comment:
        typeof record.comment === "string" ? record.comment : undefined,
      helpful:
        typeof record.helpful === "boolean" ? record.helpful : undefined,
    };
  }
  return result;
}

function generateVisitorId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through to a deterministic-enough random string.
  }
  const random = Math.random().toString(36).slice(2);
  const time = Date.now().toString(36);
  return `visitor-${time}-${random}`;
}

interface NoticeState {
  id: number;
  message: string;
}

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState("");
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [ratings, setRatings] = useState<RatingMap>({});
  const [compareList, setCompareList] = useState<number[]>([]);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [guides, setGuides] = useState<Record<string, boolean>>({});
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markStorageUnavailable = useCallback(() => {
    setStorageAvailable((previous) => {
      if (previous) setStorageError(STORAGE_PRIVATE_MESSAGE);
      return false;
    });
  }, []);

  const notify = useCallback((message: string) => {
    setNotice({ id: Date.now(), message });
  }, []);

  /* Initial read + visitor bootstrap. */
  useEffect(() => {
    let storage: Storage;
    try {
      storage = window.localStorage;
      const probe = "__tas_storage_probe__";
      storage.setItem(probe, "1");
      storage.removeItem(probe);
    } catch {
      setStorageAvailable(false);
      setStorageError(STORAGE_PRIVATE_MESSAGE);
      setReady(true);
      return;
    }

    const storedVisitor = storage.getItem(STORAGE_KEYS.visitor);
    let nextVisitor = storedVisitor?.trim() ?? "";
    if (!/^[A-Za-z0-9._:-]{8,80}$/.test(nextVisitor)) {
      nextVisitor = generateVisitorId();
      try {
        storage.setItem(STORAGE_KEYS.visitor, nextVisitor);
      } catch {
        setStorageAvailable(false);
        setStorageError(STORAGE_PRIVATE_MESSAGE);
      }
    }

    setVisitorId(nextVisitor);
    setBookmarks(
      Array.from(new Set(parseNumbers(readJson(storage, STORAGE_KEYS.bookmarks, [])))),
    );
    setRatings(parseRatings(readJson(storage, STORAGE_KEYS.ratings, {})));
    setCompareList(
      Array.from(
        new Set(parseNumbers(readJson(storage, STORAGE_KEYS.compare, []))),
      ).slice(0, MAX_COMPARE),
    );
    setGuides({
      diagnosis: storage.getItem(STORAGE_KEYS.diagnosisGuide) === "1",
      dashboard: storage.getItem(STORAGE_KEYS.dashboardGuide) === "1",
    });
    setReady(true);
  }, []);

  /* Persist after every change (and mirror changes from other tabs). */
  useEffect(() => {
    if (!ready || !storageAvailable) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.bookmarks,
        JSON.stringify(bookmarks),
      );
    } catch {
      markStorageUnavailable();
    }
  }, [bookmarks, ready, storageAvailable, markStorageUnavailable]);

  useEffect(() => {
    if (!ready || !storageAvailable) return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.ratings, JSON.stringify(ratings));
    } catch {
      markStorageUnavailable();
    }
  }, [ratings, ready, storageAvailable, markStorageUnavailable]);

  useEffect(() => {
    if (!ready || !storageAvailable) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.compare,
        JSON.stringify(compareList),
      );
    } catch {
      markStorageUnavailable();
    }
  }, [compareList, ready, storageAvailable, markStorageUnavailable]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (!event.key) return;
      if (event.key === STORAGE_KEYS.bookmarks) {
        setBookmarks(
          Array.from(
            new Set(parseNumbers(readJson(window.localStorage, event.key, []))),
          ),
        );
      } else if (event.key === STORAGE_KEYS.ratings) {
        setRatings(
          parseRatings(readJson(window.localStorage, event.key, {})),
        );
      } else if (event.key === STORAGE_KEYS.compare) {
        setCompareList(
          Array.from(
            new Set(
              parseNumbers(readJson(window.localStorage, event.key, [])),
            ),
          ).slice(0, MAX_COMPARE),
        );
      } else if (event.key === STORAGE_KEYS.visitor) {
        const next = event.newValue?.trim() ?? "";
        if (/^[A-Za-z0-9._:-]{8,80}$/.test(next)) setVisitorId(next);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* Toast auto-dismiss. */
  useEffect(() => {
    if (!notice) return;
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3200);
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, [notice]);

  const isBookmarked = useCallback(
    (sourceId: number) => bookmarks.includes(sourceId),
    [bookmarks],
  );

  const toggleBookmark = useCallback(
    (sourceId: number, sourceName?: string) => {
      if (!ready) return;
      if (bookmarks.includes(sourceId)) {
        setBookmarks(bookmarks.filter((id) => id !== sourceId));
        setCompareList((previous) => previous.filter((id) => id !== sourceId));
        notify("تمت إزالة المصدر من المفضلة.");
      } else {
        setBookmarks([...bookmarks, sourceId]);
        notify(
          sourceName
            ? `تم حفظ «${sourceName}» في المفضلة.`
            : "تم حفظ المصدر في المفضلة.",
        );
      }
    },
    [bookmarks, notify, ready],
  );

  const removeBookmark = useCallback(
    (sourceId: number) => {
      setBookmarks((previous) => previous.filter((id) => id !== sourceId));
      setCompareList((previous) => previous.filter((id) => id !== sourceId));
      notify("تمت إزالة المصدر من المفضلة.");
    },
    [notify],
  );

  const isCompared = useCallback(
    (sourceId: number) => compareList.includes(sourceId),
    [compareList],
  );

  const toggleCompare = useCallback(
    (sourceId: number, sourceName?: string): boolean => {
      if (!ready) return false;
      if (compareList.includes(sourceId)) {
        setCompareList(compareList.filter((id) => id !== sourceId));
        notify("تمت إزالة المصدر من المقارنة.");
        return true;
      }
      if (compareList.length >= MAX_COMPARE) {
        notify(
          `يمكن مقارنة ${MAX_COMPARE} مصادر كحد أقصى. أزل مصدراً من القائمة أولاً.`,
        );
        return false;
      }
      setCompareList([...compareList, sourceId]);
      notify(
        sourceName
          ? `تمت إضافة «${sourceName}» إلى المقارنة.`
          : "تمت إضافة المصدر إلى المقارنة.",
      );
      return true;
    },
    [compareList, notify, ready],
  );

  const clearCompare = useCallback(() => {
    setCompareList([]);
    notify("تم تفريغ قائمة المقارنة.");
  }, [notify]);

  const myRating = useCallback(
    (sourceId: number): MyRating | null => ratings[String(sourceId)] ?? null,
    [ratings],
  );

  const saveRating = useCallback(
    (
      sourceId: number,
      stars: number,
      extra?: { comment?: string | null; helpful?: boolean | null },
    ) => {
      setRatings((previous) => ({
        ...previous,
        [String(sourceId)]: {
          stars,
          date: new Date().toISOString(),
          comment:
            extra?.comment === null
              ? undefined
              : (extra?.comment ?? previous[String(sourceId)]?.comment),
          helpful:
            extra?.helpful === null
              ? undefined
              : (extra?.helpful ?? previous[String(sourceId)]?.helpful),
        },
      }));
    },
    [],
  );

  const removeRating = useCallback(
    (sourceId: number) => {
      setRatings((previous) => {
        const next = { ...previous };
        delete next[String(sourceId)];
        return next;
      });
      notify("تم حذف تقييمك المحلي.");
    },
    [notify],
  );

  const dismissGuide = useCallback((key: "diagnosis" | "dashboard") => {
    setGuides((previous) => ({ ...previous, [key]: true }));
    try {
      const storageKey =
        key === "diagnosis"
          ? STORAGE_KEYS.diagnosisGuide
          : STORAGE_KEYS.dashboardGuide;
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // The banner can simply reappear next visit.
    }
  }, []);

  const isGuideDismissed = useCallback(
    (key: "diagnosis" | "dashboard") => guides[key] === true,
    [guides],
  );

  const value = useMemo<BookmarksContextValue>(
    () => ({
      ready,
      storageAvailable,
      storageError,
      visitorId,
      bookmarks,
      ratings,
      compareList,
      isBookmarked,
      toggleBookmark,
      removeBookmark,
      isCompared,
      toggleCompare,
      clearCompare,
      myRating,
      saveRating,
      removeRating,
      notify,
      dismissGuide,
      isGuideDismissed,
    }),
    [
      ready,
      storageAvailable,
      storageError,
      visitorId,
      bookmarks,
      ratings,
      compareList,
      isBookmarked,
      toggleBookmark,
      removeBookmark,
      isCompared,
      toggleCompare,
      clearCompare,
      myRating,
      saveRating,
      removeRating,
      notify,
      dismissGuide,
      isGuideDismissed,
    ],
  );

  return (
    <BookmarksContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-3 bottom-4 z-[95] flex justify-center sm:inset-x-auto sm:left-6"
      >
        {notice ? (
          <div className="pointer-events-auto max-w-md rounded-xl border border-accent/30 bg-surface-raised px-4 py-3 text-sm font-semibold text-white shadow-2xl animate-fade-up">
            {notice.message}
          </div>
        ) : null}
      </div>
    </BookmarksContext.Provider>
  );
}

export function useBookmarks(): BookmarksContextValue {
  const context = useContext(BookmarksContext);
  if (!context) {
    throw new Error("useBookmarks must be used inside BookmarksProvider.");
  }
  return context;
}
