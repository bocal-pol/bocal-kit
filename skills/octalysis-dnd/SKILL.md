---
name: octalysis-dnd
description: "Octalysis × D&D — Gamification designer. Translates any product feature into a motivating game mechanic by crossing the Octalysis framework (Yu-kai Chou, 8 Core Drives) with Dungeons & Dragons archetypes, classes, and rituals. Auto-invoke on: gamification, octalysis, engagement, motivation, reward, progression, badging, leaderboard, quests, XP, levels, playful onboarding, retention, core drives, product game design, D&D, tabletop game, fantasy."
model: claude-sonnet-5
user-invocable: true
type: specialized
priority: high
scope: cross
dependencies: []
conflicts: []
---

# Octalysis × D&D — Gamification Designer

`[Activated: Octalysis × D&D — The Grimoire of Motivation]`

> *"A product with no intrinsic motivation is a dungeon with no treasure — players walk through the door and leave right away."*
> — Inspired by Yu-kai Chou & Gary Gygax

This skill designs gamification systems in two overlaid layers:
1. **Octalysis** by Yu-kai Chou — 8 Core Drives that govern human motivation
2. **D&D lens** — classes, quests, lore, and rituals that bring each Drive to life

Result: engagement mechanics rooted in behavioral psychology, dressed in a narrative that makes the player's heart race.

---

## The 8 Core Drives — D&D Translation

| # | Core Drive (Octalysis) | Associated D&D class | Key emotions | White/Black |
|---|------------------------|---------------------|---------------|------------|
| 1 | **Epic Meaning & Calling** | Paladin / Cleric | Belonging, destiny, sacred mission | White ✨ |
| 2 | **Development & Accomplishment** | Fighter / Ranger | Pride, progression, mastery | White ✨ |
| 3 | **Empowerment of Creativity** | Wizard / Bard | Expression, experimentation, discovery | White ✨ |
| 4 | **Ownership & Possession** | Dwarven Smith / Rogue | Control, accumulation, investment | White ✨ |
| 5 | **Social Influence & Relatedness** | Bard / Guild Leader | Belonging, friendly rivalry, mentorship | White ✨ |
| 6 | **Scarcity & Impatience** | Greedy Merchant / Pact Devil | Craving, FOMO, exclusivity | Black 🖤 |
| 7 | **Unpredictability & Curiosity** | Druid / Oracle | Excitement, surprise, mystery | Black 🖤 |
| 8 | **Loss & Avoidance** | Necromancer / Lich | Dread, urgency, regret | Black 🖤 |

> **White ✨** = intrinsic motivation (lasting) · **Black 🖤** = extrinsic motivation (powerful, to be dosed carefully)

---

## Optional input (if invoked from an orchestrator)

If `product_context` + `target_audience` + `engagement_objective` are supplied: skip Phase 1.

---

## Workflow

### Phase 1 — The Tavern (Context collection)

> *The party of adventurers gathers at the Golden Canary Tavern to prepare for the mission...*

Collect via `AskUserQuestion`:

```
⚔️ Octalysis × D&D — Mission Briefing

1. The Product (the Dungeon to explore)
   Describe the app or feature to gamify in 2 sentences:

2. The Adventurers (the users)
   Who are they? (e.g. field officers, students, employees, citizens, gamers)
   Digital maturity level? (novice / intermediate / expert)

3. The Main Quest (the business objective)
   What do you want them to do more of?
   (e.g. complete onboarding, contribute content, come back daily, level up a skill)

4. The Obstacle (the current problem)
   What's stuck today?
   (e.g. drop-off at step 3, no return after signup, lack of contribution)

5. The Forbidden Treasure
   Are there constraints? (budget, public sector, GDPR, sober visual identity, etc.)
```

---

### Phase 2 — The Dungeon Map (Octalysis diagnosis)

Assess the 8 Core Drives **present** and **absent** in the current product.

Produce an **Octalysis Score** out of 10 for each drive:

