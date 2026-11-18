/**
 * File: lib/phase4/symptom-catalog.ts
 * Purpose: The curated symptom catalogue and the conservative symptom → OBD
 * mapping used by the guided diagnostic tool.
 *
 * Editorial rules
 * ---------------
 * 1. Every symptom is a physical observation a mechanic can make without a
 *    scan tool (rough idle, soft pedal, A/C not cooling, …).
 * 2. Every mapped code exists in `data/obd-codes.json` (442 rows).
 * 3. Mappings follow documented OBD-II families (misfire, fuel trim, EVAP,
 *    wheel speed, SRS, …). They are deliberately conservative and are marked
 *    `APPROXIMATE` in the UI: a symptom is not a diagnosis.
 * 4. Brand lists are only filled when the code itself is documented as
 *    brand-specific (e.g. P1586 Citroën/Peugeot, P1118 Fiat). We never guess
 *    a brand association.
 */

import type {
  DiagnosisConfidence,
  SymptomRecord,
  SymptomSystemId,
  SymptomSystemMeta,
} from "@/lib/types";

export const SYMPTOM_SYSTEMS: SymptomSystemMeta[] = [
  {
    id: "engine",
    name_ar: "المحرك",
    name_en: "Engine",
    description: "تفتفة، فقدان قوة، صعوبة تشغيل، استهلاك وقود أو ضغط زيت.",
    icon: "cog",
    tone: "engine",
  },
  {
    id: "electrical",
    name_ar: "الكهرباء",
    name_en: "Electrical",
    description: "بطارية، شحن، إضاءة عدادات، شبكة CAN أو إيموبيلايزر.",
    icon: "zap",
    tone: "electrical",
  },
  {
    id: "brakes",
    name_ar: "الفرامل",
    name_en: "Brakes",
    description: "ضوء ABS، دواسة طرية، اهتزاز عند الفرملة أو فرامل وقوف.",
    icon: "disc",
    tone: "brakes",
  },
  {
    id: "cooling",
    name_ar: "التبريد والتكييف",
    name_en: "Cooling & AC",
    description: "حرارة مرتفعة، مروحة، قراءة حرارة أو تكييف لا يبرد.",
    icon: "thermometer",
    tone: "cooling",
  },
  {
    id: "transmission",
    name_ar: "ناقل الحركة",
    name_en: "Transmission",
    description: "تعشيق متأخر، نفضة، انزلاق أو وضع الطوارئ.",
    icon: "git-branch",
    tone: "transmission",
  },
  {
    id: "fuel_exhaust",
    name_ar: "الوقود والعادم",
    name_en: "Fuel & Exhaust",
    description: "رائحة بنزين، خليط فقير/غني، دخان أو فشل الانبعاثات.",
    icon: "fuel",
    tone: "fuel",
  },
  {
    id: "suspension",
    name_ar: "التعليق والتوجيه",
    name_en: "Suspension & Steering",
    description: "اهتزاز على سرعة، ضوء ESP أو انحراف زاوية المقود.",
    icon: "gauge",
    tone: "suspension",
  },
  {
    id: "body",
    name_ar: "الجسم والوسائد الهوائية",
    name_en: "Body & SRS",
    description: "ضوء الوسائد، حساس صدمة أو حزام/شداد لا يعمل.",
    icon: "shield",
    tone: "body",
  },
];

interface SymptomSeed {
  id: string;
  name_ar: string;
  name_en: string;
  system_category: SymptomSystemId;
}

