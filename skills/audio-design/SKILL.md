---
name: audio-design
description: "Engine-agnostic game audio technique: bus organization, decibel volume sliders, loudness, ducking music under dialogue, adaptive music and SFX variation, with Godot, Unity, and FMOD/Wwise mappings. Auto-invoke to mix a game, make music react to combat, fix repetitive footsteps or beat sync, or a mix that clips or pumps. Not for Godot's audio API (`godot-audio`)."
model: claude-sonnet-5-5
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Audio design

Game audio is a mix graph plus a music system. Every sound plays on a small set of buses that
settings sliders and ducking act on, and music reacts through layers and segments rather than a
single loop. This skill owns these decisions; `godot-audio`, Unity's AudioMixer, or FMOD/Wwise
supply the API.

> Adapted and translated from the `audio-design` skill in
> [`gamedev-skills/awesome-gamedev-agent-skills`](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
> (Apache 2.0) — see [`skills/game-dev-router/NOTICE.md`](../game-dev-router/NOTICE.md).

## When to use it

- Design a bus layout, volume sliders, group effects, and a loudness target.
- Duck music and ambience under voice or big impacts.
- Build adaptive music, SFX variation, or beat-quantized gameplay.

**Not this skill**: questions about Godot's node/bus/stream API go to `godot-audio`; settings
menu layout goes to `game-ui-ux`; triggering sounds from impacts goes through `game-feel`'s
feedback package.

## Workflow

1. **Inventory first.** List every player or `AudioSource` and the bus or mixer group it
   outputs to; anything on Master or ungrouped bypasses the sliders.
2. **Organize buses**: `Master ← Music ← MusicDuck`, `SFX`, `Ambience`, `UI`, `Voice`. Sliders
   map to bus gain; nobody sets per-clip volume by hand.
3. **Map sliders to decibels**: square the 0..1 slider, convert with `linear_to_db`, floor at 0.
4. **Set headroom and a loudness target**: true peak at or below -1 dBTP; integrated loudness
   around -24 LUFS (±2) for console/PC on TV or speakers, and around -18 LUFS (±2) for handheld
   and mobile. Music-streaming targets like -14 LUFS are not game targets.
5. **Duck** music under voice with a sidechain compressor or by tweening a dedicated ducking
   bus.
6. **Make music adaptive**: vertical layers for intensity, horizontal segments switched on bar
   lines for state changes, stingers for one-off events (see the reference).
7. **Vary repeated SFX** with sample pools and small pitch and volume offsets.
8. **Measure, then listen.** Capture a representative 2-5 minute session and measure it:
   - Godot: `xvfb-run -a godot --path . --write-movie capture.avi --fixed-fps 60 --quit-after 9000`
     (needs a renderer; Movie Maker crashes under `--headless`). Other engines: ask the user to
     record the game's output as WAV and share the path.
   - `ffmpeg -hide_banner -nostats -i capture.avi -vn -af ebur128=peak=true:framelog=quiet -f null -`
     shows integrated loudness (`I:`) and true peak (`Peak:`). Compare against step 4.
   - Then ask the user to listen on headphones and on speakers, and report whether ducking is
     audible without pumping and whether music transitions land on the beat.

## Patterns

The snippets are in Godot 4.7 GDScript; Unity 6.3 LTS and middleware equivalents follow each.

### 1. Bus routing and slider → gain mapping

```gdscript
# Route sounds to named buses; control GROUPS, not individual clips.
sfx_player.bus = &"SFX"
music_player.bus = &"Music"

# Map a 0..1 settings slider to bus gain. Squaring the slider first spreads the
# audible change over the whole range; a raw linear amplitude slider puts most
# of the change in the first fifth.
func set_bus_volume(bus_name: StringName, slider01: float) -> void:
    var idx := AudioServer.get_bus_index(bus_name)
    var gain := clampf(slider01, 0.0, 1.0)
    AudioServer.set_bus_mute(idx, gain <= 0.0)             # true silence at 0
    AudioServer.set_bus_volume_linear(idx, gain * gain)    # = set_bus_volume_db(idx, linear_to_db(gain * gain))
# WRONG: AudioServer.set_bus_volume_db(idx, slider01): "0.5" means +0.5 dB (no
# audible change) and 0 means full volume.
```

Unity 6.3 LTS: expose the group's Volume as a mixer parameter, then
`mixer.SetFloat("MusicVolume", 20f * Mathf.Log10(Mathf.Max(gain * gain, 0.0001f)))` (the mixer
floor is -80 dB). An `AudioSource` whose Output group is empty plays outside the mix groups: no
category slider or snapshot affects it — route every source.

### 2. Sidechain ducking (music drops under voice)

A compressor on the music bus, driven by the voice bus, lowers music during dialogue and
releases afterward. Starting values: threshold around -30 dB on the voice signal, ratio 4:1 to
8:1, the fastest attack the effect allows (up to ~10 ms), release 300-500 ms.

```gdscript
# Godot 4.7: AudioEffectCompressor reads its sidechain bus for threshold detection.
func _ready() -> void:
    var duck := AudioEffectCompressor.new()
    duck.sidechain = &"Voice"      # the bus that triggers the drop
    duck.threshold = -30.0         # dB, range -60..0
    duck.ratio = 8.0               # range 1..48
    duck.attack_us = 2000.0        # in MICROseconds, range 20..2000 (2 ms is the maximum)
    duck.release_ms = 400.0        # in milliseconds, range 20..2000
    AudioServer.add_bus_effect(AudioServer.get_bus_index(&"Music"), duck)

# Compressor-free alternative: tween a dedicated "MusicDuck" bus placed between
# Music and Master, so ducking never overwrites the player's Music slider.
func duck_music(active: bool) -> void:
    var idx := AudioServer.get_bus_index(&"MusicDuck")
    var from := AudioServer.get_bus_volume_db(idx)
    var to := -12.0 if active else 0.0
    create_tween().tween_method(
        func(db: float) -> void: AudioServer.set_bus_volume_db(idx, db), from, to, 0.25)
```

Unity 6.3 LTS: add a **Duck Volume** effect to the Music group and a **Send** effect on the
Voice group that targets it. FMOD Studio and Wwise have native sidechain/auto-ducking on buses;
prefer that over script tweens when the project already uses a middleware.

### 3. SFX variation (killing the "machine gun" repetition)

```gdscript
# Godot 4.7: AudioStreamRandomizer draws a take (no immediate repeat by default)
# and randomizes pitch and volume on each play. No node allocation per shot.
func make_footsteps(samples: Array[AudioStream]) -> void:
    var rnd := AudioStreamRandomizer.new()
    for s in samples:
        rnd.add_stream(-1, s)                 # -1 appends at the end; optional 3rd arg = weight
    rnd.random_pitch_semitones = 1.0          # up to +/-1 semitone (about 6%)
    rnd.random_volume_offset_db = 2.0         # up to +/-2 dB
    $Footsteps.stream = rnd
    $Footsteps.max_polyphony = 4              # no extra node needed to overlap footsteps
```

Unity 6.3 LTS: put the takes in an **Audio Random Container** asset (Random or Shuffle
playback, Avoid Repeating Last, volume and pitch randomization) and assign it to the
`AudioSource`'s Audio Resource (`AudioSource.resource`); in Manual trigger mode each `Play()`
draws a new take. For full script control, keep an array of clips, pick one different from the
last, set `pitch` within a small range, and call `PlayOneShot` on a pooled `AudioSource`.

### 4. Beat-synced events (quantizing to the musical grid)

```gdscript
# Schedule gameplay/visuals against music time, not frame time, so they land on the beat.
const BPM := 120.0
const SECONDS_PER_BEAT := 60.0 / BPM

# What the player HEARS right now: playback position, plus time since the last
# mix (position only updates once per mixed block), minus output latency.
func song_time() -> float:
    return ($Music.get_playback_position() + AudioServer.get_time_since_last_mix()
            - AudioServer.get_output_latency())

func current_beat() -> int:
    return floori(song_time() / SECONDS_PER_BEAT)  # negative = beat 0 isn't audible yet

# Quantize an action to the NEXT beat boundary rather than firing it immediately.
func time_until_next_beat() -> float:
    var time := song_time()
    if time < 0.0:
        return -time                             # pre-roll: wait for the first audible beat
    return SECONDS_PER_BEAT - fposmod(time, SECONDS_PER_BEAT)
# On an exact non-negative beat boundary, NEXT means one full beat later.
```

Unity 6.3 LTS: read `AudioSettings.dspTime` and schedule with
`AudioSource.PlayScheduled(dspTime)` for sample-accurate starts.

## Pitfalls

- **Slider values used as dB.** `set_bus_volume_db(idx, 0.5)` means +0.5 dB, and 0 means full
  volume. Convert, and square or cube the slider first: a raw linear-amplitude slider barely
  changes over most of its range then drops off at the bottom.
- **Sources that bypass the mix.** A Unity `AudioSource` with an empty Output, or a Godot player
  left on `Master`, ignores category sliders and snapshots.
- **Ducking that overwrites the player's slider.** Tweening the Music bus to 0 dB throws away
  their setting. Duck a separate bus between Music and Master, or use the compressor.
- **Godot's `attack_us` is in microseconds** (20-2000), while `release_ms` is in milliseconds;
  a value of 10 means 10 µs, not 10 ms.
- **Pumping.** A fast release or a high ratio makes music audibly "breathe" after every line.
  Lengthen the release (300-500 ms) or lower the ratio.
- **Master clipping.** Summed sounds exceed 0 dBFS and distort. Leave headroom; a limiter on
  Master is a safety net, not the mixer.
- **Beat sync from frame time** drifts within seconds. Use playback position, plus time since
  the last mix, minus output latency (Unity: `AudioSettings.dspTime` and `PlayScheduled`).
- **Stems started by separate players** drift from one another over a long loop. Use a single
  synchronized stream (Godot `AudioStreamSynchronized`) or a middleware.
- **Bar-quantized switches on `AudioStreamWAV`** never quantize: only Ogg Vorbis and MP3
  streams carry `bpm` and `bar_beats` for `AudioStreamInteractive`.
- **Unbounded one-shot players** leak and pile up. Use `max_polyphony`, a stream randomizer, or
  a pool; free on `finished`.
- **Measuring in the editor** with meters alone. Editor meters show per-bus peak, not integrated
  loudness over a session; measure a capture as in step 8.

## References

- [`references/adaptive-music.md`](references/adaptive-music.md): read to build layered or
  segmented music (stem sync, bar-quantized switches, `AudioStreamSynchronized`,
  `AudioStreamInteractive`, stingers, a smoothed intensity value with hysteresis).

## Related skills

- `godot-audio`: Godot players, buses, effects, and import settings.
- `game-feel`: the feedback packages that trigger impact sounds.
- `game-ui-ux`: the settings screen that carries the volume sliders.

## Version notes

Last checked: 2026-11-11.

- Loudness targets: Sony ASWG-R001 (2013), -24 LUFS home and -18 LUFS handheld, measured per
  ITU-R BS.1770.
- Godot 4.7: `AudioServer.set_bus_volume_linear`, `AudioEffectCompressor.sidechain`/`attack_us`/
  `release_ms`, `AudioStreamRandomizer`, `AudioStreamSynchronized` (`MAX_STREAMS` = 32),
  `AudioStreamInteractive` with `TRANSITION_FROM_TIME_NEXT_BAR`; `bpm`/`bar_beats` only exist on
  `AudioStreamOggVorbis` and `AudioStreamMP3` (Godot 4.7.2 class reference). Movie Maker under
  `--headless` crashed in a local test on 4.7.2; works under `xvfb-run`.
- Unity 6.3 LTS: Audio Random Container assigned via `AudioSource.resource`; mixer floor -80 dB;
  `AudioSettings.dspTime` with `AudioSource.PlayScheduled`.
- ffmpeg's `ebur128` filter with `peak=true` reports BS.1770 integrated loudness and true peak;
  tested with ffmpeg 6.1.
