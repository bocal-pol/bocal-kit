---
name: 21st-design-sync
description: >-
  Look at the current project's design (its shadcn / Tailwind CSS variables and
  color tokens) and publish it to the 21st.dev community as a shareable theme,
  using `21st publish-theme`. Use when the user says "publish my theme",
  "share our design as a 21st theme", "sync my design to 21st", "turn my
  globals.css into a theme". It reads the project's design tokens and syncs them
  into the public theme library.
  NOTE: publishing is public only and requires an API key — warn the user if
  they have no key before proceeding.
model: claude-sonnet-5
user-invocable: true
type: utility
priority: low
scope: frontend
dependencies:
  - 21st-cli-use
conflicts: []
---

# 21st Design Sync — publish your project's design as a theme

Take the design a project already ships (its light + dark CSS variables) and
publish it to the **public** 21st.dev theme library so anyone can preview,
bookmark, and apply it. Under the hood this is one CLI call:
`21st publish-theme <file.css> --name "…"`.

> **Not to be confused with the `DesignSync` tool** (used by `design-agent`), which syncs
> components to Claude Design on claude.ai. That's a **harness tool**, not a skill — hence
> the absence of `conflicts` here: the field only references skills, and no `design-sync`
> skill exists. This skill publishes CSS tokens to the **public** 21st.dev marketplace.

## Pre-flight (always)

1. **Auth needs a real API key** — `publish-theme` doesn't accept a session token. Get one at **https://21st.dev/settings/api-keys**. No key → warn the user, don't continue.
2. **Publishing is public** — a published theme is immediately visible in the community library (no unlisted/private option). Confirm with the user before publishing.

---

## Step 1 — Find the project's design tokens

Locate the file that defines the shadcn/Tailwind theme variables. Check in this order:

- `app/globals.css`, `src/app/globals.css`
- `src/index.css`, `styles/globals.css`, `app/styles/globals.css`

Look for a `:root { … }` block of CSS custom properties (`--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`) and a matching `.dark { … }` block.

## Step 2 — Assemble a valid theme CSS file

The upload endpoint **requires both blocks to be non-empty** (`:root` and `.dark`).

- Copy the project's `:root` and `.dark` blocks into a standalone file (e.g. `project-theme.css`).
- **If the project has no `.dark`** → generate a dark variant before publishing: invert lightness while keeping hue/chroma to stay on-brand. Never publish a theme with an empty dark mode.
- Keep the standard shadcn token names so the theme previews and applies correctly.

```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 4%;
  --primary: 240 6% 10%;
  /* …rest of the project's light tokens… */
  --radius: 0.5rem;
}
.dark {
  --background: 240 10% 4%;
  --foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  /* …rest of the project's dark tokens… */
}
```

## Step 3 — Name & tag

- **Name** (required, ≤ 50 chars): infer from the project — product/brand name in `package.json`, repo, or site title. Ask if ambiguous.
- **Tags** (optional): `dark`, `minimal`, `neutral`, `vibrant`, `saas`…

## Step 4 — Publish

```bash
21st publish-theme ./project-theme.css \
  --name "Acme" \
  --tags dark,minimal \
  --api-key 21st_sk_…            # or TWENTYFIRST_TOKEN env var
```

Returns the live theme URL (`https://21st.dev/community/themes/<slug>`).

## Updating vs re-publishing

- **Every `publish-theme` creates a NEW theme** (no upsert by slug). Running it twice = two themes.
- To change **name/tags**: `21st edit <theme-id> --type theme [--name "…"] [--tags a,b]`
- To change the **colors**: publish a new file + delete the old one: `21st delete <theme-id> --type theme --yes`
