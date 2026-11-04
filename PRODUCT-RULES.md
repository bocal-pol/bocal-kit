# Product rules — interface conventions

> Detail of the nine product rules applied to projects with an interface. `CLAUDE.md` keeps only a
> summary and points here: these rules only concern frontend and back-office deliveries, and
> loading them into every session would cost ~380 lines of preamble to everything else.
>
> Each is documented as an architecture decision: see the ADR column of the table in `CLAUDE.md`.

**When to read this file**: before shipping a screen, a form, a navigation, or a user action. The
completion checklists it contains are blocking for those deliverables.

---
## SaveMe — non-modal feedback for reversible actions (cross-cutting rule for all projects)

Not every user action needs a confirmation modal. Actions with no financial or legal consequence
use the **SaveMe** pattern: a self-dismissing toast with an undo button, backed by a persistent
history. Modals stay reserved for destructive operations or ones with external impact.

### Decision criterion: business criticality

| Criticality | Pattern | Examples |
| --------- | ------- | -------- |
| None / low — no financial or legal consequence | **SaveMe** (toast + history) | Archive, change a status, pin, remove a tag, disable |
| High — irreversible destruction or external distribution | **Confirmation modal** | Permanently delete, send, publish, pay, sign |

### SaveMe behavior

1. **Self-dismissing toast** (5–8 s): a message describing the action taken + a clickable **Undo**
   button during that window
2. **History persistence**: the action stays accessible via a bell icon or a "Recent actions"
   sidebar — the user can undo even after the toast disappears
3. **Deferred execution**: the action is actually executed server-side once the window expires (or
   immediately if the history guarantees reversibility via soft-delete)

### SaveMe message format

```text
[What just happened] — [Button: Undo]
e.g.: "Card archived"  — Undo
e.g.: "Tag removed"    — Undo
```

