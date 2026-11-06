---
name: web-vanilla
description: Small standalone HTML/CSS/JS web tools — calculators, static dashboards, forms, viewers. No framework, no bundler. Internal use, self-contained (1-3 files). WCAG AA, responsive, dark mode.
model: claude-sonnet-5
user-invocable: true
aliases: ["/web"]
argument-hint: "[description of the desired web tool]"
type: framework
priority: medium
scope: frontend
dependencies: []
conflicts:
  - react-developer
  - angular-developer
---

# Web Vanilla — Standalone Web Tools

Builds small pure HTML/CSS/JS web tools, no framework, no bundler, deployable as a single HTML
file.

## Principles

- **Zero dependency**: no React, Vue, Angular, jQuery — native ES6 only
- **Self-contained**: 1 HTML file (3 max) — works by double-clicking or running locally
- **Mobile-first responsive**: flexbox / grid, viewport units
- **WCAG AA**: minimum 4.5:1 contrast, keyboard navigation, ARIA where needed
- **Dark mode**: `prefers-color-scheme: dark` + `data-theme`

## Typical use cases

| Tool | Description |
|---|---|
| CIDR calculator | Subnets, IP ranges, masks — useful for day-to-day network work |
| Static dashboard | An equipment dashboard from local or hardcoded JSON |
| Log form | An intervention form that generates a Markdown block to copy |
| Config generator | A form → text config (VLAN, ACL, firewall rules) |
| Topology viewer | A dynamic SVG of a simple network topology |
| Pomodoro timer | A work-session counter |

## Typical structure (1 file)

```html
<!DOCTYPE html>
<html lang="en" data-theme="auto">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Title]</title>
  <style>
    :root { --bg: #fff; --fg: #111; --accent: #2563eb; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: #1a1a2e; --fg: #e0e0e0; --accent: #60a5fa; }
    }
    body { background: var(--bg); color: var(--fg); font-family: system-ui; }
  </style>
</head>
<body>
  <!-- Semantic HTML5 structure -->
  <script type="module">
    // ES6 modules, fetch API, localStorage if persistence is needed
  </script>
</body>
</html>
```

## Save location

`web/[tool-name]/index.html`
