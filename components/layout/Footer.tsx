/**
 * File: components/layout/Footer.tsx
 * Purpose: Site footer with a short description, quick links, last link
 * verification date, contact entry point, and share actions.
 */

import Link from "next/link";
import { CalendarCheck, Mail, ShieldCheck, Wrench } from "lucide-react";
import { getLastVerifiedDate } from "@/lib/queries";
import { formatArabicDate } from "@/lib/utils";

const quickLinks = [
  { href: "/tools/diagnosis", label: "التشخيص الموجّه" },
  { href: "/categories", label: "التصنيفات" },
  { href: "/obd-codes", label: "أكواد OBD" },
  { href: "/sources", label: "كل المصادر" },
  { href: "/my-sources", label: "مساحتي" },
  { href: "/contribute", label: "أضف مصدراً" },
  { href: "/how-to-use", label: "كيف تستعمل" },
  { href: "/about", label: "عن المنصة" },
];

const systemLinks = [
  { href: "/categories/engine", label: "المحرك" },
  { href: "/categories/electrical-electronics", label: "الكهرباء" },
  { href: "/categories/transmission", label: "ناقل الحركة" },
  { href: "/categories/cooling-ac", label: "التبريد والتكييف" },
];

function shareUrl(network: "whatsapp" | "facebook"): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const text = "بوابة مصادر السيارات التونسية — دليل عملي لمصادر التشخيص والإصلاح";
  if (network === "whatsapp") {
    return `https://wa.me/?text=${encodeURIComponent(`${text} ${site}`)}`;
  }
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(site)}`;
}

export async function Footer() {
  const lastVerified = await getLastVerifiedDate();

  return (
    <footer className="mt-auto border-t border-line bg-surface-sunken/70">
      <div className="container-page py-10 sm:py-12">
        <div className="grid gap-9 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-background">
                <Wrench className="h-5 w-5" strokeWidth={2.4} aria-hidden="true" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-extrabold text-white">
                  بوابة مصادر السيارات التونسية
                </p>
                <p className="mt-1 text-[11px] text-muted">دليل عملي للورشات</p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-7 text-muted">
              مرجع واحد لميكانيكيي الورشات في تونس: أدلة إصلاح، أكواد أعطال،
              مخططات كهربائية، وبرامج تشخيص، بواجهة عربية سريعة على الهاتف.
            </p>
            <span className="chip mt-4">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
              بيانات مُنقّاة ومصنّفة من المرحلة الأولى
            </span>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white">روابط سريعة</h2>
            <ul className="mt-4 space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-8 items-center text-sm text-muted transition-colors hover:text-accent-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white">أنظمة شائعة</h2>
            <ul className="mt-4 space-y-2.5">
              {systemLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-8 items-center text-sm text-muted transition-colors hover:text-accent-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white">ابقَ على اطلاع</h2>
            <p className="mt-3 text-xs leading-6 text-muted">
              شارك المنصة مع زملائك في الورشة، أو أرسل ملاحظة لفريق التحرير.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={shareUrl("whatsapp")}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="مشاركة المنصة على واتساب"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[11px] font-bold text-muted-strong transition-colors hover:border-emerald-400/40 hover:text-emerald-300"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M17.47 14.38c-.29-.15-1.72-.85-1.99-.95-.27-.1-.46-.15-.66.15-.19.29-.76.95-.93 1.14-.17.19-.34.22-.63.07-.29-.15-1.22-.45-2.33-1.44-.86-.77-1.44-1.72-1.61-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.15-.66-1.59-.9-2.18-.24-.58-.48-.5-.66-.51h-.56c-.19 0-.51.07-.78.36-.27.29-1.03 1-1.03 2.44 0 1.44 1.05 2.83 1.2 3.02.15.19 2.07 3.16 5.01 4.43.7.3 1.25.48 1.68.62.71.23 1.35.2 1.86.12.57-.09 1.72-.7 1.96-1.38.24-.68.24-1.26.17-1.38-.07-.12-.27-.19-.56-.34z" />
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.86 9.86 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.02h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.11.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.25-4.36c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.2-8.25 8.2z" />
                </svg>
                واتساب
              </a>
              <a
                href={shareUrl("facebook")}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="مشاركة المنصة على فيسبوك"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[11px] font-bold text-muted-strong transition-colors hover:border-blue-400/40 hover:text-blue-300"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M14 8.5V6.75c0-.72.48-.9.82-.9h2.06V2.1L14.03 2C11.02 2 9.35 3.78 9.35 6.75V8.5H7v3.5h2.35V22h3.9v-10h2.9l.38-3.5H14z" />
                </svg>
                فيسبوك
              </a>
              <Link
                href="/about#contact"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-accent/25 bg-accent/10 px-3 text-[11px] font-bold text-accent-200 transition-colors hover:bg-accent hover:text-background"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                راسلنا
              </Link>
            </div>

            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-[10px] text-muted">
              <CalendarCheck className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" />
              آخر تحديث للروابط:{" "}
              <span className="font-bold text-muted-strong">
                {formatArabicDate(lastVerified)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-3 border-t border-line pt-6 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2025 بوابة مصادر السيارات التونسية. جميع المصادر مملوكة لأصحابها.</p>
          <p className="text-[10px] text-muted/80">
            صُمّمت للورشات: واجهة عربية · اتجاه من اليمين إلى اليسار · سريعة على الهاتف
          </p>
        </div>
      </div>
    </footer>
  );
}
