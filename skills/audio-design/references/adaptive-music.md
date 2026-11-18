# Adaptive (dynamic) music

Contents:
1. Vertical layering (stems, `AudioStreamSynchronized`)
2. Horizontal re-sequencing (bar-quantized switches, `AudioStreamInteractive`, transition types)
3. Mapping gameplay to intensity (smoothing and hysteresis)
4. Practical notes (audio clock, loop points, middleware, budget)

Adaptive music changes with gameplay rather than looping a single track. Two techniques
dominate, and they combine:

- **Vertical layering (re-orchestration)** — several stems (drums, bass, melody, tension pad)
  play in sync; fading layers changes intensity without changing the underlying loop. Seamless
  because every layer shares the same timeline.
- **Horizontal re-sequencing** — the track is cut into segments (intro, loop A, loop B, combat,
  outro); you change which segment plays next, transitioning on musical boundaries (bar/phrase)
  so the change lands on the beat.

## Vertical layering

All layers are the same length and start together; only their volumes change.

```gdscript
# Keep N stem players in sync (same position), and fade volumes by intensity.
var layers := { "base": p_base, "drums": p_drums, "tension": p_tension }

func start_layers() -> void:
    for p in layers.values():
        p.volume_db = -80.0       # starts silent
        p.play()                  # all start together -> stay sample-aligned
    layers["base"].volume_db = 0.0

func set_intensity(level: int) -> void:   # 0 calm .. 2 combat
    _fade(layers["drums"],   0.0 if level >= 1 else -80.0)
    _fade(layers["tension"], 0.0 if level >= 2 else -80.0)

func _fade(p, target_db: float, t := 0.8) -> void:
    create_tween().tween_property(p, "volume_db", target_db, t)
```

Tips: compose stems at the same BPM/length and export them aligned. Fades of ~0.5-1.5 s sound
musical; instant cuts sound mechanical. Since layers never restart, intensity can change at any
time without losing sync.

Godot 4.7 has this built in: an `AudioStreamSynchronized` carries up to 32 sub-streams that
start at exactly the same instant in a single player, and
`set_sync_stream_volume(index, volume_db)` fades a layer. Prefer it to multiple players when
stems must stay sample-aligned.

## Horizontal re-sequencing

Switch segments at safe musical points so transitions don't sound abrupt.

```gdscript
# Request a section change; only apply it on the next bar boundary.
var pending_section := ""
var _last_bar := -1
const BPM := 120.0
const BEATS_PER_BAR := 4
const SEC_PER_BAR := 60.0 / BPM * BEATS_PER_BAR

func request_section(section: String) -> void:
    pending_section = section     # no mid-bar switch; queue it

func _process(_dt: float) -> void:
    var bar := int(song_time() / SEC_PER_BAR)   # song_time(): see the beat sync pattern in SKILL.md
    if bar != _last_bar:
        _last_bar = bar
        if pending_section != "":
            crossfade_to(pending_section, 0.2)   # short fade over the seam
            pending_section = ""
```

`_process` only sees the boundary on the first frame after it, so this switch arrives up to one
frame late. Godot 4.7's `AudioStreamInteractive` does the switch on the audio thread instead: add
clips, set `bpm`/`bar_beats` on each clip's Ogg Vorbis or MP3 stream (`AudioStreamWAV` has no
beat data), define transitions with `add_transition(from, to, TRANSITION_FROM_TIME_NEXT_BAR,
...)`, then call `get_stream_playback().switch_to_clip_by_name(&"combat")` on the player.

Transition strategies, in increasing refinement:

- **Instant fade** — a quick volume blend; enough for low-stakes changes.
- **Quantized switch** — wait for the next beat/bar/phrase, then switch. The default for music
  that must stay "in rhythm."
- **Transition segments** — short bridge clips written to connect A→B musically.
- **Stingers** — one-off musical accents layered over the bed for events (boss appears, secret
  found) without altering the loop.

## Mapping gameplay to intensity

Drive music from a small, smoothed intensity value rather than from raw events:

```gdscript
# Combine signals into 0..1, smooth them, then map to layers/sections with hysteresis.
var intensity := 0.0

func intensity_from_state(enemies_near: int, player_hp01: float, dt: float) -> float:
    var raw := clampf(enemies_near / 5.0, 0.0, 1.0) * (1.0 - 0.4 * player_hp01)
    # Framerate-independent smoothing; a fixed per-frame lerp(…, 0.05) would settle
    # twice as fast at 120 FPS as at 60.
    intensity = lerpf(intensity, raw, 1.0 - exp(-3.0 * dt))
    return intensity

# Hysteresis: require crossing different thresholds going up and down so music
# doesn't oscillate when intensity hovers near a boundary.
func level_from_intensity(i: float, current: int) -> int:
    if current < 1 and i > 0.6: return 1
    if current >= 1 and i < 0.4: return 0
    return current
```

## Practical notes

- **Drive timing from the audio clock**, not frame delta, and account for output latency when
  scheduling.
- **Loop points** must be sample-accurate; gaps or clicks give away the seam. Compose loops on
  bar boundaries and test the loop.
- **Middleware** (FMOD, Wwise) natively implements layering, quantized transitions, and
  parameter-driven intensity — reach for it once the music system outgrows a handful of
  stems/segments.
- **Budget**: many simultaneous stems cost voices and memory. Stream long music; keep stem
  count modest on low-end targets.
