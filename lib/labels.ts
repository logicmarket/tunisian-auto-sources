/**
 * Arabic display labels for the controlled vocabulary from Phase 0.
 * Values are translated, never invented: unknown values fall back to the
 * original database string so new data is always visible.
 */

const SYSTEM_LABELS: Record<string, string> = {
  "General / Multi-system": "عام / متعدد الأنظمة",
  Diagnostics: "تشخيص",
  "Electrical & Electronics": "كهرباء وإلكترونيات",
  Engine: "المحرك",
  "Suspension & Steering": "التعليق والتوجيه",
  "Cooling & AC": "التبريد والتكييف",
  "Fuel & Injection": "الوقود والحقن",
  Transmission: "ناقل الحركة",
  "Body & Paint": "الهيكل والطلاء",
  "Exhaust & Emissions": "العادم والانبعاثات",
};

const TASK_LABELS: Record<string, string> = {
  "Repair Guide": "دليل إصلاح",
  Diagnosis: "تشخيص",
  "OBD / Error Codes": "أكواد الأعطال",
  "Software / Apps": "برامج وتطبيقات",
  "Reference / Learning": "مراجع وتعلّم",
  "ECU Programming": "برمجة ECU",
  "Community / Forums": "مجتمعات ومنتديات",
  "Parts / Suppliers": "قطع وموردون",
  "Tools & Equipment": "أدوات ومعدات",
  Maintenance: "صيانة",
};

const LANGUAGE_LABELS: Record<string, string> = {
  English: "الإنجليزية",
  French: "الفرنسية",
  Arabic: "العربية",
  "Mixed / Multilingual": "متعدد اللغات",
  Unknown: "غير محدّد",
};

const OBD_CATEGORY_LABELS: Record<string, string> = {
  P: "مجموعة المحرك والدفع (P)",
  B: "مجموعة الهيكل (B)",
  C: "مجموعة الشاسيه والعجلات (C)",
  U: "مجموعة الشبكة (U)",
  "Engine / Ignition": "المحرك / الإشعال",
  "Engine / Sensors & Actuators": "المحرك / الحساسات والمشغلات",
  "Fuel & Air Metering": "الوقود وتقدير الهواء",
  "Emissions & EVAP": "الانبعاثات ونظام EVAP",
  "Cooling System": "نظام التبريد",
  Transmission: "ناقل الحركة",
  "Electrical System": "النظام الكهربائي",
  "Body / SRS & Safety": "الهيكل / الوسائد وأنظمة السلامة",
  "Body / Comfort & Access": "الهيكل / الراحة والوصول",
  "Chassis / ABS & Stability": "الشاسيه / ABS والاتزان",
  "Network / Communication": "الشبكة / الاتصال",
  "Ignition / Misfire": "الإشعال وفقدان الاشتعال",
  "Emissions / Catalyst": "الانبعاثات والكاتاليزور",
  "Emissions / Oxygen Sensor": "الانبعاثات وحساس الأكسجين",
  "Emissions / EVAP": "أبخرة الوقود (EVAP)",
  "Sensor / Circuit": "الحساسات والدوائر",
  "Idle Control": "التحكم في الخمول",
  "Ignition System": "نظام الإشعال",
  "Fuel System": "نظام الوقود",
  "Air Intake": "سحب الهواء",
  "Engine Mechanical": "ميكانيكا المحرك",
};

export type LinkStatusTone = "success" | "warning" | "neutral" | "danger";

const LINK_STATUS_META: Record<string, { label: string; tone: LinkStatusTone }> = {
  LIVE: { label: "رابط نشط", tone: "success" },
  REDIRECT: { label: "رابط محوّل", tone: "warning" },
  UNKNOWN: { label: "غير مؤكد", tone: "neutral" },
  UNVERIFIED: { label: "غير محقّق", tone: "neutral" },
  DEAD: { label: "رابط معطّل", tone: "danger" },
};

export function getSystemLabel(value: string): string {
  return SYSTEM_LABELS[value] ?? value;
}

export function getTaskLabel(value: string): string {
  return TASK_LABELS[value] ?? value;
}

export function getLanguageLabel(value: string): string {
  return LANGUAGE_LABELS[value] ?? value;
}

export function getObdCategoryLabel(value: string): string {
  return OBD_CATEGORY_LABELS[value] ?? value;
}

export type SeverityTone = "critical" | "high" | "medium" | "low";

const SEVERITY_META: Record<
  string,
  { label: string; tone: SeverityTone; description: string }
> = {
  Critical: {
    label: "خطير جداً",
    tone: "critical",
    description: "أوقف القيادة وراجع السيارة فوراً؛ قد يمسّ هذا العطل السلامة المباشرة.",
  },
  High: {
    label: "مرتفع",
    tone: "high",
    description: "لا تُؤجّل الإصلاح. قد يتلف مكوّناً باهظاً أو يؤثر على الأداء والانبعاثات.",
  },
  Medium: {
    label: "متوسط",
    tone: "medium",
    description: "راقب السلوك وأصلح في أقرب فرصة مناسبة قبل أن يتفاقم.",
  },
  Low: {
    label: "منخفض",
    tone: "low",
    description: "أثر محدود على القيادة، لكن الفحص الدوري يمنع مفاجآت لاحقاً.",
  },
};

export function getSeverityMeta(value: string | null | undefined): {
  label: string;
  tone: SeverityTone;
  description: string;
} {
  return (
    SEVERITY_META[value ?? ""] ?? {
      label: "غير محدّد",
      tone: "medium",
      description: "لم تُحدَّد درجة الخطورة لهذا الكود بعد.",
    }
  );
}

export const severityToneClasses: Record<SeverityTone, string> = {
  critical: "border-red-400/30 bg-red-400/10 text-red-300",
  high: "border-orange-400/30 bg-orange-400/10 text-orange-300",
  medium: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  low: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
};

export function getLinkStatusMeta(value: string): { label: string; tone: LinkStatusTone } {
  return LINK_STATUS_META[value] ?? { label: value || "غير محدد", tone: "neutral" };
}

export const linkStatusToneClasses: Record<LinkStatusTone, string> = {
  success: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
  warning: "bg-amber-400/10 text-amber-300 ring-amber-400/20",
  neutral: "bg-slate-400/10 text-slate-300 ring-slate-400/20",
  danger: "bg-red-400/10 text-red-300 ring-red-400/20",
};