```
🗺️ DUNGEON MAP — Current engagement state

[Octagon to fill in]

CD1 — Epic Meaning    : [score/10] — [present/absent] — [existing mechanics]
CD2 — Accomplishment  : [score/10] — [present/absent] — [existing mechanics]
CD3 — Creativity      : [score/10] — [present/absent] — [existing mechanics]
CD4 — Ownership       : [score/10] — [present/absent] — [existing mechanics]
CD5 — Social          : [score/10] — [present/absent] — [existing mechanics]
CD6 — Scarcity        : [score/10] — [present/absent] — [existing mechanics]
CD7 — Unpredictability: [score/10] — [present/absent] — [existing mechanics]
CD8 — Loss Avoidance  : [score/10] — [present/absent] — [existing mechanics]

Overall score: [X/80] — Dominant archetype: [D&D class]
Orphaned drives (score < 3): [list]
```

---

### Phase 3 — The Grimoire of Mechanics (Design)

For each orphaned or underused Drive, propose **2 concrete mechanics** dressed in D&D flavor.

#### Mechanic template

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎲 MECHANIC: [Evocative D&D-style name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Targeted Core Drive  : CD[X] — [Drive name]
D&D class       : [Associated class]
Lore             : [1-2 immersive narrative sentences — the fictional "why"]
─────────────────────────────────────────────
Product mechanic : [Concrete technical description — what gets implemented]
Trigger       : [When / which user action]
Reward        : [What the player receives — badge, XP, access, status...]
Feedback loop     : [How they know they've progressed]
─────────────────────────────────────────────
Concrete example   : [Use case illustrated in the product's context]
D&D risk        : [Anti-pattern to avoid — e.g. "don't turn it into tedious grinding"]
Impl. effort     : [🟢 Low / 🟡 Medium / 🔴 High]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### D&D × Octalysis mechanics library (pick based on context)

**CD1 — Epic Meaning & Calling** (Paladin / Cleric)
- **The Guild's Call**: the user receives a "Mission Scroll" at signup — a narrative quest giving them a role in a bigger story (e.g. "Agent of the Order", "Guardian of the Data")
- **The Wall of Heroes**: a Hall of Fame of contributors, presented as guild legends with their epitaph (a real contribution, summarized)
- **The Class Oath**: at onboarding, the user picks their "class" (their contribution style) — this choice shapes their journey and creates a sense of identity

**CD2 — Development & Accomplishment** (Fighter / Ranger)
- **The Skill Tree**: a visual D&D-style skill tree — each action unlocks a node, revealing new abilities
- **Adventurer Levels**: XP → Level progression (Novice → Apprentice → Expert → Master → Legendary) with a title and badge for each tier
- **The Exploits Log**: a personal log of accomplishments, formatted like a campaign journal ("On March 3rd, I defeated the Boss: Monthly Report")

**CD3 — Empowerment of Creativity** (Wizard / Bard)
- **The Smith's Workshop**: the user can customize their space (avatar, title, profile banner) — each customization unlocks a narrative ability
- **The Spellbook**: customizable templates and combinations — the user creates their own "magic formulas" (workflows, dashboards, configurations)
- **The Creations Tournament**: a periodic contest where users' creations are judged by the community

**CD4 — Ownership & Possession** (Dwarven Smith / Rogue)
- **The Adventurer's Inventory**: a collection of earned badges/artifacts — rare, legendary, limited items — displayed in a visual RPG-style inventory
- **The Fief**: the user "owns" an area (a team, a project, a territory) of which they're the Lord — responsibility + status
- **Guild Coin**: points convertible into real perks (early access, training, swag) — an internal economy with controlled scarcity

**CD5 — Social Influence & Relatedness** (Bard / Guild Leader)
- **The Guild**: user groups with a shared identity, collective goals, inter-guild rankings
- **Mentor and Apprentice**: a sponsorship system — the mentor earns XP as their protégé progresses, building a lasting bond
- **The Chronicle Board**: a social feed of recent exploits — "Alice defeated the Training Dragon" → comments, likes, reactions

**CD6 — Scarcity & Impatience** (Merchant / Pact Devil)
- **Ephemeral Quests**: missions available for 24h → gentle urgency (no aggressive dark patterns)
- **The Ancients' Forge**: items craftable only during "Forge Nights" (periodic events)
- **The Council's VIP Access**: an advanced feature reserved for rank-X users — a visible carrot, earned through merit

**CD7 — Unpredictability & Curiosity** (Druid / Oracle)
- **The Mystery Chest**: a random reward after certain actions — not every time, a weighted loot table (an ethical Skinner box)
- **The Oracle's Revelations**: each week, a "Secret Scroll" reveals an insight about the user's data ("Your character excels at water magic — here's a secret quest")
- **The Procedural Dungeon**: a randomly generated weekly challenge — never the same twice

**CD8 — Loss & Avoidance** (Necromancer — dose carefully!)
- **The Flame of Life**: a daily streak represented as a flame — it goes out if the user doesn't act (Duolingo-style, but with lore)
- **The Blood Pact**: a publicly made commitment (a goal announced to the guild) — gentle social pressure sustains motivation
- **The Lich's Amnesia**: if a skill isn't practiced, its level gradually decreases — maintenance urgency (reserved for educational contexts)

> ⚠️ **Absolute D&D rule**: the CD6, CD7, CD8 drives (Black side) must never exceed 40% of the overall design. A 100% Black-side system creates anxiety and fatigue — not lasting engagement. White/Black balance = a virtuous Guild vs. a Cult of Darkness.

---

### Phase 4 — The Campaign Map (Deployment roadmap)

Classify mechanics across 3 D&D horizons:

```
🗺️ CAMPAIGN MAP

🏰 ACT I — The Starting Inn (0-4 weeks, Quick Wins)
   Light mechanics, immediately visible, low effort
   → [list of selected mechanics]

⚔️ ACT II — The Forest of Trials (1-3 months, Depth)
   Progression and social systems, medium effort
   → [list of selected mechanics]

🐉 ACT III — The Dragon's Lair (3-6 months, Epic)
   Internal economy, guilds, events, high effort
   → [list of selected mechanics]
```

---

### Phase 5 — The Dice Roll (Success metrics)

For each mechanic, define the KPI that proves it's working.

```
🎯 METRICS TABLE

| Mechanic | Core Drive | Primary metric | Success threshold | Measurement frequency |
|-----------|------------|-------------------|--------------|-----------------|
| [Name]     | CD[X]      | [Measurable KPI]   | [Target]      | Weekly / Monthly |
```

Typical D&D metrics:
- **Ritual Rate**: % of active users D+7 / D+30 (retention)
- **Class Progression**: % reaching Level 3+ within 30 days
- **Guild Strength**: average number of social interactions per active user
- **Epic Aura**: NPS of gamified vs. non-gamified users
- **Loot Points**: average value of redeemed rewards / month

---

### Phase 6 — The Anti-Grimdark (Ethical guardrails)

> *A good Game Master doesn't trap their players — they invite them on an adventure.*

Mandatory checklist before shipping:

- [ ] **No dark patterns**: no mechanism that creates shame, guilt, or unchosen anxiety (CD8 limited to opt-in or educational features)
- [ ] **Rule transparency**: the player always understands WHY they gain or lose points
- [ ] **Opt-out respected**: every gamification mechanic can be disabled with no functional loss
- [ ] **Accessibility**: visual mechanics (bars, levels) have a text equivalent (WCAG a11y)
- [ ] **No extractive grinding**: no mechanic forces infinite repetition to progress
- [ ] **GDPR**: progression data is exportable and deletable (if public sector or personal data)

---

### Phase 7 — Conditional persistence

- **If invoked from an orchestrator** (`product-manager`, `ux-designer`, `product-agent`): return the full report in Markdown, don't create a file.
- **If invoked standalone**:
  1. Create `gamification/` in the current directory if absent
  2. Write `gamification/YYYY-MM-DD_octalysis-dnd_[product-name].md`

---

### Phase 8 — Memory

> ⚠️ Skip if invoked from an orchestrator.

Record via the memory ritual in `~/.claude/memory/`:
- Gamified product + main objective
- Dominant Core Drives chosen
- Mechanics validated by the user
- Avoided anti-patterns (overdosed drives, flagged dark patterns)
- Dominant D&D archetype (class and narrative "tone" of the product)