export const SYMPTOMS: SymptomSeed[] = [
  /* ── المحرك (8) ─────────────────────────────────────────────── */
  {
    id: "eng_rough_idle",
    name_ar: "رجّة أو تفتفة واضحة عند الوقوف",
    name_en: "Rough idle / misfire at idle",
    system_category: "engine",
  },
  {
    id: "eng_low_power",
    name_ar: "فقدان قوة عند التسريع",
    name_en: "Loss of power under acceleration",
    system_category: "engine",
  },
  {
    id: "eng_starts_then_stalls",
    name_ar: "المحرك يشتغل ثم يطفأ فوراً",
    name_en: "Engine starts then stalls",
    system_category: "engine",
  },
  {
    id: "eng_hard_start",
    name_ar: "صعوبة في التشغيل خاصة على البارد",
    name_en: "Hard starting, especially cold",
    system_category: "engine",
  },
  {
    id: "eng_high_fuel",
    name_ar: "استهلاك وقود مرتفع بشكل غير معتاد",
    name_en: "Abnormally high fuel consumption",
    system_category: "engine",
  },
  {
    id: "eng_misfire_load",
    name_ar: "تفتفة تحت الحمل أو عند التسارع",
    name_en: "Misfire under load / acceleration",
    system_category: "engine",
  },
  {
    id: "eng_knock",
    name_ar: "طرق أو قرقعة في المحرك",
    name_en: "Engine knock / pinging",
    system_category: "engine",
  },
  {
    id: "eng_oil_pressure",
    name_ar: "ضوء ضغط الزيت أو صوت ميكانيكي",
    name_en: "Oil pressure warning / mechanical noise",
    system_category: "engine",
  },

  /* ── الكهرباء (5) ───────────────────────────────────────────── */
  {
    id: "elec_battery_drain",
    name_ar: "البطارية تفرغ بسرعة أو الشحن ضعيف",
    name_en: "Battery drains quickly / weak charging",
    system_category: "electrical",
  },
  {
    id: "elec_dash_flicker",
    name_ar: "إضاءة العدادات ترمش أو تختفي",
    name_en: "Dashboard lights flicker or cut out",
    system_category: "electrical",
  },
  {
    id: "elec_multiple_systems",
    name_ar: "عدة أنظمة تتوقف في نفس الوقت",
    name_en: "Multiple systems fail at once",
    system_category: "electrical",
  },
  {
    id: "elec_immobilizer",
    name_ar: "المفتاح لا يُتعرّف عليه / منع التشغيل",
    name_en: "Key not recognised / immobilizer",
    system_category: "electrical",
  },
  {
    id: "elec_no_response",
    name_ar: "وحدة تحكم أو حساس لا يستجيب",
    name_en: "Control module or sensor not responding",
    system_category: "electrical",
  },

  /* ── الفرامل (4) ────────────────────────────────────────────── */
  {
    id: "brk_abs_light",
    name_ar: "ضوء ABS مضاء باستمرار",
    name_en: "ABS warning light on",
    system_category: "brakes",
  },
  {
    id: "brk_soft_pedal",
    name_ar: "دواسة الفرامل طرية أو تهبط",
    name_en: "Spongy or sinking brake pedal",
    system_category: "brakes",
  },
  {
    id: "brk_abs_vibration",
    name_ar: "اهتزاز أو تدخل ABS عند الفرملة",
    name_en: "ABS vibration / false activation",
    system_category: "brakes",
  },
  {
    id: "brk_parking",
    name_ar: "فرامل الوقوف / فرامل اليد لا تعمل",
    name_en: "Parking / handbrake not working",
    system_category: "brakes",
  },

  /* ── التبريد والتكييف (5) ───────────────────────────────────── */
  {
    id: "cool_overheat",
    name_ar: "ارتفاع سريع في حرارة المحرك",
    name_en: "Rapid engine overheating",
    system_category: "cooling",
  },
  {
    id: "cool_fan",
    name_ar: "الحرارة ترتفع في الوقوف / المروحة لا تدور",
    name_en: "Overheat at standstill / fan not running",
    system_category: "cooling",
  },
  {
    id: "cool_ac_no_cold",
    name_ar: "التكييف لا يبرد",
    name_en: "A/C not cooling",
    system_category: "cooling",
  },
  {
    id: "cool_ac_compressor",
    name_ar: "ضاغط التكييف لا يعمل",
    name_en: "A/C compressor not engaging",
    system_category: "cooling",
  },
  {
    id: "cool_temp_gauge",
    name_ar: "قراءة حرارة غير ثابتة أو خاطئة",
    name_en: "Unstable or incorrect temperature gauge",
    system_category: "cooling",
  },

  /* ── ناقل الحركة (4) ────────────────────────────────────────── */
  {
    id: "trn_delayed_shift",
    name_ar: "تعشيق متأخر أو نفضة عند النقل",
    name_en: "Delayed or harsh shifting",
    system_category: "transmission",
  },
  {
    id: "trn_limp",
    name_ar: "الناقل عالق في غيار واحد / وضع الطوارئ",
    name_en: "Transmission stuck in limp mode",
    system_category: "transmission",
  },
  {
    id: "trn_slip",
    name_ar: "انزلاق: صوت المحرك يرتفع بدون تسارع",
    name_en: "Slipping: RPM rises without acceleration",
    system_category: "transmission",
  },
  {
    id: "trn_light",
    name_ar: "ضوء الناقل أو TCS مضاء",
    name_en: "Transmission or TCS light on",
    system_category: "transmission",
  },

  /* ── الوقود والعادم (5) ──────────────────────────────────────── */
  {
    id: "fuel_smell",
    name_ar: "رائحة بنزين قوية",
    name_en: "Strong fuel smell",
    system_category: "fuel_exhaust",
  },
  {
    id: "fuel_lean",
    name_ar: "خليط فقير / تسارع متقطع",
    name_en: "Lean mixture / hesitation",
    system_category: "fuel_exhaust",
  },
  {
    id: "fuel_rich",
    name_ar: "خليط غني / دخان أسود",
    name_en: "Rich mixture / black smoke",
    system_category: "fuel_exhaust",
  },
  {
    id: "exh_emissions_fail",
    name_ar: "فشل في اختبار الانبعاثات",
    name_en: "Failed emissions test",
    system_category: "fuel_exhaust",
  },
  {
    id: "fuel_whistle",
    name_ar: "صوت شفط هواء / ضعف تسارع",
    name_en: "Intake whistle / weak acceleration",
    system_category: "fuel_exhaust",
  },

  /* ── التعليق والتوجيه (4) ───────────────────────────────────── */
  {
    id: "susp_vibration_speed",
    name_ar: "اهتزاز على سرعة معينة",
    name_en: "Vibration at a specific speed",
    system_category: "suspension",
  },
  {
    id: "susp_esp_light",
    name_ar: "ضوء ESP / التماسك مضاء",
    name_en: "ESP / traction warning light on",
    system_category: "suspension",
  },
  {
    id: "susp_steering_offset",
    name_ar: "المقود يميل أو زاوية غير صحيحة",
    name_en: "Steering wheel off-centre",
    system_category: "suspension",
  },
  {
    id: "susp_false_abs",
    name_ar: "ABS / ESP يتدخل بدون سبب",
    name_en: "False ABS / ESP intervention",
    system_category: "suspension",
  },

  /* ── الجسم والوسائد الهوائية (3) ─────────────────────────────── */
  {
    id: "body_airbag_light",
    name_ar: "ضوء الوسائد الهوائية مضاء",
    name_en: "Airbag (SRS) warning light on",
    system_category: "body",
  },
  {
    id: "body_airbag_no_deploy",
    name_ar: "شك في عدم عمل الوسائد / حساس صدمة",
    name_en: "Suspected SRS fault / impact sensor",
    system_category: "body",
  },
  {
    id: "body_seatbelt",
    name_ar: "الحزام أو الشداد لا يعمل",
    name_en: "Seatbelt or pretensioner fault",
    system_category: "body",
  },
];

