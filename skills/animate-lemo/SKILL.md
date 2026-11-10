---
name: animate-lemo
description: "Directs and produces a short film made entirely in code, in one of the ~66 visual styles of the Lemo-Opuscar library (e.g. Impasto Oil Painting, Watercolor Brush, Ukiyo-e, Satellite Briefing, Exploded Teardown). Auto-invoke on: coded film, short film, styled video, animated promo, animated explainer, archive footage cut into a style, 'make me a film in this style', a film request with no style chosen yet (help pick one), changing an existing style or making a new one from scratch, listing the available styles. Not for plain editing, trimming, or converting the user's existing video files, and not for a generic short clip (see the `animate` skill for that, based on Hugging Face LTX-Video)."
model: claude-sonnet-5
user-invocable: true
argument-hint: "[style <slug>|deps [voice] [music]]"
type: specialized
priority: medium
scope: cross
dependencies: []
conflicts:
  - animate
---

# animate-lemo — Coded Short Film (Lemo-Opuscar)

Adapted from [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) (MIT) — the style library, the directing guides, and the rendering tools live in that external repository. This skill fetches it (a read-only sparse clone) and steps aside for its own instructions: it reimplements nothing, it only provides the local entry point and the path adaptations needed in skill mode.

**Difference from the `animate` skill**: `animate` generates a short clip (2-4 s, text/image-to-video) via the Hugging Face LTX-Video MCP — no narrative style, no audio, no editing. `animate-lemo` directs and produces a **complete film** (structure, voice-over, music, editing, headless browser rendering) in one coded visual style out of ~66. The two never overlap in practice; never activate both skills for the same request (see `conflicts` in the frontmatter).

## Directives — Non-negotiable

| # | Rule |
|---|---|
| 1 | **External toolchain, accepted explicitly by the user**: this skill clones a third-party git repository (`github.com/lemomo-ai/lemo-opuscar`, MIT) and installs Node/Python/ffmpeg dependencies. Don't re-propose this choice on every session — only an update that significantly changes what the library does would justify asking again. |
| 2 | **Never install system software on the user's behalf** (Node, ffmpeg, Python). `setup.sh` only reports what's missing; surface that report to the user in the same round of questions as the brief, never try to install a system package yourself. |
| 3 | **Language first if nothing has been written yet.** If the user starts the skill with no context (just invoking it, nothing else), the very first question is the film's language (via the question tool), before anything else — even if session context already suggests one. |
| 4 | **Treatment before demo.** Always write `TREATMENT.md` in the project folder before opening `DEMO.md` or the chosen style's demo code. The demo is only there to learn techniques (a brush engine, a rig, a shader, a mix), never to copy its story, shots, or timing. Exception: an "Edit & Documentary" style (footage-based editing) may use its material-gathering tools (`demo/tools/footage.py` and the like) before the treatment. |
| 5 | **Never inside the library's `styles/` or `core/`.** All film work happens in the project folder (`<name>/` in the folder the user started the skill from), never inside the cloned library itself. |
| 6 | **No orphan processes.** Never kill a process this skill didn't start; never leave a background process running after the task ends. |
| 7 | **LemoLab credit is reserved for the library's own demos.** A film produced for the user, on their own topic, carries no LemoLab credit and no watermark. |
| 8 | **Temporary file hygiene**: the library clone goes into `~/lemo-opuscar` (or `$LEMO_OPUSCAR_HOME`), never at the root of a project repo. The film's project folder (`<name>/`) is created in the folder the user started the skill from, lowercase letters/digits/hyphens, no `#` or `?`. |

## Workflow

1. **Get the library.** Run `sh "<skill base directory>/scripts/setup.sh"`. It clones or updates the library (default `~/lemo-opuscar`; a clone the user is already standing in is used as-is) and prints `LIB=<path>` on its last line.
2. **Install the core tools early.** Run `sh "<skill base directory>/scripts/setup.sh" deps` as soon as possible, in the background if you can (a few minutes the first time). Add `deps voice` or `deps music` later, only if the film needs them (`$LIB/TECHNIQUE.md` §1). Report missing system tools (Node, ffmpeg, Python) in the brief's round of questions — never install them yourself. Packages a style needs (listed in its `STYLE.md`) are installed into the project folder.
3. **Follow the library.** Read `$LIB/AGENTS.md` and do what it says, starting with **Start** (the user's own styles in `~/lemo-my-styles/`; if the skill was started with nothing written, ask the language question first, then the ways in): finding the style or making one, the round of questions, the treatment, production, and delivery.

### What changes in skill mode (compared to a standalone clone of the library)

| | |
|---|---|
| Project folder | `<name>/` in the folder the user started the skill from (lowercase letters, digits, hyphens; avoid `#` and `?` in the path). Wherever the guides say `films/<name>/`, read this folder |
| Running tools | from `$LIB`, with the project's absolute path: `cd "$LIB" && node core/render/still.mjs "<project>" 1.5 3` |
| Library files in pages | absolute URLs: `/core/lib.js`, `/node_modules/three/…` (the project is served at `/@film/`) |
| Library files in scripts and `build.sh` | `$LIB/…`, with `LIB=<path>` at the top of `build.sh`; never `../..` |
| Demo source | not downloaded by default. `sh "<skill base directory>/scripts/setup.sh" demo <slug>`, only after `TREATMENT.md` is written, to read its techniques; it is not meant to be rendered. An Edit & Documentary style is the exception: fetch it before the treatment to use the material tools its `STYLE.md` names in `demo/tools/` (`$LIB/AGENTS.md`, "Treatment first") |

Deliver what `$LIB/DIRECTOR.md` §11 lists, in the project folder, and tell the user where it is.

## Quick reference to the library's guides ($LIB)

| Need | File |
|---|---|
| Overview, request routing | `AGENTS.md` |
| Directing: story, sound, rhythm, camera, shots, checks, delivery | `DIRECTOR.md` |
| Technique: setup, pages, voice, music, mix | `TECHNIQUE.md` |
| Tool commands and flags | `core/README.md` |
| Changing a style / making one from scratch / saved personal styles | `MY-STYLES.md` |
| List of the ~66 available styles (English/Chinese names, slugs) | `styles/README.md` |
