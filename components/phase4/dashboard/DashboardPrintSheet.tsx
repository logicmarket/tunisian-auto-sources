"use client";

/**
 * File: components/phase4/dashboard/DashboardPrintSheet.tsx
 * Purpose: Light, A4-sized comparison sheet used by html2pdf and as the
 * browser-print fallback. It stays off-screen on screen but becomes the only
 * visible block in print mode.
 */

import { forwardRef } from "react";
import type { RatingMap, SourceRecord } from "@/lib/types";
import { getLanguageLabel, getSystemLabel, getTaskLabel } from "@/lib/labels";
import { formatRating } from "@/lib/utils";

interface DashboardPrintSheetProps {
  sources: SourceRecord[];
  ratings: RatingMap;
}

export const DashboardPrintSheet = forwardRef<HTMLDivElement, DashboardPrintSheetProps>(
  function DashboardPrintSheet({ sources, ratings }, ref) {
    const exportedAt = new Intl.DateTimeFormat("ar-TN-u-nu-latn", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());

    return (
      <div
        className="print-comparison-wrap pointer-events-none fixed left-[-10000px] top-0 z-[-1] w-[794px]"
        aria-hidden="true"
      >
        <div ref={ref} className="pdf-sheet bg-white p-8 text-[#111111]" dir="rtl">
          <div style={{ borderBottom: "2px solid #111", paddingBottom: 10, marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#b45309", margin: 0 }}>
              بوابة مصادر السيارات التونسية
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: "4px 0 0" }}>
              مقارنة المصادر المحفوظة
            </h1>
            <p style={{ fontSize: 10, color: "#555", margin: "4px 0 0" }}>
              تم التصدير في {exportedAt} · {sources.length} مصادر
            </p>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #999", padding: 6, textAlign: "right", background: "#f3f4f6" }}>
                  المعيار
                </th>
                {sources.map((source) => (
                  <th
                    key={source.id}
                    style={{ border: "1px solid #999", padding: 6, textAlign: "right", background: "#f3f4f6" }}
                  >
                    {source.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: "النظام",
                  render: (source: SourceRecord) => getSystemLabel(source.category_system),
                },
                {
                  label: "المهمة",
                  render: (source: SourceRecord) => getTaskLabel(source.category_task),
                },
                {
                  label: "اللغة",
                  render: (source: SourceRecord) => getLanguageLabel(source.language),
                },
                {
                  label: "حالة الرابط",
                  render: (source: SourceRecord) => source.link_status,
                },
                {
                  label: "التقييم التحريري",
                  render: (source: SourceRecord) => `${formatRating(source.rating)} / 5`,
                },
                {
                  label: "تقييمي",
                  render: (source: SourceRecord) =>
                    ratings[String(source.id)]
                      ? `${ratings[String(source.id)].stars} / 5`
                      : "لم يُقيَّم",
                },
              ].map((row) => (
                <tr key={row.label}>
                  <th style={{ border: "1px solid #999", padding: 6, textAlign: "right", background: "#f9fafb" }}>
                    {row.label}
                  </th>
                  {sources.map((source) => (
                    <td key={source.id} style={{ border: "1px solid #999", padding: 6 }}>
                      {row.render(source)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ marginTop: 14, fontSize: 9, lineHeight: 1.7, color: "#555" }}>
            هذه المقارنة أداة مساعدة لاختيار مصدر، وليست تقييماً فنياً للسيارات أو
            قطع الغيار. تحقّق من تاريخ آخر فحص للرابط على صفحة المصدر. التقييمات
            المعروضة تحريرية أو شخصية محلية، ومتوسط الزوار لا يظهر قبل 3 تقييمات.
          </p>
        </div>
      </div>
    );
  },
);
