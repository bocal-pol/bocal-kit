---
name: seo-geo
description: "SEO/GEO Frontend — generates and audits robots.txt, sitemap.xml, llms.txt, llms-full.txt, manifest.webmanifest, SEO meta tags, Open Graph, Schema.org JSON-LD, GEO tags, hreflang, canonical. Auto-invoke on: SEO, GEO, robots.txt, sitemap, llms.txt, Open Graph, Schema.org, JSON-LD, meta tags, canonical, hreflang, manifest, PWA, indexing, crawl, SEO ranking, LLM discovery."
model: claude-sonnet-5
user-invocable: true
type: domain
priority: high
scope: frontend
dependencies: []
conflicts: []
---

# SEO / GEO — Frontend Discovery

`[Activated: SEO-GEO]`

Generates and audits every file and tag needed for web indexing (SEO), geographic localization
(GEO), and LLM discoverability (AI discovery).

> **Absolute rule**: never generate an artifact flagged as backend-configured. If the project
> indicates `sitemap: backend`, `llms: backend`, or similar (in `.env`, README, project config),
> skip the corresponding artifact and mention it explicitly in the report.

---

## Step 0 — Project context detection

Before any generation, read:
- `README.md`, `package.json`, `.env.example` to identify the framework (React / Angular / Next.js
  / Nuxt / other)
- Grep `sitemap|robots|llms|seo` in `README.md` to detect what's already delegated to the backend

Deduce:
- **Framework**: React 18+ | Angular 21+ | Next.js | Nuxt | other
- **SSR**: yes/no (Next.js App Router, Nuxt = often backend for the sitemap)
- **i18n**: yes/no (presence of `i18n`, `ngx-translate`, `react-i18next`, `next-intl`)
- **GEO localization**: ask if not detectable

---

## Step 1 — Information gathering (if missing)

Only ask these questions if they can't be deduced from context:

1. **Site/app name** and **production URL** (e.g. `https://mysite.example`)
2. **Short description** of the site (for Schema.org and llms.txt)
3. **GEO localization**: country, region, city, GPS coordinates if relevant
4. **Language(s)**: main language + secondary languages for hreflang
5. **Schema.org entity type**: `WebSite` | `Organization` | `LocalBusiness` | `Person` | other
6. **Backend artifacts**: which files are already generated server-side? (dynamic sitemap, etc.)

---

## Step 2 — Existing-state audit

Grep and list what already exists:

```bash
# Static files
find public/ -name "robots.txt" -o -name "sitemap.xml" -o -name "llms.txt" -o -name "llms-full.txt" -o -name "*.webmanifest"

# Meta tags in the code
grep -r "og:title\|og:image\|canonical\|geo.region\|application/ld+json" src/ --include="*.tsx" --include="*.ts" --include="*.html" -l
```

Audit report: ✅ present | ⚠️ incomplete | ❌ missing | ⏭️ backend (skip)

---

## Step 3 — Artifact generation

### 3.1 `robots.txt` — `public/robots.txt`

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: https://{URL}/sitemap.xml

# LLM crawlers
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /
```

### 3.2 `sitemap.xml` — `public/sitemap.xml`

⏭️ Skip if SSR or backend. Otherwise, generate it with the static routes detected in `src/app/` or
`src/routes/`.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://{URL}/</loc>
    <lastmod>{YYYY-MM-DD}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <!-- hreflang if i18n -->
  </url>
</urlset>
```

### 3.3 `llms.txt` — `public/llms.txt`

[llmstxt.org](https://llmstxt.org) spec — a Markdown file exposing content to LLM crawlers.

```markdown
# {Site name}

> {Short description — 1 to 2 sentences}

## Main pages

- [{Page title}](https://{URL}/{path}): {short description}

## Documentation / Resources

- [{Title}](https://{URL}/{path}): {description}

## Contact

- Email: {email}
- Location: {city, country}
```

### 3.4 `llms-full.txt` — `public/llms-full.txt`

Extended version: same structure as `llms.txt` + the full text content of each key section (like a
Markdown dump of the site). Useful for LLMs that index in depth.

### 3.5 `manifest.webmanifest` — `public/manifest.webmanifest`

```json
{
  "name": "{Full name}",
  "short_name": "{Short name}",
  "description": "{Description}",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "lang": "{en|fr|...}",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 3.6 SEO `<meta>` tags + Open Graph

**React** — component `src/components/seo/SeoHead.tsx`:

```tsx
// SEO + Open Graph + GEO + canonical tags
// Place in the <head> via react-helmet-async or Next.js <Head>
export function SeoHead({ title, description, url, image, geo }: SeoHeadProps) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content="website" />

      {/* GEO */}
      <meta name="geo.region" content={geo.region} />        {/* e.g. US-NY */}
      <meta name="geo.placename" content={geo.placename} />  {/* e.g. New York */}
      <meta name="ICBM" content={geo.icbm} />                {/* e.g. 40.7128, -74.0060 */}

      {/* LLM discovery */}
      <link rel="llms" href="/llms.txt" />
    </Helmet>
  );
}
```

**Angular** — service `src/app/core/services/seo.service.ts` via `Meta` + `Title` from
`@angular/platform-browser`.

### 3.7 Schema.org JSON-LD

Injected in the root component or per page:

```json
{
  "@context": "https://schema.org",
  "@type": "{WebSite|Organization|LocalBusiness}",
  "name": "{Name}",
  "url": "https://{URL}",
  "description": "{Description}",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "{country}",
    "addressRegion": "{region}",
    "addressLocality": "{city}"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "{lat}",
    "longitude": "{lng}"
  }
}
```

### 3.8 `hreflang`

⏭️ Skip if i18n is handled backend/SSR-side. Otherwise, add in `<head>` for each language:

```html
<link rel="alternate" hreflang="en" href="https://{URL}/en/" />
<link rel="alternate" hreflang="fr" href="https://{URL}/fr/" />
<link rel="alternate" hreflang="x-default" href="https://{URL}/" />
```

---

## Step 4 — Delivery report

Produce a summary table:

| Artifact | Status | Path |
|---|---|---|
| `robots.txt` | ✅ generated | `public/robots.txt` |
| `sitemap.xml` | ✅ generated / ⏭️ backend | `public/sitemap.xml` |
| `llms.txt` | ✅ generated | `public/llms.txt` |
| `llms-full.txt` | ✅ generated | `public/llms-full.txt` |
| `manifest.webmanifest` | ✅ generated | `public/manifest.webmanifest` |
| SEO + OG meta | ✅ component created | `src/components/seo/SeoHead.tsx` |
| Schema.org JSON-LD | ✅ integrated | inside `SeoHead` |
| GEO tags | ✅ integrated | inside `SeoHead` |
| hreflang | ✅ integrated / ⏭️ backend | inside `SeoHead` |

Explicitly mention every skipped artifact and why.

---

## Optional input (invocation by frontend-agent)

When invoked by `frontend-agent`, may receive as context:
- The production URL
- The detected framework
- The list of backend artifacts to exclude

In that case, skip the Step 1 interview and generate directly.