Writing rules: past-tense action, short subject, never a question mark (it's not a confirmation).

### Checklist before marking "done"

- [ ] The toast shows the action's label + the Undo button
- [ ] The window is between 5 and 8 seconds (globally configurable)
- [ ] Undoing via the toast or via history produces the same result
- [ ] The server-side action is soft (reversible) during the undo window
- [ ] High-criticality actions always use a modal (never a SaveMe)
- [ ] The action history is accessible without leaving the current page

### What SaveMe does NOT replace

- Confirmation modals for: permanent deletion, sending an email/notification, publishing, payment,
  electronic signature, changing access rights
- Error alerts (SaveMe is only for reversible successes)

## Sidebar — information architecture (cross-cutting rule for back-office and interfaces with navigation)

Every navigation sidebar must follow three non-negotiable constraints: grouping by intent, a
7-root-entry limit, and highlighting the main feature.

### 1. Group by intent, not by technical feature

Menu entries reflect what the operator wants to **accomplish**, not the name of tables, modules, or
controllers.

| ❌ Wrong (features) | ✅ Right (intents) |
| ---------------------------- | ----------------------- |
| Users / Roles / Permissions | Access management |
| Invoices / Payments / Credits | Billing |
| Requests / Validations / Closures | Request processing |
| Products / Categories / Tags | Catalog |

Two grouping modes depending on the app's nature:

- **By user goal** — "What does the operator want to do?" (Management, Configuration, Reporting…)
- **By workflow** — steps of a single business process grouped together even if technically
  separate (Intake → Validation → Closure = one single "Processing" group)

### 2. Maximum 7 root-level spaces

Human working memory is limited to 7 ± 2 items (Miller's Law). The root sidebar never exceeds 7
entries.

**If the need exceeds 7:**

- Group mandatorily into **submenus** or **collapsible sections**
- The root level stays ≤ 7, always
- Never add an 8th item without removing or merging an existing one

Recommended order of the 7 slots:

```text
1. [Main feature] ← always first
2-5. Business-intent groups (3-4 max)
6. Reporting / Overview (if relevant)
7. Configuration / Settings ← always last
```

### 3. Highlighting the main feature

Two mandatory, combined mechanisms:

**Main item first, visually distinct:**

- Position 1 at the top of the sidebar
- Differentiated visual treatment: accent color, a slightly larger Solar icon, or a permanent
  selection background
- Never bury the main feature in a subgroup

**Fixed quick-action button:**

- A `+ [New main action]` button pinned at the top of the sidebar, always visible
- Independent of navigation — the operator can create without navigating first
- Example: `+ New request`, `+ New case`, `+ Create a user`
- Style: primary button (accent color), Solar `add` or `add-circle` icon

```text
┌─────────────────────────┐
│  + New request          │  ← quick-action button (fixed)
├─────────────────────────┤
│ ● Dashboard              │  ← main item (accent)
│   Processing             │
│   Access management      │
│   Billing                 │
│   Reporting               │
│   Settings                │
└─────────────────────────┘
```

### Agent obligations

**backend-agent (Filament back-office)** — before shipping a navigation:

- Count root items: if > 7, group before shipping
- Verify labels describe an intent, not a model name
- Position the main item in slot 1 with distinct styling
- Add the quick-action button for the back-office's main action

**frontend-agent (frontend)** — same rules for web app sidebars.

### Sidebar completion criteria

- [ ] Number of root items ≤ 7
- [ ] No label matches the name of a table or technical model
- [ ] The main feature's item is in position 1 with distinct visual treatment
- [ ] A quick-action button is pinned at the top of the sidebar
- [ ] Settings / Configuration items are in the last position

## Keyboard shortcuts — full coverage + command palette (cross-cutting rule for all projects with an interface)

Every mouse-accessible action must have a keyboard shortcut. Power users should never need the
mouse for their routine workflows. This rule applies to both frontend and back-office.

### Mandatory coverage level

1. **Global actions** — navigation between sections, create, save, cancel
2. **Contextual actions** — every button, menu, and table action
3. **Command palette** (`Cmd+K` / `Ctrl+K`) — universal entry point for any action, searchable by
   label

### Shortcut conventions (cross-app standards)

| Action | Shortcut (Mac) | Shortcut (Win/Linux) |
| ------ | --------------- | --------------------- |
| Create a new item | `⌘N` | `Ctrl+N` |
| Save / Submit | `⌘Enter` | `Ctrl+Enter` |
| Cancel / Close | `Escape` | `Escape` |
| Search | `⌘K` or `/` | `Ctrl+K` or `/` |
| Delete (item focused) | `⌘Delete` | `Ctrl+Delete` |
| Edit (item focused) | `E` | `E` |
| Navigate between sections | `G` then a letter (`G` + `H` = Home) | same |

Single-letter shortcuts (`E`, `D`, `G`…) only activate when focus isn't in an input field.

### Discoverability — the two mandatory mechanisms

#### Hover tooltip

```text
[Button: Archive]
Tooltip: "Archive  ⌘⇧A"
```

- Always show the shortcut to the right of the label in the tooltip
- Format: action label + space + key combination
- Use macOS symbols (⌘, ⇧, ⌥) on the frontend; `Ctrl`, `Shift`, `Alt` on the back-office

#### Centralized reference panel

- Accessible via `?` or `Ctrl+?` — lists every shortcut active in the current context
- Organized by section: Navigation / Actions / Forms / Table
- Filterable by search

### Back-office rules (Filament / Laravel admin)

#### Data tables

| Key | Action |
| ------ | ------ |
| `↑` / `↓` | Navigate between rows |
| `E` | Edit the focused row |
| `D` | Delete the focused row (triggers a modal or SaveMe depending on criticality) |
| `Space` | Select / deselect the row |
| `Enter` | Open the detail view |
| `Escape` | Deselect everything |

#### Back-office forms

- `Tab` / `Shift+Tab`: strict, logical tab order (never a visual jump)
- `Ctrl+Enter`: submit the form
- `Escape`: cancel and go back (with SaveMe if data was modified)
- Every form section is accessible via a navigation shortcut (`G` + letter)

### Frontend rules (Angular / React / Flutter)

- Implement via a centralized shortcut service/hook (e.g. `useHotkeys`, `@angular/cdk`
  `Overlay`+`A11y`) — never scattered `keydown` listeners in components
- The service manages context priority: modal > drawer > page
- Shortcuts auto-disable when focus is in an `<input>`, `<textarea>`, or `contenteditable`
- The command palette (`Cmd+K`) is a global component mounted at the app's root

### Agent obligations for shortcuts

**frontend-agent (frontend)** — before shipping a form or a list, verify that:

- A centralized shortcut service exists in the project
- Every main action has a registered shortcut
- Tooltips show the shortcuts
- The command palette is wired up

**backend-agent (Filament back-office)** — before shipping a Filament Resource:

- Keyboard navigation active on the table (↑↓, E, D, Space, Enter)
- Correct tab order on every form
- `Ctrl+Enter` to submit, `Escape` to cancel

### Shortcut completion criteria

- [ ] A centralized shortcut service/hook exists (no scattered listeners)
- [ ] Every main action has a documented shortcut
- [ ] Tooltips show the shortcut next to each action's label
- [ ] The command palette (`Cmd+K` / `Ctrl+K`) is functional and searchable
- [ ] The `?` panel lists every shortcut active in the current context
- [ ] Full keyboard navigation on back-office tables (↑↓, E, D, Space, Enter)
- [ ] Strict tab order on every form (frontend AND back-office)
- [ ] Single-letter shortcuts are disabled when focus is in an input field

## Lazy Principle — zero useless input (cross-cutting rule for B2C/B2B projects with an interface)

The user should never have to enter data they've already provided, that can be inferred from
context, or that has no real business value. This rule applies to every input point: create/edit
forms, modals, filters, inline-edit.

### Decision hierarchy — in this order

Before showing a field, answer these questions:

1. **Is the data already stored for this user?** → pre-fill silently, don't show the field (unless
   the user must explicitly validate it)
2. **Can a reliable contextual default be inferred?** → pre-select it, leave it visible but
   non-blocking
3. **Does the data have real business value for this flow?** → if not, remove the field, even if
   it's technically available in the database
4. **Has the user already entered this data in the same session?** → reuse it without asking again
5. **Only then** → show an input field, with the most appropriate component for the data type

### Mandatory contextual defaults

| Field | Expected default |
| ----- | -------------- |
| Creation / start date | Today |
| Status at creation | Draft / In progress (depending on domain) |
| Assigned to | Logged-in user |
| Organization / team | Current session organization |
| Currency / language | Preference stored in the profile |

### Mandatory components per data type

Forbid free-text input when a specialized component exists:

| Data type | Required component |
| -------------- | ---------------- |
| Date, time, range | Date picker / time picker / range picker |
| Duration | Duration picker (not a free-text "3h30" field) |
| Status / category / type | Select or segmented control (not free text) |
| Color | Color picker |
| Location / address | Geographic autocomplete |
| User / member | People picker with search |
| Amount / price | Formatted numeric input with fixed currency |

### Autocomplete and suggestions

- Free-text fields that reference existing data (tags, names, labels) must offer **autocomplete**
  based on the user's history or the most frequent values in context
- Suggestion order: (1) recently used by this user, (2) most frequent in the project, (3)
  alphabetical order

### Rules for required fields (*)

- A field can only be required if its **missing value actually blocks** business processing
- A required field with a reliable default must **not be visually required** — it's pre-filled,
  the user can change it but isn't forced to touch it
- Never a required field whose value will be ignored by the backend

### Agent obligations (frontend-agent / backend-agent)

**frontend-agent (frontend)**: before coding a form, list every field and justify each one via the
hierarchy above. Any field with no business justification is removed.

**backend-agent (backend)**: creation endpoints accept optional fields with server-side defaults.
Never reject a request for a missing field that has a known default.

### Completion criteria

- [ ] No form field re-asks for data already present in the user's profile
- [ ] Every contextual default is pre-filled when the form opens
- [ ] Each data type uses the specialized component (picker, select, autocomplete) — no free-text
      input for structured data
- [ ] Required fields with no real business value have been removed
- [ ] Autocomplete is active on every field that references existing data

## Hick's Law — on-screen action hierarchy (cross-cutting rule for all projects with an interface)

Decision time grows with the number of options of comparable visual weight (Hick-Hyman law,
`T = a + b·log₂(n+1)`). On screen, this translates into 4 action-hierarchy rules.

### The 4 rules

1. **One single, obvious primary action per screen.** If two actions seem equally legitimate to the
   user, that's a screen-design problem to fix — not a signal to add a second button of the same
   weight.
2. **The primary button visually dominates** its surroundings: size, solid vs. outline fill,
   position. A secondary button treated with the same fill as the main CTA cancels the hierarchy.
3. **Advanced options hidden by default**, collapsed under a disclosure (accordion, "Advanced
   options," secondary tab) — never shown flat next to the primary action just because they exist.
4. **Never two actions of equal weight side by side.** Two full-weight buttons of the same size on
   the same row, even in different colors, force a comparison before the choice. One of the two
   yields visual weight (ghost button, text link) or the two are merged.

A fifth reflex — not showing an option with no business value — is already covered by the
**Lazy Principle** above for forms; apply the same principle to actions and menu items rather than
duplicating a second decision hierarchy.

### Grouping (chunking) rather than removal

Hick's Law penalizes a lack of structure, not functional richness: a 20-item menu organized into 4
groups of 5 is decided faster in practice than a flat list of 20 (the user first picks a group,
then an item within it — the sum of the two logarithmic times is lower than a single flat choice's
time). Before removing a useful option to reduce `n`, first try grouping it with related options.

### Agent obligations

- **frontend-agent / mobile-agent / design-agent**: before shipping a screen with more than one
  clickable action, identify the primary action and justify the visual treatment of the others
  (secondary, tertiary, hidden). A screen with two visually equivalent CTAs is a finding to fix
  before delivery.
- **ux-designer**: wireframes annotate the action hierarchy (primary / secondary / hidden by
  default) the same way they annotate component states.

### Completion criteria

- [ ] Every screen has a primary action identifiable without hesitation in under a second
- [ ] The primary button has strictly higher visual weight than the screen's other actions
- [ ] No advanced option is shown by default next to the primary action
- [ ] No pair of equal-visual-weight buttons coexists on the same screen
- [ ] Options with no business value have been removed (Lazy Principle), not just hidden

## Impact Radar — transparency of cascading deletions (cross-cutting rule for all projects)

Every deletion modal whose action impacts other items must show an **impact radar**: a verbalized,
readable summary of the real consequences before confirmation. The user sees real names — not
anonymous counters.

### Trigger

Show the impact radar **as soon as at least one related item will be affected** by the deletion. If
there's no impact: don't show the section at all (no "No items affected" message — the modal stays
simple).

### Verbalized format (real names, grouped by type)

```text
⚠️ This deletion will also affect:

Tasks (3)
  • Contract review for Acme Corp
  • Q3 schedule update
  • Deliverable validation

Files (2)
  • client_brief_v2.pdf
  • signed_contract.docx
```

Presentation rules:

- **Always real names** — never "3 tasks" alone with no identification
- **Grouped by entity type** (Tasks, Files, Users, Contracts…)
- **Alert icon** (⚠️ or Solar equivalent) to visually mark the impact zone
- **Read-only** — the user reviews it, they can't modify the deletion scope from the radar
- **Truncation** beyond 5 items per group: show the first 5 + "… and N more" (no infinite scroll in
  a modal)

### Modal structure with an impact radar

```text
┌─────────────────────────────────────────────┐
│  Delete [item name]?                        │
│                                             │
│  ⚠️ This deletion will also affect:          │
│  Tasks (3)                                  │
│    • Contract review for Acme Corp          │
│    • Q3 schedule update                     │
│    • Deliverable validation                 │
│                                             │
│  This action is irreversible.               │
│                                             │
│           [Cancel]  [Delete]                │
└─────────────────────────────────────────────┘
```

### Backend obligations

To feed the impact radar, the backend must expose an endpoint or a **dry-run** logic before
deletion:

- Compute dependencies without executing the deletion
- Return related entities grouped by type with their readable labels
- Fast response (< 500 ms) — the modal opens with no perceptible delay

### Impact radar completion criteria

- [ ] The impact radar shows if and only if at least one related item exists
- [ ] Real item names are shown (not just IDs or counters)
- [ ] Truncation at 5 items per group is in place with "… and N more"
- [ ] The confirmation button is labeled "Delete" (red/destructive), not "OK" or "Confirm"
- [ ] A dry-run endpoint or method is available on the backend
- [ ] The radar is read-only (no checkboxes, no selection)

## Ikea Effect — progressive ownership (consumer / B2C projects)

Users take more ownership of what they've partially built or personalized. This rule applies to
every project with consumer end users (B2C). It does **not** apply to internal tools, interface-less
APIs, single-client B2B projects, or validation MVPs (< 2 weeks).

### Blocking prerequisite

**Without a working authentication system → don't implement personalization.** Flag the gap and
recommend adding auth first. Personalization with no account is ephemeral (localStorage) and
creates frustration on re-login.

### Personalization scope (by priority)

1. **Visual identity** — profile picture, avatar, personal color/theme
2. **Content & data** — favorites, shortcuts, pinned widgets, item order
3. **Behavioral** — language, notifications, display density, interface preferences

### Timing: optional onboarding + contextual nudges

- **Onboarding**: 1 to 3 light steps on first launch (e.g. "Add a photo," "Choose your theme") —
  all skippable, none blocking
- **Nudges**: contextual suggestions at the right moment (e.g. after the 3rd login: "Personalize
  your dashboard"), never intrusive
- **Zero mandatory friction**: never block app access to force personalization

### Checklist before marking "done" (applicable projects)

- [ ] At least one visual-identity point is implemented (avatar or theme)
- [ ] Preferences are persisted server-side (not only localStorage)
- [ ] A contextual nudge exists to guide discovery (no hidden menu)
- [ ] Personalization is accessible from the user profile at any time
- [ ] Personalization data survives a logout/login (manual test or Playwright)

## Legal pages & consent — default legal compliance (cross-cutting rule for all projects with an interface)

Every application with external forms, payment, or external users collecting personal data
publishes and keeps its legal documents up to date, collects only necessary data, obtains explicit
consent when required, and meets WCAG accessibility — by default, not as a pre-launch afterthought.

### Trigger

Applies as soon as one of these criteria is true: an external data-collection form, payment (one-off
or recurring), an external user account, or a third-party tracker/script. Doesn't apply to internal
tools with no public exposure nor to interface-less APIs (an exclusion common to every rule in this
file, noted in the introduction).

### Expected behavior

1. **Published and up-to-date documents** — privacy policy, legal notice, Terms of Service
   (including a refund policy beyond the legal cooling-off period), cookie consent banner: produced
   by the `legal-pages` skill, using the text for the chosen publication country (adapt to the
   relevant EU jurisdiction) — never a generic page copy-pasted with no project adaptation.
2. **Editable without going back through the AI** — if the stack is Laravel/Filament, these
   documents are administered via the Filament pattern described in `skills/legal-pages/SKILL.md`
   (versioned content, publication history), not frozen in a Markdown file from initial generation
   only.
3. **Non-pre-checked form consent** — every form collecting non-essential data shows an explicit
   consent checkbox, never pre-checked, with the minimal required disclosure (purpose, legal basis,
   retention, rights).
4. **Verified minimization** — no field is collected with no declared purpose in the data dictionary
   or the App Spec; a gap is flagged by `compliance-officer`, not ignored.
5. **WCAG 2.1 AA accessibility** — especially on the consent banner and consent forms (contrast,
   keyboard navigation, screen-reader announcement), audited by `accessibility-lead` before
   production.

### Obligations by agent

- **project-bootstrap-agent**: drafts these documents at bootstrap time if the trigger above is
  detected — not postponed until the end of the project.
- **backend-agent** (Filament back-office): scaffolds the versioned `LegalDocument` pattern
  (`skills/legal-pages/SKILL.md`) when the stack is Laravel; never a non-editable static file if
  Filament is already used for the rest of the admin.
- **frontend-agent**: implements the consent banner and form consent checkboxes compliant with the
  cookie-consent spec, with non-essential scripts gated.
- **design-agent / ux-designer**: delegates the audit of the banner and consent forms to
  `accessibility-lead`, the same as the rest of the interface.

### Checklist before marking "done"

- [ ] Privacy policy, legal notice, Terms of Service (+ refund policy if payment) published and
      up to date for the project's publication country
- [ ] Documents editable via Filament if the stack is Laravel (not only frozen Markdown files)
- [ ] Every form collecting non-essential data shows explicit, non-pre-checked consent
- [ ] No collected field lacks a declared purpose (minimization verified by `compliance-officer`)
- [ ] The consent banner and consent forms have been audited by `accessibility-lead` (WCAG 2.1 AA)

### Exclusions

Internal tools with no public exposure, interface-less APIs, validation MVPs under two weeks old —
the same exclusions as the other rules in this file.

## Perceived performance — immediate responsiveness and success confirmation (cross-cutting rule for all projects with an interface)

Beyond the loading states already covered by the frontend-agent's "UI state components" rule and
error messages, five reflexes guarantee a sense of perceived speed, independent of actual network
latency.

### Trigger

Every interface with a clickable action or an async task (request, submission, a long task
offloaded to a job/queue). Doesn't apply to interface-less APIs nor to purely server-side batch
processing with no associated UI.

### The 5 reflexes

1. **Immediate reaction to a click (< 100 ms)** — a "pressed"/pending visual state shows before any
   server response; the button disables immediately to prevent a double submission. Never leave a
   clickable button with no visual feedback during the network wait.
2. **Loading state for any content fetch** — refer directly to the "UI state components" rule
   (`agents/frontend-agent.md`): skeleton, spinner, or progress bar depending on context. Not
   restated here.
3. **Progress for long tasks, even with no known `%`** — a task offloaded to a job/queue (see the
   "Resilience under load" rule) shows an indeterminate indicator **and** a step label ("Step 2/4:
   generating the PDF…") or a status poll. Never total silence between triggering and finishing a
   long task.
4. **Explicit confirmation of important successful steps** — a pattern distinct from **SaveMe**
   (which assumes a reversible, cancelable action): for a significant but non-reversible step
   (payment completed, case submitted, account created), show a **persistent** success banner or
   screen (not a few-second toast), with a success symbol and the next suggested action if relevant.
   Don't confuse this with SaveMe: a minor save remains a cancelable toast, not a success banner.
5. **Error message with no over-disclosure** — the 3-part rule remains the reference; an additional
   guard: the "why" never reveals an exploitable technical or sensitive detail (stack trace,
   whether an account exists, database structure, server path, framework name/version).

### Obligations by agent

- **frontend-agent / mobile-agent** (web + mobile): implements the "pressed"/pending state on every
  clickable action, polling/step text for long tasks with no `%`, and the success-banner component
  for important steps — distinct from the SaveMe toast.
- **backend-agent / infrastructure-agent**: every task offloaded to a job/queue (see "Resilience
  under load") exposes a status endpoint or channel (polling, websocket, SSE) letting the frontend
  show progress — a job with no queryable status can't satisfy this rule on the UI side.
- **design-agent / ux-designer**: annotates the "pressed" state and the success banner in
  wireframes the same way as the 4 UI states, and visually distinguishes this pattern from the
  SaveMe toast.

### Checklist before marking "done"

- [ ] Every action button gives visual feedback in under 100 ms, before any server response
- [ ] An action button disables immediately after the first click (no double submission possible)
- [ ] Every long task with no known `%` shows an indeterminate indicator + a step label or a
      queryable status
- [ ] Important successful steps (payment, submission, account creation) show a persistent
      confirmation, not an ephemeral toast
- [ ] No error message reveals an exploitable technical or sensitive detail

### Exclusions

Interface-less APIs, purely server-side batch processing with no associated UI.
