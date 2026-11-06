---
name: encode-correction
description: Claude behavior correction — encodes a correction into the right environment file (CLAUDE.md, memory, skill, settings). Invoke via /encode-correction [description of the behavior to correct]. Auto-invoke when the user says "no not like that", "stop doing", "don't do that anymore", "I don't want you to", "fix your behavior", "remember this", "I always want you to", "I never want you to".
model: claude-sonnet-5
user-invocable: true
argument-hint: "[description of the behavior to correct]"
type: utility
priority: low
scope: cross
dependencies: []
conflicts: []
---

# /encode-correction — Behavior correction

Immediately encodes a correction into the right file so the behavior doesn't happen again.

## Workflow

### Step 1 — Capture the correction

If an argument is supplied: use it directly as the description.

Otherwise, ask via AskUserQuestion:

```
/encode-correction — Which correction to encode?

Describe the behavior to correct:
  → What Claude did: ___
  → What it should have done instead: ___
  → Always / Never / In this context: ___
```

### Step 2 — Classify the correction

Determine where to encode it based on the correction's nature:

| Type | Criterion | Target file |
|------|---------|--------------|
| **Global rule** | Always/never applicable across all projects | `~/.claude/CLAUDE.md` |
| **Behavioral preference** | Response style, tone, format, habits | `~/.claude/memory/feedback_behavior.md` |
| **Skill rule** | Correction specific to a skill (angular-developer, team-dev…) | `~/.claude/skills/<name>/SKILL.md` |
| **Wrong skill** | The wrong skill triggered automatically | Description in the offending skill + `~/.claude/CLAUDE.md` if systemic |

> If the correction is ambiguous: prefer `CLAUDE.md` for "always/never" rules, and the feedback memory for preferences.

### Step 3 — Read the target file

Read the target file **before** any modification so existing content isn't overwritten.

### Step 4 — Encode the correction

#### If target = `~/.claude/CLAUDE.md`

Add under a `## Behavior corrections` section (create it if absent):

```markdown
## Behavior corrections

- **[Date YYYY-MM-DD]**: [Short, actionable rule]
  - Don't: [forbidden behavior]
  - Do instead: [expected behavior]
```

#### If target = feedback memory

Create or update `~/.claude/memory/feedback_behavior.md` with frontmatter:

```markdown
---
name: feedback_behavior
description: User-validated behavior corrections — rules to apply systematically
type: feedback
---

## [Rule title]

[Rule in one imperative sentence]

**Why:** [What the user said or the implicit reason]
**How to apply:** [When and how to apply this rule]
```

Then add the pointer to `~/.claude/memory/MEMORY.md` if not already present.

#### If target = a specific skill

1. Read `~/.claude/skills/<name>/SKILL.md`
2. Locate the relevant phase
3. Add or edit a `> ⚠️ **Correction**: [rule]` line before the relevant code block
4. If the correction invalidates a code example: update the example

### Step 5 — Confirm

Display a short recap:

```
✅ Correction encoded

File modified: [path]
Rule added: "[exact text of the encoded rule]"
```

No long summary. Just what changed.
