---
name: strudel-patterns
description: "Strudel Patterns — snippet library, mini-notation cheat sheet, safety limiter, Euclidean generator, scale constraints. Essential skill for the Algorave Maestro. Auto-invoke on: strudel mini-notation, tidal pattern, strudel euclidean, strudel scale, strudel gain, strudel lpf, strudel jux, algorave snippet."
model: claude-sonnet-5
user-invocable: true
type: specialized
priority: low
scope: cross
dependencies: []
conflicts: []
---

# Strudel Patterns — Library & Reference

Ready-to-use snippets for the Strudel REPL. Safety limiter, scales, Euclidean rhythms, LFO,
modulation. Direct copy-paste into the strudel.cc REPL.

## Rules — Non-negotiable

| Rule | Application |
|-------|------------|
| **Safety Limiter** | `.gain()` max 0.9 per layer. Never `gain(1.5)` or `gain(2)` — guaranteed distortion |
| **Scale First** | Always constrain notes to a scale before playing them live |
| **Euclidean > Straight** | Prefer `"bd(3,8)"` over `"bd ~ bd ~"` for natural groove |
| **Slow LFO** | A too-fast LFO destroys the groove — `.slow(4)` minimum for filters |

## Optional input (if invoked from `algorave-agent`)

If genre + BPM + layer are provided as input:
- Return the matching snippets directly without gathering more info

Otherwise: answer the question asked or display the reference menu.

---

## 1. Mini-Notation Cheat Sheet

```
─── Sequence ─────────────────────────────────────────
"a b c d"          → 4 events over 1 cycle
"a [b c]"          → b and c share slot 1's space
"a [b [c d]]"      → nested subdivision
"a*2"              → a repeated at 2x speed
"a/2"              → a spread over 2 cycles
"a@2"              → a lasts twice as long

─── Rests & randomness ───────────────────────────────
"~ a"              → silence + a
"a|b"              → a or b randomly per cycle
"<a b>"            → alternates a and b each cycle

─── Polyrhythm ──────────────────────────────────────
"[a b c](3,4)"     → 3 hits on a grid of 4
"bd(3,8)"          → euclidean: 3 kicks in 8 steps
"sd(2,8,4)"        → euclidean with an offset of 4

─── Weight ────────────────────────────────────────────
"a?0.3"            → 30% chance of playing a
"a!2"              → a with 2x priority (repeated)
```

---

## 2. Safety Limiter — Gain Check

```javascript
// ✅ Safe gains — a 4-layer stack
stack(
  s("bd sd").gain(0.85),    // Kicks: max 0.9
  s("hh*8").gain(0.45),     // Hats: max 0.5 (high frequency hits hard)
  note("c2").s("bass").gain(0.75),  // Bass: 0.7–0.8
  note("c4").s("lead").gain(0.5)    // Lead: 0.4–0.6 (pad/lead always lower)
)
// Perceived sum ≈ 0.85 (headroom preserved thanks to different frequencies)

// ❌ Anti-patterns
s("bd").gain(1.5)      // DANGER: distortion
note("c4").gain(1.0)   // DANGER: in a stack → clipping
```

---

## 3. Euclidean Rhythm Generator

```javascript
// Basic Euclidean
// Format: "sample(n_hits, n_steps)" or "sample(n_hits, n_steps, offset)"

// ─── Kicks ──────────────────────────────────────────
s("bd(1,4)")    // Basic 4-on-the-floor
s("bd(3,8)")    // Afro-Cuban clave (the groovy-est)
s("bd(4,8)")    // Double-time kick
s("bd(2,4)")    // Uptempo/DnB kick

// ─── Snare / Clap ───────────────────────────────────
s("sd(2,8,4)")  // Snare on beats 2 and 4 (with offset)
s("cp(1,4,2)")  // Clap on the 3 (reggae/soul)

// ─── Hi-hats ────────────────────────────────────────
s("hh(5,8)")    // Latin feel (Bossa Nova feel)
s("hh(7,8)")    // Almost every 16th note (dense techno)
s("hh(3,4)")    // Triplet swing
s("oh(1,4,2)")  // Open hat on the 2

// ─── Ethnic percussion ───────────────────────────
s("perc(5,16)") // Afrobeat pattern
s("rim(3,8,1)") // Off-beat rimshot

// ─── Full rhythmic stack (128 BPM Dark Techno) ──
stack(
  s("bd(3,8)").gain(0.9),
  s("sd(2,8,4)").gain(0.7),
  s("hh(5,8)").gain(0.45).pan(sine),
  s("perc(3,8,2)").gain(0.3).speed("1 0.8")
)
```

---

## 4. Scale Constraints

