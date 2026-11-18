import type { Metadata, Viewport } from "next";
import { Cairo, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { BookmarksProvider } from "@/components/phase4/providers/BookmarksProvider";
import { StorageNotice } from "@/components/phase4/StorageNotice";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  OG_IMAGE,
  OG_IMAGE_PATH,
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_NAME_SHORT,
  SITE_URL,
  getSeoStats,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import "@/styles/globals.css";

/**
 * Root layout — Arabic RTL, dark mode by default, Cairo for Arabic UI and
 * Inter as the Latin fallback. The `dark` class is intentional: garage
 * environments are dim, and Phase 2 will add an optional light theme.
 */

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
  preload: true,
  fallback: ["Segoe UI", "Tahoma", "sans-serif"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
  fallback: ["Segoe UI", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — دليل تشخيص وإصلاح السيارات`,
    template: `%s | ${SITE_NAME_SHORT}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "السيارات التونسية",
    "ميكانيكا السيارات",
    "تشخيص السيارات",
    "أكواد OBD",
    "إصلاح السيارات",
    "ورشات تونس",
    "automotive repair Tunisia",
    "OBD codes Arabic",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "automotive",
  alternates: {
    canonical: "/",
    languages: {
      "ar-TN": "/",
      ar: "/",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: SITE_LOCALE,
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — دليل تشخيص وإصلاح السيارات`,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — دليل تشخيص وإصلاح السيارات`,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE_PATH],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark",
  themeColor: "#0f1115",
};

// Catalogue pages are statically rendered and revalidated hourly (ISR).
// Database reads inside the layout (footer date) and pages share one cache.
export const revalidate = 3600;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const stats = await getSeoStats();

  return (
    <html
      lang="ar"
      dir="rtl"
      className={`dark ${cairo.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans text-foreground">
        <JsonLd data={[organizationJsonLd(), websiteJsonLd(stats)]} />
        <a href="#main" className="skip-link">
          تجاوز إلى المحتوى
        </a>
        <BookmarksProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <StorageNotice />
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </BookmarksProvider>
        <Analytics />
      </body>
    </html>
  );
}
