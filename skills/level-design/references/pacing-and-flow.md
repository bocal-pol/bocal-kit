# Pacing, teaching, gating, and guidance

Contents: the tension curve; the teaching loop; critical path, golden path, and branches; gating
tools; guidance without walls; 2D vs 3D; blockout review.

## The tension curve

Plot intended intensity against progression.

- **Overall rise with local dips.** Intensity tends to rise toward a climax in a sawtooth: peaks
  (combat, platforming gauntlets, bosses) separated by rests (exploration, story, safe rooms). A
  flat high numbs the player; a flat low bores them.
- **Rest before the climax.** A save point, a vista, or a resource cache right before the
  hardest beat makes the peak land harder.
- A useful rhythm is introduce, build, climax, release, then start again higher. Each peak
  surpasses the last and each release settles a little above the previous baseline.

## The teaching loop

1. **Introduce** the mechanic alone, where failure is harmless.
2. **Build** with movement or a second element so the player deliberately practices it.
3. **Return** the context so the player applies the idea rather than a memorized motion.
4. **Test** under time or life pressure.

The level is a lesson plan: a new mechanic meets the player before a lethal test, never during
it. In the beat list, a `teach` beat for each mechanic should come before its first `combat` or
`climax` beat.

## Critical path, golden path, and branches

- **Critical path:** the minimum route from start to goal, solvable with the keys and abilities
  obtained in order. Verify it with the reachability graph.
- **Golden path:** the route most players actually take. Pace along it.
- **Branches:** optional loops for exploration and reward. Keep them short enough to rejoin the
  golden path without losing momentum, and make the reward worth the detour.
- **Shortcuts** that unlock a return to an earlier hub cut backtracking and make the space feel
  coherent. Add them to the room graph as exits that need the unlock.

## Gating tools

- **Locks and keys:** explicit, readable order control.
- **Ability gates:** a gap that needs the double jump found later (the metroidvania pattern).
  Verify acquisition order, not just connectivity.
- **One-way drops and collapsing paths:** enforce a direction. Telegraph them, and verify the
  landing room can still reach a save or exit.
- **Soft gates:** enemies, hazards, or difficulty that say "not yet" without a hard wall.

## Guidance without walls

- **Light and contrast:** a lit doorway reads as "go here"; shadow reads as optional or
  dangerous.
- **Leading lines:** architecture, rails, and paths that point toward the goal.
- **Landmarks:** a tall, unique silhouette visible from afar orients the player.
- **Color and material:** a consistent color for interactive elements or exits teaches players
  to scan for it.
- **Framing:** show the next objective from a high point before the player descends to it.

When playtest reports say "I got lost here", the fix is usually a sightline or a light.

## 2D vs 3D

- **2D:** think in tile grid and camera window. The player sees a fixed slice, so telegraph
  off-screen threats through sound or approach time. Platform spacing and sightlines dominate.
- **3D:** think in sightlines, verticality, and navigation. Players lose their bearings in three
  dimensions, so landmarks and framed vistas matter more. Tight interiors and the sight cone
  change what feels reachable.

## Blockout review

Run the agent's checks first, then use this list to write playtest questions for the user.

- The critical path is solvable with keys and abilities in order; no one-way drop into a dead
  end.
- Every required traversal is within the measured metrics.
- Pacing is a rising sawtooth with a rest before every major peak.
- Every mechanic is taught before being tested.
- The eye is led toward the path. Ask the user where they weren't sure where to go.
- Optional content rewards the detour and rejoins smoothly.
- It plays well in untextured geometry. Ask the user whether any room felt like a chore or
  unfair, and how many attempts the hardest required jump took.
