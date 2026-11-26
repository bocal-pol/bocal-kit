# Scoring table — 17 patterns, 100 points

Single source for the scoring table. Derived from gabrielle-pch/reslop (MIT). The other skills
(`impeccable`, `design-agent`) point here. They do not copy this table.

A pattern counts only if a named file proves it.

| Pattern | Pts | Counts when you find |
| --- | --- | --- |
| Purple gradients | 10 | a purple, indigo or fuchsia gradient (Tailwind names, or hex/hsl in that range) |
| Gradient text | 8 | `bg-clip-text` + `text-transparent`, or `background-clip: text` |
| Glassmorphism | 8 | `backdrop-blur` / `backdrop-filter` on a translucent surface |
| Buzzword copy | 8 | three or more of: seamless, supercharge, unlock, reimagine, next-generation, AI-powered, effortless, transform, elevate, revolutionary |
| Inter or Geist | 6 | one of the two loaded or set as the main font |
| Glow blobs | 6 | large blurred decorative elements (`blur-3xl`, `filter: blur(60px)` or more) |
| Pill eyebrow | 6 | a small `rounded-full` label directly above the main heading |
| Identical cards | 6 | a 3-column grid of icon + title + text built from one template |
| Floating or pill navbar | 6 | a fixed or sticky nav that is `rounded-full` or inset from the edges |
| Big metrics | 6 | a row of big numbers with tiny labels (10x, 99.9%, 10k+) |
| Scroll reveals | 5 | IntersectionObserver reveals, `whileInView`, AOS or similar |
| Infinite marquee | 5 | an infinite `translateX` animation on a row of logos or items |
| Sparkles | 4 | ✦, ✨ or a sparkle icon |
| Lucide icons | 4 | lucide imports, or inline SVG icons in its style inside rounded tiles |
| Grid or dot background | 4 | a repeating line or dot pattern used as decoration |
| Italic serif accent | 4 | one italic serif word inside a sans-serif heading |
| Em dashes and "Not just X" | 4 | three or more em dashes in marketing copy, or a "Not just X. Y." line |

Total: 100.

## Verdict

| Score | Verdict |
| --- | --- |
| 0–19 | Made by a human. Possibly with a pencil. |
| 20–44 | Lightly seasoned. Could be a template. |
| 45–69 | Generic SaaS. Your visitors have seen this site before. |
| 70–89 | Almost indistinguishable from a one-shot Claude landing page. |
| 90–100 | Peak slop. Nothing left to add. |

## Local application notes

- **Lucide** is the required icon library of this ecosystem. The "Lucide icons" pattern still
  counts (4 points), but only for the variant "rounded icon tiles + two-word title". A single
  Lucide icon in an action bar is not slop. Do not count it, and say so.
- **Inter**: if the brand guide (`DESIGN.md`) requires Inter, the pattern is counted and marked
  "required by the brand guide". The before/after change treats it as kept on purpose.
- **Em dashes**: some languages use them in a normal way. Count them only in marketing copy
  (headings, hooks, buttons), not in documentation.
- **Invented social proof** (numbers, logos, testimonials): "Big metrics" covers the numbers. Fake
  logos and testimonials are an editorial defect for `impeccable` (Floor rule) and for
  `design-agent` Phase A3 step 4. This table does not score them.
