/**
 * File: lib/catalog.ts
 * Purpose: Single source of truth for the portal's browsable taxonomy:
 * system categories, task categories, Arabic descriptions, URL slugs,
 * icons and accent tones. Shared by server pages, filters and search.
 */

import {
  getLanguageLabel,
  getSystemLabel,
  getTaskLabel,
} from "./labels";
import { formatNumber, normalizeSearchText, toFilterKey } from "./utils";

export type SystemTone =
  | "general"
  | "diagnostics"
  | "electrical"
  | "engine"
  | "suspension"
  | "cooling"
  | "fuel"
  | "transmission"
  | "body"
  | "exhaust";

export type CatalogIconName =
  | "layers"
  | "stethoscope"
  | "zap"
  | "cog"
  | "gauge"
  | "thermometer"
  | "fuel"
  | "git-branch"
  | "paintbrush"
  | "wind"
  | "book-open"
  | "scan-line"
  | "cpu"
  | "graduation-cap"
  | "settings"
  | "users"
  | "package"
  | "wrench"
  | "calendar";

export interface SystemMeta {
  value: string;
  slug: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: CatalogIconName;
  tone: SystemTone;
}

export interface TaskMeta {
  value: string;
  slug: string;
  label: string;
  quickLabel: string;
  description: string;
  icon: CatalogIconName;
  quick: boolean;
}

/**
 * The ten systems in the Phase 0 controlled vocabulary. Order is deliberate:
 * broad general references first, then increasing specialisation.
 */
export const SYSTEM_META: SystemMeta[] = [
  {
    value: "General / Multi-system",
    slug: "general-multi-system",
    label: "عام / متعدد الأنظمة",
    shortLabel: "عام",
    description:
      "مصادر شاملة تغطي عدة أنظمة وطرازات في منصة واحدة: أدلة إصلاح كبرى، قواعد بيانات متعددة العلامات، ومنصات تشخيص عامة.",
    icon: "layers",
    tone: "general",
  },
  {
    value: "Diagnostics",
    slug: "diagnostics",
    label: "تشخيص",
    shortLabel: "تشخيص",
    description:
      "قواعد بيانات وأدوات تساعدك على تحديد العطل انطلاقاً من الكود أو العَرَض، قبل فك أي قطعة أو استبدالها.",
    icon: "stethoscope",
    tone: "diagnostics",
  },
  {
    value: "Electrical & Electronics",
    slug: "electrical-electronics",
    label: "كهرباء وإلكترونيات",
    shortLabel: "كهرباء",
    description:
      "مخططات كهربائية، مواضع الحساسات، وحدات التحكم، وطرق قياس الدوائر والبحث عن التسرب والقطع.",
    icon: "zap",
    tone: "electrical",
  },
  {
    value: "Engine",
    slug: "engine",
    label: "المحرك",
    shortLabel: "المحرك",
    description:
      "أعطال المحرك والاشتعال والتوقيت، ضغط الأسطوانات، تسرب الهواء، وأنظمة الهواء والوقود المرتبطة به.",
    icon: "cog",
    tone: "engine",
  },
  {
    value: "Suspension & Steering",
    slug: "suspension-steering",
    label: "التعليق والتوجيه",
    shortLabel: "التعليق",
    description:
      "المساعدين، المقصات، العكوس، زوايا العجل، وأنظمة التوجيه الكهربائية والهيدروليكية.",
    icon: "gauge",
    tone: "suspension",
  },
  {
    value: "Cooling & AC",
    slug: "cooling-ac",
    label: "التبريد والتكييف",
    shortLabel: "التبريد",
    description:
      "دورة التبريد، الرادياتير، الثرموستات، المراوح، وضاغط التكييف ودوائر الفريون.",
    icon: "thermometer",
    tone: "cooling",
  },
  {
    value: "Fuel & Injection",
    slug: "fuel-injection",
    label: "الوقود والحقن",
    shortLabel: "الوقود",
    description:
      "مضخة الوقود، البخاخات، حساسات الضغط، وأنظمة الحقن المباشر وتصحيحات الخليط.",
    icon: "fuel",
    tone: "fuel",
  },
  {
    value: "Transmission",
    slug: "transmission",
    label: "ناقل الحركة",
    shortLabel: "الناقل",
    description:
      "ناقل الحركة العادي والأوتوماتيك، الصمامات (Solenoids)، وكمبيوتر الناقل وإجراءات إعادة التعلم.",
    icon: "git-branch",
    tone: "transmission",
  },
  {
    value: "Body & Paint",
    slug: "body-paint",
    label: "الهيكل والطلاء",
    shortLabel: "الهيكل",
    description:
      "الهيكل، السمكرة، الطلاء، الزجاج، والإكسسوارات الخارجية والداخلية.",
    icon: "paintbrush",
    tone: "body",
  },
  {
    value: "Exhaust & Emissions",
    slug: "exhaust-emissions",
    label: "العادم والانبعاثات",
    shortLabel: "العادم",
    description:
      "العادم، الكاتاليزور، حساسات الأكسجين، ونظام EVAP واختبارات الانبعاثات.",
    icon: "wind",
    tone: "exhaust",
  },
];

