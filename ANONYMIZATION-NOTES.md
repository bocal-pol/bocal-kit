# Anonymization notes

Decisions made while anonymizing content ported from the private source repo into this public
repository.

## Excluded entirely

- **`personal-agents.json`** — not ported. It registers personal Product Owners tied to the
  maintainer's private context (prepping, tabletop RPG, family) that have no place in a generic
  public kit. The persona agents themselves (survival-logistics-agent, game-master-agent, etc.) are
  still ported as generic, reusable capabilities — only the specific personal-registry file with
  its keyword bindings is excluded.
- **`skills/family-context/`** (if present in the source agent/skill set) — personal-scope content,
  excluded by default per the source repo's own convention; not applicable to a public fork.

## Name substitutions

- Every occurrence of the maintainer's real name found in example content, anecdotes, or template
  rows (not in `LICENSE`/author attribution) was generalized to "the repo owner," "the maintainer,"
  or rewritten in first person, depending on grammatical context. Found in: `hindsight.md` entries,
  a bug-tracker example table, an `improve-skills`-equivalent skill's internal/public distinction
  example.
- The maintainer's real name is kept **only** in `LICENSE` (copyright) and in the author mention at
  the end of `primer.md`/`README.md` — both legitimate, assumed attributions, consistent with how
  the source repo itself handles this.

## Verified clean

- No email address or institutional domain was found in any root document, hook script, or config
  file ported in this pass (`.mcp.json`, `settings.json`, `keybindings.json`, `.gitattributes`).
- No user-specific Windows path (employee ID, machine-specific username) was found in any ported
  file — all paths already used generic `~/.claude/` references in the source.
- No API key, token, or credential was found in any ported config file.

## No ambiguous cases encountered beyond the above

Everything else ported in this pass (structure + root docs) was either already generic business
context (e.g. references to a public-sector domain, which is a business-context detail, not
identifying data) or didn't require a judgment call.

## Agents porting pass — additional decisions

- **`pilgrimage-route-agent`** (ported from the source's pilgrimage-trail persona agent): the
  source bound this agent to one specific private side-project by name, with references to that
  project's internal file tree (specific submodule path, specific document filenames). Generalized
  the persona into a reusable "pilgrimage trip-planning project" role — kept the domain expertise,
  the on-the-ground realism discipline, the trail-log response format, and the skill-orchestration
  table in full, but replaced the named private project and its exact internal paths with generic
  equivalents ("a trip plan document," "stage files," etc.) that any user adopting this agent can
  map to their own project structure.

- **`race-engineering-agent`** and **`algorave-agent`**: no personal-identifier content, but both
  were persona agents tied to the source's private hobby context. Ported as-is (motorsport/Rubik's
  cube expertise, Strudel live-coding), since neither referenced any private project or identifying
  detail — only straight translation was needed.

- **`survival-logistics-agent`** (ex-`survivaliste-agent`): the source was written entirely around
  one specific country's law (weapons law article numbers, forestry-code articles, regional
  hunting-season calendars, a specific government emergency-number set). Generalized every legal
  reference into an explicitly-flagged example structure ("adapt to your jurisdiction," "check your
  local forestry authority") rather than deleting the content — the mechanism (Rule of 3, weighed
  BOB, calorie budgeting) is universal even though the specific legal figures are not.

- **`legal-compliance-agent`** (ex-`policier-agent`): same treatment as above, more heavily —
  the entire persona was built around one country's weapons law and forestry code, with specific
  article numbers and administrative vocabulary. Rewrote every legal section as an explicitly-
  labeled "EXAMPLE, verify locally" structure, replaced the country-specific emergency numbers with
  a generic instruction to use the reader's own country's numbers, and kept the advisor persona,
  the risk-assessment format, and the response structure intact.

- **`creativity-theory-agent`** (ex-`szikra-agent`): the source was almost entirely scoped to one
  specific private application (its own monorepo, ADRs, enums, and a course document specific to
  that product). Generalized into a reusable idea-management methodology persona: kept the six
  cited creativity theories (Johnson, Koestler, Wallas, Luhmann, Robinson & Schroeder, Edmondson) in
  full, the Spark Notebook response format, and the theory/code guardrail discipline, but replaced
  every concrete reference to the private product's specific status enum values, ADR numbers, file
  paths, and course document with generic placeholders a reader can map onto their own
  idea-management product. The 7 child `szikra-*` skills this agent orchestrates were renamed to
  `creativity-theory-*` for consistency and are expected to receive the same generalization
  treatment when ported in the skills pass.

- **`ict-director-agent`** (ex-`ict-agent`) and **`public-procurement-agent`** (ex-`marches-agent`):
  both referenced internal personal-profile folder names (`ProfilTechnique/`, `ProfilReseau/`,
  `ProfilDirICT/`) used to organize the source's own multi-profile ICT setup. Replaced with generic
  placeholder names (`<technical-profile>/`, `<network-profile>/`, `<director-profile>/`) and a note
  that these only matter if the adopting project runs multiple ICT sub-profiles.
