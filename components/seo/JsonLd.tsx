/**
 * File: components/seo/JsonLd.tsx
 * Purpose: Renders one or more Schema.org JSON-LD graphs. The payload is
 * serialised safely (angle brackets escaped) before being injected.
 */

export function JsonLd({ data }: { data: unknown | unknown[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      // The value is produced by our own typed builders, never user input.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
