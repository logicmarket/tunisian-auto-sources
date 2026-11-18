"use client";

/**
 * File: components/search/SearchResultGroups.tsx
 * Purpose: Grouped, keyboard-highlightable search results used in both the
 * full-screen overlay and the hero instant-search dropdown.
 */

import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  Layers,
  ScanLine,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { SearchPortalResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  flattenSearchResults,
  type FlatSearchItem,
} from "./search-result-utils";

interface SearchResultGroupsProps {
  data: SearchPortalResult | null;
  activeIndex: number;
  onActivate: (item: FlatSearchItem) => void;
  onHover: (index: number) => void;
  compact?: boolean;
  idPrefix?: string;
}

const GROUP_META: Record<
  FlatSearchItem["type"],
  { label: string; icon: LucideIcon }
> = {
  source: { label: "المصادر", icon: Wrench },
  category: { label: "التصنيفات", icon: Layers },
  obd: { label: "أكواد OBD", icon: ScanLine },
};

export function SearchResultGroups({
  data,
  activeIndex,
  onActivate,
  onHover,
  compact = false,
  idPrefix = "search",
}: SearchResultGroupsProps) {
  const items = flattenSearchResults(data, compact);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (items.length === 0) return null;

  return (
    <div className={cn("space-y-4", compact ? "p-2" : "space-y-5")}>
      {(Object.keys(GROUP_META) as FlatSearchItem["type"][]).map((type) => {
        const groupItems = items.filter((item) => item.type === type);
        if (groupItems.length === 0) return null;
        const { label, icon: Icon } = GROUP_META[type];

        return (
          <section key={type} aria-label={label}>
            <div className="flex items-center gap-2 px-2 pb-1.5">
              <Icon className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                {label}
              </h3>
              <span className="text-[10px] tabular-nums text-muted/70">
                {groupItems.length}
              </span>
            </div>

            <div className="space-y-0.5">
              {groupItems.map((item) => {
                const index = items.indexOf(item);
                const active = index === activeIndex;
                return (
                  <button
                    key={item.key}
                    ref={active ? activeRef : undefined}
                    id={`${idPrefix}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => onHover(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onActivate(item)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-start transition-colors",
                      active
                        ? "border-accent/35 bg-accent/10"
                        : "border-transparent hover:bg-surface-raised",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        active
                          ? "bg-accent text-background"
                          : "bg-surface-raised text-accent-300",
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        {item.obd ? (
                          <span
                            className="rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent-300"
                            dir="ltr"
                          >
                            {item.obd.code}
                          </span>
                        ) : null}
                        <span className="truncate text-sm font-bold text-white">
                          {item.title}
                        </span>
                      </span>
                      <span className="mt-0.5 line-clamp-1 block text-[11px] leading-5 text-muted">
                        {item.snippet}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-muted/70">
                        {item.meta}
                      </span>
                    </span>

                    <ArrowLeft
                      className={cn(
                        "mt-2 h-3.5 w-3.5 shrink-0",
                        active ? "text-accent-300" : "text-muted/40",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export { flattenSearchResults };
