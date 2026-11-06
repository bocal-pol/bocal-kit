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

## semgrep
Source hardcoded two personal machine paths referencing a private project ("SiteV26",
`C:\Projet\SiteV26\InfraDocker\...` and `D:\site26\SiteV26\InfraDocker\...`). Replaced the whole
"known paths" detection logic with a generic grep-based auto-detection of a compose file declaring
a `semgrep` service, rather than porting the private paths as "known paths" for a public audience.

## creativity-theory-* (7 skills, ported from szikra-*)
Source skills each had a "Szikrataku anchoring" section tied to a private personal side project
(a specific idea-management app name, its real service/class names, specific ADR numbers). For
each skill, replaced that section with a generalized "Implementation example — applying this to a
real idea-management product" section that keeps the transferable methodological content
(which fields/axes are useful, the general mechanism) but drops the private project's name,
concrete class names, and ADR references.

## threat-intelligence
Source referenced "CERT.be / Centre pour la Cybersécurité Belgique" as a mandatory source tied to
the "contexte institutionnel de ce dépôt" (the repo's institutional/public-sector context).
Generalized to "A national/regional CERT relevant to the deployment's jurisdiction" with guidance
to check it when the project has a public-sector or regulated context — keeps the useful practice,
drops the specific national/institutional identifier.
