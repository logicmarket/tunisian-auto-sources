/**
 * File: components/ui/category-tones.ts
 * Purpose: Tailwind class maps for the colour-coded system categories.
 * Kept as complete class strings so the Tailwind compiler can see them.
 */

import type { SystemTone } from "@/lib/catalog";

export interface SystemToneClasses {
  badge: string;
  icon: string;
  cardHover: string;
  bar: string;
}

export const SYSTEM_TONE_CLASSES: Record<SystemTone, SystemToneClasses> = {
  general: {
    badge: "bg-sky-400/10 text-sky-300 ring-sky-400/25",
    icon: "bg-sky-400/10 text-sky-300 ring-sky-400/20",
    cardHover: "hover:border-sky-400/35",
    bar: "from-sky-400 to-sky-300",
  },
  diagnostics: {
    badge: "bg-violet-400/10 text-violet-300 ring-violet-400/25",
    icon: "bg-violet-400/10 text-violet-300 ring-violet-400/20",
    cardHover: "hover:border-violet-400/35",
    bar: "from-violet-400 to-violet-300",
  },
  electrical: {
    badge: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
    icon: "bg-amber-400/10 text-amber-300 ring-amber-400/20",
    cardHover: "hover:border-amber-400/35",
    bar: "from-amber-400 to-yellow-300",
  },
  engine: {
    badge: "bg-red-400/10 text-red-300 ring-red-400/25",
    icon: "bg-red-400/10 text-red-300 ring-red-400/20",
    cardHover: "hover:border-red-400/35",
    bar: "from-red-400 to-rose-300",
  },
  suspension: {
    badge: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25",
    icon: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
    cardHover: "hover:border-emerald-400/35",
    bar: "from-emerald-400 to-teal-300",
  },
  cooling: {
    badge: "bg-cyan-400/10 text-cyan-300 ring-cyan-400/25",
    icon: "bg-cyan-400/10 text-cyan-300 ring-cyan-400/20",
    cardHover: "hover:border-cyan-400/35",
    bar: "from-cyan-400 to-sky-300",
  },
  fuel: {
    badge: "bg-orange-400/10 text-orange-300 ring-orange-400/25",
    icon: "bg-orange-400/10 text-orange-300 ring-orange-400/20",
    cardHover: "hover:border-orange-400/35",
    bar: "from-orange-400 to-amber-300",
  },
  transmission: {
    badge: "bg-blue-400/10 text-blue-300 ring-blue-400/25",
    icon: "bg-blue-400/10 text-blue-300 ring-blue-400/20",
    cardHover: "hover:border-blue-400/35",
    bar: "from-blue-400 to-indigo-300",
  },
  body: {
    badge: "bg-pink-400/10 text-pink-300 ring-pink-400/25",
    icon: "bg-pink-400/10 text-pink-300 ring-pink-400/20",
    cardHover: "hover:border-pink-400/35",
    bar: "from-pink-400 to-rose-300",
  },
  exhaust: {
    badge: "bg-slate-400/10 text-slate-300 ring-slate-400/25",
    icon: "bg-slate-400/10 text-slate-300 ring-slate-400/20",
    cardHover: "hover:border-slate-400/35",
    bar: "from-slate-400 to-slate-300",
  },
};