/** All ten task categories, with the eight requested quick filters flagged. */
export const TASK_META: TaskMeta[] = [
  {
    value: "Diagnosis",
    slug: "diagnosis",
    label: getTaskLabel("Diagnosis"),
    quickLabel: "تشخيص",
    description:
      "تحديد العطل من الأعراض أو كود العطل خطوة بخطوة قبل استبدال القطع.",
    icon: "stethoscope",
    quick: true,
  },
  {
    value: "Repair Guide",
    slug: "repair-guide",
    label: getTaskLabel("Repair Guide"),
    quickLabel: "إصلاح",
    description:
      "خطوات الفك والتركيب، عزوم الربط، ومواصفات الصانع لكل طراز.",
    icon: "book-open",
    quick: true,
  },
  {
    value: "Maintenance",
    slug: "maintenance",
    label: getTaskLabel("Maintenance"),
    quickLabel: "صيانة",
    description:
      "جداول الصيانة الدورية، مواصفات السوائل، وقطع الاستهلاك.",
    icon: "calendar",
    quick: true,
  },
  {
    value: "ECU Programming",
    slug: "ecu-programming",
    label: getTaskLabel("ECU Programming"),
    quickLabel: "برمجة ECU",
    description:
      "برمجة وحدات التحكم، الترميز، التحديثات، وإعادة التعلم.",
    icon: "settings",
    quick: true,
  },
  {
    value: "Parts / Suppliers",
    slug: "parts-suppliers",
    label: getTaskLabel("Parts / Suppliers"),
    quickLabel: "قطع غيار",
    description:
      "موردو قطع الغيار، مقارنة الأرقام، والبحث عن البدائل.",
    icon: "package",
    quick: true,
  },
  {
    value: "Tools & Equipment",
    slug: "tools-equipment",
    label: getTaskLabel("Tools & Equipment"),
    quickLabel: "أدوات",
    description:
      "أجهزة الفحص، أطقم الأدوات، ومعدات الورشة اليومية.",
    icon: "wrench",
    quick: true,
  },
  {
    value: "OBD / Error Codes",
    slug: "obd-error-codes",
    label: getTaskLabel("OBD / Error Codes"),
    quickLabel: "أكواد أخطاء",
    description:
      "قواعد بيانات أكواد OBD ومعانيها وأسبابها وإجراءات فحصها.",
    icon: "scan-line",
    quick: true,
  },
  {
    value: "Reference / Learning",
    slug: "reference-learning",
    label: getTaskLabel("Reference / Learning"),
    quickLabel: "معلومات",
    description:
      "مراجع فنية، دورات، وشروحات نظرية تدعم قرارك في الورشة.",
    icon: "graduation-cap",
    quick: true,
  },
  {
    value: "Community / Forums",
    slug: "community-forums",
    label: getTaskLabel("Community / Forums"),
    quickLabel: "مجتمعات",
    description:
      "نقاشات فنيين، حالات محلولة، وتجارب من ورشات حقيقية.",
    icon: "users",
    quick: false,
  },
  {
    value: "Software / Apps",
    slug: "software-apps",
    label: getTaskLabel("Software / Apps"),
    quickLabel: "برامج",
    description:
      "تطبيقات تشخيص، برامج ورشة، وأدوات رقمية مساعدة.",
    icon: "cpu",
    quick: false,
  },
];

export const QUICK_TASKS = TASK_META.filter((task) => task.quick);