export interface SymptomMappingSeed {
  symptom_id: string;
  obd_code: string;
  confidence: DiagnosisConfidence;
  common_brands: string[];
  priority_rank: number;
  rationale_ar: string;
}

function map(
  symptom_id: string,
  obd_code: string,
  confidence: DiagnosisConfidence,
  rationale_ar: string,
  options: { brands?: string[]; rank?: number } = {},
): SymptomMappingSeed {
  return {
    symptom_id,
    obd_code,
    confidence,
    common_brands: options.brands ?? [],
    priority_rank: options.rank ?? (confidence === "high" ? 1 : confidence === "medium" ? 2 : 3),
    rationale_ar,
  };
}

/**
 * Conservative mapping table. The first row per symptom is the closest
 * documented code; later rows are plausible alternatives, not certainties.
 */
export const SYMPTOM_MAPPINGS: SymptomMappingSeed[] = [
  /* Engine */
  map("eng_rough_idle", "P0300", "high", "تفتفة عشوائية متعددة الأسطوانات: أقرب تفسير لرجّة واضحة عند الوقوف."),
  map("eng_rough_idle", "P0301", "medium", "تفتفة في الأسطوانة 1 تظهر غالباً كرجّة عند الوقوف."),
  map("eng_rough_idle", "P0171", "medium", "خليط فقير قد يسبب تفتفة وتذبذباً في الدوران."),
  map("eng_rough_idle", "P1118", "low", "إشارة حساس الخانق منخفضة (مرتبطة بفيات) وقد تسبب تفتفة.", { brands: ["Fiat"] }),

  map("eng_low_power", "P0171", "high", "خليط فقير في البنك 1 يقلل القدرة ويظهر عند التسريع."),
  map("eng_low_power", "P0101", "medium", "قياس هواء الدخول خارج المدى يؤثر مباشرة على القدرة."),
  map("eng_low_power", "P0300", "medium", "تفتفة متعددة الأسطوانات تُحس كفقدان قوة."),
  map("eng_low_power", "P1586", "low", "حدود تكيّف الخانق غير مبلوغة (سيتروين/بيجو) وقد تسبب ضعف استجابة.", { brands: ["Citroen", "Peugeot"] }),

  map("eng_starts_then_stalls", "P0335", "high", "انقطاع إشارة حساس موضع العمود المرفقي يوقف المحرك فوراً."),
  map("eng_starts_then_stalls", "P0230", "medium", "دائرة مرحّل مضخة الوقود قد تقطع التغذية بعد التشغيل."),
  map("eng_starts_then_stalls", "P0102", "low", "إشارة هواء دخول منخفضة قد تسبب توقفاً بعد التشغيل."),

  map("eng_hard_start", "P0335", "high", "عدم قراءة موضع العمود المرفقي يمنع التشغيل الموثوق."),
  map("eng_hard_start", "P0230", "medium", "ضعف تغذية الوقود يجعل التشغيل طويلاً خاصة على البارد."),
  map("eng_hard_start", "P0128", "low", "ثرموستات دون حرارة التنظيم يؤثر على خليط التشغيل البارد."),

  map("eng_high_fuel", "P0172", "high", "خليط غني في البنك 1 يرفع الاستهلاك بوضوح."),
  map("eng_high_fuel", "P0175", "medium", "خليط غني في البنك 2 (محركات V) يرفع الاستهلاك."),
  map("eng_high_fuel", "P0101", "medium", "قراءة هواء غير دقيقة تسبب حقناً زائداً."),

  map("eng_misfire_load", "P0300", "high", "تفتفة تظهر تحت الحمل تُسجّل عادة كتفتفة عشوائية."),
  map("eng_misfire_load", "P0351", "medium", "دائرة ملف الإشعال A قد تنقطع تحت الحمل."),
  map("eng_misfire_load", "P0301", "medium", "تفتفة الأسطوانة 1 تظهر غالباً عند التسارع."),

  map("eng_knock", "P0325", "high", "دائرة حساس الطرق في البنك 1: أقرب كود لقرقعة مسموعة."),
  map("eng_knock", "P0326", "medium", "أداء حساس الطرق خارج المدى قد يسبب تأخير توقيت."),
  map("eng_knock", "P0300", "low", "تفتفة قد تُسمع خطأً كطرق في بعض المحركات."),

  map("eng_oil_pressure", "P0524", "high", "ضغط زيت المحرك منخفض: تحذير حرج يطابق ضوء الضغط."),
  map("eng_oil_pressure", "P0520", "medium", "دائرة حساس/مفتاح ضغط الزيت قد تعطي تحذيراً خاطئاً."),
  map("eng_oil_pressure", "P0521", "low", "أداء حساس ضغط الزيت خارج المدى."),

  /* Electrical */
  map("elec_battery_drain", "P0562", "high", "جهد النظام منخفض: يطابق بطارية تفرغ أو شحناً ضعيفاً."),
  map("elec_battery_drain", "P0560", "medium", "خلل عام في جهد النظام يستدعي فحص الشحن والأرضيات."),
  map("elec_battery_drain", "P0563", "low", "جهد مرتفع قد يشير إلى منظم شحن معطوب."),

  map("elec_dash_flicker", "P0561", "high", "جهد غير مستقر يفسر رمش إضاءة العدادات."),
  map("elec_dash_flicker", "U0155", "medium", "انقطاع الاتصال بلوحة العدادات يسبب اختفاء إضاءتها."),
  map("elec_dash_flicker", "U0001", "low", "خلل ناقل CAN عالي السرعة قد يؤثر على عدة وحدات."),

  map("elec_multiple_systems", "U0001", "high", "خلل ناقل CAN عالي السرعة يطابق تعطل أنظمة متعددة معاً."),
  map("elec_multiple_systems", "U0073", "high", "ناقل الاتصال في حالة إيقاف: علامة كلاسيكية لخلل شبكة."),
  map("elec_multiple_systems", "P0600", "medium", "خلل رابط الاتصال التسلسلي داخل وحدة التحكم."),

  map("elec_immobilizer", "P0513", "high", "مفتاح إيموبيلايزر غير صحيح: يطابق منع التشغيل."),
  map("elec_immobilizer", "U0167", "medium", "انقطاع الاتصال بوحدة الإيموبيلايزر."),
  map("elec_immobilizer", "P1260", "low", "اكتشاف سرقة/تعطيل مركبة (فورد) قد يمنع التشغيل."),

  map("elec_no_response", "U0100", "high", "لا اتصال مع وحدة ECM/PCM: وحدة تحكم لا تستجيب."),
  map("elec_no_response", "P0600", "medium", "خلل رابط الاتصال التسلسلي قد يقطع استجابة الوحدة."),
  map("elec_no_response", "U0002", "low", "أداء/إعداد ناقل CAN عالي السرعة غير سليم."),

  /* Brakes */
  map("brk_abs_light", "C0081", "high", "مؤشر عطل ABS: يطابق ضوء ABS المضاء مباشرة."),
  map("brk_abs_light", "C0031", "medium", "حساس سرعة العجل الأمامي الأيسر قد يطفئ ABS."),
  map("brk_abs_light", "C0034", "medium", "حساس سرعة العجل الأمامي الأيمن قد يطفئ ABS."),

  map("brk_soft_pedal", "C0049", "high", "مستوى سائل الفرامل: أول ما يجب فحصه مع دواسة هابطة."),
  map("brk_soft_pedal", "C0044", "medium", "حساس ضغط الفرامل A قد يفسر قراءة/أداء غير طبيعي."),
  map("brk_soft_pedal", "C0021", "medium", "أداء معزز الفرامل قد يسبب دواسة طرية."),

  map("brk_abs_vibration", "C0031", "high", "إشارة سرعة عجل غير منتظمة تسبب تدخل ABS واهتزازاً."),
  map("brk_abs_vibration", "C0034", "medium", "حساس عجل أمامي أيمن غير مستقر."),
  map("brk_abs_vibration", "C0061", "low", "حساس التسارع الجانبي قد يشارك في تدخل ESP."),

  map("brk_parking", "U0128", "high", "انقطاع الاتصال بوحدة فرامل الوقوف."),
  map("brk_parking", "C0040", "medium", "مفتاح دواسة الفرامل A قد يمنع تحرير/تعشيق الفرامل."),
  map("brk_parking", "C0082", "medium", "مؤشر عطل نظام الفرامل."),

  /* Cooling & AC */
  map("cool_overheat", "P0118", "high", "إشارة حرارة سائل تبريد مرتفعة: أقرب كود لارتفاع الحرارة."),
  map("cool_overheat", "P0128", "high", "ثرموستات دون حرارة التنظيم يفسر سلوك حرارة غير طبيعي."),
  map("cool_overheat", "P0117", "medium", "إشارة حساس الحرارة منخفضة (دائرة) قد تعطي قراءة مضللة."),

  map("cool_fan", "P0118", "high", "حرارة مرتفعة عند الوقوف تطابق إشارة ECT مرتفعة."),
  map("cool_fan", "P0115", "medium", "دائرة حساس حرارة السائل قد تمنع تشغيل المروحة في الوقت المناسب."),
  map("cool_fan", "P0128", "medium", "سلوك الثرموستات يؤثر على متى تعمل المروحة."),

  map("cool_ac_no_cold", "P0534", "high", "فقدان شحنة الفريون: يطابق تكييفاً لا يبرد."),
  map("cool_ac_no_cold", "P0530", "medium", "دائرة حساس ضغط الفريون قد تعطل الضاغط."),
  map("cool_ac_no_cold", "P0532", "medium", "إشارة ضغط فريون منخفضة تمنع التشغيل."),

  map("cool_ac_compressor", "P0530", "high", "حساس ضغط الفريون يتحكم في تعشيق الضاغط."),
  map("cool_ac_compressor", "P0532", "medium", "ضغط منخفض قد يمنع تعشيق الضاغط حمايةً له."),
  map("cool_ac_compressor", "P0534", "medium", "نقص الشحنة يمنع الضاغط من العمل بفعالية."),

  map("cool_temp_gauge", "P0115", "high", "دائرة حساس حرارة السائل: مصدر قراءة المؤشر."),
  map("cool_temp_gauge", "P0119", "medium", "إشارة حساس الحرارة متقطعة تسبب تذبذب المؤشر."),
  map("cool_temp_gauge", "P0116", "low", "أداء حساس الحرارة خارج المدى."),

  /* Transmission */
  map("trn_delayed_shift", "P0700", "high", "عطل نظام التحكم في الناقل: الكود الجامع لأعطال TCM."),
  map("trn_delayed_shift", "P0730", "medium", "نسبة تعشيق غير صحيحة قد تُحس كتأخر في النقل."),
  map("trn_delayed_shift", "P0745", "medium", "ملف الصمام A قد يبطئ النقل."),

  map("trn_limp", "P0700", "high", "عطل نظام الناقل يفعّل وضع الطوارئ غالباً."),
  map("trn_limp", "P0705", "high", "حساس مدى الناقل قد يحبس الناقل في غيار واحد."),
  map("trn_limp", "P0702", "medium", "عطل كهربائي في نظام التحكم بالناقل."),

  map("trn_slip", "P0730", "high", "نسبة تعشيق غير صحيحة: توقيع انزلاق الناقل."),
  map("trn_slip", "P1870", "medium", "انزلاق مكوّنات الناقل (GM) يطابق ارتفاع الدوران دون تسارع."),
  map("trn_slip", "P0740", "medium", "دائرة قفل محول العزم قد تسبب انزلاقاً."),

  map("trn_light", "P0700", "high", "الكود الجامع الذي يضيء ضوء الناقل."),
  map("trn_light", "U0101", "medium", "انقطاع الاتصال بوحدة TCM."),
  map("trn_light", "P0702", "medium", "عطل كهربائي في نظام التحكم."),

  /* Fuel & Exhaust */
  map("fuel_smell", "P0455", "high", "تسرب كبير في نظام EVAP يطابق رائحة بنزين."),
  map("fuel_smell", "P0442", "medium", "تسرب صغير في EVAP قد يفسر الرائحة."),
  map("fuel_smell", "P0457", "medium", "تسرب مع غطاء وقود غير محكم أو مفقود."),

  map("fuel_lean", "P0171", "high", "خليط فقير في البنك 1: أقرب كود لتسارع متقطع."),
  map("fuel_lean", "P0174", "medium", "خليط فقير في البنك 2."),
  map("fuel_lean", "P0101", "medium", "قياس هواء غير دقيق يسبب خليطاً فقيراً."),

  map("fuel_rich", "P0172", "high", "خليط غني في البنك 1: يطابق دخاناً أسود."),
  map("fuel_rich", "P0175", "medium", "خليط غني في البنك 2."),
  map("fuel_rich", "P0101", "low", "قراءة هواء خاطئة قد تسبب حقناً زائداً."),

  map("exh_emissions_fail", "P0420", "high", "كفاءة الكاتاليزور في البنك 1 دون الحد: سبب شائع لفشل الانبعاثات."),
  map("exh_emissions_fail", "P0430", "medium", "كفاءة الكاتاليزور في البنك 2."),
  map("exh_emissions_fail", "P0442", "low", "تسرب EVAP صغير قد يفشل الاختبار."),

  map("fuel_whistle", "P0101", "high", "قياس هواء خارج المدى يطابق صوت شفط وضعف تسارع."),
  map("fuel_whistle", "P0102", "medium", "إشارة هواء دخول منخفضة."),
  map("fuel_whistle", "P0171", "medium", "خليط فقير ناتج عن هواء غير مقيس."),

  /* Suspension & Steering */
  map("susp_vibration_speed", "C0051", "high", "حساس موضع المقود قد يسبب اهتزازاً/تدخلاً في التوجيه."),
  map("susp_vibration_speed", "C0031", "medium", "إشارة سرعة عجل غير منتظمة تسبب اهتزازاً على سرعة معينة."),
  map("susp_vibration_speed", "U0126", "medium", "انقطاع الاتصال بحساس زاوية المقود."),

  map("susp_esp_light", "C0061", "high", "حساس التسارع الجانبي: عنصر أساسي في ESP."),
  map("susp_esp_light", "C0063", "medium", "حساس معدل الانحراف (Yaw) يطابق ضوء ESP."),
  map("susp_esp_light", "U0122", "medium", "انقطاع الاتصال بوحدة ديناميكية المركبة."),

  map("susp_steering_offset", "C0051", "high", "حساس موضع المقود يطابق ميل المقود/زاوية غير صحيحة."),
  map("susp_steering_offset", "C0052", "medium", "إشارة A لحساس موضع المقود."),
  map("susp_steering_offset", "U0126", "medium", "انقطاع الاتصال بحساس زاوية المقود."),

  map("susp_false_abs", "C0061", "high", "حساس تسارع جانبي غير سليم قد يسبب تدخل ESP بلا سبب."),
  map("susp_false_abs", "C0063", "medium", "حساس Yaw غير مستقر يفسر تدخلاً خاطئاً."),
  map("susp_false_abs", "C0031", "low", "إشارة سرعة عجل قد تسبب تدخل ABS خاطئاً."),

  /* Body & SRS */
  map("body_airbag_light", "B0090", "high", "حساس التقييد الأمامي الأيسر: سبب شائع لضوء SRS."),
  map("body_airbag_light", "B0050", "medium", "حساس حزام المقعد للسائق."),
  map("body_airbag_light", "U0151", "medium", "انقطاع الاتصال بوحدة التقييد (SRS)."),

  map("body_airbag_no_deploy", "B0101", "high", "حساس الصدمة الأمامي الأيسر: يؤثر على قرار فتح الوسادة."),
  map("body_airbag_no_deploy", "B0090", "medium", "حساس تقييد أمامي قد يمنع عمل النظام."),
  map("body_airbag_no_deploy", "U0151", "medium", "فقدان الاتصال بوحدة SRS."),

  map("body_seatbelt", "B0070", "high", "دائرة شداد حزام السائق: يطابق شداداً لا يعمل."),
  map("body_seatbelt", "B0050", "medium", "حساس حزام المقعد للسائق."),
  map("body_seatbelt", "B0080", "low", "محدد حمل حزام السائق."),
];

