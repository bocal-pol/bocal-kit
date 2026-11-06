---
name: 21st-registry
description: >-
  Publish your own work to 21st.dev and manage it from the terminal with the
  `21st` CLI (`@21st-dev/cli`): publish a React component to a team library,
  publish a CSS theme or a template listing, edit / unpublish / delete your
  published items, and read/replace your public profile page (bento board).
  Triggers when the user says "publish/share/upload this to 21st", "share with
  team", "make this reusable", "unpublish/edit/delete my component", "change
  its visibility", "add this to my 21st profile/bento", "update my profile
  page". For finding and installing existing items use `21st-cli-use`; for
  turning a project's design tokens into a theme use `21st-design-sync`.
model: claude-sonnet-5
user-invocable: true
type: framework
priority: medium
scope: frontend
dependencies:
  - 21st-cli-use
conflicts: []
---

# Publish & manage on the 21st registry

Publish components, themes and templates to 21st.dev, and manage what you've
already published, all through the unified `21st` CLI (`@21st-dev/cli`).

## Pre-flight (always)

1. **Auth needs a real API key.** Publish, edit, and delete are management endpoints: they accept only a `21st_sk_…` key, not a `21st login` session token. Get one at **https://21st.dev/settings/api-keys** and pass it via `--api-key 21st_sk_…` or the `TWENTYFIRST_TOKEN` / `API_KEY_21ST` var.
2. **Search before publishing** (`21st search "<query>"`) to avoid creating a duplicate in the library.

---

## Publish a component

```bash
21st publish ./path/to/Component.tsx \
  --to default \
  --description "1-2 sentences: what it does and when to use it"
```

### Visibility — default is unlisted

| The user says… | Flag |
|---|---|
| "share with team", default | *(none — defaults to `unlisted`)* |
| "shareable link but not listed" | `--unlisted` |
| "publish publicly", "make it public on 21st" | `--public` |
| "restrict to the team library", "keep it internal" | `--private` |

**Never use `--public` without an explicit instruction.** Public components go through admin moderation.

### Flag reference

| Flag | When |
|---|---|
| `--description "…"` | **Required**, 10+ chars: what it does + when to use it |
| `--name`, `--slug`, `--tags a,b` | Override auto-detection |
| `--demo <file>` | Auto-found (`{Comp}.demo.tsx`, `demos/{slug}.tsx`) or synthesized |
| `--preview <img>` | Optional static thumbnail |
| `--registry ui\|hooks\|blocks\|icons` | Target sub-registry (default `ui`) |
| `--to <library-slug>` | Target team library |
| `--public` / `--unlisted` / `--private` | Visibility (default `unlisted`) |

Re-run with the **same slug** → upsert (prints "Updated"). Re-run with a different slug → new component.

### Hard rules

- ❌ Never `--public` without an explicit instruction
- ❌ Never publish a file with API keys, secrets, or unsaved edits
- ✅ Always search first; always ship a useful demo

---

## Publish a theme

```bash
21st publish-theme ./my-theme.css --name "Midnight" [--tags dark,minimal]
```

The CSS must define **both** a `:root` block and a `.dark` block. To generate that CSS from a project's tokens, use the `21st-design-sync` skill.

## Publish a template

```bash
21st publish-template "SaaS Starter" \
  --site https://demo.example.com \
  --preview https://example.com/thumb.png \
  [--description "…"] [--price 49] [--buy-url https://…]
```

---

## Edit & delete

```bash
21st edit <slug> --type component --visibility public|unlisted|private \
  [--description "…"] [--tags a,b]
21st edit <theme-id> --type theme [--name "New Name"] [--tags a,b]

# Delete — semantics differ by type:
#   component → unpublished (reversible)
#   theme     → unpublished (reversible)
#   template  → PERMANENT hard delete
21st delete <id|slug> --type component|theme|template --yes
```

---

## Manage your profile page (bento board)

```bash
21st profile get [--json]                 # read the current board
21st profile set --file board.json        # replace (FULL REPLACE — read first)
21st profile set --clear                  # revert to the classic profile
21st profile upload ./cover.png           # upload an image, returns a URL
```

`board.json` is an array of blocks:

```json
[
  { "type": "component", "demoId": 143 },
  { "type": "social", "url": "https://x.com/you" },
  { "type": "note", "text": "Building UI for 21st.dev" },
  { "type": "hire", "headline": "Work with me", "url": "https://cal.com/you" },
  { "type": "divider" },
  { "type": "image", "mediaUrl": "<url from `profile upload`>" }
]
```
