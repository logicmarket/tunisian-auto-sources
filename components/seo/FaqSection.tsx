/**
 * File: components/seo/FaqSection.tsx
 * Purpose: Visible FAQ block. Google requires FAQPage structured data to
 * match content that is actually visible on the page, so the same array in
 * `lib/seo.ts` drives both this UI and the JSON-LD.
 */

import { ChevronDown, HelpCircle } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { FAQ_ITEMS, faqJsonLd } from "@/lib/seo";

export function FaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="container-page pb-12 sm:pb-16"
    >
      <JsonLd data={faqJsonLd(FAQ_ITEMS)} />

      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent-300 ring-1 ring-inset ring-accent/20">
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-400">
              أسئلة متكررة
            </p>
            <h2
              id="faq-heading"
              className="text-xl font-extrabold text-white sm:text-2xl"
            >
              قبل أن تبدأ
            </h2>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.question}
              className="group surface-card overflow-hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-bold text-white sm:px-5">
                <span>{item.question}</span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-accent-400 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="border-t border-line px-4 py-3.5 text-xs leading-7 text-muted sm:px-5">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
