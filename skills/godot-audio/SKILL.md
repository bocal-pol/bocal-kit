---
name: godot-audio
description: "Godot 4.7 audio API: 2D and 3D `AudioStreamPlayer`, bus layout, volume and mute via `AudioServer`, polyphony, import-time looping, and playback position for rhythm sync. Auto-invoke to wire SFX, music or volume sliders in Godot, or when a sound is silent, cut off, doesn't loop, or ignores its bus. Not for engine-agnostic mixing, ducking or adaptive music (`audio-design`)."
model: claude-sonnet-5-5
type: framework
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Godot Audio (4.x)

This skill owns playing, routing and controlling sound via Godot's player nodes and
`AudioServer`, plus proof of bus wiring via a headless check. Targets **Godot 4.7**; check
`config/features` in `project.godot` first.

> Adapted/translated from `godot-audio` in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Choose the player node, route to a bus, set volume in decibels or linear, configure loops, or
  read the playback position for rhythm sync.

**Not this skill**: engine-agnostic mixing, ducking and adaptive music (`audio-design`).

## Main workflow

1. **Read the bus layout first.** It lives in the file named by `audio/buses/default_bus_layout`
   (default `res://default_bus_layout.tres`); each `bus/N/name` is a bus. Bus names in scenes and
   code must match exactly.
2. **Choose the node:** `AudioStreamPlayer` for music, UI and global SFX;
   `AudioStreamPlayer2D`/`3D` when distance and panning matter.
3. **Route each player** by setting `bus` (e.g. `&"SFX"`). Add a bus by editing the layout file,
   the Audio panel, or `AudioServer.add_bus()` at runtime.
4. **Volume is in decibels.** For 0..1 sliders, use `volume_linear` on players and
   `AudioServer.set_bus_volume_linear()`, which convert for you.
5. **Loops are an import setting.** Set the loop on `.ogg`/`.mp3`/`.wav` import (or
   `AudioStreamWAV.loop_mode`), not on the player.
6. **Run the checks** below before concluding.

## Patterns

### 1. One-off SFX that can overlap

```gdscript
@onready var sfx: AudioStreamPlayer = $Sfx   # stream assigned in the scene

func _ready() -> void:
    sfx.max_polyphony = 4                      # default 1: a retrigger cuts the previous playback

func play_hit() -> void:
    sfx.pitch_scale = randf_range(0.95, 1.05)
    sfx.play()
```

For many variants, use an `AudioStreamRandomizer` as the stream rather than code.

### 2. Volume slider and mute for a bus

```gdscript
func set_bus_volume(bus_name: StringName, value_0_to_1: float) -> void:
    var bus := AudioServer.get_bus_index(bus_name)
    if bus == -1:
        push_error("No audio bus named %s" % bus_name)
        return
    AudioServer.set_bus_mute(bus, value_0_to_1 <= 0.0)   # mute at 0 rather than -inf dB
    if value_0_to_1 > 0.0:
        AudioServer.set_bus_volume_linear(bus, value_0_to_1)
```

### 3. Crossfade between two music players

```gdscript
@onready var a: AudioStreamPlayer = $MusicA
@onready var b: AudioStreamPlayer = $MusicB

func crossfade_to(stream: AudioStream, secs := 1.5) -> void:
    b.stream = stream
    b.volume_db = -40.0
    b.play()
    var tw := create_tween().set_parallel(true)
    tw.tween_property(a, "volume_db", -40.0, secs)
    tw.tween_property(b, "volume_db", 0.0, secs)
    tw.chain().tween_callback(a.stop)   # bound to the old player now
    var old := a
    a = b
    b = old
```

### 4. Song time for rhythm sync

```gdscript
@onready var music: AudioStreamPlayer = $Music

func song_time() -> float:
    # playback position updates once per mix; add elapsed time since then, minus latency.
    return music.get_playback_position() + AudioServer.get_time_since_last_mix() \
        - AudioServer.get_output_latency()
```

## Verify

1. Run a headless check that loads the real bus layout and fails on every `bus = "..."` or
   `get_bus_index("...")` name it doesn't define, with file and line.
2. If `godot-nodes-scenes` is installed, run its path checker to catch missing stream files.
3. Playback logic tests headless: `playing`, `get_playback_position()` and `finished` behave
   normally. Loudness and the mix don't test: ask the user to listen and report levels, clipping
   and anything inaudible.

## Pitfalls

- **A sound plays on Master and ignores its bus volume** → its `bus` name doesn't exist. Godot
  silently falls back to Master, reading `player.bus` back returns `Master`, and
  `get_bus_index()` returns -1.
- **Half volume still sounds loud** → `volume_db = 0.5` is +0.5 dB. Use the linear helpers or
  `linear_to_db()`.
- **NaN or stuck volume after fading to silence** → `linear_to_db(0.0)` is `-inf`, and
  `set_bus_volume_linear(bus, 0.0)` also stores `-inf`. Mute at zero (Pattern 2).
- **Fast SFX cut each other off** → `max_polyphony` defaults to 1.
- **Music doesn't loop** → the loop is disabled in import settings or `loop_mode`.
- **3D sound is silent** → no current `Camera3D`/`AudioListener3D`, `max_distance` too small, or
  `unit_size` too low for the scene's scale.
- **An Area2D/Area3D reverb override does nothing (4.7+)** → positional players' `area_mask`
  now defaults to 0. Check the area's layer in the player's `area_mask`.
- **Rhythm-synced visuals drift or stutter** → `get_playback_position()` alone only advances per
  mix buffer. Use Pattern 4.
- **Effect buses, reverb, doppler or AudioStreamGenerator are silent only on web builds** → since
  4.3 web exports play via the browser's Web Audio API ("Sample"), which skips them. Set the
  player's `playback_type` to Stream, or `audio/general/default_playback_type.web` project-wide.

## References

- The official audio buses docs cover the layout file format, the full `AudioServer` API, the
  effect list, side-chain compression, `AudioStreamPolyphonic`, `AudioStreamInteractive`,
  positional audio settings, and `AudioStreamGenerator`.

## Related skills

- `audio-design`: mix levels, ducking, adaptive music and rhythm-sync technique.
- `godot-ui-control`: the sliders and toggles that call Pattern 2.
- `godot-animation`: tweens for fades.
- `godot-gdscript-headless-testing`: running playback tests in CI.

## Version notes

Last checked: 2026-11-17, against Godot 4.7.

- Godot 4.7.2 (August 2026) is the current stable release; 4.8 is in beta.
- `volume_linear` on players and `AudioServer.set_bus_volume_linear()` exist since 4.4.
- Web exports use Sample playback (Web Audio API) by default since 4.3.
- 4.7 changed `area_mask` on `AudioStreamPlayer2D`/`3D` to default to 0.
