# Slop flavors and cross-flavor "tells"

A **recognition** reference, not a building guide. Derived from gabrielle-pch/reslop (MIT). Use it
to name the dominant flavor of a site and to find slop that the table (calibrated on Indigo SaaS)
under-scores.

## The 12 flavors

| # | Flavor | Light / dark, palette | Font | Surfaces and motifs | Giveaway |
| --- | --- | --- | --- | --- | --- |
| 0 | Indigo SaaS | light; white, slate, indigo → violet | Inter or Geist | white cards, wide soft shadows, hairlines, masked grid, top halo | gradient phrase in the heading |
| 1 | Aurora glass | dark; near-black, purple → cyan, some fuchsia | Inter + one italic serif word | frosted glass, blurred blobs, glowing edges, spotlight | "● All systems operational" |
| 2 | Dev-tool noir | dark; black, greys, one accent (electric blue, orange, lime) | Geist/Inter + mono for labels | 1px hairlines, visible grid lines with `+` at the crossings, light beams, shimmer borders | `[01] FEATURES` in mono, a `⌘K` hint |
| 3 | Warm editorial | light; cream, ink, terracotta or olive | display serif (Instrument Serif, Fraunces, Newsreader) + plain sans | paper cards, rules, grain, `✻` ornaments, hand-drawn underlines | italic serif everywhere, "Thoughtfully crafted" |
| 4 | Neo-brutalist | light; off-white, black, yellow, pink, blue | heavy grotesque (Space Grotesk, Archivo, Bricolage Grotesque) | 2–3px black borders, hard offset shadows, small radius, tilted stickers, stars | a tilted "NEW!" sticker |
| 5 | Pastel mesh | light; peach, lavender, mint mesh gradients | rounded sans (Plus Jakarta Sans, Outfit, DM Sans) | `rounded-3xl`, clay-like surfaces, soft blobs, emoji in the icon tiles | "Your calm space for…" 🌿 |
| 6 | Trust blue | light with navy bands; white, navy, electric blue, emerald | Manrope, Sora or Inter Tight | stacked cards, checklists, shield and lock icons, fake chart cards | a row of vague trust badges (Secure, Private, Reliable) |
| 7 | Terminal | dark; black, phosphor green or amber | mono everywhere (JetBrains Mono, IBM Plex Mono, Space Mono) | ASCII boxes, `>` prompts, scanlines, `[ bracketed ]` buttons | `> initializing…` typing out with a blinking cursor |
| 8 | Holo Y2K | silver-light or dark; iridescent pink, cyan, lilac, lime, chrome | wide display (Unbounded, Syne) + plain sans | glossy pills, chrome orbs, `✦ ✧` stars, wireframe globe | holographic gradient text |
| 9 | Luxe noir | dark (or ivory); black, champagne gold | thin high-contrast serif (Cormorant, Playfair Display) + tracked caps | hairline gold frames, huge whitespace, roman numerals | "Crafted for the few." |
| 10 | Keynote bento | light grey `#f5f5f7`, black, white, one vivid accent | Inter Tight or Inter Display, huge and tight | giant rounded tiles, product shots on flat color | one-word headings: "Fast. Beyond." |
| 11 | Acid startup | black or off-white; acid lime or hot orange | chunky grotesque (Bricolage Grotesque, Unbounded) | pills everywhere, 3D blobs, marquee bands, `↗` arrows | "Meet your new [thing] agent ↗" |

## The 10 cross-flavor "tells"

These work in any flavor, said in the vocabulary of that flavor (the pill of Indigo SaaS is a mono
tag in Terminal and a sticker in Neo-brutalist). A site with six or more of them is probably
generated, even if it scores low on the table.

1. A small label above the main heading.
2. One treated phrase in the heading (gradient, italic, highlighter, outline).
3. The same section rhythm in a loop: label, heading, one grey sentence, grid.
4. A grid of cards from one template: icon in a tile, two-word title, one line each, all of the
   same length.
5. Fade-in on scroll.
6. A decorative background layer.
7. Thin line icons (lucide or similar) plus the sparkle of the flavor: `✦`, `★`, `✻`, `*`.
8. A closing call-to-action block that repeats the hero.
9. Copy tics: em dashes, "Not just X. Y.", "Simplify. Automate. Scale.", "so you can focus on
   what matters".
10. Fictional social proof: invented company logos, or testimonials.

## Use in a report

At the end of the report, outside the total, add `Flavor recognized: <name>`. If it is not
Indigo SaaS, add `Cross-flavor tells: n/10` with the numbers found. Do not add these tells to the
score. The table stays comparable from one audit to the next.
