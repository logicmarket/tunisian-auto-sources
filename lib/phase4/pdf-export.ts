/**
 * File: lib/phase4/pdf-export.ts
 * Purpose: Lazy browser-only PDF/JSON export for the personal dashboard.
 * html2pdf.js is imported on demand so it never enters the initial bundle;
 * when it fails, callers fall back to the browser print dialog.
 */

export interface PdfExportResult {
  ok: boolean;
  error?: string;
}

function safeFilename(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "sources";
}

export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
): Promise<PdfExportResult> {
  try {
    const mod = await import("html2pdf.js");
    const html2pdf = mod.default;

    await html2pdf()
      .set({
        margin: [8, 8, 10, 8],
        filename: `${safeFilename(filename)}.pdf`,
        image: { type: "jpeg", quality: 0.96 },
        enableLinks: true,
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          scrollY: 0,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
      })
      .from(element)
      .save();

    return { ok: true };
  } catch (error) {
    console.error("[pdf-export] failed:", error);
    return {
      ok: false,
      error: "تعذر إنشاء ملف PDF. فتحنا لك نافذة الطباعة كبديل.",
    };
  }
}

/** Browser-only JSON download for a portable copy of the local dashboard. */
export function downloadJson(data: unknown, filename: string): PdfExportResult {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeFilename(filename)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return { ok: true };
  } catch (error) {
    console.error("[json-export] failed:", error);
    return {
      ok: false,
      error: "تعذر إنشاء ملف JSON. جرّب متصفحاً آخر.",
    };
  }
}