/** Safety-first pre-diagnosis steps per system. */
export const INITIAL_STEPS: Record<SymptomSystemId, string[]> = {
  engine: [
    "أطفئ المحرك وافحص مستوى الزيت وسائل التبريد قبل أي تشغيل إضافي.",
    "سجّل أكواد الأعطال و«بيانات التجميد» (Freeze Frame) قبل مسح أي كود.",
    "افحص خراطيم الهواء بحثاً عن تشقق أو تسرب غير مقيس.",
    "لا تستبدل أي قطعة قبل التحقق من التغذية والكتلة والتوصيلات.",
  ],
  electrical: [
    "افحص أطراف البطارية والأرضيات ونظّفها قبل أي قياس.",
    "قِس جهد الشحن: يجب أن يكون قريباً من 13.5–14.5 فولت عند الدوران.",
    "افحص المصاهر والمرحّلات المتعلقة بالدائرة المعطلة.",
    "افصل البطارية قبل العمل على أي وحدة تحكم أو توصيلات حساسات.",
  ],
  brakes: [
    "لا تقُد السيارة إذا كانت الدواسة تهبط أو هناك تسرب سائل فرامل.",
    "افحص مستوى سائل الفرامل ونوعه حسب دليل الصانع.",
    "افحص التيل والأنابيب والوصلات بحثاً عن تسرب أو تلف.",
    "ارفع السيارة بأمان وافحص أسلاك حساسات سرعة العجل.",
  ],
  cooling: [
    "لا تفتح غطاء الرادياتير أثناء سخونة المحرك إطلاقاً.",
    "افحص المستوى فقط بعد أن يبرد المحرك تماماً.",
    "افحص المروحة والمرحّل والفيوز قبل الحكم على الثرموستات.",
    "في التكييف لا تفرّغ الدائرة دون معدات استرجاع الفريون.",
  ],
  transmission: [
    "افحص مستوى سائل الناقل حسب إجراء الصانع (محرك دائر/مطفأ).",
    "اقرأ أكواد TCM قبل مسحها وسجّل ظروف ظهور العطل.",
    "لا تجبر الناقل على التعشيق عند سماع صوت غير طبيعي.",
    "افحص توصيلات وحدة TCM والأرضيات.",
  ],
  fuel_exhaust: [
    "لا تدخّن ولا تقترب من لهب مكشوف عند فحص دائرة الوقود.",
    "افحص غطاء الوقود وخراطيم EVAP أولاً عند وجود رائحة.",
    "قِس ضغط الوقود حسب مواصفات الصانع قبل استبدال المضخة.",
    "لا تستبدل الكاتاليزور قبل التأكد من عدم وجود خليط غني أو تسرب.",
  ],
  suspension: [
    "ارفع السيارة على نقاط رفع معتمدة واستخدم حوامل أمان.",
    "افحص لعب العجل والمقصات والمساعدين قبل أي ضبط زوايا.",
    "افحص ضغط الإطارات وتآكلها غير المنتظم.",
    "بعد أي عمل على التعليق أعد ضبط الزوايا حسب الصانع.",
  ],
  body: [
    "افصل البطارية وانتظر المدة التي يحددها الصانع قبل العمل على SRS.",
    "لا تفحص موصلات الوسائد بمقياس مقاومة عادي.",
    "لا تفك أي وسادة هوائية دون تدريب ومعدات معتمدة.",
    "سجّل أكواد B قبل مسحها وافحص شدادات الأحزمة بصرياً.",
  ],
};

export function getSymptomById(id: string): SymptomSeed | null {
  return SYMPTOMS.find((symptom) => symptom.id === id) ?? null;
}

export function getSystemMeta(
  id: SymptomSystemId,
): SymptomSystemMeta | null {
  return SYMPTOM_SYSTEMS.find((system) => system.id === id) ?? null;
}

export function symptomsForSystem(system: SymptomSystemId): SymptomSeed[] {
  return SYMPTOMS.filter((symptom) => symptom.system_category === system);
}

export const DIAGNOSIS_BRANDS = [
  "Peugeot",
  "Renault",
  "Citroen",
  "Fiat",
  "Hyundai",
  "Kia",
  "Volkswagen",
  "Other",
] as const;

export type DiagnosisBrand = (typeof DIAGNOSIS_BRANDS)[number];

/** Converts the catalogue into rows ready for the `symptoms` table. */
export function toSymptomRecords(): SymptomRecord[] {
  const counters = new Map<string, number>();
  return SYMPTOMS.map((symptom) => {
    const order = counters.get(symptom.system_category) ?? 0;
    counters.set(symptom.system_category, order + 1);
    return { ...symptom, sort_order: order };
  });
}
