/**
 * Shared domain types for the Tunisian Automotive Sources Portal.
 * These mirror the SQLite schema in `lib/db.ts` one-to-one.
 */

export type LinkStatus = "LIVE" | "REDIRECT" | "UNKNOWN" | "UNVERIFIED" | "DEAD";

export interface SourceRecord {
  id: number;
  name: string;
  url: string;
  description_ar: string;
  description_fr: string | null;
  category_system: string;
  category_task: string;
  language: string;
  link_status: string;
  last_verified: string | null;
  rating: number;
  notes: string | null;
  slug?: string | null;
  submission_id?: number | null;
  created_at: string;
  updated_at: string;
}

/** Shape accepted by the seed loader before timestamps are assigned by SQLite. */
export interface SeedSource {
  id?: number;
  name: string;
  url: string;
  description_ar: string;
  description_fr?: string | null;
  category_system: string;
  category_task: string;
  language: string;
  link_status?: string;
  last_verified?: string | null;
  rating?: number;
  notes?: string | null;
}

export type ObdSeverity = "Critical" | "High" | "Medium" | "Low";

export type ObdVerification = "VERIFIED" | "UNVERIFIED";

export interface ObdCodeSeed {
  code: string;
  category: string;
  system_category?: string | null;
  related_system?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
  description?: string | null;
  causes?: string | string[] | null;
  diagnosis_steps?: string | string[] | null;
  severity?: string | null;
  verification?: string | null;
  source_note?: string | null;
  family?: string | null;
}

export interface SourceFilters {
  system?: string;
  task?: string;
  language?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export type SourceSort = "rating" | "latest" | "name";

export interface SourcePage {
  items: SourceRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ObdCodeRecord {
  id: number;
  code: string;
  category: string;
  system_category: string | null;
  related_system: string | null;
  name_ar: string | null;
  name_en: string | null;
  description: string | null;
  causes: string | null;
  diagnosis_steps: string | null;
  severity: string | null;
  verification: string | null;
  source_note: string | null;
  family: string | null;
}

export interface SearchCategoryResult {
  kind: "system" | "task";
  value: string;
  slug: string;
  label: string;
  description: string;
  count: number;
  href: string;
}

export interface SearchPortalResult {
  query: string;
  total: number;
  sources: SourceRecord[];
  categories: SearchCategoryResult[];
  obd: ObdCodeRecord[];
}

export interface SourceFeedbackSummary {
  ratingAverage: number;
  ratingCount: number;
  helpfulYes: number;
  helpfulNo: number;
}

export interface CategoryCount {
  value: string;
  count: number;
}

export interface CategoryGroups {
  systems: CategoryCount[];
  tasks: CategoryCount[];
  languages: CategoryCount[];
  statuses: CategoryCount[];
  total: number;
}

export interface PortalStats {
  totalSources: number;
  liveSources: number;
  redirectSources: number;
  arabicSources: number;
  systemCount: number;
  taskCount: number;
  averageRating: number;
}

export interface SeedResult {
  totalRecords: number;
  validRecords: number;
  insertedSources: number;
  skippedDuplicates: number;
  skippedIncomplete: number;
  skippedInvalid: number;
  insertedObdCodes: number;
}

export interface ApiError {
  error: string;
  detail?: string;
}

/* ─────────────────────────── Phase 4 ─────────────────────────── */

export type DiagnosisConfidence = "high" | "medium" | "low";

export type SymptomSystemId =
  | "engine"
  | "electrical"
  | "brakes"
  | "cooling"
  | "transmission"
  | "fuel_exhaust"
  | "suspension"
  | "body";

export interface SymptomRecord {
  id: string;
  name_ar: string;
  name_en: string;
  system_category: SymptomSystemId;
  sort_order: number;
}

export interface SymptomSystemMeta {
  id: SymptomSystemId;
  name_ar: string;
  name_en: string;
  description: string;
  icon:
    | "cog"
    | "zap"
    | "disc"
    | "thermometer"
    | "git-branch"
    | "fuel"
    | "gauge"
    | "shield";
  tone: string;
}

export interface SymptomMappingRecord {
  id: number;
  symptom_id: string;
  obd_code: string;
  confidence: DiagnosisConfidence;
  common_brands: string;
  priority_rank: number;
  rationale_ar: string | null;
  verification: string;
}

export interface DiagnosisMatch {
  code: ObdCodeRecord;
  confidence: DiagnosisConfidence;
  score: number;
  matchedSymptoms: string[];
  explanations: string[];
  brandMatched: boolean;
  approximate: boolean;
  relatedCodes: ObdCodeRecord[];
  sources: SourceRecord[];
}

export interface DiagnosisBySymptomResult {
  symptoms: SymptomRecord[];
  brand: string | null;
  matches: DiagnosisMatch[];
  initialSteps: string[];
  approximate: boolean;
}

export interface DiagnosisCodeDetail {
  code: ObdCodeRecord;
  relatedCodes: ObdCodeRecord[];
  sources: SourceRecord[];
  symptomHints: string[];
  approximate: boolean;
}

export interface RatingSummary {
  average: number;
  total: number;
  visitorRating: number | null;
  visitorComment: string | null;
  visitorHelpful: boolean | null;
  showAverage: boolean;
  flagged: boolean;
  updatedAt: string | null;
}

export interface RatingPostBody {
  stars: number;
  comment?: string;
  visitorId: string;
  helpful?: boolean;
}

export interface MyRating {
  stars: number;
  date: string;
  comment?: string;
  helpful?: boolean;
}

export type RatingMap = Record<string, MyRating>;

export interface SubmissionRecord {
  id: number;
  url: string;
  normalized_url: string;
  name: string;
  description_ar: string;
  suggested_system: string;
  suggested_task: string;
  reason: string | null;
  email: string | null;
  status: "pending" | "approved" | "rejected";
  reviewer_note: string | null;
  status_token: string;
  recaptcha_score: number | null;
  spam_flags: string | null;
  ip_address: string | null;
  published_source_id: number | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface SubmissionPublic {
  id: number;
  trackingId: string;
  name: string;
  url: string;
  status: SubmissionRecord["status"];
  createdAt: string;
  reviewedAt: string | null;
  reviewerNote: string | null;
  publishedSourceId: number | null;
}

export interface ContributeInput {
  url: string;
  name: string;
  description_ar: string;
  suggested_system: string;
  suggested_task: string;
  reason?: string;
  email?: string;
  recaptchaToken?: string;
}

export interface SourceSummary {
  id: number;
  name: string;
  url: string;
  description_ar: string;
  category_system: string;
  category_task: string;
  language: string;
  link_status: string;
  rating: number;
  created_at: string;
}