```javascript
// Syntax: note("0 2 4").scale("root:mode")
// Index 0 = root, negatives = below the base octave

// ─── Minor scales ────────────────────────────────
.scale("c:minor")       // Natural minor — universal
.scale("a:aeolian")     // Same thing (Aeolian = natural minor)
.scale("d:dorian")      // Soft minor with a major 6th — funk/jazz
.scale("e:phrygian")    // Spanish/flamenco minor — tension
.scale("b:locrian")     // The most tense/dissonant

// ─── Major scales ────────────────────────────────
.scale("c:major")       // Plain major
.scale("g:mixolydian")  // Major ♭7 — blues/rock

// ─── Pentatonics (safe for improvisation) ────────
.scale("c:minor pentatonic")  // Blues/rock
.scale("c:major pentatonic")  // Folk/pop

// ─── Composed examples ──────────────────────────────
// Aeolian bass line
note("0 ~ 0 [5 7] ~ 5 3 ~").scale("c:aeolian").s("bass")

// Phrygian melody (dark techno lead)
note("0 1 0 ~ [-2 ~] 0 3 ~").scale("e:phrygian").s("supersaw")

// Pentatonic arpeggio (ambient)
note("0 2 4 7 9").scale("c:minor pentatonic").s("piano").slow(2)
```

---

## 5. LFO & Modulation

```javascript
// ─── Available waveforms ──────────────────────
sine      // Smooth sine wave 0→1
sawtooth  // Sawtooth 0→1 (linear rise)
square    // Square 0 or 1
triangle  // Triangle 0→1→0
rand      // Random per event
perlin    // Perlin noise (smooth randomness)

// ─── Scaling ────────────────────────────────
// range(min, max, shape) → maps 0-1 to min-max
.lpf(range(200, 4000, sine.slow(8)))    // Oscillating filter
.pan(range(-0.8, 0.8, sine.slow(2)))    // Auto-pan
.speed(range(0.8, 1.2, sine.slow(4)))   // Pitch drift

// ─── Quantization ──────────────────────────────────
// segment(n, val) → quantizes into n steps per cycle
.lpf(segment(8, range(200, 3000, sine.slow(4))))   // 8 steps — step filter
.lpf(segment(64, range(200, 5000, sawtooth.slow(8)))) // 64 steps — near-continuous

// ─── Practical examples ──────────────────────────────
// Tremolo
.gain(range(0.4, 0.8, sine.fast(4)))

// Simulated flanger / phaser
.delay(range(0.01, 0.04, sine.slow(2))).delayfeedback(0.5)

// Filter opening over 8 bars (classic house)
.lpf(segment(64, range(200, 8000, sawtooth.slow(8))))

// Pitch vibrato
.speed(range(0.98, 1.02, sine.fast(5)))
```

---

## 6. Spatial Effects

```javascript
// ─── jux: stereo image ─────────────────────────────
.jux(rev)              // Reverse on the right channel
.jux(fast(2))          // Double speed on the right
.jux(x => x.speed(0.5).lpf(500))  // Low-passed filter on the right
.juxBy(0.5, rev)       // 50% blend between original and transformed

// ─── Pan ─────────────────────────────────────────────
.pan(0)                // Center
.pan(-1)               // Full left
.pan(rand)             // Random per event (stereo chaos)
.pan(sine.slow(4))     // Slow auto-pan

// ─── Reverb & Delay ─────────────────────────────────
.room(0.3)             // Small room
.room(0.8)             // Large space/cathedral
.delay(0.5).delaytime(0.25).delayfeedback(0.4)  // Syncopated echo
```

---

## 7. Ready-to-Use Snippets

```javascript
// ─── Hypnotic techno kick ──────────────────────────
s("bd(3,8) bd(1,8,7)").gain(0.9).every(8, x => x.fast(2))

// ─── Minimal acid bassline ───────────────────────
note("0 [2 3] 0 [-1 ~]").scale("c:phrygian").s("sawtooth")
  .lpf(segment(32, range(200, 3000, sawtooth.slow(4)))).resonance(0.25)
  .gain(0.75).jux(rev)

// ─── Breathing hi-hat ────────────────────────────────
s("hh(7,8)").gain(range(0.1, 0.5, sine.slow(2))).pan(sine.slow(3))
  .every(4, x => x.speed("1 0.8 1 1.2"))

// ─── Ambient pad ─────────────────────────────────────
note("0 [~ 4] 7 [~ 9]").scale("c:minor pentatonic").s("pad")
  .room(0.8).slow(2).jux(rev).gain(0.45)
  .layer(x => x.slow(4).note("0").gain(0.2))

// ─── Glitch texture ──────────────────────────────────
s("glitch*[4 8 2]").speed(rand.range(0.3, 3)).pan(rand).gain(0.2).crush(rand.range(4, 12))

// ─── Polyrhythmic strings ─────────────────────────────
stack(
  note("0 2 4").scale("c:minor").s("pluck").slow(3).gain(0.4),
  note("0 4 7 11").scale("c:minor").s("pluck").slow(4).gain(0.35).pan(-0.5)
) // 3-vs-4 polymeter
```

### Phase — Conditional persistence

- **If invoked from `algorave-agent`**: return the snippets as inline Markdown.
- **If invoked standalone**: display the requested section in chat.

### Phase — Memory

> ⚠️ Skip if invoked from `algorave-agent`.

If invoked standalone, record in `<project>/.claude/gamedev-knowledge.md`:
- Favorite scales and samples
- Validated gain parameters
