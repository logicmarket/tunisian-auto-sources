"use client";

/**
 * File: components/layout/Header.tsx
 * Purpose: Sticky Arabic RTL header with primary navigation, a search
 * trigger (Ctrl/⌘+K), and a slide-out mobile drawer.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Bookmark,
  HelpCircle,
  Menu,
  ScanLine,
  Search,
  Stethoscope,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { useBookmarks } from "@/components/phase4/providers/BookmarksProvider";

const NAV_LINKS = [
  { href: "/", label: "الرئيسية", match: "exact" as const },
  { href: "/tools/diagnosis", label: "التشخيص", match: "prefix" as const },
  { href: "/obd-codes", label: "أكواد OBD", match: "prefix" as const },
  { href: "/categories", label: "التصنيفات", match: "prefix" as const },
  { href: "/my-sources", label: "مساحتي", match: "prefix" as const },
  { href: "/about", label: "عن المنصة", match: "prefix" as const },
];

function isActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();
  const { ready, bookmarks } = useBookmarks();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line/70 bg-background/85 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <Link
            href="/"
            className="group flex min-h-12 shrink-0 items-center gap-2.5 rounded-xl focus-visible:ring-offset-4"
            aria-label="بوابة مصادر السيارات التونسية — الصفحة الرئيسية"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-background shadow-accent-glow transition-transform duration-200 group-hover:-rotate-6">
              <Wrench className="h-5 w-5" strokeWidth={2.4} aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[14px] font-extrabold tracking-tight text-white sm:text-base">
                بوابة مصادر السيارات
              </span>
              <span className="mt-1 text-[10px] font-medium tracking-wide text-muted">
                دليل الورشات التونسية
              </span>
            </span>
          </Link>

          <nav
            className="hidden items-center gap-0.5 lg:flex"
            aria-label="التنقل الرئيسي"
          >
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href, link.match);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex min-h-12 items-center rounded-lg px-3 text-sm font-semibold transition-colors",
                    active
                      ? "bg-accent/10 text-accent-300"
                      : "text-muted-strong hover:bg-surface hover:text-white",
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {link.href === "/tools/diagnosis" ? (
                      <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : null}
                    {link.label}
                    {link.href === "/my-sources" && ready && bookmarks.length > 0 ? (
                      <span
                        className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-extrabold text-background"
                        aria-label={`${bookmarks.length} مصدراً محفوظاً`}
                      >
                        {bookmarks.length}
                      </span>
                    ) : null}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="فتح البحث في المنصة"
              className="inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-muted-strong transition-colors hover:border-accent/40 hover:text-white"
            >
              <Search className="h-4 w-4 text-accent-400" aria-hidden="true" />
              <span className="hidden sm:inline">بحث</span>
              <kbd className="hidden rounded border border-line bg-surface-raised px-1.5 py-0.5 font-sans text-[9px] text-muted lg:inline">
                Ctrl K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="فتح قائمة التنقل"
              aria-expanded={menuOpen}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface text-muted-strong transition-colors hover:border-accent/40 hover:text-white lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-[85] lg:hidden" role="presentation">
          <button
            type="button"
            aria-label="إغلاق قائمة التنقل"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="قائمة التنقل"
            className="absolute inset-y-0 right-0 flex w-[85%] max-w-xs animate-drawer flex-col border-l border-line bg-surface shadow-2xl"
          >
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <span className="flex items-center gap-2 text-sm font-extrabold text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-background">
                  <Wrench className="h-4 w-4" aria-hidden="true" />
                </span>
                بوابة المصادر
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="إغلاق القائمة"
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-line text-muted-strong transition-colors hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="قائمة الهاتف">
              <ul className="space-y-1">
                {NAV_LINKS.map((link) => {
                  const active = isActive(pathname, link.href, link.match);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-12 items-center justify-between rounded-xl px-4 text-sm font-bold transition-colors",
                          active
                            ? "bg-accent/10 text-accent-300"
                            : "text-muted-strong hover:bg-surface-raised hover:text-white",
                        )}
                      >
                        <span>{link.label}</span>
                        {link.href === "/my-sources" && ready && bookmarks.length > 0 ? (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-extrabold text-background">
                            {bookmarks.length}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="my-4 h-px bg-line" />

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setSearchOpen(true);
                }}
                className="flex min-h-12 w-full items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-background"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                البحث في المنصة
              </button>

              <div className="mt-5 space-y-2 px-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                  وصول سريع
                </p>
                <Link
                  href="/tools/diagnosis"
                  className="flex min-h-12 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-muted-strong hover:text-white"
                >
                  <Stethoscope className="h-4 w-4 text-accent-400" aria-hidden="true" />
                  التشخيص الموجّه
                </Link>
                <Link
                  href="/sources"
                  className="flex min-h-12 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-muted-strong hover:text-white"
                >
                  <BookOpen className="h-4 w-4 text-accent-400" aria-hidden="true" />
                  كل المصادر
                </Link>
                <Link
                  href="/my-sources"
                  className="flex min-h-12 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-muted-strong hover:text-white"
                >
                  <Bookmark className="h-4 w-4 text-accent-400" aria-hidden="true" />
                  مساحتي الشخصية
                </Link>
                <Link
                  href="/contribute"
                  className="flex min-h-12 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-muted-strong hover:text-white"
                >
                  <ScanLine className="h-4 w-4 text-accent-400" aria-hidden="true" />
                  أضف مصدراً
                </Link>
                <Link
                  href="/obd-codes"
                  className="flex min-h-12 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-muted-strong hover:text-white"
                >
                  <ScanLine className="h-4 w-4 text-accent-400" aria-hidden="true" />
                  قاعدة أكواد OBD
                </Link>
                <Link
                  href="/how-to-use"
                  className="flex min-h-12 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-muted-strong hover:text-white"
                >
                  <HelpCircle className="h-4 w-4 text-accent-400" aria-hidden="true" />
                  كيف تستعمل المنصة
                </Link>
              </div>
            </nav>

            <div className="border-t border-line px-4 py-4">
              <p className="text-[10px] leading-5 text-muted">
                دليل عملي لمصادر تشخيص وإصلاح السيارات — واجهة عربية، سريعة على
                الهاتف.
              </p>
            </div>
          </aside>
        </div>
      ) : null}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
