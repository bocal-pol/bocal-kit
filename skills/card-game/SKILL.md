---
name: card-game
description: "Designs a card game or deckbuilder in any engine: cards as data with a single effect interpreter, deck zones, a trigger stack, and seeded shuffles. Auto-invoke for a Slay the Spire- or Balatro-like game or a TCG, or cards that duplicate or shuffles that feel biased. Not for grid dungeons (`roguelike`) or board puzzles (`puzzle`)."
model: claude-sonnet-5-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Card game

This skill owns a card game's rules engine: zones, draw, costs, effect resolution, rewards, and
balancing math — including a roguelike deckbuilder's run structure — never engine code. Engine
skills supply the data assets and UI. Always load the detected engine skill together with this
genre skill.

> Adapted/translated from the `card-game` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- The central objects are cards that move between zones: deckbuilder, roguelike deckbuilder,
  TCG/CCG, solitaire, poker-hand scorer, card battler.
- Designing costs, draw, rewards, triggers, enemy intents, or a scoring formula, or fixing cards
  that duplicate, vanish, or resolve in the wrong order.

**Not this skill**: grid dungeon runs (`roguelike`); board games with matching or pushing rules
(`puzzle`); an RPG with a small side card minigame (start with `rpg`).

## Main workflow

1. **Name the reference game and set the frame.** Write the numbers before any card: deck size,
   hand size, draw per turn, resource per turn, what happens to the hand at end of turn, copy
   limits. See reference frames below.
2. **Model zones and cards as data.** Every card instance has a unique id and lives in exactly
   one zone. A card's text translates into a list of operations for a single interpreter
   (Pattern 1).
3. **Choose the resolution model**: a stack (last in resolves first, for response-heavy TCGs) or
   a queue (first in first out, simpler for PvE deckbuilders). Write the order for simultaneous
   triggers (active player first, then by timestamp).
4. **Write a power budget** for one resource and price every card against it (see below).
5. **Build the reward loop** (deckbuilders): after each fight, offer 3 cards, pick 1 or skip,
   with rarity weighted by act; offer card removal in shops or events.
6. **Verify** with the checklist below.

## Reference frames

| Game | Deck | Hand and draw | Resource | End of turn |
|---|---|---|---|---|
| Slay the Spire | 10-card starting deck (Ironclad: 5 Strike, 4 Defend, Bash) | draw 5 | 3 energy | discard hand |
| Balatro | 52 playing cards | hand 8, play up to 5 | 4 hands, 3 discards per blind | redraw to 8 |
| Hearthstone | 30 cards | hand cap 10, excess draws burned | mana 1 to 10, +1 per turn | keeps hand |
| Magic: the Gathering | 60+ constructed, 40+ limited, max 4 copies | opening hand 7, draw 1 | lands | discard to 7 |

A Balatro run is 8 antes of three blinds (small x1, big x1.5, boss usually x2 the ante's base
score). Slay the Spire enemies show their next action (intent), which turns a PvE card game into
a planning puzzle rather than a guessing game. Copy the idea, never the cards themselves.

## Power budget and deck math

- **Budget per resource.** Pick a reference and price everything against it. Slay the Spire's
  starting cards set 1 energy = 6 damage (Strike) or 5 block (Defend), and an upgrade adds about
  half again. Rares can exceed the budget; zero-cost cards need a drawback or a small effect.
- **Every card added dilutes the deck.** The chance a specific card is in a 5-card hand is
  5/deck size: 50% in a 10-card deck, 33% at 15, 25% at 20. That's why skipping a reward or
  removing a Strike is often the strongest choice, and why removal belongs in the reward economy.
- **Copies in constructed formats.** A 4-of in a 60-card deck is present in the opening 7-card
  hand ~40% of the time and in the first 10 cards ~53% (hypergeometric law). Use the same formula
  to tune any draw consistency.
- **Cycle time** = deck size / draw per turn: a 10-card deck drawing 5 sees each card every 2
  turns. Draw and deck thinning shorten this cycle; that's where infinite combos come from.
- **Scoring pipelines** (Balatro-style): fix the order and write it down, e.g. base chips, then
  added chips, then added mult, then multiplied mult, applied left to right in slot order.
  Additive and multiplicative steps in the wrong order change scores by orders of magnitude.

## Patterns

### 1. Zones, draw, and playing a card (pseudocode)

