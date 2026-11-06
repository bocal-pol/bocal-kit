---
name: animate
description: "Short video generation (2-4 s) via Hugging Face LTX-Video: interviews on motion, camera, and duration, then a validated prompt before generation. Auto-invoke on: animate, video, clip, animation, image-to-video, text-to-video, camera movement, LTX, generate a video."
model: claude-sonnet-5
user-invocable: true
argument-hint: "[quick|deep|from-image <url>|template <name>]"
type: specialized
priority: high
scope: cross
dependencies: []
conflicts: []
---

# animate — High-quality video generation (Claude Code)

Video prompt-crafting skill to generate very high-quality clips. Interviews the user in waves about **motion over time** (subject action, camera movement, duration, pacing, sound ambiance), then generates the clip via HF (LTX-Video distilled, free) or produces a copy-paste video prompt if HF is unavailable. Complements the `imagine` skill (still image): `animate` handles time and motion.

## Directives — Non-negotiable

| # | Rule |
|---|---|
| 1 | **Never auto-generate.** Always present the prompt, wait for validation before generating. |
| 2 | **Interview first.** In `deep` mode, don't skip waves without explicit consent. |
| 3 | **Video generation can be slow/limited** (HF free but ZeroGPU quota; keep clips short, 2-4 s). **Warn** before launching, and report any quota failure **without retrying in a loop**. |
| 4 | **Prefer image-to-video** when a source image exists: locking the first frame gives far better consistency than text-to-video. |
| 5 | **Consistency/realism pass** before generation: spot physical, safety, or anatomical inconsistencies that motion will worsen (e.g. fire under a shelter, a floating object). |
| 6 | **Backends**: 1) **HF `hf-t2v`** (LTX-Video distilled, free, default) → `mcp__hf-t2v__gr1_ltx_video_distilled_generate` (text-to-video AND image-to-video); 2) **prompt-only** if HF unavailable. |
| 7 | **Templates** reused from `~/.claude/image-templates/` (same character sheets as `imagine`). English in the questions. |

## Selection log

```yaml
# [SKILL-SELECT]
skill:      animate
score:      92
reason:     "explicit request for video generation / animation / clip"
matched_by: explicit
fallback:   false
```

## Workflow

### Phase 1 — Input dispatch

| Argument | Behavior |
|---|---|
| *(empty)* or `deep` | Full wave-based interview (Phase 2). |
| `quick` | 4 grouped questions (Subject+Action, Camera, Duration/pacing, Ratio) → Phase 3. |
| `from-image <url>` | **Image-to-video** mode: the first frame is the provided image. Skip Wave B (visual style already set by the image), focus on motion. |
| `template <name>` | Load `~/.claude/image-templates/<name>.md` to inherit the character/style, then interview on motion. |

### Phase 2 — Wave-based interview (`deep` mode)

**Wave A — Intent** (3 questions)
1. Target use? *(social media clip / cinematic shot / loop / product demo / subtle cinemagraph)*
2. Source? *(text-to-video from scratch / image-to-video from an existing image)*
3. Level of control? *(I describe everything / you decide)*

**Wave B — Subject & scene** (3 questions, *skippable if image-to-video*)
1. Main subject + setting (who/what/where).
2. Visual style / medium (realistic photo, animation, painted animation, 3D…).
3. Palette and visual mood.

**Wave C — Subject motion** (3 questions)
1. What does the subject do **over time**? (an action unfolding, start → end)
2. Speed and amplitude? *(subtle cinemagraph-like motion / sharp action / fast dynamics)*
3. Secondary animated elements? *(hair, fabric, fire, smoke, water, leaves, particles, flickering light)*

**Wave D — Camera** (3 questions)
1. Camera movement? *(static / slight push-in / lateral tracking / orbit / dolly / handheld / drone)*
2. Camera movement speed? *(nearly still / slow / moderate / dynamic)*
3. Framing and focal length? *(close-up / wide shot / telephoto / wide-angle)*

**Wave E — Duration & pacing** (2 questions)
1. Target duration? *(2-4 s cinemagraph / 5-6 s standard / 8-10 s long shot)*
2. Loop or single shot? *(seamless loop / one-shot with a beginning and end)*

**Wave F — Sound ambiance & technical** (3 questions)
1. Audio? *(native ambient sound / music / silence / voice)* — some models generate audio, others don't.
2. Ratio and orientation? *(16:9 / 9:16 vertical / 1:1 / 2.39:1 cinema)*
3. Elements to forbid (unwanted morphing, deformed hands, flicker, text…).

### Phase 3 — Video prompt synthesis

```markdown
## Video prompt — [short title]

**Mode**: text-to-video | image-to-video (first-frame lock)

**Motion prompt** (EN, ordered: subject → temporal action → camera movement → mood):
`[subject and scene], [what happens over time, start to end], [secondary motion: fire/smoke/hair/leaves],
 [camera movement and speed], [pacing], [lighting/mood], [style], [duration], [aspect ratio]`

**Negative / to avoid**:
`[exclusions from Wave F + defaults: morphing artifacts, warping, flicker, deformed hands, extra limbs,
 text, watermark, jump cuts, abrupt speed changes]`

**Suggested params**:
- Duration: `[value]` · Ratio: `[value]` · Loop: yes/no
- Backend: HF `hf-t2v` (LTX-Video distilled)
- Starting frame (if image-to-video): `[url]`
```

### Phase 4 — Video generation

Warn (duration/limits, Directive 3) and ask for validation. Then:

1. **HF `hf-t2v` (free, default)** — LTX-Video distilled. Call `mcp__hf-t2v__gr1_ltx_video_distilled_generate`:
   - `mode` = `text-to-video` (from a description) **or** `image-to-video` (first-frame lock — pass the `imagine` image via `input_image_filepath` to keep the character)
   - `prompt` = Phase 3 motion prompt · `negative_prompt` = exclusions
   - `duration_ui` = 2 to 4 s (short, to stay within the ZeroGPU quota) · `width_ui`/`height_ui` divisible by 32
   - `seed_ui` + `randomize_seed: false` for reproducibility
   Returns the `.mp4` URL. Free (ZeroGPU quotas; an `HF_TOKEN` raises the limits).

2. **Prompt-only (fallback)** — if `hf-t2v` is unavailable: deliver the motion prompt for Runway / Kling / Luma / Pika.

### Phase 5 — Template saving (optional)
Offer to save the animated character/style to `~/.claude/image-templates/<slug>.md` (same character sheets as `imagine`), adding a `## Video settings` section (motion type, camera, duration, preferred model).

### Phase 6 — Fallback
- **HF `hf-t2v` unavailable / ZeroGPU quota reached** → prompt-only mode: deliver the Phase 3 prompt for Runway / Kling / Luma / Sora / Pika, noting the absence of actual generation.
- **Non-interactive mode** → implicit `quick`: image-to-video if an image is provided, otherwise text-to-video; slight push-in camera; 5 s; 16:9.

## Complementarity with `imagine`
- `imagine` = still image (composition, light, framing).
- `animate` = motion (temporal action, camera, duration, sound).
- Recommended combined workflow: first generate the reference image with `imagine`, then animate it with `animate --from-image <url>` (first-frame lock) for maximum consistency.

## Skip memorization
No persistence in `~/.claude/memory/` by default. The only intentional persistence: templates in `~/.claude/image-templates/` on explicit request (Phase 5).