export function getSystemMeta(value: string | null | undefined): SystemMeta | null {
  if (!value) return null;
  return SYSTEM_META.find((system) => system.value === value) ?? null;
}

export function getSystemMetaBySlug(slug: string | null | undefined): SystemMeta | null {
  if (!slug) return null;
  const decoded = decodeURIComponent(slug).trim().toLowerCase();
  return (
    SYSTEM_META.find(
      (system) =>
        system.slug === decoded ||
        toFilterKey(system.value) === decoded ||
        system.value.toLowerCase() === decoded,
    ) ?? null
  );
}

export function getTaskMeta(value: string | null | undefined): TaskMeta | null {
  if (!value) return null;
  return TASK_META.find((task) => task.value === value) ?? null;
}

export function getTaskMetaBySlug(slug: string | null | undefined): TaskMeta | null {
  if (!slug) return null;
  const decoded = decodeURIComponent(slug).trim().toLowerCase();
  return (
    TASK_META.find(
      (task) =>
        task.slug === decoded ||
        toFilterKey(task.value) === decoded ||
        task.value.toLowerCase() === decoded,
    ) ?? null
  );
}

/** Resolves a URL `system` param from a slug, English value or Arabic label. */
export function resolveSystemParam(param: string | null | undefined): string | undefined {
  if (!param) return undefined;
  const meta = getSystemMetaBySlug(param);
  if (meta) return meta.value;
  const normalized = normalizeSearchText(param);
  return SYSTEM_META.find(
    (system) =>
      normalizeSearchText(system.label) === normalized ||
      normalizeSearchText(system.shortLabel) === normalized,
  )?.value;
}

export function resolveTaskParam(param: string | null | undefined): string | undefined {
  if (!param) return undefined;
  const meta = getTaskMetaBySlug(param);
  if (meta) return meta.value;
  const normalized = normalizeSearchText(param);
  return TASK_META.find(
    (task) =>
      normalizeSearchText(task.label) === normalized ||
      normalizeSearchText(task.quickLabel) === normalized,
  )?.value;
}

const LANGUAGE_VALUES = [
  "Arabic",
  "French",
  "English",
  "Mixed / Multilingual",
  "Unknown",
] as const;

export function getLanguageSlug(value: string): string {
  return toFilterKey(value);
}

export function resolveLanguageParam(param: string | null | undefined): string | undefined {
  if (!param) return undefined;
  const decoded = decodeURIComponent(param).trim();
  const normalized = normalizeSearchText(decoded);
  const direct = LANGUAGE_VALUES.find(
    (value) =>
      value.toLowerCase() === decoded.toLowerCase() ||
      toFilterKey(value) === decoded.toLowerCase() ||
      normalizeSearchText(getLanguageLabel(value)) === normalized,
  );
  if (direct) return direct;

  const aliases: Record<string, string> = {
    en: "English",
    eng: "English",
    ar: "Arabic",
    ara: "Arabic",
    fr: "French",
    fra: "French",
    english: "English",
    french: "French",
    arabic: "Arabic",
    multilingual: "Mixed / Multilingual",
    mixed: "Mixed / Multilingual",
  };

  return aliases[normalized];
}

export function systemHref(value: string): string {
  const meta = getSystemMeta(value);
  return meta ? `/categories/${meta.slug}` : `/categories/${toFilterKey(value)}`;
}

export function taskHref(value: string): string {
  const meta = getTaskMeta(value);
  const slug = meta?.slug ?? toFilterKey(value);
  return `/sources?task=${encodeURIComponent(slug)}`;
}

export function languageHref(value: string): string {
  return `/sources?lang=${encodeURIComponent(getLanguageSlug(value))}`;
}

/** Arabic count phrase used across cards and badges. */
export function sourceCountLabel(count: number): string {
  if (count <= 0) return "لا مصادر بعد";
  if (count === 1) return "مصدر واحد";
  if (count === 2) return "مصدران";
  if (count <= 10) return `${formatNumber(count)} مصادر`;
  return `${formatNumber(count)} مصدراً`;
}

/** Mutable alias used by search to keep labels in one place. */
export function getSystemLabelSafe(value: string): string {
  return getSystemMeta(value)?.label ?? getSystemLabel(value);
}

export function getTaskLabelSafe(value: string): string {
  return getTaskMeta(value)?.label ?? getTaskLabel(value);
}
