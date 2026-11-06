---
name: web-search
description: Contextual web search for skills needing external information — analyst, threat-intelligence, dependency-updater. Invoked from other skills only, not directly invocable.
model: claude-haiku-4-5-20251001
user-invocable: false
type: utility
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Web Search

Contextual web synthesis for internal skills. Never writes a file — returns only the synthesis.

## Input (invoked from other skills only)

- `query`: the precise research subject
- `context`: the reason for the search (an outdated package, a CVE, API documentation, etc.)

## Workflow

### Phase 1 — Building the URLs

Identify 2-3 relevant sources depending on the query type:
- npm/pip package → `npmjs.com/package/X`, `pypi.org/project/X`
- CVE / vulnerability → `nvd.nist.gov/vuln/detail/CVE-XXX` (primary),
  `cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-XXX` (fallback)
- Dependency changelog → `github.com/org/repo/releases`
- API documentation → the package's known official URL

Don't guess unknown URLs. If no reliable URL can be identified, return `⚠️ URLs not determinable
for this query`.

### Phase 2 — Fetch

WebFetch each identified URL. If a URL fails (404, timeout), continue with the others without
blocking.

### Phase 3 — Synthesis

Return a concise Markdown block (< 200 words) with the information relevant to the original query.
Format: extracted facts + source (URL). Don't paraphrase beyond what's necessary.
