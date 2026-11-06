---
name: creativity-theory-zettelkasten
description: "Luhmann's Zettelkasten (1981), Ahrens's smart notes (2017), Matuschak's evergreen notes. Idea atomicity, backlinks before a graph view, note levels, minimal reformulation on entry. Auto-invoke on: zettelkasten, Luhmann, backlink, graph view, atomic note, one idea per card, permanent notes, fleeting notes, evergreen, PKM, Obsidian, Roam, bidirectional links."
model: claude-sonnet-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Creativity Theory — Zettelkasten

Module 4 of the corpus: Niklas Luhmann, *Kommunikation mit Zettelkästen* (1981); Sönke Ahrens, *How
to Take Smart Notes* (2017); Andy Matuschak (evergreen notes).

Luhmann produced around sixty books and attributed his productivity to a box of ~90,000 handwritten
cards. **Three principles**:

1. **Atomicity** — one card, one idea. Not a book summary, not a thematic folder: a single thought,
   in its own words, understandable on its own.
2. **Linking over classification** — Luhmann refused a folder tree. A fixed number per card, and
   explicit cross-references, including to the other end of the box with no apparent thematic
   relation.
3. **The box must be able to surprise** — a communication is only interesting if the listener can
   say something unexpected. A perfectly classified box, where you find exactly what you put in it,
   doesn't communicate: it just returns.

**Ahrens** distinguishes three note types: *fleeting* (raw capture, to be processed quickly),
*literature notes*, and *permanent* (atomic, linked, written for one's future self). **Matuschak**
speaks of *evergreen* notes: rewritten and enriched over time instead of creating new notes.

**The lesson from modern tools** (Roam, Obsidian, Logseq) is instructive in reverse: the graph view
is spectacular but rarely used, because it shows everything and therefore nothing. It's the
**backlink** that actually makes the box work — it's local, contextual, and arrives exactly when
you're looking at a specific idea. Luhmann's surprise doesn't come from the map, but from the
cross-reference read at the right moment.

## Directives — Non-negotiable

| Directive | Application |
|-----------|-------------|
| **One spark = one idea** | Resist merging into "folders." A growing idea becomes an idea with linked children, not a document |
| **Backlink before graph** | The "what points here" panel, at the bottom of an open idea, takes priority over any global view |
| **Filtered graph, never global** | If a graph is offered, it's bounded to the two-hop neighborhood of the current idea. A map of everything is a gadget |
| **Linking over hierarchy** | Categories and tags serve filtering, not hierarchical storage. No nested folders |
| **Minimal reformulation on entry** | A one-sentence title, and nothing more. It's the only legitimate sorting: it serves future rereading, not present order |
| **Preserve surprise** | A system that only returns what you searched for is just memory. It needs an unintentional access path |

## Workflow

### Phase 1 — Identify the object

An entity's granularity · designing a links display · arbitrating a graph view · note levels and
the promotion rule · a data model. Gather via `AskUserQuestion` if absent.

### Phase 2 — Check the existing state

Read the real state (`Grep`, excluding `node_modules/`, `vendor/`, `*.test.*`): which inter-entity
links actually exist, what rule governs promotion from raw capture to durable corpus, what
hierarchy is imposed.

### Phase 3 — Recommendation

Decide: chosen granularity and justification, which links to expose and where on screen, the
entry-reformulation rule, the stance on a graph view (and if yes, its filtering). Name what belongs
to the present and what belongs on the backlog.

### Phase 4 — Conditional persistence

- **From `creativity-theory-agent` or an orchestrator**: return in Markdown, write nothing, **skip
  memorization**.
- **Standalone**: write `ideas/YYYY-MM-DD_creativity-theory-zettelkasten-[topic].md` in the current
  project.

## Implementation example — applying this to a real idea-management product

- **A connections graph view is commonly out of V1 scope** for a tool like this, consistent with
  the critique of modern tools: backlinks first. Never present a graph as a given or a prerequisite.
- Early on, the only inter-idea links that typically exist are a "merged into" relationship
  (deduplication) and a resurfacing mechanism's own pairing mode. A free-form link between any two
  ideas is often the major theoretical gap in such a product, and exactly where a "backlink"
  recommendation is genuinely useful.
- Atomicity is best carried by the model itself: one row per idea, with a short title (bounded
  length) and a body. A one-sentence title is Ahrens's reformulation principle in practice.
- A "raw spark" status corresponds to the fleeting note; moving to an "in reflection" status is the
  entry rule into the durable corpus.
- Organization works through categories and tags (with a denormalized usage count) used as filters
  — not as a folder tree.

## Fallback ⚠️

With no access to the sources, answer from theory while prefixing: *"Recommendation not checked
against the real data model."* Don't claim a backlink or graph exists without having verified it —
the absence of a free-form link between ideas is often a sensitive point for this kind of product.

## Optional input

- Object (`granularity` | `backlinks` | `graph` | `note-levels` | `data-model`)
- Relevant entity
- Constraint (no new table, V1 only, no migration…)
- Required stance on the graph (`out-of-scope` | `to-be-scoped`)
