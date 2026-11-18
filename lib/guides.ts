/**
 * File: lib/guides.ts
 * Purpose: Loads the ten editorial system guides shown at
 * /categories/[system]/guide and exposes them to server components.
 */

import fs from "node:fs";
import path from "node:path";
import { SYSTEM_META, type SystemMeta } from "./catalog";

export interface GuideTerm {
  ar: string;
  fr: string;
  en: string;
  def: string;
}

export interface SystemGuide {
  slug: string;
  system: string;
  label: string;
  title: string;
  intro: string[];
  tips: string[];
  terms: GuideTerm[];
  mistakes: string[];
  tools: string[];
}

const GUIDES_PATH = path.join(process.cwd(), "data", "category-guides.json");

let cache: Record<string, SystemGuide> | null = null;

function loadGuides(): Record<string, SystemGuide> {
  if (cache) return cache;
  const raw = fs.readFileSync(GUIDES_PATH, "utf8");
  cache = JSON.parse(raw) as Record<string, SystemGuide>;
  return cache;
}

export function getAllGuides(): SystemGuide[] {
  return SYSTEM_META.map((system) => loadGuides()[system.slug]).filter(
    (guide): guide is SystemGuide => Boolean(guide),
  );
}

export function getGuideBySlug(
  slug: string | null | undefined,
): SystemGuide | null {
  if (!slug) return null;
  return loadGuides()[slug] ?? null;
}

export function getGuideForSystem(
  meta: SystemMeta | null,
): SystemGuide | null {
  if (!meta) return null;
  return getGuideBySlug(meta.slug);
}