```python
# Pseudocode. One zone per card instance; moving = remove from one list, add to another.
def draw(player, n):
    for _ in range(n):
        if not player.draw_pile:
            if not player.discard_pile:
                return on_empty_draw(player)    # deck-out loss, fatigue, or just stop
            player.draw_pile = player.discard_pile; player.discard_pile = []
            shuffle(player.draw_pile, player.rng)        # seeded Fisher-Yates (see Pitfalls)
        card = player.draw_pile.pop()
        if len(player.hand) >= HAND_CAP:
            move(card, to=player.discard_pile); log("burned", card)  # define overdraw explicitly
        else:
            player.hand.append(card)

def play(card, player, targets):
    if player.energy < cost(card) or not legal(card, targets):
        return False                                      # nothing has changed yet
    player.energy -= cost(card)
    move(card, from_=player.hand, to=player.limbo)          # in play during resolution
    for op in card.ops:
        push_effect(op, Ctx(player, card, targets))
    resolve_stack()                                         # see resolution pattern
    move(card, from_=player.limbo, to=destination(card))     # discard, exile, board
    return True
```

Keeping the card in a "limbo" zone while it resolves prevents a draw effect from reshuffling the
card currently being played back into the draw pile.

## Verify

1. 10,000 random legal turns played by a bot: after every action, every card id appears in
   exactly one zone and the total count never changes.
2. Shuffle uniformity: shuffle a 4-card deck 24,000 times; each of the 24 orderings should
   approach 1,000 (a chi-squared statistic above ~41 at 23 degrees of freedom signals bias,
   p < 0.01).
3. Same seed and same inputs replay to the same final-state hash.
4. A trigger loop (A draws when B is drawn, B when A is) stops at a depth cap with a log line.
5. A greedy bot plays the starting deck for 1,000 turns; report damage and block per turn and
   size the first enemies from it (~3-4 turns of starting-deck damage is a common start).

## Pitfalls

- **A card in two zones, or missing** → movement done as add-then-remove, or removal by value
  when two copies exist. Give every instance an id and check the invariant after every action.
- **A draw effect reshuffles the card being played** → the card went to the discard pile before
  its effects resolved. Resolve from a limbo zone (Pattern 1).
- **Triggers loop forever** → A triggers B triggers A. Cap resolution depth (e.g. 100 stack
  entries per action), stop with a log line, and add a test for the known loop.
- **Order changes between two runs** → triggers collected from a hash table or unordered set.
  Sort by a fixed key (controller, then timestamp) before stacking.
- **Biased shuffle** → sorting with a random comparator, or swapping with a fixed index instead
  of any index in `0..i`. Use Fisher-Yates with an inclusive upper bound.
- **Replays and undo drift** → the shuffle uses the engine's global RNG, also consumed by
  particles and AI. Give the deck its own seeded generator and save its state.
- **"The shuffle is streaky"** → players misread real randomness. A shuffled deck is already a
  bag randomizer; resist hidden pity rules in draws, and add visible tools instead (scry,
  mulligan, ward).
- **A cancelled target leaves the board half-changed** → paid before validating. Validate cost
  and targets first, then commit (Pattern 1).
- **The starting deck dies to the first fight or trivializes act 1** → enemy HP set by feel. Size
  it from measured damage-per-turn from the bot (Verify step).

## References

- `godot-resources` / `unity-scriptableobjects`: card data assets.
- `save-systems`: run and collection saves.

## Related skills

- **Composes with** (routing table §3d): `godot-resources`/`unity-scriptableobjects` +
  `game-ui-ux` (+ engine UI).
- **Ownership on overlap** (routing table §3c): a roguelike deckbuilder is owned by `card-game`,
  which only loads `procedural-gen` for card generation.
- `game-designer`: project-wide balancing and tone — `card-game` owns the genre-specific power
  budget and deck math, `game-designer` arbitrates cross-project tone.
- `lead-gameplay-programmer`: integrating the effect interpreter into the code architecture —
  `card-game` supplies the data model and pseudocode, not the final wiring.
- `physics-engineer`: out of scope for this genre.

## Version notes

Last checked: 2026-11-17.

- Slay the Spire's Ironclad starting deck and 2-turn cycle time: official game data.
- Balatro's blinds and antes: the game's community wiki.
- Hearthstone's hand cap and overdraw: the game's community wiki.
- Magic deck limits: Comprehensive Rules, section 100.2.
- Hypergeometric figures computable with a standard combination function (60 cards, 4 copies:
  39.9% in 7, 52.8% in 10).
